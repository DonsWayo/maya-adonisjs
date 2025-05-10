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
      // Convert Date objects to ISO strings for ClickHouse
      const eventData = {
        ...errorEvent,
        timestamp: errorEvent.timestamp.toISOString(),
        received_at: errorEvent.received_at?.toISOString() || new Date().toISOString(),
        first_seen: errorEvent.first_seen?.toISOString() || new Date().toISOString(),
      }
      
      // Insert the error event into ClickHouse
      await clickhouse.insert({
        table: 'error_events',
        values: [eventData]
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
      conditions.push('(message ILIKE {search_pattern:String} OR type ILIKE {search_pattern:String})')
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
      format: 'JSONEachRow'
    })
    
    // Get the JSON result
    const jsonResult = await result.json()
    
    // Map the results to ErrorEvent objects
    return Array.isArray(jsonResult) ? jsonResult.map((row: any) => {
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
    }) : []
  }

  /**
   * Get a specific error event by ID
   */
  public static async getErrorEventById(id: string): Promise<ErrorEvent | null> {
    const query = `
      SELECT *
      FROM error_events
      WHERE id = '${id}'
      LIMIT 1
    `

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    })
    
    const jsonResult = await result.json() as any[]
    
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
      WHERE project_id = '${projectId}'
        AND timestamp >= now() - INTERVAL 1 MONTH
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    })
    
    const jsonResult = await result.json() as any[]

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
      WHERE project_id = '${projectId}'
        AND timestamp >= now() - INTERVAL 1 MONTH
      GROUP BY type
      ORDER BY count DESC
      LIMIT ${limit}
    `

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    })
    
    const jsonResult = await result.json() as any[]

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
      WHERE project_id = '${projectId}'
        AND timestamp >= now() - INTERVAL 1 MONTH
    `

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    })
    
    const jsonResult = await result.json() as any[]

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
        unique_error_types: 0
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
}
