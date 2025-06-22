import { inject } from '@adonisjs/core'
import crypto from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import { ClickHouseService } from '#error/services/clickhouse_service'

export interface AICacheEntry {
  fingerprintHash: string
  analysisType: 'error_analysis' | 'suggested_fix' | 'similar_errors'
  provider: string
  model: string
  analysisResult: string
  promptHash: string
  confidenceScore: number
  isPublic: number
  errorPatterns: string[]
  createdAt: Date
  lastUsedAt: Date
  usageCount: number
  projectsUsed: string[]
  avgFeedbackScore?: number
  feedbackCount: number
  tokensSaved: number
  costSavedCents: number
  metadata: string
}

export interface CacheLookupParams {
  fingerprintHash: string
  analysisType: 'error_analysis' | 'suggested_fix' | 'similar_errors'
  projectId?: string
  respectPrivacy?: boolean
}

@inject()
export default class AICacheService {
  constructor(private clickHouseService: ClickHouseService) {}

  /**
   * Generate hash for prompt content (for cache versioning)
   */
  private generatePromptHash(prompt: string): string {
    return crypto
      .createHash('sha256')
      .update(prompt.trim().toLowerCase())
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Look up cached AI analysis
   */
  async getCachedAnalysis(
    params: CacheLookupParams
  ): Promise<AICacheEntry | null> {
    try {
      let query = `
        SELECT *
        FROM ai_analysis_cache
        WHERE fingerprint_hash = {fingerprintHash:String}
          AND analysis_type = {analysisType:String}
      `

      // Respect privacy by only returning public analyses if project doesn't match
      if (params.respectPrivacy !== false && params.projectId) {
        query += `
          AND (
            is_public = 1 
            OR has(projects_used, {projectId:String})
          )
        `
      }

      query += `
        ORDER BY confidence_score DESC, usage_count DESC
        LIMIT 1
      `

      const result = await this.clickHouseService.query(query, {
        fingerprintHash: params.fingerprintHash,
        analysisType: params.analysisType,
        projectId: params.projectId || ''
      })

      if (result.data.length === 0) {
        return null
      }

      const cached = result.data[0]
      
      // Update usage stats asynchronously
      this.updateCacheUsage(
        cached.fingerprint_hash,
        cached.analysis_type,
        params.projectId
      ).catch(err => logger.error('Failed to update cache usage:', err))

      return {
        fingerprintHash: cached.fingerprint_hash,
        analysisType: cached.analysis_type,
        provider: cached.provider,
        model: cached.model,
        analysisResult: cached.analysis_result,
        promptHash: cached.prompt_hash,
        confidenceScore: cached.confidence_score,
        isPublic: cached.is_public,
        errorPatterns: cached.error_patterns,
        createdAt: new Date(cached.created_at),
        lastUsedAt: new Date(cached.last_used_at),
        usageCount: cached.usage_count,
        projectsUsed: cached.projects_used,
        avgFeedbackScore: cached.avg_feedback_score,
        feedbackCount: cached.feedback_count,
        tokensSaved: cached.tokens_saved,
        costSavedCents: cached.cost_saved_cents,
        metadata: cached.metadata
      }
    } catch (error) {
      logger.error('Failed to get cached analysis:', error)
      return null
    }
  }

  /**
   * Store AI analysis in cache
   */
  async cacheAnalysis(
    fingerprintHash: string,
    analysisType: 'error_analysis' | 'suggested_fix' | 'similar_errors',
    analysis: any,
    params: {
      provider: string
      model: string
      prompt: string
      projectId: string
      confidenceScore?: number
      isPublic?: boolean
      errorPatterns?: string[]
      promptTokens?: number
      completionTokens?: number
    }
  ): Promise<void> {
    try {
      const promptHash = this.generatePromptHash(params.prompt)
      
      // Check if this is a common/framework error that can be shared
      const isPublicError = params.isPublic ?? this.isPublicError(params.errorPatterns || [])

      const now = new Date()
      const formatDateTime = (date: Date): string => {
        return date.toISOString().substring(0, 19).replace('T', ' ')
      }

      await this.clickHouseService.insert('ai_analysis_cache', [
        {
          fingerprint_hash: fingerprintHash,
          analysis_type: analysisType,
          provider: params.provider,
          model: params.model,
          analysis_result: JSON.stringify(analysis),
          prompt_hash: promptHash,
          confidence_score: params.confidenceScore || 0.8,
          is_public: isPublicError ? 1 : 0,
          error_patterns: params.errorPatterns || [],
          created_at: formatDateTime(now),
          last_used_at: formatDateTime(now),
          usage_count: 1,
          projects_used: [params.projectId],
          avg_feedback_score: null,
          feedback_count: 0,
          tokens_saved: 0,
          cost_saved_cents: 0,
          metadata: JSON.stringify({
            initialTokens: {
              prompt: params.promptTokens || 0,
              completion: params.completionTokens || 0
            }
          })
        }
      ])

      logger.info({
        fingerprintHash,
        analysisType,
        isPublic: isPublicError
      }, 'AI analysis cached successfully')
    } catch (error) {
      logger.error({ 
        err: error,
        fingerprintHash,
        analysisType,
        errorMessage: error instanceof Error ? error.message : String(error)
      }, 'Failed to cache analysis')
      throw error
    }
  }

  /**
   * Update cache usage statistics
   */
  private async updateCacheUsage(
    fingerprintHash: string,
    analysisType: string,
    projectId?: string
  ): Promise<void> {
    try {
      // Get the cached entry's token info for cost calculation
      const entry = await this.clickHouseService.query(`
        SELECT metadata
        FROM ai_analysis_cache
        WHERE fingerprint_hash = {fingerprintHash:String}
          AND analysis_type = {analysisType:String}
        LIMIT 1
      `, { fingerprintHash, analysisType })

      if (entry.data.length === 0) return

      const metadata = JSON.parse(entry.data[0].metadata)
      const tokensSaved = (metadata.initialTokens?.prompt || 0) + (metadata.initialTokens?.completion || 0)
      // Cost will be calculated by the main app's AI usage tracking
      const costSaved = 0

      // Update usage stats
      await this.clickHouseService.query(`
        ALTER TABLE ai_analysis_cache
        UPDATE
          last_used_at = now(),
          usage_count = usage_count + 1,
          tokens_saved = tokens_saved + {tokensSaved:UInt32},
          cost_saved_cents = cost_saved_cents + {costSaved:UInt32},
          projects_used = arrayDistinct(arrayConcat(projects_used, [{projectId:String}]))
        WHERE fingerprint_hash = {fingerprintHash:String}
          AND analysis_type = {analysisType:String}
      `, {
        fingerprintHash,
        analysisType,
        tokensSaved,
        costSaved,
        projectId: projectId || ''
      })
    } catch (error) {
      logger.error('Failed to update cache usage:', error)
    }
  }

  /**
   * Determine if an error is public/shareable based on patterns
   */
  private isPublicError(patterns: string[]): boolean {
    const publicPatterns = [
      // Framework errors
      'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError',
      // Common library errors
      'Cannot read property', 'undefined is not', 'null is not',
      // Database errors (generic)
      'ECONNREFUSED', 'ETIMEDOUT', 'connection timeout',
      // HTTP errors
      '404', '500', '502', '503',
      // Common framework names
      'react', 'vue', 'angular', 'express', 'django', 'rails',
      'laravel', 'symfony', 'spring', 'fastapi'
    ]

    const errorString = patterns.join(' ').toLowerCase()
    return publicPatterns.some(pattern => 
      errorString.includes(pattern.toLowerCase())
    )
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCacheHits: number
    totalTokensSaved: number
    totalCostSavedCents: number
    byAnalysisType: Record<string, any>
    byProvider: Record<string, any>
  }> {
    try {
      let query = `
        SELECT
          analysis_type,
          provider,
          model,
          sum(cache_hits) as total_hits,
          sum(total_tokens_saved) as tokens_saved,
          sum(total_cost_saved_cents) as cost_saved
        FROM ai_cache_stats
      `

      const params: any = {}
      if (startDate && endDate) {
        query += ` WHERE date >= toDate({startDate:String}) AND date <= toDate({endDate:String})`
        params.startDate = startDate.toISOString().split('T')[0]
        params.endDate = endDate.toISOString().split('T')[0]
      }

      query += ` GROUP BY analysis_type, provider, model`

      const result = await this.clickHouseService.query(query, params)

      const stats = {
        totalCacheHits: 0,
        totalTokensSaved: 0,
        totalCostSavedCents: 0,
        byAnalysisType: {} as Record<string, any>,
        byProvider: {} as Record<string, any>
      }

      for (const row of result.data) {
        stats.totalCacheHits += Number(row.total_hits)
        stats.totalTokensSaved += Number(row.tokens_saved)
        stats.totalCostSavedCents += Number(row.cost_saved)

        // Group by analysis type
        if (!stats.byAnalysisType[row.analysis_type]) {
          stats.byAnalysisType[row.analysis_type] = {
            hits: 0,
            tokensSaved: 0,
            costSavedCents: 0
          }
        }
        stats.byAnalysisType[row.analysis_type].hits += Number(row.total_hits)
        stats.byAnalysisType[row.analysis_type].tokensSaved += Number(row.tokens_saved)
        stats.byAnalysisType[row.analysis_type].costSavedCents += Number(row.cost_saved)

        // Group by provider
        if (!stats.byProvider[row.provider]) {
          stats.byProvider[row.provider] = {
            hits: 0,
            tokensSaved: 0,
            costSavedCents: 0
          }
        }
        stats.byProvider[row.provider].hits += Number(row.total_hits)
        stats.byProvider[row.provider].tokensSaved += Number(row.tokens_saved)
        stats.byProvider[row.provider].costSavedCents += Number(row.cost_saved)
      }

      return stats
    } catch (error) {
      logger.error('Failed to get cache stats:', error)
      return {
        totalCacheHits: 0,
        totalTokensSaved: 0,
        totalCostSavedCents: 0,
        byAnalysisType: {},
        byProvider: {}
      }
    }
  }

  /**
   * Submit feedback for a cached analysis
   */
  async submitFeedback(
    fingerprintHash: string,
    analysisType: string,
    score: number
  ): Promise<void> {
    try {
      await this.clickHouseService.query(`
        ALTER TABLE ai_analysis_cache
        UPDATE
          avg_feedback_score = ((avg_feedback_score * feedback_count) + {score:Float32}) / (feedback_count + 1),
          feedback_count = feedback_count + 1
        WHERE fingerprint_hash = {fingerprintHash:String}
          AND analysis_type = {analysisType:String}
      `, {
        fingerprintHash,
        analysisType,
        score
      })
    } catch (error) {
      logger.error('Failed to submit feedback:', error)
    }
  }
}