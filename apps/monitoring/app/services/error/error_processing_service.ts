import { inject } from '@adonisjs/core'
import { ClickHouseService } from '#error/services/clickhouse_service'
import ErrorGroup from '#error/models/error_group'
import db from '@adonisjs/lucid/services/db'
import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import AIAnalysisService from '#services/ai/ai_service'

@inject()
export default class ErrorProcessingService {
  constructor(
    private clickHouseService: ClickHouseService,
    private aiAnalysisService: AIAnalysisService
  ) {}
  /**
   * Process an error event by fetching it from ClickHouse and creating/updating error groups
   */
  async processEvent(eventId: string, projectId: string): Promise<void> {
    logger.info(`Starting to process event ${eventId} for project ${projectId}`)

    try {
      // 1. Fetch the raw event from ClickHouse
      logger.debug(`Fetching event ${eventId} from ClickHouse...`)
      const event = await this.clickHouseService.getErrorEventById(eventId)

      if (!event) {
        logger.error(`Event ${eventId} not found in ClickHouse`)
        throw new Error(`Event ${eventId} not found`)
      }
      logger.debug('Event fetched successfully', {
        id: event.id,
        type: event.type,
        message: event.message?.substring(0, 50),
        fingerprint: event.fingerprint
      })

      // 2. Calculate the fingerprint hash for grouping
      const fingerprintHash = this.calculateFingerprintHash(event.fingerprint)
      logger.debug(`Calculated fingerprint hash: ${fingerprintHash}`)

      // 3. Find or create error group
      logger.debug(`Finding or creating error group...`)
      const group = await this.findOrCreateErrorGroup({
        projectId,
        fingerprintHash,
        event,
      })
      logger.info(`Error group ${group.id} - ${group.title} (${group.eventCount || 0} events)`)

      // 4. Update the event with the group ID
      logger.debug(`Updating event ${eventId} with group ID ${group.id}...`)
      await this.clickHouseService.updateEventGroupId(eventId, group.id)

      // 5. Update group statistics
      logger.debug(`Updating group statistics...`)
      await this.updateGroupStatistics(group.id)

      // 6. Check if we should trigger AI analysis (moved before indexing)
      if (this.shouldTriggerAIAnalysis(group)) {
        logger.info(`Triggering AI analysis for group ${group.id}`)
        const analysis = await this.aiAnalysisService.analyzeError(event)
        
        if (analysis) {
          // Store AI analysis in the error group
          await this.updateGroupWithAIAnalysis(group.id, analysis)
        }
      }

      // 7. Index error for RAG only if it's a new error group or significant change
      if (group.eventCount === 1 || group.eventCount % 100 === 0) {
        await this.aiAnalysisService.indexError(event)
      }

      // 8. Check alert conditions
      await this.checkAlertConditions(group, event)

      // Mark event as processed
      logger.debug(`Marking event ${eventId} as processed...`)
      await this.clickHouseService.markEventAsProcessed(eventId)
      
      logger.info(`Successfully processed event ${eventId}`)
    } catch (error) {
      logger.error(`Error processing event ${eventId}:`, error)
      throw error
    }
  }

  /**
   * Calculate a deterministic hash from a fingerprint array
   */
  calculateFingerprintHash(fingerprint: string[]): string {
    const fingerprintString = fingerprint.join('::')
    return crypto.createHash('sha256').update(fingerprintString).digest('hex')
  }

  /**
   * Find or create an error group based on fingerprint
   */
  async findOrCreateErrorGroup(params: {
    projectId: string
    fingerprintHash: string
    event: any
  }): Promise<ErrorGroup> {
    const { projectId, fingerprintHash, event } = params

    // Use a transaction to handle concurrent requests
    return await db.transaction(async (trx) => {
      // Try to find existing group with lock
      logger.debug(`Looking for existing group with hash ${fingerprintHash}...`)
      let group = await ErrorGroup.query({ client: trx })
        .where('project_id', projectId)
        .where('fingerprint_hash', fingerprintHash)
        .forUpdate() // Lock the row to prevent concurrent updates
        .first()

      if (!group) {
        logger.debug(`No existing group found, creating new one...`)
        try {
          // Create new group
          group = await ErrorGroup.create({
            projectId,
            fingerprintHash,
            fingerprint: event.fingerprint,
            title: this.generateGroupTitle(event),
            type: event.exception_type || event.type,
            message: event.exception_value || event.message,
            platform: event.platform,
            firstSeen: DateTime.fromJSDate(new Date(event.timestamp)),
            lastSeen: DateTime.fromJSDate(new Date(event.timestamp)),
            status: 'unresolved',
            metadata: {
              level: event.level,
              environment: event.environment,
              release: event.release,
            },
          }, { client: trx })
        } catch (error) {
          // Handle unique constraint violation (race condition)
          if (error.code === '23505' || error.constraint === 'error_groups_project_id_fingerprint_hash_unique') {
            logger.debug('Unique constraint violation, fetching existing group...')
            // Another process created the group, fetch it
            group = await ErrorGroup.query({ client: trx })
              .where('project_id', projectId)
              .where('fingerprint_hash', fingerprintHash)
              .firstOrFail()
          } else {
            throw error
          }
        }
      } else {
        logger.debug(`Found existing group ${group.id}, updating last seen...`)
        // Update last seen
        group.lastSeen = DateTime.fromJSDate(new Date(event.timestamp))
        await group.save()
      }

      return group
    })
  }

