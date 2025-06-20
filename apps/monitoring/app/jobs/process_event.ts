import { Job } from '@nemoventures/adonis-jobs'
import ErrorProcessingService from '#services/error/error_processing_service'
import logger from '@adonisjs/core/services/logger'

interface ProcessEventData {
  eventId: string
  projectId: string
}

export default class ProcessEvent extends Job<ProcessEventData, void> {
  static get key() {
    return 'process-event'
  }

  static get concurrency() {
    return 10 // Process up to 10 events concurrently
  }

  async process() {
    const { eventId, projectId } = this.data
    
    // Delegate to the service
    await ErrorProcessingService.processEvent(eventId, projectId)
  }

  // Job lifecycle hooks
  async onFailed(error: Error) {
    logger.error('ProcessEvent job failed', { 
      message: error.message,
      stack: error.stack 
    })
    // Could send to monitoring service
  }

  async onSucceeded() {
    logger.info('ProcessEvent job completed successfully')
    // Track success metrics
  }
}
