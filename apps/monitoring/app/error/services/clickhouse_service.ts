import clickhouse from 'adonis-clickhouse/services/main'
import { ErrorEvent } from '../models/error_event.js'

/**
 * Interface for query parameters
 */
interface QueryParams {
  projectId?: string
  startDate?: string
  endDate?: string
  level?: string
  environment?: string
  search?: string
  limit?: number
  offset?: number
}

export class ClickHouseService {
  /**
   * Store an error event in ClickHouse
   */
  public static async storeErrorEvent(errorEvent: ErrorEvent): Promise<void> {
    try {
      // Convert camelCase to snake_case and handle Date objects for ClickHouse
      // ClickHouse DateTime format: YYYY-MM-DD HH:MM:SS
      const formatDateTime = (date: Date): string => {
        return date.toISOString().substring(0, 19).replace('T', ' ')
      }

      const eventData = {
        id: errorEvent.id,
        timestamp: formatDateTime(errorEvent.timestamp),
        received_at: formatDateTime(errorEvent.received_at || new Date()),
        project_id: errorEvent.projectId,
        level: errorEvent.level,
        message: errorEvent.message,
        type: errorEvent.type,
        handled: errorEvent.handled,
        severity: errorEvent.severity,
        platform: errorEvent.platform,
        platform_version: errorEvent.platform_version,
        sdk: errorEvent.sdk,
        sdk_version: errorEvent.sdk_version,
        release: errorEvent.release,
        environment: errorEvent.environment,
        server_name: errorEvent.serverName,
        runtime: errorEvent.runtime,
        runtime_version: errorEvent.runtime_version,
        transaction: errorEvent.transaction,
        transaction_duration: errorEvent.transaction_duration,
        url: errorEvent.url,
        method: errorEvent.method,
        status_code: errorEvent.status_code,
        user_hash: errorEvent.user_hash,
        session_id: errorEvent.session_id,
        client_info: errorEvent.client_info,
        exception: errorEvent.exception,
        exception_type: errorEvent.exception_type,
        exception_value: errorEvent.exception_value,
        exception_module: errorEvent.exception_module,
        stack_trace: errorEvent.stack_trace,
        frames_count: errorEvent.frames_count,
        request: errorEvent.request,
        tags: errorEvent.tags,
        extra: errorEvent.extra,
        breadcrumbs: errorEvent.breadcrumbs,
        contexts: errorEvent.contexts,
        fingerprint: errorEvent.fingerprint,
        memory_usage: errorEvent.memory_usage,
        cpu_usage: errorEvent.cpu_usage,
        duration: errorEvent.duration,
        first_seen: formatDateTime(errorEvent.first_seen || new Date()),
        group_id: errorEvent.group_id,
        is_sample: errorEvent.is_sample,
        sample_rate: errorEvent.sample_rate,
        has_been_processed: errorEvent.has_been_processed,
      }

      // Insert the error event into ClickHouse - values must be an array
      await clickhouse.insert({
        table: 'error_events',
        values: [eventData],
        format: 'JSONEachRow',
      })
    } catch (error) {
      console.error('Failed to store error event in ClickHouse:', error)
      throw error
    }
  }

