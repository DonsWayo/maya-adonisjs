import { randomUUID } from 'node:crypto'
import { ErrorEvent } from '#error/models/error_event'
import { ClickHouseService } from '#error/services/clickhouse_service'
import ProcessEvent from '#jobs/process_event'
import logger from '@adonisjs/core/services/logger'

export default class ErrorEventService {
  /**
   * Store an error event from API payload
   */
  public static async storeFromPayload(
    projectId: string,
    payload: any
  ): Promise<{ id: string }> {
    // Generate an event ID if not provided
    const eventId = payload.event_id || randomUUID().replace(/-/g, '')

    // Get default values for required fields
    const eventType = payload.exception?.values?.[0]?.type || 'Error'
    const eventMessage =
      payload.message || payload.exception?.values?.[0]?.value || 'Unknown error'

    // Create the error event object
    const errorEvent: ErrorEvent = {
      id: eventId,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      received_at: new Date(),
      projectId,
      level: payload.level || 'error',
      message: eventMessage,
      type: eventType,
      handled: 0, // Default to unhandled
      severity: payload.level || 'error',
      platform: payload.platform,
      platform_version: null,
      sdk: JSON.stringify(payload.sdk || { name: 'unknown', version: '0.0.0' }),
      sdk_version: payload.sdk
        ? typeof payload.sdk.version === 'string'
          ? payload.sdk.version
          : null
        : null,
      release: payload.release || null,
      environment: payload.environment || 'production',
      serverName: payload.server_name || null,
      runtime: null,
      runtime_version: null,
      transaction: payload.transaction || null,
      transaction_duration: null,
      url:
        payload.request && typeof payload.request === 'object'
          ? (payload.request as any).url || null
          : null,
      method:
        payload.request && typeof payload.request === 'object'
          ? (payload.request as any).method || null
          : null,
      status_code:
        payload.request && typeof payload.request === 'object'
          ? Number((payload.request as any).status_code) || null
          : null,

      // Anonymous user context
      user_hash:
        payload.user && typeof payload.user === 'object' && (payload.user as any).id
          ? String((payload.user as any).id).substring(0, 8)
          : null,
      session_id:
        payload.contexts &&
        typeof payload.contexts === 'object' &&
        (payload.contexts as any).session &&
        typeof (payload.contexts as any).session === 'object'
          ? (payload.contexts as any).session.id || null
          : null,
      client_info:
        payload.contexts && typeof payload.contexts === 'object'
          ? JSON.stringify((payload.contexts as any).client) || null
          : null,

      // Error details
      exception: payload.exception ? JSON.stringify(payload.exception) : null,
      exception_type: payload.exception?.values?.[0]?.type || null,
      exception_value: payload.exception?.values?.[0]?.value || null,
      exception_module: payload.exception?.values?.[0]?.module || null,
      stack_trace: payload.exception?.values?.[0]?.stacktrace
        ? JSON.stringify(payload.exception.values[0].stacktrace)
        : null,
      frames_count:
        payload.exception?.values?.[0]?.stacktrace &&
        typeof payload.exception.values[0].stacktrace === 'object' &&
        Array.isArray((payload.exception.values[0].stacktrace as any).frames)
          ? (payload.exception.values[0].stacktrace as any).frames.length
          : null,

      // Additional context
      request: payload.request ? JSON.stringify(payload.request) : null,
      tags: payload.tags ? JSON.stringify(payload.tags) : null,
      extra: payload.extra ? JSON.stringify(payload.extra) : null,
      breadcrumbs: payload.breadcrumbs ? JSON.stringify(payload.breadcrumbs) : null,
      contexts: payload.contexts ? JSON.stringify(payload.contexts) : null,
      fingerprint: payload.fingerprint || [eventType, eventMessage],

      // Performance metrics
      memory_usage: null,
      cpu_usage: null,
      duration: null,

      // Metadata
      first_seen: new Date(),
      group_id: null,
      is_sample: 0,
      sample_rate: 1,
      has_been_processed: 0,
    }

    // Save to ClickHouse first (synchronously)
    await ClickHouseService.storeErrorEvent(errorEvent)

    // Enqueue async processing job
    await ProcessEvent.dispatch({
      eventId: errorEvent.id,
      projectId: errorEvent.projectId,
    })

    return { id: errorEvent.id }
  }

  /**
   * Store an error event directly (for seeding)
   */
  public static async storeDirectly(errorEvent: ErrorEvent): Promise<void> {
    // Save to ClickHouse
    await ClickHouseService.storeErrorEvent(errorEvent)

    // Enqueue async processing job
    try {
      await ProcessEvent.dispatch({
        eventId: errorEvent.id,
        projectId: errorEvent.projectId,
      })
      logger.debug(`Job dispatched for event ${errorEvent.id}`)
    } catch (error) {
      logger.error(`Failed to dispatch job for event ${errorEvent.id}:`, error)
    }
  }
}