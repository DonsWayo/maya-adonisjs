import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import AICacheService from '#services/ai/ai_cache_service'
import Project from '#error/models/project'

@inject()
export default class AICacheController {
  constructor(private aiCacheService: AICacheService) {}

  /**
   * Get AI cache statistics
   */
  async stats({ request, response }: HttpContext) {
    const { startDate, endDate } = request.qs()
    
    const start = startDate ? DateTime.fromISO(startDate) : DateTime.now().minus({ days: 30 })
    const end = endDate ? DateTime.fromISO(endDate) : DateTime.now()
    
    const stats = await this.aiCacheService.getCacheStats(
      start.toJSDate(),
      end.toJSDate()
    )
    
    return response.json({
      ...stats,
      period: {
        startDate: start.toISO(),
        endDate: end.toISO()
      },
      savings: {
        estimatedCostSavedDollars: (stats.totalCostSavedCents / 100).toFixed(2),
        apiCallsSaved: stats.totalCacheHits
      }
    })
  }

  /**
   * Get cached analysis for a specific error
   */
  async getCached({ params, response }: HttpContext) {
    const project = await Project.findOrFail(params.projectId)
    
    // Validate analysis type
    const validTypes = ['error_analysis', 'suggested_fix', 'similar_errors']
    if (!validTypes.includes(params.analysisType)) {
      return response.unprocessableEntity({
        messages: [{
          field: 'analysisType',
          rule: 'enum',
          message: `analysisType must be one of: ${validTypes.join(', ')}`
        }]
      })
    }
    
    const cached = await this.aiCacheService.getCachedAnalysis({
      fingerprintHash: params.fingerprintHash,
      analysisType: params.analysisType as any,
      projectId: project.id,
      respectPrivacy: true
    })
    
    if (!cached) {
      return response.notFound({ error: 'No cached analysis found' })
    }
    
    return response.json({
      cached,
      analysis: JSON.parse(cached.analysisResult)
    })
  }

  /**
   * Submit feedback for a cached analysis
   */
  async submitFeedback({ request, params, response }: HttpContext) {
    const { score } = request.body()
    
    // Validate analysis type
    const validTypes = ['error_analysis', 'suggested_fix', 'similar_errors']
    if (!validTypes.includes(params.analysisType)) {
      return response.unprocessableEntity({
        messages: [{
          field: 'analysisType',
          rule: 'enum',
          message: `analysisType must be one of: ${validTypes.join(', ')}`
        }]
      })
    }
    
    if (!score) {
      return response.unprocessableEntity({
        messages: [{
          field: 'score',
          rule: 'required',
          message: 'Score is required'
        }]
      })
    }
    
    if (score < 1) {
      return response.unprocessableEntity({
        messages: [{
          field: 'score',
          rule: 'min',
          message: 'Score must be at least 1'
        }]
      })
    }
    
    if (score > 5) {
      return response.unprocessableEntity({
        messages: [{
          field: 'score',
          rule: 'max',
          message: 'Score must be at most 5'
        }]
      })
    }
    
    await this.aiCacheService.submitFeedback(
      params.fingerprintHash,
      params.analysisType,
      score
    )
    
    return response.json({ success: true })
  }
}