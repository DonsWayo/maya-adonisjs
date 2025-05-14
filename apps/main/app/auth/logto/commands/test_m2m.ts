import { BaseCommand } from '@adonisjs/core/ace'
import apiResourceService from '#auth/logto/services/api_resource_service'

/**
 * Test command to verify M2M authentication setup
 */
export default class TestM2m extends BaseCommand {
  static commandName = 'test:m2m'
  static description = 'Test M2M authentication setup with Logto'

  // Define command signature
  static options = {
    allowUnknownFlags: false,
  }

  async run() {
    this.logger.info('Testing M2M authentication setup...')
    
    try {
      // 1. Create a test M2M application
      this.logger.info('Creating test M2M application...')
      const m2mApp = await apiResourceService.createM2MApplication(
        'Test M2M App',
        'Test application for M2M authentication'
      )
      
      this.logger.success(`Created M2M application: ${m2mApp.name} (${m2mApp.id})`)
      this.logger.info('Client Secret (save this, it will not be shown again):', m2mApp.secret)
      
      // 2. Test getting an access token with the M2M credentials
      this.logger.info('Testing token acquisition...')
      
      // Construct the token endpoint URL
      const logtoUrl = process.env.LOGTO_URL || 'http://logto.localhost'
      const tokenEndpoint = `${logtoUrl}/oidc/token`
      
      // Prepare the request
      const params = new URLSearchParams()
      params.append('grant_type', 'client_credentials')
      params.append('client_id', m2mApp.id)
      params.append('client_secret', m2mApp.secret)
      params.append('scope', 'read:users read:companies')
      
      // Make the request
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      })
      
      if (response.ok) {
        const data = await response.json() as { access_token: string; expires_in: number }
        this.logger.success('Successfully obtained access token!')
        this.logger.info(`Token expires in: ${data.expires_in} seconds`)
        
        // Display token info (first few characters only)
        const tokenPreview = data.access_token.substring(0, 20) + '...'
        this.logger.info(`Access token (truncated): ${tokenPreview}`)
        
        // 3. Test making an API request with the token
        this.logger.info('Testing API access with the token...')
        
        // Get the API URL from environment or use a default
        const apiUrl = process.env.MAIN_APP_API_URL || 'http://localhost:3333/api'
        
        // Make a request to the users API
        const usersResponse = await fetch(`${apiUrl}/users`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        })
        
        if (usersResponse.ok) {
          const users = await usersResponse.json() as any[]
          this.logger.success('Successfully accessed users API!')
          this.logger.info(`Retrieved ${users.length} users`)
        } else {
          const errorText = await usersResponse.text()
          this.logger.error(`Failed to access users API: ${usersResponse.status} ${errorText}`)
        }
      } else {
        const errorText = await response.text()
        this.logger.error(`Failed to obtain access token: ${response.status} ${errorText}`)
      }
    } catch (error) {
      this.logger.error(`Error testing M2M authentication: ${error instanceof Error ? error.message : String(error)}`)
      if (error instanceof Error && error.stack) {
        this.logger.debug(error.stack)
      }
    }
    
    this.logger.info('M2M authentication test completed')
  }
}