  /**
   * Query error events with filtering
   */
  public static async queryErrorEvents(params: QueryParams): Promise<ErrorEvent[]> {
    const {
      projectId,
      startDate,
      endDate,
      level,
      environment,
      search,
      limit = 100,
      offset = 0,
    } = params

    let conditions: string[] = []
    const queryParams: Record<string, any> = {}

    // Apply filters
    if (projectId) {
      conditions.push('project_id = {project_id:String}')
      queryParams.project_id = projectId
    }

    if (startDate) {
      conditions.push('timestamp >= {start_date:DateTime}')
      queryParams.start_date = new Date(startDate).toISOString()
    }

    if (endDate) {
      conditions.push('timestamp <= {end_date:DateTime}')
      queryParams.end_date = new Date(endDate).toISOString()
    }

    if (level) {
      conditions.push('level = {level:String}')
      queryParams.level = level
    }

    if (environment) {
      conditions.push('environment = {environment:String}')
      queryParams.environment = environment
    }

    if (search) {
      // Search in message and type
      conditions.push(
        '(message ILIKE {search_pattern:String} OR type ILIKE {search_pattern:String})'
      )
      queryParams.search_pattern = `%${search}%`
    }

    // Build the WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Build the query
    const query = `
      SELECT *
      FROM error_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt32}
    `

    queryParams.limit = limit
    queryParams.offset = offset

    // Execute the query
    const result = await clickhouse.query({
      query,
      query_params: queryParams,
      format: 'JSONEachRow',
    })

    // Get the JSON result
    const jsonResult = await result.json()

    // Map the results to ErrorEvent objects
    return Array.isArray(jsonResult)
      ? jsonResult.map((row: any) => {
          // Convert string dates back to Date objects
          const event: ErrorEvent = {
            ...row,
            timestamp: new Date(row.timestamp),
            received_at: row.received_at ? new Date(row.received_at) : undefined,
            first_seen: row.first_seen ? new Date(row.first_seen) : undefined,
            // Parse JSON fields
            tags: row.tags ? JSON.parse(row.tags) : null,
            extra: row.extra ? JSON.parse(row.extra) : null,
            request: row.request ? JSON.parse(row.request) : null,
            exception: row.exception ? JSON.parse(row.exception) : null,
            breadcrumbs: row.breadcrumbs ? JSON.parse(row.breadcrumbs) : null,
            contexts: row.contexts ? JSON.parse(row.contexts) : null,
            // Ensure fingerprint is an array
            fingerprint: Array.isArray(row.fingerprint) ? row.fingerprint : [row.fingerprint],
          }
          return event
        })
      : []
  }

  /**
   * Get a specific error event by ID
   */
  public static async getErrorEventById(id: string): Promise<ErrorEvent | null> {
    const query = `
      SELECT *
      FROM error_events
      WHERE id = {id:String}
      LIMIT 1
    `

    const result = await clickhouse.query({
      query,
      query_params: { id },
      format: 'JSONEachRow',
    })

    const jsonResult = (await result.json()) as any[]

    if (jsonResult.length === 0) {
      return null
    }

    const row = jsonResult[0]

    // Convert string dates back to Date objects and parse JSON fields
    const event: ErrorEvent = {
      ...row,
      timestamp: new Date(row.timestamp),
      received_at: row.received_at ? new Date(row.received_at) : undefined,
      first_seen: row.first_seen ? new Date(row.first_seen) : undefined,
      // Parse JSON fields
      tags: row.tags ? JSON.parse(row.tags) : null,
      extra: row.extra ? JSON.parse(row.extra) : null,
      request: row.request ? JSON.parse(row.request) : null,
      exception: row.exception ? JSON.parse(row.exception) : null,
      breadcrumbs: row.breadcrumbs ? JSON.parse(row.breadcrumbs) : null,
      contexts: row.contexts ? JSON.parse(row.contexts) : null,
      // Ensure fingerprint is an array
      fingerprint: Array.isArray(row.fingerprint) ? row.fingerprint : [row.fingerprint],
    }

    return event
  }

  /**
   * Get error event counts by time period
   */
  public static async getErrorEventCounts(projectId: string, period: string): Promise<any[]> {
    let interval: string

    switch (period) {
      case 'hour':
        interval = 'toStartOfHour(timestamp)'
        break
      case 'day':
        interval = 'toStartOfDay(timestamp)'
        break
      case 'week':
        interval = 'toStartOfWeek(timestamp)'
        break
      case 'month':
        interval = 'toStartOfMonth(timestamp)'
        break
      default:
        interval = 'toStartOfDay(timestamp)'
    }

    const query = `
      SELECT 
        ${interval} AS time_bucket,
        count() AS count,
        countIf(level = 'error') AS error_count,
        countIf(level = 'warning') AS warning_count,
        countIf(level = 'info') AS info_count
      FROM error_events
      WHERE project_id = {projectId:String}
        AND timestamp >= now() - INTERVAL 1 MONTH
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `

    const result = await clickhouse.query({
      query,
      query_params: { projectId },
      format: 'JSONEachRow',
    })

    const jsonResult = (await result.json()) as any[]

    // Convert time buckets to ISO strings for easier frontend processing
    return jsonResult.map((row: any) => ({
      ...row,
      time_bucket: new Date(row.time_bucket).toISOString(),
    }))
  }

