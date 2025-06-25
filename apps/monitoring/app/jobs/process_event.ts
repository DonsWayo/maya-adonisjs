import { Job } from '@nemoventures/adonis-jobs'
import { inject } from '@adonisjs/core'
import ErrorProcessingService from '#services/error/error_processing_service'
import logger from '@adonisjs/core/services/logger'

interface ProcessEventData {
  eventId: string
  projectId: string
}

@inject()
export default class ProcessEvent extends Job<ProcessEventData, void> {
  constructor(private errorProcessingService: ErrorProcessingService) {
    super()
  }

  static get key() {
    return 'process-event'
  }

  static get concurrency() {
    return 10 // Process up to 10 events concurrently
  }

  async process() {
    const { eventId, projectId } = this.data

    // Delegate to the service
    await this.errorProcessingService.processEvent(eventId, projectId)
  }

  // Job lifecycle hooks
  async onFailed(error: Error) {
    logger.error('ProcessEvent job failed', {
      message: error.message,
      stack: error.stack,
      eventId: this.data.eventId,
      projectId: this.data.projectId,
    })
    // Could send to monitoring service
  }

  async onSucceeded() {
    logger.info('ProcessEvent job completed successfully', {
      eventId: this.data.eventId,
      projectId: this.data.projectId,
    })
    // Track success metrics
  }
}
