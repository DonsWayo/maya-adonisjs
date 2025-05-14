import { ApplicationService } from '@adonisjs/core/types'
import apiResourceService from '#auth/logto/services/api_resource_service'

/**
 * Provider to register the API resource with Logto during application startup
 */
export default class ApiResourceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register the API resource with Logto when the application starts
   */
  async register() {
    // Nothing to register
  }

  /**
   * Initialize the API resource when the application is ready
   */
  async boot() {
    // Register the API resource with Logto
    try {
      await apiResourceService.registerApiResource()
    } catch (error) {
      console.error('Failed to register API resource with Logto:', error)
      // Don't throw the error to prevent application startup failure
      // The application can still function without the API resource
    }
  }

  /**
   * Cleanup resources before the application shuts down
   */
  async shutdown() {
    // Nothing to clean up
  }
}