  /**
   * Generate a readable title for an error group
   */
  generateGroupTitle(event: any): string {
    if (event.exception_type && event.exception_value) {
      return `${event.exception_type}: ${event.exception_value.substring(0, 100)}`
    }

    return event.message.substring(0, 100)
  }

  /**
   * Update event count and other statistics for a group
   */
  async updateGroupStatistics(groupId: string): Promise<void> {
    const stats = await this.clickHouseService.getGroupStatistics(groupId)

    await ErrorGroup.query()
      .where('id', groupId)
      .update({
        eventCount: stats.count,
        userCount: stats.uniqueUsers,
        metadata: db.raw(
          `
          jsonb_set(
            metadata,
            '{stats}',
            ?::jsonb
          )
        `,
          [
            JSON.stringify({
              last24h: stats.last24h,
              last7d: stats.last7d,
              last30d: stats.last30d,
            }),
          ]
        ),
      })
  }

  /**
   * Determine if AI analysis should be triggered for a group
   */
  shouldTriggerAIAnalysis(group: ErrorGroup): boolean {
    // Trigger AI analysis for new groups
    if (!group.aiSummary) return true

    // Re-analyze if event count has doubled since last analysis
    const lastAnalysisCount = group.metadata?.lastAnalysisCount || 0
    if (group.eventCount > lastAnalysisCount * 2) return true

    // Re-analyze weekly
    const lastAnalysis = group.metadata?.lastAnalysisDate
    if (lastAnalysis) {
      const daysSinceAnalysis =
        (Date.now() - new Date(lastAnalysis).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceAnalysis > 7) return true
    }

    return false
  }

  /**
   * Update error group with AI analysis results
   */
  async updateGroupWithAIAnalysis(groupId: string, analysis: any): Promise<void> {
    await ErrorGroup.query()
      .where('id', groupId)
      .update({
        aiSummary: analysis.summary,
        metadata: db.raw(
          `
          jsonb_set(
            jsonb_set(
              jsonb_set(
                metadata,
                '{aiAnalysis}',
                ?::jsonb
              ),
              '{lastAnalysisDate}',
              to_jsonb(CURRENT_TIMESTAMP)
            ),
            '{lastAnalysisCount}',
            to_jsonb(event_count)
          )
        `,
          [
            JSON.stringify({
              severity: analysis.severity,
              category: analysis.category,
              possibleCauses: analysis.possibleCauses,
              suggestedFixes: analysis.suggestedFixes,
              relatedErrors: analysis.relatedErrors,
              timestamp: new Date().toISOString(),
            }),
          ]
        ),
      })
  }

  /**
   * Check various alert conditions for an error group
   */
  async checkAlertConditions(group: ErrorGroup, event: any): Promise<void> {
    // 1. New error group
    if (group.eventCount === 1) {
      // TODO: Dispatch alert job when implemented
      // await queue.dispatch('send-alert', {
      //   type: 'new_error',
      //   groupId: group.id,
      //   projectId: group.projectId
      // })
    }

    // 2. Error spike (10x increase in last hour)
    const recentStats = await this.clickHouseService.getRecentGroupStats(group.id, 60)
    if (recentStats.current > recentStats.previous * 10) {
      // TODO: Dispatch alert job when implemented
      // await queue.dispatch('send-alert', {
      //   type: 'error_spike',
      //   groupId: group.id,
      //   projectId: group.projectId,
      //   spikeMultiplier: recentStats.current / recentStats.previous
      // })
    }

    // 3. High severity errors
    if (event.level === 'fatal' || event.level === 'error') {
      if (group.eventCount % 100 === 0) {
        // Every 100 errors
        // TODO: Dispatch alert job when implemented
        // await queue.dispatch('send-alert', {
        //   type: 'high_error_count',
        //   groupId: group.id,
        //   projectId: group.projectId,
        //   count: group.eventCount
        // })
      }
    }
  }
}