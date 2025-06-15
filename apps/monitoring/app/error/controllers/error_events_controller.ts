import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import { ErrorEvent } from '../models/error_event.js'
import Project from '../models/project.js'
import { storeErrorEventValidator } from '../validators.js'
import { ClickHouseService } from '../services/clickhouse_service.js'

export default class ErrorEventsController {
  /*
   * API ENDPOINTS
   */

  /**
   * Store a new error event (Sentry-compatible endpoint)
   */
  public async store({ request, params, response }: HttpContext) {
    // Extract project ID from the Sentry-style URL
    const projectId = params.projectId
    
    // Verify the project exists and authentication
    const project = await Project.query()
      .where('id', projectId)
      .orWhere('public_key', projectId) // projectId could be either ID or public key
      .first()
    
    if (!project) {
      return response.unauthorized({ error: 'Invalid project ID or authentication' })
    }
    
    try {
      // Validate the incoming data
      const payload = await request.validateUsing(storeErrorEventValidator)
      
      // Generate an event ID if not provided
      const eventId = payload.event_id || randomUUID().replace(/-/g, '')
      
      // Get default values for required fields
      const eventType = payload.exception?.values?.[0]?.type || 'Error'
      const eventMessage = payload.message || (payload.exception?.values?.[0]?.value || 'Unknown error')
      
      // Create the error event object
      const errorEvent: ErrorEvent = {
        id: eventId,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        received_at: new Date(),
        projectId: project.id,
        level: payload.level || 'error',
        message: eventMessage,
        type: eventType,
        handled: 0, // Default to unhandled
        severity: payload.level || 'error',
        platform: payload.platform,
        platform_version: null,
        sdk: JSON.stringify(payload.sdk || { name: 'unknown', version: '0.0.0' }),
        sdk_version: payload.sdk ? (typeof payload.sdk.version === 'string' ? payload.sdk.version : null) : null,
        release: payload.release || null,
        environment: payload.environment || 'production',
        serverName: payload.server_name || null,
        runtime: null,
        runtime_version: null,
        transaction: payload.transaction || null,
        transaction_duration: null,
        url: payload.request && typeof payload.request === 'object' ? 
             (payload.request as any).url || null : null,
        method: payload.request && typeof payload.request === 'object' ? 
                (payload.request as any).method || null : null,
        status_code: payload.request && typeof payload.request === 'object' ? 
                    Number((payload.request as any).status_code) || null : null,
        
        // Anonymous user context
        user_hash: payload.user && typeof payload.user === 'object' && (payload.user as any).id ? 
                  String((payload.user as any).id).substring(0, 8) : null,
        session_id: payload.contexts && typeof payload.contexts === 'object' && 
                   (payload.contexts as any).session && typeof (payload.contexts as any).session === 'object' ? 
                   (payload.contexts as any).session.id || null : null,
        client_info: payload.contexts && typeof payload.contexts === 'object' ? 
                    JSON.stringify((payload.contexts as any).client) || null : null,
        
        // Error details
        exception: payload.exception ? JSON.stringify(payload.exception) : null,
        exception_type: payload.exception?.values?.[0]?.type || null,
        exception_value: payload.exception?.values?.[0]?.value || null,
        exception_module: payload.exception?.values?.[0]?.module || null,
        stack_trace: payload.exception?.values?.[0]?.stacktrace ? 
                    JSON.stringify(payload.exception.values[0].stacktrace) : null,
        frames_count: payload.exception?.values?.[0]?.stacktrace && 
                     typeof payload.exception.values[0].stacktrace === 'object' && 
                     Array.isArray((payload.exception.values[0].stacktrace as any).frames) ? 
                     (payload.exception.values[0].stacktrace as any).frames.length : null,
        
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
        has_been_processed: 0
      }
      
      // Save to ClickHouse
      await ClickHouseService.storeErrorEvent(errorEvent)
      
      // Return Sentry-compatible response
      return response.json({ id: eventId })
    } catch (error) {
      console.error('Error storing event:', error)
      return response.badRequest({ error: 'Invalid event data' })
    }
  }

  /**
   * Display a list of error events for a project
   */
  public async index({ params, request, inertia }: HttpContext) {
    const { projectId } = params
    const { startDate, endDate, level, environment, search, page = 1, limit = 20 } = request.qs()
    
    // Verify the project exists
    const project = await Project.find(projectId)
    if (!project) {
      return inertia.location(`/projects`)
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit
    
    try {
      // Query error events with filtering
      const events = await ClickHouseService.queryErrorEvents({
        projectId,
        startDate,
        endDate,
        level,
        environment,
        search,
        limit,
        offset,
      })
      
      // Get error event counts for charts
      const eventCounts = await ClickHouseService.getErrorEventCounts(projectId, 'day')
      
      // Get top error types
      const topErrorTypes = await ClickHouseService.getTopErrorTypes(projectId, 5)
      
      return inertia.render('error/errors/index', { 
        project, 
        events, 
        eventCounts,
        topErrorTypes,
        filters: { startDate, endDate, level, environment, search },
        pagination: { page, limit, offset }
      })
    } catch (error) {
      console.error('Error fetching error events:', error)
      return inertia.location(`/projects/${projectId}`)
    }
  }

  /**
   * Display a specific error event
   */
  public async show({ params, inertia }: HttpContext) {
    const { projectId, id } = params
    
    // Verify the project exists
    const project = await Project.find(projectId)
    if (!project) {
      return inertia.location(`/projects`)
    }
    
    try {
      // Get the error event
      const event = await ClickHouseService.getErrorEventById(id)
      
      if (!event) {
        return inertia.location(`/projects/${projectId}/errors`)
      }
      
      // Verify the event belongs to the project
      if (event.projectId !== projectId) {
        return inertia.location(`/projects/${projectId}/errors`)
      }
      
      return inertia.render('error/errors/show', { project, event })
    } catch (error) {
      console.error('Error fetching error event:', error)
      return inertia.location(`/projects/${projectId}/errors`)
    }
  }

  /**
   * Display the dashboard for a project
   */
  public async dashboard({ params, inertia }: HttpContext) {
    const { projectId } = params
    
    // Verify the project exists
    const project = await Project.find(projectId)
    if (!project) {
      return inertia.location(`/projects`)
    }
    
    try {
      // Get error event counts for charts (last 30 days)
      const eventCounts = await ClickHouseService.getErrorEventCounts(projectId, 'day')
      
      // Get top error types
      const topErrorTypes = await ClickHouseService.getTopErrorTypes(projectId, 10)
      
      // Get recent error events (last 10)
      const recentEvents = await ClickHouseService.queryErrorEvents({
        projectId,
        limit: 10,
        offset: 0,
      })
      
      // Get summary statistics
      const summary = await ClickHouseService.getErrorEventsSummary(projectId)
      
      return inertia.render('error/projects/dashboard', { 
        project, 
        eventCounts,
        topErrorTypes,
        recentEvents,
        summary
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      return inertia.location(`/projects`)
    }
  }
}