  /**
   * Get top error types by count
   */
  public static async getTopErrorTypes(projectId: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        type,
        count() AS count,
        min(timestamp) AS first_seen,
        max(timestamp) AS last_seen,
        uniqExact(id) AS unique_events
      FROM error_events
      WHERE project_id = {projectId:String}
        AND timestamp >= now() - INTERVAL 1 MONTH
      GROUP BY type
      ORDER BY count DESC
      LIMIT {limit:UInt32}
    `

    const result = await clickhouse.query({
      query,
      query_params: { projectId, limit },
      format: 'JSONEachRow',
    })

    const jsonResult = (await result.json()) as any[]

    // Convert time values to ISO strings
    return jsonResult.map((row: any) => ({
      ...row,
      first_seen: new Date(row.first_seen).toISOString(),
      last_seen: new Date(row.last_seen).toISOString(),
    }))
  }

  /**
   * Get error events summary statistics
   */
  public static async getErrorEventsSummary(projectId: string): Promise<any> {
    const query = `
      SELECT 
        count() AS total_events,
        countIf(level = 'error') AS error_count,
        countIf(level = 'warning') AS warning_count,
        countIf(level = 'info') AS info_count,
        countIf(handled = 0) AS unhandled_count,
        countIf(timestamp >= now() - INTERVAL 1 DAY) AS events_24h,
        min(timestamp) AS first_event,
        max(timestamp) AS last_event,
        uniqExact(type) AS unique_error_types
      FROM error_events
      WHERE project_id = {projectId:String}
        AND timestamp >= now() - INTERVAL 1 MONTH
    `

    const result = await clickhouse.query({
      query,
      query_params: { projectId },
      format: 'JSONEachRow',
    })

    const jsonResult = (await result.json()) as any[]

    if (!jsonResult || jsonResult.length === 0) {
      return {
        total_events: 0,
        error_count: 0,
        warning_count: 0,
        info_count: 0,
        unhandled_count: 0,
        events_24h: 0,
        first_event: null,
        last_event: null,
        unique_error_types: 0,
      }
    }

    const summary = jsonResult[0]

    // Convert time values to ISO strings if they exist
    if (summary.first_event) {
      summary.first_event = new Date(summary.first_event).toISOString()
    }

    if (summary.last_event) {
      summary.last_event = new Date(summary.last_event).toISOString()
    }

    return summary
  }

  /**
   * Update event with group ID after processing
   */
  public static async updateEventGroupId(eventId: string, groupId: string): Promise<void> {
    const query = `
      ALTER TABLE error_events
      UPDATE group_id = {groupId:String}
      WHERE id = {eventId:String}
    `

    await clickhouse.query({
      query,
      query_params: { groupId, eventId },
      format: 'JSONEachRow',
    })
  }

  /**
   * Mark event as processed
   */
  public static async markEventAsProcessed(eventId: string): Promise<void> {
    const query = `
      ALTER TABLE error_events
      UPDATE has_been_processed = 1
      WHERE id = {eventId:String}
    `

    await clickhouse.query({
      query,
      query_params: { eventId },
      format: 'JSONEachRow',
    })
  }

  /**
   * Get group statistics for updating PostgreSQL
   */
  public static async getGroupStatistics(groupId: string): Promise<{
    count: number
    uniqueUsers: number
    last24h: number
    last7d: number
    last30d: number
  }> {
    const query = `
      SELECT 
        count() AS count,
        uniqExact(user_hash) AS unique_users,
        countIf(timestamp >= now() - INTERVAL 1 DAY) AS last_24h,
        countIf(timestamp >= now() - INTERVAL 7 DAY) AS last_7d,
        countIf(timestamp >= now() - INTERVAL 30 DAY) AS last_30d
      FROM error_events
      WHERE group_id = {groupId:String}
    `

    const result = await clickhouse.query({
      query,
      query_params: { groupId },
      format: 'JSONEachRow',
    })

    const jsonResult = (await result.json()) as any[]

    if (jsonResult.length === 0) {
      return {
        count: 0,
        uniqueUsers: 0,
        last24h: 0,
        last7d: 0,
        last30d: 0,
      }
    }

    return {
      count: jsonResult[0].count || 0,
      uniqueUsers: jsonResult[0].unique_users || 0,
      last24h: jsonResult[0].last_24h || 0,
      last7d: jsonResult[0].last_7d || 0,
      last30d: jsonResult[0].last_30d || 0,
    }
  }

  /**
   * Get recent group statistics for spike detection
   */
  public static async getRecentGroupStats(
    groupId: string,
    minutes: number
  ): Promise<{
    current: number
    previous: number
  }> {
    const query = `
      SELECT 
        countIf(timestamp >= now() - INTERVAL {minutes:UInt32} MINUTE) AS current,
        countIf(timestamp >= now() - INTERVAL {minutes2:UInt32} MINUTE AND timestamp < now() - INTERVAL {minutes:UInt32} MINUTE) AS previous
      FROM error_events
      WHERE group_id = {groupId:String}
    `

    const result = await clickhouse.query({
      query,
      query_params: { groupId, minutes, minutes2: minutes * 2 },
      format: 'JSONEachRow',
    })

    const jsonResult = (await result.json()) as any[]

    if (jsonResult.length === 0) {
      return {
        current: 0,
        previous: 0,
      }
    }

    return {
      current: jsonResult[0].current || 0,
      previous: jsonResult[0].previous || 1, // Avoid division by zero
    }
  }

  /**
   * Batch insert for seeder efficiency
   */
  public static async batchInsert(events: ErrorEvent[]): Promise<void> {
    const formatDateTime = (date: Date): string => {
      return date.toISOString().substring(0, 19).replace('T', ' ')
    }

    const values = events.map((event) => ({
      id: event.id,
      timestamp: formatDateTime(event.timestamp),
      received_at: formatDateTime(event.received_at || new Date()),
      project_id: event.projectId,
      level: event.level,
      message: event.message,
      type: event.type,
      handled: event.handled,
      severity: event.severity,
      platform: event.platform,
      platform_version: event.platform_version,
      sdk: event.sdk,
      sdk_version: event.sdk_version,
      release: event.release,
      environment: event.environment,
      server_name: event.serverName,
      runtime: event.runtime,
      runtime_version: event.runtime_version,
      transaction: event.transaction,
      transaction_duration: event.transaction_duration,
      url: event.url,
      method: event.method,
      status_code: event.status_code,
      user_hash: event.user_hash,
      session_id: event.session_id,
      client_info: event.client_info,
      exception: event.exception,
      exception_type: event.exception_type,
      exception_value: event.exception_value,
      exception_module: event.exception_module,
      stack_trace: event.stack_trace,
      frames_count: event.frames_count,
      request: event.request,
      tags: event.tags,
      extra: event.extra,
      breadcrumbs: event.breadcrumbs,
      contexts: event.contexts,
      fingerprint: event.fingerprint,
      memory_usage: event.memory_usage,
      cpu_usage: event.cpu_usage,
      duration: event.duration,
      first_seen: formatDateTime(event.first_seen || new Date()),
      group_id: event.group_id,
      is_sample: event.is_sample,
      sample_rate: event.sample_rate,
      has_been_processed: event.has_been_processed,
    }))

    await clickhouse.insert({
      table: 'error_events',
      values,
      format: 'JSONEachRow',
    })
  }
}
