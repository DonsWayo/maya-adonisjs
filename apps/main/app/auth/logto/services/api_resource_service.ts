import env from '#start/env'
import { managementApiService } from '#auth/logto/index'

/**
 * Service to manage API resources in Logto
 */
export class ApiResourceService {
  /**
   * API identifier for the main app API
   * This should match the audience value in the JWT middleware
   */
  private apiIdentifier: string

  constructor() {
    // The API identifier should be unique and follow a URL format
    // Using the app's domain as the base is a good practice
    this.apiIdentifier = env.get('API_RESOURCE_IDENTIFIER', 'http://main.localhost')
  }

  /**
   * Register the API resource with Logto if it doesn't exist
   * This should be called during app startup
   */
  async registerApiResource() {
    try {
      console.log('Checking if API resource exists in Logto...')
      console.log('Using API identifier:', this.apiIdentifier)
      
      // Get all API resources
      const resources = await managementApiService.request('/api/resources', 'GET')
      console.log(`Found ${resources.length} API resources in Logto`)
      
      // Log all resources for debugging
      resources.forEach((resource: any, index: number) => {
        console.log(`Resource ${index + 1}:`, {
          id: resource.id,
          name: resource.name,
          indicator: resource.indicator
        })
      })
      
      // Check if our API resource already exists
      const existingResource = resources.find((resource: any) => 
        resource.indicator === this.apiIdentifier
      )
      
      if (existingResource) {
        console.log('API resource already exists in Logto:', existingResource.id)
        console.log('Resource details:', JSON.stringify(existingResource, null, 2))
        
        // Check if the resource has the required scopes
        console.log('Checking if resource has required scopes...')
        const scopes = await this.getApiResourceScopes(existingResource.id)
        console.log(`Resource has ${scopes.length} scopes`)
        
        // If scopes are missing, register them
        if (scopes.length === 0) {
          console.log('No scopes found, registering required scopes...')
          await this.registerApiScopes(existingResource.id)
        } else {
          console.log('Scopes already exist, no need to register')
        }
        
        // Check if the M2M role exists
        await this.ensureM2MRoleExists(existingResource.id)
        
        return existingResource
      }
      
      // Create the API resource if it doesn't exist
      console.log('Creating API resource in Logto...')
      const newResource = await managementApiService.request('/api/resources', 'POST', {
        name: 'Maya Main API',
        indicator: this.apiIdentifier,
        isDefault: false,
        accessTokenTtl: 86400, // 24 hours
      })
      
      console.log('New API resource created:', JSON.stringify(newResource, null, 2))
      
      // Register API scopes
      await this.registerApiScopes(newResource.id)
      
      // Create M2M role with all scopes
      await this.ensureM2MRoleExists(newResource.id)
      
      console.log('API resource created in Logto:', newResource.id)
      return newResource
    } catch (error) {
      console.error('Error registering API resource:', error)
      throw error
    }
  }
  
