import env from '#start/env'
import managementApiService from './management_api_service.js'
import { LogtoError } from '../types/errors.js'

/**
 * Service for managing Logto webhooks
 * Ensures that webhooks are properly configured to notify the main app
 * of user-related events in Logto
 */
export class WebhookService {
  /**
   * Webhook configuration
   */
  private webhookName = 'main-app-user-sync'
  private webhookUrl: string
  private signingKey: string
  
  /**
   * Events to subscribe to
   */
  private events = [
    // User events
    'User.Created',
    'User.Deleted',
    'User.Data.Updated',
    'User.SuspensionStatus.Updated',
    
    // Organization events
    'Organization.Created',
    'Organization.Deleted',
    'Organization.Data.Updated',
    'Organization.Membership.Updated',
    
    // Role events
    'Role.Created',
    'Role.Deleted',
    'Role.Data.Updated',
    'Role.Scopes.Updated',
    
    // Organization role events
    'OrganizationRole.Created',
    'OrganizationRole.Deleted',
    'OrganizationRole.Data.Updated',
    'OrganizationRole.Scopes.Updated',
    
    // Scope events
    'Scope.Created',
    'Scope.Deleted',
    'Scope.Data.Updated',
    
    // Organization scope events
    'OrganizationScope.Created',
    'OrganizationScope.Deleted',
    'OrganizationScope.Data.Updated',
    
    // User interaction events
    'PostRegister',
    'PostSignIn',
    'PostResetPassword'
  ]
  
  constructor() {
    this.webhookUrl = `${env.get('APP_URL')}/api/webhooks/logto`
    this.signingKey = env.get('LOGTO_WEBHOOK_SIGNING_KEY')
    
    if (!this.signingKey) {
      console.warn('LOGTO_WEBHOOK_SIGNING_KEY is not set. Webhook verification will not be secure.')
    }
  }
  
  /**
   * Ensure the webhook exists in Logto
   * Creates it if it doesn't exist, updates it if it does
   */
  public async ensureWebhookExists(): Promise<any> {
    try {
      console.log('Checking if webhook exists in Logto...')
      
      // Get all webhooks
      const hooks = await managementApiService.request('/api/hooks', 'GET')
      console.log(`Found ${hooks.length} webhooks in Logto`)
      
      // Find our webhook
      const existingHook = hooks.find((hook: any) => hook.name === this.webhookName)
      
      if (existingHook) {
        console.log('Webhook already exists:', existingHook.id)
        
        // Update the webhook to ensure it has the latest configuration
        const updatedHook = await managementApiService.request(`/api/hooks/${existingHook.id}`, 'PATCH', {
          name: this.webhookName,
          events: this.events,
          config: {
            url: this.webhookUrl,
            signingKey: this.signingKey,
            retries: 3,
            timeout: 10000
          }
        })
        
        console.log('Webhook updated successfully:', updatedHook.id)
        return updatedHook
      }
      
      // Create a new webhook
      console.log('Creating new webhook...')
      
      const newHook = await managementApiService.request('/api/hooks', 'POST', {
        name: this.webhookName,
        events: this.events,
        config: {
          url: this.webhookUrl,
          signingKey: this.signingKey,
          retries: 3,
          timeout: 10000
        }
      })
      
      console.log('New webhook created:', newHook.id)
      return newHook
    } catch (error) {
      console.error('Error ensuring webhook exists:', error)
      throw new LogtoError('Failed to configure webhook', error)
    }
  }
  
  /**
   * Test the webhook to ensure it's working properly
   */
  public async testWebhook(hookId: string): Promise<any> {
    try {
      console.log(`Testing webhook ${hookId}...`)
      
      const testResult = await managementApiService.request(`/api/hooks/${hookId}/test`, 'POST', {
        events: ['PostSignIn'],
        config: {
          url: this.webhookUrl,
          signingKey: this.signingKey,
          retries: 1,
          timeout: 10000
        }
      })
      
      console.log('Webhook test result:', testResult)
      return testResult
    } catch (error) {
      console.error('Error testing webhook:', error)
      throw new LogtoError('Failed to test webhook', error)
    }
  }
  
  /**
   * Get recent logs for the webhook
   */
  public async getRecentLogs(hookId: string): Promise<any> {
    try {
      console.log(`Getting recent logs for webhook ${hookId}...`)
      
      const logs = await managementApiService.request(`/api/hooks/${hookId}/recent-logs`, 'GET')
      
      console.log(`Found ${logs.length} recent logs for webhook ${hookId}`)
      return logs
    } catch (error) {
      console.error('Error getting webhook logs:', error)
      throw new LogtoError('Failed to get webhook logs', error)
    }
  }
}

export default new WebhookService()
