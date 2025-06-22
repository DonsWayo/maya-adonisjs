import { inject } from '@adonisjs/core'
import { createRAGService, type AIService, type ErrorAnalysis, type AIServiceConfig } from '@workspace/ai'
import aiConfig from '#config/ai'
import type { ErrorEvent } from '#error/models/error_event'
import logger from '@adonisjs/core/services/logger'
import mainAppService from '#services/main_app_service'
import AICacheService from './ai_cache_service.js'
import crypto from 'node:crypto'
import Project from '#error/models/project'
import { jsonrepair } from 'jsonrepair'

@inject()
export default class AIAnalysisService {
  constructor(private aiCacheService: AICacheService) {}
  private aiService: AIService | null = null
  private initPromise: Promise<void> | null = null
  private config: AIServiceConfig | null = null

  /**
   * Initialize the AI service
   */
  private async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        const config = aiConfig as AIServiceConfig
        
        if (!config.apiKey) {
          logger.warn('AI API key not configured, AI features will be disabled')
          return
        }

        this.config = config
        this.aiService = await createRAGService({
          ...config,
          pgConnectionString: config.ragConfig?.connectionString || '',
        })

        logger.info('AI service initialized successfully')
      } catch (error) {
        logger.error({ err: error }, 'Failed to initialize AI service')
      }
    })()

    return this.initPromise
  }

  /**
   * Analyze an error event using AI
   */
  async analyzeError(errorEvent: ErrorEvent): Promise<ErrorAnalysis | null> {
    await this.initialize()

    if (!this.aiService) {
      logger.debug('AI service not available, skipping error analysis')
      return null
    }

    try {
      // Prepare error context
      const errorContext = {
        message: errorEvent.message,
        type: errorEvent.type,
        stackTrace: errorEvent.stack_trace || undefined,
        context: {
          platform: errorEvent.platform,
          environment: errorEvent.environment,
          release: errorEvent.release,
          url: errorEvent.url,
          method: errorEvent.method,
          statusCode: errorEvent.status_code,
          tags: errorEvent.tags ? (typeof errorEvent.tags === 'string' ? JSON.parse(errorEvent.tags) : errorEvent.tags) : undefined,
          extra: errorEvent.extra ? (typeof errorEvent.extra === 'string' ? JSON.parse(errorEvent.extra) : errorEvent.extra) : undefined,
        },
      }

      // Generate fingerprint hash for caching
      const fingerprintHash = this.generateErrorFingerprint(errorEvent)
      
      // Check cache first
      const cached = await this.aiCacheService.getCachedAnalysis({
        fingerprintHash,
        analysisType: 'error_analysis',
        projectId: errorEvent.projectId,
        respectPrivacy: true
      })

      if (cached) {
        // Parse the metadata to get the original token counts
        const metadata = JSON.parse(cached.metadata)
        const savedPromptTokens = metadata.initialTokens?.prompt || 0
        const savedCompletionTokens = metadata.initialTokens?.completion || 0
        const totalTokensSaved = savedPromptTokens + savedCompletionTokens
        
        logger.info({ 
          errorId: errorEvent.id, 
          cacheHit: true,
          tokensSaved: totalTokensSaved 
        }, 'Error analysis served from cache')
        
        // Track cache hit (no AI usage, just saved tokens)
        await this.trackUsage({
          projectId: errorEvent.projectId,
          operation: 'generate',
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: 0,
          success: true,
          feature: 'error_analysis_cached',
          metadata: { cacheHit: true, tokensSaved: totalTokensSaved }
        })
        
        return JSON.parse(cached.analysisResult) as ErrorAnalysis
      }

      // Not in cache, perform actual analysis
      const { analyzeError } = await import('@workspace/ai')
      const startTime = Date.now()
      const promptText = JSON.stringify(errorContext)
      
      try {
        const analysis = await analyzeError(this.aiService, errorContext)
        const latencyMs = Date.now() - startTime
        const promptTokens = Math.ceil(promptText.length / 4)
        const completionTokens = Math.ceil(JSON.stringify(analysis).length / 4)

        // Cache the successful analysis
        await this.aiCacheService.cacheAnalysis(
          fingerprintHash,
          'error_analysis',
          analysis,
          {
            provider: this.config?.provider || 'unknown',
            model: this.config?.defaultModel || 'unknown',
            prompt: promptText,
            projectId: errorEvent.projectId,
            confidenceScore: 0.9,
            errorPatterns: [errorEvent.type, errorEvent.message],
            promptTokens,
            completionTokens
          }
        )

        // Track AI usage
        await this.trackUsage({
          projectId: errorEvent.projectId,
          operation: 'generate',
          promptTokens,
          completionTokens,
          latencyMs,
          success: true,
          feature: 'error_analysis'
        })

        logger.info({ errorId: errorEvent.id }, 'Error analyzed successfully')
        return analysis
      } catch (analysisError) {
        const latencyMs = Date.now() - startTime
        
        // Track failed AI usage
        await this.trackUsage({
          projectId: errorEvent.projectId,
          operation: 'generate',
          promptTokens: Math.ceil(promptText.length / 4),
          completionTokens: 0,
          latencyMs,
          success: false,
          errorMessage: analysisError instanceof Error ? analysisError.message : String(analysisError),
          feature: 'error_analysis'
        })
        
        throw analysisError
      }
    } catch (error) {
      logger.error({ err: error, errorId: errorEvent.id }, 'Failed to analyze error')
      return null
    }
  }

  /**
   * Suggest better error grouping based on AI analysis
   */
  async suggestErrorGrouping(errorEvents: ErrorEvent[]): Promise<{
    suggestedGroups: Array<{
      groupName: string
      groupDescription: string
      errorIds: string[]
      commonPatterns: string[]
      confidence: number
    }>
    reasoning: string
  } | null> {
    await this.initialize()

    if (!this.aiService || errorEvents.length < 2) {
      return null
    }

    try {
      // Prepare error data for analysis
      const errorData = errorEvents.map(event => ({
        id: event.id,
        type: event.type,
        message: event.message,
        stackTrace: event.stack_trace ? event.stack_trace.substring(0, 500) : '',
        fingerprint: event.fingerprint,
        platform: event.platform,
        environment: event.environment
      }))

      const prompt = `Analyze these ${errorEvents.length} errors and suggest optimal grouping strategies.
      
Current errors:
${JSON.stringify(errorData, null, 2)}

Suggest groupings that would:
1. Group truly related errors together
2. Separate distinct issues even if they have similar messages
3. Consider root causes, not just surface symptoms
4. Be meaningful for developers to track and fix

Return a JSON object with the following structure:
{
  "suggestedGroups": [
    {
      "groupName": "descriptive name for the group",
      "groupDescription": "detailed description of what these errors have in common",
      "errorIds": ["error_id1", "error_id2"],
      "commonPatterns": ["pattern1", "pattern2"],
      "confidence": 0.9
    }
  ],
  "reasoning": "explanation of the grouping logic"
}`

      const startTime = Date.now()
      const response = await this.aiService.generate(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
      })

      // Parse the response
      let cleanResponse = response
      if (response.includes('```json')) {
        cleanResponse = response.replace(/```json\s*/g, '').replace(/```/g, '')
      } else if (response.includes('```')) {
        cleanResponse = response.replace(/```\s*/g, '')
      }
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      
      const repairedJson = jsonrepair(jsonMatch[0])
      const result = JSON.parse(repairedJson) as {
        suggestedGroups: Array<{
          groupName: string
          groupDescription: string
          errorIds: string[]
          commonPatterns: string[]
          confidence: number
        }>
        reasoning: string
      }

      const latencyMs = Date.now() - startTime
      const promptTokens = Math.ceil(prompt.length / 4)
      const completionTokens = Math.ceil(JSON.stringify(result).length / 4)

      // Track AI usage
      await this.trackUsage({
        projectId: errorEvents[0].projectId,
        operation: 'generate',
        promptTokens,
        completionTokens,
        latencyMs,
        success: true,
        feature: 'error_grouping_suggestions'
      })

      logger.info({ 
        errorCount: errorEvents.length,
        suggestedGroups: result.suggestedGroups.length 
      }, 'AI grouping suggestions generated')

      return result
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate grouping suggestions')
      return null
    }
  }

  /**
   * Analyze error trends and patterns
   */
  async analyzeTrends(data: {
    projectId: string
    trends: any[]
    topErrors: any[]
    period: string
  }): Promise<{
    summary: string
    insights: string[]
    recommendations: string[]
    anomalies: Array<{
      description: string
      severity: 'low' | 'medium' | 'high'
      timestamp: string
    }>
  } | null> {
    await this.initialize()

    if (!this.aiService) {
      return null
    }

    try {
      const prompt = `Analyze these error trends and provide insights:

Period: ${data.period}

Error Trends by Time:
${JSON.stringify(data.trends, null, 2)}

Top Error Types:
${JSON.stringify(data.topErrors, null, 2)}

Provide analysis in JSON format with:
{
  "summary": "Overall trend summary",
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2"],
  "anomalies": [
    {
      "description": "Spike in errors at specific time",
      "severity": "high",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}`

      const startTime = Date.now()
      const response = await this.aiService.generate(prompt, {
        temperature: 0.7,
        maxTokens: 1500,
      })

      // Parse the response
      let cleanResponse = response
      if (response.includes('```json')) {
        cleanResponse = response.replace(/```json\s*/g, '').replace(/```/g, '')
      } else if (response.includes('```')) {
        cleanResponse = response.replace(/```\s*/g, '')
      }
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      
      const repairedJson = jsonrepair(jsonMatch[0])
      const analysis = JSON.parse(repairedJson)

      const latencyMs = Date.now() - startTime
      const promptTokens = Math.ceil(prompt.length / 4)
      const completionTokens = Math.ceil(JSON.stringify(analysis).length / 4)

      // Track AI usage
      await this.trackUsage({
        projectId: data.projectId,
        operation: 'generate',
        promptTokens,
        completionTokens,
        latencyMs,
        success: true,
        feature: 'trend_analysis'
      })

      logger.info({ projectId: data.projectId }, 'Trend analysis completed')
      return analysis
    } catch (error) {
      logger.error({ err: error }, 'Failed to analyze trends')
      return null
    }
  }

  /**
   * Add error documents to the RAG vector store for similarity search
   */
  async indexError(errorEvent: ErrorEvent): Promise<void> {
    await this.initialize()

    if (!this.aiService) {
      return
    }

    const startTime = Date.now()
    const document = {
      id: errorEvent.id,
      content: `Error: ${errorEvent.type} - ${errorEvent.message}\n${errorEvent.stack_trace || ''}`,
      metadata: {
        source: `error/${errorEvent.id}`,
        type: 'error',
        projectId: errorEvent.projectId,
        timestamp: errorEvent.timestamp,
        platform: errorEvent.platform,
        environment: errorEvent.environment,
        level: errorEvent.level,
        errorType: errorEvent.type,
      },
    }

    try {
      await this.aiService.addDocuments([document])
      const latencyMs = Date.now() - startTime
      
      // Track AI usage for embedding
      await this.trackUsage({
        projectId: errorEvent.projectId,
        operation: 'embed',
        promptTokens: Math.ceil(document.content.length / 4),
        completionTokens: 0,
        latencyMs,
        success: true,
        feature: 'error_indexing'
      })
      
      logger.debug({ errorId: errorEvent.id }, 'Error indexed for RAG')
    } catch (error) {
      const latencyMs = Date.now() - startTime
      
      // Track failed embedding
      await this.trackUsage({
        projectId: errorEvent.projectId,
        operation: 'embed',
        promptTokens: Math.ceil(document.content.length / 4),
        completionTokens: 0,
        latencyMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        feature: 'error_indexing'
      })
      
      logger.error({ err: error, errorId: errorEvent.id }, 'Failed to index error')
    }
  }

  /**
   * Find similar errors using semantic search
   */
  async findSimilarErrors(
    errorEvent: ErrorEvent,
    limit: number = 5
  ): Promise<Array<{ id: string; similarity: number }>> {
    await this.initialize()

    if (!this.aiService) {
      return []
    }

    const query = `${errorEvent.type}: ${errorEvent.message}`
    const startTime = Date.now()

    try {
      const results = await this.aiService.search(query, {
        namespace: 'errors',
        filters: {
          projectId: errorEvent.projectId,
          environment: errorEvent.environment,
          limit,
        },
        minSimilarity: 0.7,
      })
      
      const latencyMs = Date.now() - startTime
      
      // Track AI usage for similarity search (embedding)
      await this.trackUsage({
        projectId: errorEvent.projectId,
        operation: 'embed',
        promptTokens: Math.ceil(query.length / 4),
        completionTokens: 0,
        latencyMs,
        success: true,
        feature: 'similar_errors'
      })

      return results.map((doc) => ({
        id: doc.id,
        similarity: doc.metadata.similarity || 0.8,
      }))
    } catch (error) {
      const latencyMs = Date.now() - startTime
      
      // Track failed search
      await this.trackUsage({
        projectId: errorEvent.projectId,
        operation: 'embed',
        promptTokens: Math.ceil(query.length / 4),
        completionTokens: 0,
        latencyMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        feature: 'similar_errors'
      })
      
      logger.error({ err: error }, 'Failed to find similar errors')
      return []
    }
  }

  /**
   * Generate a suggested fix for an error using RAG context
   */
  async generateSuggestedFix(errorEvent: ErrorEvent): Promise<string | null> {
    await this.initialize()

    if (!this.aiService) {
      return null
    }

    const prompt = `
Based on this error, provide a specific fix:

Error Type: ${errorEvent.type}
Error Message: ${errorEvent.message}
Platform: ${errorEvent.platform}
Environment: ${errorEvent.environment}

Provide a concise, actionable fix that a developer can implement.
`
    const startTime = Date.now()

    try {
      // Generate fingerprint for caching
      const fingerprintHash = this.generateErrorFingerprint(errorEvent)
      
      // Check cache first
      const cached = await this.aiCacheService.getCachedAnalysis({
        fingerprintHash,
        analysisType: 'suggested_fix',
        projectId: errorEvent.projectId,
        respectPrivacy: true
      })

      if (cached) {
        logger.info({ 
          errorId: errorEvent.id, 
          cacheHit: true 
        }, 'Suggested fix served from cache')
        
        return cached.analysisResult
      }

      // Not in cache, generate new fix
      const response = await this.aiService.generateWithContext(prompt, {
        namespace: 'errors',
        filters: {
          projectId: errorEvent.projectId,
          errorType: errorEvent.type,
        },
      })
      
      const latencyMs = Date.now() - startTime
      const promptTokens = Math.ceil(prompt.length / 4)
      const completionTokens = Math.ceil(response.length / 4)
      
      // Cache the response
      await this.aiCacheService.cacheAnalysis(
        fingerprintHash,
        'suggested_fix',
        response,
        {
          provider: this.config?.provider || 'unknown',
          model: this.config?.defaultModel || 'unknown',
          prompt,
          projectId: errorEvent.projectId,
          errorPatterns: [errorEvent.type],
          promptTokens,
          completionTokens
        }
      )
      
      // Track AI usage
      await this.trackUsage({
        projectId: errorEvent.projectId,
        operation: 'generate',
        promptTokens,
        completionTokens,
        latencyMs,
        success: true,
        feature: 'suggested_fix'
      })

      return response
    } catch (error) {
      const latencyMs = Date.now() - startTime
      
      // Track failed generation
      await this.trackUsage({
        projectId: errorEvent.projectId,
        operation: 'generate',
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: 0,
        latencyMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        feature: 'suggested_fix'
      })
      
      logger.error({ err: error }, 'Failed to generate suggested fix')
      return null
    }
  }

  /**
   * Track AI usage in the main app
   */
  private async trackUsage(data: {
    projectId: string
    operation: 'generate' | 'embed' | 'extract' | 'stream'
    promptTokens: number
    completionTokens: number
    latencyMs: number
    success: boolean
    errorMessage?: string
    feature: string
    metadata?: Record<string, any>
  }): Promise<void> {
    try {
      const config = aiConfig as AIServiceConfig
      
      // Get project to find company ID
      const project = await Project.find(data.projectId)
      
      if (!project) {
        logger.warn('Project not found for AI usage tracking')
        return
      }

      // Skip tracking if project has no organization ID (e.g., in tests)
      if (!project.organizationId) {
        logger.debug('Skipping AI usage tracking - no organization ID')
        return
      }

      // Send usage data to main app
      await mainAppService.request('/ai-usage/record', 'POST', {
        companyId: project.organizationId,
        projectId: data.projectId,
        appName: 'monitoring',
        provider: config.provider,
        model: config.defaultModel || 'unknown',
        operation: data.operation,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        latencyMs: data.latencyMs,
        success: data.success,
        errorMessage: data.errorMessage,
        feature: data.feature,
        metadata: {
          projectName: project.name,
          ...(data.metadata || {})
        }
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to track AI usage')
    }
  }

  /**
   * Generate fingerprint hash for an error (similar to error grouping)
   */
  private generateErrorFingerprint(errorEvent: ErrorEvent): string {
    // Use the same logic as error grouping
    const parts = [
      errorEvent.type,
      this.normalizeErrorMessage(errorEvent.message),
      errorEvent.platform
    ]
    
    return crypto
      .createHash('sha256')
      .update(parts.join('::'))
      .digest('hex')
  }

  /**
   * Normalize error message for fingerprinting
   */
  private normalizeErrorMessage(message: string): string {
    return message
      // Replace numbers with N
      .replace(/\d+/g, 'N')
      // Replace UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')
      // Replace hex values
      .replace(/0x[0-9a-f]+/gi, '0xHEX')
      // Replace quoted strings
      .replace(/["'][^"']+["']/g, '"..."')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }
}