  /**
   * Verify API resource scopes
   */
  async verifyApiResourceScopes() {
    console.log('Verifying API resource scopes...')
    
    try {
      // Get all API resources
      const resources = await managementApiService.request('/api/resources', 'GET')
      console.log(`Found ${resources.length} API resources in Logto`)
      
      // Log all resources for debugging
      resources.forEach((resource: any, index: number) => {
        console.log(`Resource ${index + 1}:`, {
          id: resource.id,
          name: resource.name,
          indicator: resource.indicator
        })
      })
      
      // Find our API resource
      const apiResource = resources.find((resource: any) => 
        resource.indicator === this.apiIdentifier
      )
      
      if (!apiResource) {
        console.error('API resource not found in Logto')
        return { success: false, message: 'API resource not found' }
      }
      
      console.log('Found API resource:', apiResource.id)
      
      // Check if the resource has the required scopes
      const scopes = await this.getApiResourceScopes(apiResource.id)
      console.log(`Resource has ${scopes.length} scopes`)
      
      // Check if all required scopes are present
      const requiredScopes = ['read:users', 'read:companies', 'write:users', 'write:companies']
      const scopeNames = scopes.map((scope: any) => scope.name)
      
      console.log('Required scopes:', requiredScopes)
      console.log('Available scopes:', scopeNames)
      
      const missingScopes = requiredScopes.filter(scope => !scopeNames.includes(scope))
      if (missingScopes.length > 0) {
        console.error('Missing scopes:', missingScopes)
        return { 
          success: false, 
          message: `Missing required scopes: ${missingScopes.join(', ')}`,
          resource: apiResource,
          scopes
        }
      }
      
      console.log('All required scopes are present!')
      return { 
        success: true, 
        message: 'All required scopes are present',
        resource: apiResource,
        scopes
      }
    } catch (error) {
      console.error('Error verifying API resource scopes:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * Get scopes for an API resource
   */
  private async getApiResourceScopes(resourceId: string) {
    try {
      console.log(`Fetching scopes for API resource ${resourceId}...`)
      const scopes = await managementApiService.request(`/api/resources/${resourceId}/scopes`, 'GET')
      console.log(`Found ${scopes.length} scopes for resource ${resourceId}`)
      return scopes
    } catch (error) {
      console.error(`Error fetching scopes for resource ${resourceId}:`, error)
      return []
    }
  }
  
  /**
   * Register API scopes for the resource
   */
  private async registerApiScopes(resourceId: string) {
    const scopes = [
      {
        name: 'read:users',
        description: 'Read user data',
      },
      {
        name: 'read:companies',
        description: 'Read company data',
      },
      {
        name: 'write:users',
        description: 'Write user data',
      },
      {
        name: 'write:companies',
        description: 'Write company data',
      },
    ]
    
    console.log(`Registering ${scopes.length} scopes for API resource ${resourceId}...`)
    
    for (const scope of scopes) {
      try {
        console.log(`Registering scope ${scope.name}...`)
        const result = await managementApiService.request(`/api/resources/${resourceId}/scopes`, 'POST', scope)
        console.log(`Successfully registered scope ${scope.name} for API resource:`, JSON.stringify(result, null, 2))
      } catch (error) {
        console.error(`Error registering scope ${scope.name}:`, error)
        // Continue with other scopes even if one fails
      }
    }
    
    // Verify scopes were registered
    const registeredScopes = await this.getApiResourceScopes(resourceId)
    console.log(`After registration, resource has ${registeredScopes.length} scopes`)
  }
  
  /**
   * Create an M2M application in Logto for the monitoring app
   */
  async createM2MApplication(appName: string, appDescription: string) {
    try {
      console.log(`Creating M2M application "${appName}" in Logto...`)
      
      // Create the M2M application
      const m2mApp = await managementApiService.request('/api/applications', 'POST', {
        name: appName,
        description: appDescription,
        type: 'MachineToMachine',
      })
      
      console.log('M2M application created:', JSON.stringify(m2mApp, null, 2))
      
      // Get the API resource ID
      const resources = await managementApiService.request('/api/resources', 'GET')
      const apiResource = resources.find((resource: any) => 
        resource.indicator === this.apiIdentifier
      )
      
      if (!apiResource) {
        throw new Error('API resource not found in Logto')
      }
      
      console.log(`Assigning API resource ${apiResource.id} scopes to M2M application ${m2mApp.id}...`)
      
      // Assign API resource scopes to the M2M application
      const assignResult = await managementApiService.request(`/api/applications/${m2mApp.id}/api-resources`, 'POST', {
        resources: [
          {
            indicator: this.apiIdentifier,
            scopes: ['read:users', 'read:companies'],
          },
        ],
      })
      
      console.log('Scope assignment result:', JSON.stringify(assignResult, null, 2))
      console.log(`Created M2M application in Logto: ${m2mApp.id}`)
      
      return {
        id: m2mApp.id,
        secret: m2mApp.secret,
        name: m2mApp.name,
      }
    } catch (error) {
      console.error('Error creating M2M application:', error)
      throw error
    }
  }

  /**
   * Ensure an M2M role exists with the necessary permissions
   * This will create a role if it doesn't exist or update it if it does
   */
  private async ensureM2MRoleExists(resourceId: string) {
    try {
      console.log('Checking if M2M role exists...')
      
      // Get all roles
      const roles = await managementApiService.request('/api/roles', 'GET')
      console.log(`Found ${roles.length} roles in Logto`)
      
      // Find our M2M role
      const roleName = 'main-api-m2m-role'
      const existingRole = roles.find((role: any) => role.name === roleName && role.type === 'MachineToMachine')
      
      if (existingRole) {
        console.log('M2M role already exists:', existingRole.id)
        
        // Get the scopes for the resource
        const scopes = await this.getApiResourceScopes(resourceId)
        const scopeIds = scopes.map((scope: any) => scope.id)
        
        // Get the scopes already assigned to the role
        const roleScopes = await managementApiService.request(`/api/roles/${existingRole.id}/scopes`, 'GET')
        console.log(`Role has ${roleScopes.length} scopes already assigned`)
        
        // Find scopes that are not already assigned to the role
        const existingScopeIds = roleScopes.map((scope: any) => scope.id)
        const missingScopeIds = scopeIds.filter(id => !existingScopeIds.includes(id))
        
        if (missingScopeIds.length > 0) {
          console.log(`Adding ${missingScopeIds.length} missing scopes to role ${existingRole.id}`)
          
          // Add each missing scope individually to avoid errors with existing scopes
          for (const scopeId of missingScopeIds) {
            try {
              await managementApiService.request(`/api/roles/${existingRole.id}/scopes`, 'POST', {
                scopeIds: [scopeId]
              })
              console.log(`Added scope ${scopeId} to role ${existingRole.id}`)
            } catch (error) {
              console.warn(`Error adding scope ${scopeId} to role ${existingRole.id}:`, error)
            }
          }
        } else {
          console.log('All required scopes are already assigned to the role')
        }
        
        return existingRole
      }
      
      // Create a new M2M role
      console.log('Creating new M2M role...')
      
      // Get the scopes for the resource
      const scopes = await this.getApiResourceScopes(resourceId)
      const scopeIds = scopes.map((scope: any) => scope.id)
      
      // Create the role with all scopes
      const newRole = await managementApiService.request('/api/roles', 'POST', {
        name: roleName,
        description: 'Machine-to-machine role for API access',
        type: 'MachineToMachine',
        scopeIds
      })
      
      console.log('New M2M role created:', JSON.stringify(newRole, null, 2))
      return newRole
    } catch (error) {
      console.error('Error ensuring M2M role exists:', error)
      throw error
    }
  }
}

export default new ApiResourceService()
