import env from '#start/env'
import { LogtoError } from '#users/types/errors'

export class LogtoManagementApiService {
  private accessToken: string | null = null
  private tokenExpiry: number = 0
  private baseUrl: string
  private clientId: string
  private clientSecret: string

  constructor() {
    // The base URL should be the Logto server URL without any path
    // For example: http://logto.localhost
    const rawUrl = env.get('LOGTO_URL').replace(/\/$/, '')
    
    // Extract the base URL without any path
    const url = new URL(rawUrl)
    this.baseUrl = `${url.protocol}//${url.host}`
    
    this.clientId = env.get('LOGTO_M2M_CLIENT_ID')
    this.clientSecret = env.get('LOGTO_M2M_CLIENT_SECRET')
    
    console.log('Logto Management API Service initialized with URL:', this.baseUrl)
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    const now = Math.floor(Date.now() / 1000)
    if (this.accessToken && this.tokenExpiry > now + 60) {
      console.log('Using existing Logto access token')
      return this.accessToken
    }

    // Otherwise, get a new token
    try {
      // The token endpoint should be /oidc/token as per Logto docs
      const tokenEndpoint = `${this.baseUrl}/oidc/token`
      console.log('Logto token endpoint:', tokenEndpoint)
      
      // Resource URL for Logto Management API
      // According to docs: https://docs.logto.io/integrate-logto/interact-with-management-api
      // The correct identifier is https://default.logto.app/api
      const resourceUrl = 'https://default.logto.app/api'
      console.log('Logto resource URL:', resourceUrl)
      
      // Create request body
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        resource: resourceUrl,
        scope: 'all',
      }).toString()
      console.log('Logto token request body:', body)
      
      // Create authorization header
      const authHeader = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      console.log('Logto client ID:', this.clientId)
      console.log('Logto authorization header (masked):', authHeader.substring(0, 15) + '...')
      
      console.log('Sending token request to Logto...')
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
        },
        body,
      })
      
      console.log('Logto token response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const responseText = await response.text()
        console.error('Logto token error response:', responseText)
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (e) {
          errorData = { error: 'invalid_response', error_description: responseText }
        }
        throw new LogtoError('Failed to get access token', errorData)
      }

      const responseText = await response.text()
      console.log('Logto token response (masked):', responseText.substring(0, 30) + '...')
      
      const data = JSON.parse(responseText) as { access_token: string; expires_in: number }
      this.accessToken = data.access_token
      this.tokenExpiry = now + data.expires_in
      
      console.log('Logto access token obtained successfully, expires in:', data.expires_in, 'seconds')
      return this.accessToken
    } catch (error) {
      console.error('Error getting Logto access token:', error)
      throw new LogtoError('Failed to get access token', error instanceof Error ? error : String(error))
    }
  }

  async request(endpoint: string, method: string, body?: any): Promise<any> {
    try {
      console.log(`Logto API request: ${method} ${endpoint}`)
      
      const token = await this.getAccessToken()
      // Ensure the API URL is correctly formed
      const url = `${this.baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
      console.log('Logto API URL:', url)

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }

      if (body) {
        options.body = JSON.stringify(body)
        console.log('Logto API request body:', JSON.stringify(body))
      }

      console.log('Sending API request to Logto...')
      const response = await fetch(url, options)
      console.log('Logto API response status:', response.status, response.statusText)

      if (!response.ok) {
        const responseText = await response.text()
        console.error('Logto API error response:', responseText)
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (e) {
          errorData = { error: 'invalid_response', error_description: responseText }
        }
        throw new LogtoError(`API request failed: ${endpoint}`, errorData)
      }

      const responseText = await response.text()
      console.log(`Logto API response for ${endpoint} (truncated):`, 
        responseText.length > 100 ? responseText.substring(0, 100) + '...' : responseText)
      
      try {
        return JSON.parse(responseText)
      } catch (e) {
        console.error('Error parsing Logto API response:', e)
        throw new LogtoError(`Failed to parse API response: ${endpoint}`, e)
      }
    } catch (error) {
      console.error(`Error in Logto API request to ${endpoint}:`, error)
      throw error instanceof LogtoError ? error : new LogtoError(`API request failed: ${endpoint}`, error)
    }
  }

  async createOrganization(name: string, description?: string): Promise<any> {
    return this.request('/organizations', 'POST', {
      name,
      description,
    })
  }

  async getOrganization(id: string): Promise<any> {
    return this.request(`/organizations/${id}`, 'GET')
  }

  async updateOrganization(id: string, data: { name?: string; description?: string }): Promise<any> {
    return this.request(`/organizations/${id}`, 'PATCH', data)
  }

  async deleteOrganization(id: string): Promise<any> {
    return this.request(`/organizations/${id}`, 'DELETE')
  }

  async getUserOrganizations(userId: string): Promise<any> {
    return this.request(`/users/${userId}/organizations`, 'GET')
  }

  async addUserToOrganization(userId: string, organizationId: string, roleNames?: string[]): Promise<any> {
    const payload: any = {}
    if (roleNames && roleNames.length > 0) {
      payload.roleNames = roleNames
    }
    return this.request(`/organizations/${organizationId}/users/${userId}`, 'POST', payload)
  }

  async removeUserFromOrganization(userId: string, organizationId: string): Promise<any> {
    return this.request(`/organizations/${organizationId}/users/${userId}`, 'DELETE')
  }

  async assignRolesToUser(userId: string, organizationId: string, roleNames: string[]): Promise<any> {
    return this.request(`/organizations/${organizationId}/users/${userId}/roles`, 'POST', {
      roleNames,
    })
  }
  
  /**
   * Get all organization roles for a specific organization
   */
  /**
   * Get all organization roles
   * Note: This endpoint is at the tenant level, not organization level
   */
  async getOrganizationRoles(): Promise<any> {
    return this.request('/organization-roles', 'GET')
  }
  
  /**
   * Create a new organization role at the tenant level
   */
  async createOrganizationRole(name: string, description?: string): Promise<any> {
    return this.request('/organization-roles', 'POST', {
      name,
      description
    })
  }
  
  /**
   * Get user roles in an organization
   */
  async getUserOrganizationRoles(organizationId: string, userId: string): Promise<any> {
    return this.request(`/organizations/${organizationId}/users/${userId}/roles`, 'GET')
  }
  
  /**
   * Assign roles to a user in an organization
   */
  async assignUserOrganizationRoles(organizationId: string, userId: string, roleIds: string[]): Promise<any> {
    return this.request(`/organizations/${organizationId}/users/${userId}/roles`, 'POST', {
      organizationRoleIds: roleIds
    })
  }
  
  /**
   * Ensure that the tenant has the specified organization roles
   * If a role doesn't exist, it will be created
   */
  async ensureOrganizationRoles(roles: Array<{name: string, description?: string}>): Promise<any> {
    try {
      // Get existing roles
      const existingRoles = await this.getOrganizationRoles()
      const existingRoleNames = existingRoles.map((role: any) => role.name)
      
      // Create missing roles
      const rolesToCreate = roles.filter(role => !existingRoleNames.includes(role.name))
      
      const results = []
      for (const role of rolesToCreate) {
        try {
          const result = await this.createOrganizationRole(role.name, role.description)
          results.push(result)
        } catch (error) {
          console.error(`Failed to create role ${role.name}:`, error)
          // Continue with other roles even if one fails
        }
      }
      
      return {
        existingRoles,
        createdRoles: results
      }
    } catch (error) {
      console.error(`Failed to ensure organization roles:`, error)
      throw error
    }
  }
}

export default new LogtoManagementApiService()
