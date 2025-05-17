import { ApplicationService } from '@adonisjs/core/types'
import apiResourceService from '#auth/logto/services/api_resource_service'
import webhookService from '#auth/logto/services/webhook_service'

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
   * Initialize the API resource and webhook when the application is ready
   */
  async boot() {
    // Register the API resource with Logto
    try {
      console.log('Registering API resource with Logto...')
      await apiResourceService.registerApiResource()
      console.log('API resource registered successfully')
    } catch (error) {
      console.error('Failed to register API resource with Logto:', error)
      // Don't throw the error to prevent application startup failure
      // The application can still function without the API resource
    }
    
    // Register the webhook with Logto
    try {
      console.log('Registering webhook with Logto...')
      const webhook = await webhookService.ensureWebhookExists()
      console.log('Webhook registered successfully:', webhook.id)
    } catch (error) {
      console.error('Failed to register webhook with Logto:', error)
      // Don't throw the error to prevent application startup failure
      // The application can still function without the webhook
    }
  }

  /**
   * Cleanup resources before the application shuts down
   */
  async shutdown() {
    // Nothing to clean up
  }
}
