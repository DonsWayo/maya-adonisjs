import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Project from '../models/project.js'
import ErrorGroup from '../models/error_group.js'
import { storeErrorEventValidator } from '../validators.js'
import { ClickHouseService } from '../services/clickhouse_service.js'
import ErrorEventService from '#services/error/error_event_service'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class ErrorEventsController {
  constructor(
    private clickHouseService: ClickHouseService,
    private errorEventService: ErrorEventService
  ) {}
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
    let project: Project | null = null


    console.log('projectId test live reload:', projectId)


    // Check if projectId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(projectId)) {
      project = await Project.query()
        .where('id', projectId)
        .orWhere('public_key', projectId)
        .first()
    } else {
      // If not a UUID, only search by public_key
      project = await Project.query().where('public_key', projectId).first()
    }    

    if (!project) {
      return response.unauthorized({ error: 'Invalid project ID or authentication' })
    }

    // Check if project is active
    if (project.status !== 'active') {
      return response.unauthorized({ error: 'Invalid project ID or authentication' })
    }

    try {
      // Validate the incoming data
      const payload = await request.validateUsing(storeErrorEventValidator)

      // Use the service to store the event
      const result = await this.errorEventService.storeFromPayload(project.id, payload)

      // Return Sentry-compatible response
      return response.json(result)
    } catch (error) {
      console.error('Error storing event:', error)
      
      // Check if it's a validation error
      if (error.status === 422 && error.messages) {
        return response.unprocessableEntity(error)
      }
      
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
      const events = await this.clickHouseService.queryErrorEvents({
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
      const eventCounts = await this.clickHouseService.getErrorEventCounts(projectId, 'day')

      // Get top error types
      const topErrorTypes = await this.clickHouseService.getTopErrorTypes(projectId, 5)

      return inertia.render('error/errors/index', {
        project,
        events,
        eventCounts,
        topErrorTypes,
        filters: { startDate, endDate, level, environment, search },
        pagination: { page, limit, offset },
      })
    } catch (error) {
      console.error('Error fetching error events:', error)
      return inertia.location(`/projects/${projectId}`)
    }
  }

  /**
   * Display a specific error event
   */
  public async show({ params, inertia, response }: HttpContext) {
    const { projectId, id } = params


    logger.info(params, 'ErrorEventsController show')

    // Verify the project exists
    const project = await Project.find(projectId)
    if (!project) {
      return response.redirect(`/projects`)
    }
    
    logger.info(project, 'ErrorEventsController show')

    try {
      // Get the error event
      const event = await this.clickHouseService.getErrorEventById(id)

      logger.info(event, 'ErrorEventsController show')


      if (!event) {
        return response.redirect(`/projects/${projectId}/errors`)
      }

      // Verify the event belongs to the project
      if (event.projectId !== projectId) {
        return response.redirect(`/projects/${projectId}/errors`)
      }

      logger.info(event, 'ErrorEventsController show')

      // Get the error group if it exists
      let errorGroup = null
      if (event.group_id) {
        errorGroup = await ErrorGroup.find(event.group_id)
      }

      // Transform the event for Inertia (dates to ISO strings)
      const transformedEvent = {
        ...event,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        received_at: event.received_at instanceof Date ? event.received_at.toISOString() : event.received_at,
        first_seen: event.first_seen instanceof Date ? event.first_seen.toISOString() : event.first_seen,
      }

      return inertia.render('error/errors/show', { 
        project, 
        event: transformedEvent,
        errorGroup
      })
    } catch (error) {
      console.error('Error fetching error event:', error)
      return inertia.location(`/projects/${projectId}/errors`)
    }
  }

  /**
   * Display all error events across all projects
   */
  public async allErrors({ request, inertia }: HttpContext) {
    const { startDate, endDate, level, environment, search, page = 1, limit = 20 } = request.qs()

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    try {
      // Get all projects for filtering
      const projects = await Project.all()

      // Get error events
      const events = await this.clickHouseService.queryErrorEvents({
        startDate,
        endDate,
        level,
        environment,
        search,
        limit,
        offset,
      })

      // Get total count for pagination
      const total = events.length // This is not ideal, we should have a separate count query

      // Get error counts by level for cards
      const errorCounts = { error: 0, warning: 0, info: 0, debug: 0 } // Placeholder

      return inertia.render('error/errors/all', {
        events,
        projects,
        total,
        errorCounts,
        filters: { startDate, endDate, level, environment, search },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          perPage: limit,
        },
      })
    } catch (error) {
      console.error('Error fetching all error events:', error)
      return inertia.render('error/errors/all', {
        events: [],
        projects: [],
        total: 0,
        errorCounts: {},
        filters: { startDate, endDate, level, environment, search },
        pagination: {
          currentPage: 1,
          totalPages: 0,
          perPage: limit,
        },
      })
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
      const eventCounts = await this.clickHouseService.getErrorEventCounts(projectId, 'day')

      // Get top error types
      const topErrorTypes = await this.clickHouseService.getTopErrorTypes(projectId, 10)

      // Get recent error events (last 10)
      const recentEvents = await this.clickHouseService.queryErrorEvents({
        projectId,
        limit: 10,
        offset: 0,
      })

      // Get summary statistics
      const summary = await this.clickHouseService.getErrorEventsSummary(projectId)

      return inertia.render('error/projects/dashboard', {
        project,
        eventCounts,
        topErrorTypes,
        recentEvents,
        summary,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      return inertia.location(`/projects`)
    }
  }
}
