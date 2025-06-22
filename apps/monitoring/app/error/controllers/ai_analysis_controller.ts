import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import AIAnalysisService from '#services/ai/ai_service'
import { ClickHouseService } from '#error/services/clickhouse_service'
import ErrorGroup from '#error/models/error_group'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class AIAnalysisController {
  constructor(
    private aiAnalysisService: AIAnalysisService,
    private clickHouseService: ClickHouseService
  ) {}

  /**
   * Analyze a specific error event
   */
  public async analyzeError({ params, response }: HttpContext) {
    const { projectId, errorId } = params

    try {
      // Fetch the error event
      const event = await this.clickHouseService.getErrorEventById(errorId)
      
      if (!event || event.projectId !== projectId) {
        return response.notFound({ error: 'Error event not found' })
      }

      // Analyze the error
      const analysis = await this.aiAnalysisService.analyzeError(event)
      
      if (!analysis) {
        return response.serviceUnavailable({ error: 'AI service not available' })
      }

      return response.json({
        success: true,
        analysis
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to analyze error')
      return response.internalServerError({ error: 'Failed to analyze error' })
    }
  }

  /**
   * Find similar errors
   */
  public async findSimilar({ params, response }: HttpContext) {
    const { projectId, errorId } = params

    try {
      // Fetch the error event
      const event = await this.clickHouseService.getErrorEventById(errorId)
      
      if (!event || event.projectId !== projectId) {
        return response.notFound({ error: 'Error event not found' })
      }

      // Find similar errors
      const similarErrors = await this.aiAnalysisService.findSimilarErrors(event)

      return response.json({
        success: true,
        similarErrors
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to find similar errors')
      return response.internalServerError({ error: 'Failed to find similar errors' })
    }
  }

  /**
   * Generate suggested fix for an error
   */
  public async suggestFix({ params, response }: HttpContext) {
    const { projectId, errorId } = params

    try {
      // Fetch the error event
      const event = await this.clickHouseService.getErrorEventById(errorId)
      
      if (!event || event.projectId !== projectId) {
        return response.notFound({ error: 'Error event not found' })
      }

      // Generate suggested fix
      const suggestedFix = await this.aiAnalysisService.generateSuggestedFix(event)
      
      if (!suggestedFix) {
        return response.serviceUnavailable({ error: 'Could not generate fix suggestion' })
      }

      return response.json({
        success: true,
        suggestedFix: {
          description: suggestedFix,
          confidence: 0.85  // Default confidence for AI suggestions
        }
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate fix suggestion')
      return response.internalServerError({ error: 'Failed to generate fix suggestion' })
    }
  }

  /**
   * Get AI analysis for an error group
   */
  public async getGroupAnalysis({ params, request, response }: HttpContext) {
    const { projectId, groupId } = params
    const forceRefresh = request.input('refresh', false)

    try {
      const group = await ErrorGroup.query()
        .where('id', groupId)
        .where('project_id', projectId)
        .first()

      if (!group) {
        return response.notFound({ error: 'Error group not found' })
      }

      // Check if we need to refresh the analysis
      const shouldRefresh = forceRefresh || 
        !group.aiSummary || 
        !group.metadata?.lastAnalysisDate ||
        (Date.now() - new Date(group.metadata.lastAnalysisDate).getTime() > 7 * 24 * 60 * 60 * 1000) // 7 days old

      if (shouldRefresh) {
        // Get sample errors from this group
        const sampleErrors = await this.clickHouseService.queryErrorEvents({
          projectId,
          limit: 5,
          offset: 0
        })

        const groupErrors = sampleErrors.filter(e => e.group_id === groupId)
        
        if (groupErrors.length > 0) {
          // Analyze the first error as a representative
          const analysis = await this.aiAnalysisService.analyzeError(groupErrors[0])
          
          if (analysis) {
            // Update the group with new analysis
            group.aiSummary = analysis.summary
            group.metadata = {
              ...group.metadata,
              aiAnalysis: analysis,
              lastAnalysisDate: new Date().toISOString()
            }
            await group.save()
          }
        }
      }

      // Get additional insights
      const stats = await this.clickHouseService.getGroupStatistics(groupId)
      const recentTrend = await this.clickHouseService.getRecentGroupStats(groupId, 60) // Last hour

      return response.json({
        success: true,
        aiSummary: group.aiSummary,
        aiAnalysis: group.metadata?.aiAnalysis || null,
        lastAnalysisDate: group.metadata?.lastAnalysisDate || null,
        statistics: {
          totalEvents: stats.count,
          uniqueUsers: stats.uniqueUsers,
          last24h: stats.last24h,
          last7d: stats.last7d,
          last30d: stats.last30d,
          recentTrend: {
            current: recentTrend.current,
            previous: recentTrend.previous,
            changePercent: recentTrend.previous > 0 
              ? ((recentTrend.current - recentTrend.previous) / recentTrend.previous * 100).toFixed(2)
              : 0
          }
        }
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to get group analysis')
      return response.internalServerError({ error: 'Failed to get group analysis' })
    }
  }

  /**
   * Get AI analysis for multiple error groups (batch endpoint)
   */
  public async getGroupsAnalysis({ params, request, response }: HttpContext) {
    const { projectId } = params
    const groupIds = request.input('groupIds', [])
    const includeStats = request.input('includeStats', false)

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return response.badRequest({ error: 'groupIds array is required' })
    }

    if (groupIds.length > 20) {
      return response.badRequest({ error: 'Maximum 20 groups can be analyzed at once' })
    }

    try {
      const groups = await ErrorGroup.query()
        .whereIn('id', groupIds)
        .where('project_id', projectId)

      const results = await Promise.all(
        groups.map(async (group) => {
          const result: any = {
            groupId: group.id,
            title: group.title,
            aiSummary: group.aiSummary,
            aiAnalysis: group.metadata?.aiAnalysis || null,
            lastAnalysisDate: group.metadata?.lastAnalysisDate || null
          }

          if (includeStats) {
            const stats = await this.clickHouseService.getGroupStatistics(group.id)
            result.statistics = {
              totalEvents: stats.count,
              uniqueUsers: stats.uniqueUsers,
              last24h: stats.last24h,
              last7d: stats.last7d,
              last30d: stats.last30d
            }
          }

          return result
        })
      )

      // Identify groups that need analysis
      const groupsNeedingAnalysis = results.filter(r => !r.aiSummary).map(r => r.groupId)

      return response.json({
        success: true,
        groups: results,
        groupsNeedingAnalysis,
        totalGroups: results.length
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to get groups analysis')
      return response.internalServerError({ error: 'Failed to get groups analysis' })
    }
  }

  /**
   * Generate AI trend analysis for a project
   */
  public async getProjectTrends({ params, request, response }: HttpContext) {
    const { projectId } = params
    const period = request.input('period', '7d') // 1d, 7d, 30d

    try {
      // Get error trends from ClickHouse
      const periodMap = {
        '1d': 'hour',
        '7d': 'day',
        '30d': 'week'
      }

      const trends = await this.clickHouseService.getErrorEventCounts(projectId, periodMap[period as keyof typeof periodMap] || 'day')
      
      // Get top error types
      const topErrors = await this.clickHouseService.getTopErrorTypes(projectId, 10)

      // Generate AI insights about the trends
      const trendAnalysis = await this.aiAnalysisService.analyzeTrends({
        projectId,
        trends,
        topErrors,
        period
      })

      return response.json({
        success: true,
        period,
        trends,
        topErrors,
        aiAnalysis: trendAnalysis,
        generatedAt: new Date().toISOString()
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to get project trends')
      return response.internalServerError({ error: 'Failed to get project trends' })
    }
  }
}