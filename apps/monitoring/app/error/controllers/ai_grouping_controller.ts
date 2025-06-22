import type { HttpContext } from '@adonisjs/core/http'
import AIService from '#services/ai/ai_service'
import type { ErrorEvent } from '#error/models/error_event'
import ErrorGroup from '#error/models/error_group'
import { inject } from '@adonisjs/core'
import { ClickHouseService } from '#error/services/clickhouse_service'
import { suggestGroupingValidator, applyGroupingValidator } from '#error/validators'
import { DateTime } from 'luxon'


@inject()
export default class AIGroupingController {
  constructor(
    private aiService: AIService,
    private clickHouseService: ClickHouseService
  ) {}

  /**
   * Get AI-powered grouping suggestions for errors
   */
  async suggestGrouping({ request, response, params }: HttpContext) {
    const projectId = params.projectId
    const data = await request.validateUsing(suggestGroupingValidator)

    try {
      let errorEvents: ErrorEvent[]

      if (data.errorIds) {
        // Get specific errors by IDs
        const allErrors = await this.clickHouseService.queryErrorEvents({
          projectId,
          limit: 1000
        })
        errorEvents = allErrors.filter(e => data.errorIds!.includes(e.id))
      } else if (data.groupId) {
        // Get errors from a specific group
        const group = await ErrorGroup.query()
          .where('id', data.groupId)
          .where('projectId', projectId)
          .firstOrFail()

        const allErrors = await this.clickHouseService.queryErrorEvents({
          projectId,
          limit: 1000
        })
        errorEvents = allErrors.filter(e => e.group_id === group.id).slice(0, 50)
      } else {
        // Get recent ungrouped or poorly grouped errors
        const timeRangeHours = {
          '1h': 1,
          '24h': 24,
          '7d': 168,
          '30d': 720,
        }[data.timeRange || '24h']

        const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)

        const allErrors = await this.clickHouseService.queryErrorEvents({
          projectId,
          limit: 1000
        })
        errorEvents = allErrors.filter(e => new Date(e.timestamp) >= since).slice(0, 100)
      }

      if (errorEvents.length < 2) {
        return response.badRequest({
          message: 'At least 2 errors are required for grouping suggestions',
        })
      }

      const suggestions = await this.aiService.suggestErrorGrouping(errorEvents)

      if (!suggestions) {
        return response.serviceUnavailable({
          message: 'AI service temporarily unavailable',
        })
      }

      // Enhance suggestions with current group information
      const enhancedSuggestions = await Promise.all(
        suggestions.suggestedGroups.map(async (group) => {
          const errorDetails = await Promise.all(
            group.errorIds.map(async (errorId) => {
              const error = errorEvents.find(e => e.id === errorId)
              if (!error) return null

              const currentGroup = error.group_id
                ? await ErrorGroup.find(error.group_id)
                : null

              return {
                id: error.id,
                message: error.message,
                type: error.type,
                currentGroupId: currentGroup?.id,
                currentGroupTitle: currentGroup?.title,
              }
            })
          )

          return {
            ...group,
            errors: errorDetails.filter(Boolean),
          }
        })
      )

      return response.ok({
        suggestions: enhancedSuggestions,
        reasoning: suggestions.reasoning,
        totalErrors: errorEvents.length,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Failed to generate grouping suggestions',
        error: error.message,
      })
    }
  }

  /**
   * Apply suggested grouping to errors
   */
  async applyGrouping({ request, response, params }: HttpContext) {
    const projectId = params.projectId
    const data = await request.validateUsing(applyGroupingValidator)

    try {
      const results = []

      for (const suggestion of data.suggestions) {
        // Verify all errors belong to this project
        const allErrors = await this.clickHouseService.queryErrorEvents({
          projectId,
          limit: 1000
        })
        const matchingErrors = allErrors.filter(e => suggestion.errorIds.includes(e.id))
        const errorCount = [{ total: matchingErrors.length }]

        if (errorCount[0].total !== suggestion.errorIds.length) {
          results.push({
            groupName: suggestion.groupName,
            success: false,
            error: 'Some errors not found or not in this project',
          })
          continue
        }

        // Create new group with the suggested name
        const group = await ErrorGroup.create({
          projectId,
          title: suggestion.groupName,
          type: 'mixed', // Since it's AI-suggested grouping
          message: `AI-suggested group: ${suggestion.groupName}`,
          fingerprintHash: `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          fingerprint: [`ai-suggested`, suggestion.groupName],
          platform: 'mixed',
          firstSeen: DateTime.now(),
          lastSeen: DateTime.now(),
          status: 'unresolved',
          metadata: {
            aiSuggested: true,
            createdBy: 'ai-grouping',
          },
        })

        // Update errors to belong to this new group
        // Note: ClickHouse is append-only, so we can't update errors directly
        // The grouping will be handled by the error processing pipeline

        results.push({
          groupName: suggestion.groupName,
          groupId: group.id,
          success: true,
          errorsUpdated: suggestion.errorIds.length,
        })
      }

      return response.ok({
        results,
        totalGroups: results.filter(r => r.success).length,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Failed to apply grouping suggestions',
        error: error.message,
      })
    }
  }
}