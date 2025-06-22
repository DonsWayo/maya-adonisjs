import env from '#start/env'
import { DateTime } from 'luxon'

/**
 * Service to connect to the main app using M2M authentication
 */
export class MainAppService {
  /**
   * Base URL for the main app API
   */
  private baseUrl: string

  /**
   * Logto token endpoint
   */
  private tokenEndpoint: string

  /**
   * M2M client credentials
   */
  private clientId: string | undefined
  private clientSecret: string | undefined

  /**
   * API resource identifier
   */
  private apiIdentifier: string

  /**
   * Cache for the access token
   */
  private accessToken: string | null = null
  private tokenExpiry: DateTime | null = null

  constructor() {
    this.baseUrl = env.get('MAIN_APP_API_URL', 'http://main.localhost/api/v1')
    this.tokenEndpoint = `${env.get('LOGTO_URL')}/oidc/token`
    this.clientId = env.get('LOGTO_M2M_CLIENT_ID')
    this.clientSecret = env.get('LOGTO_M2M_CLIENT_SECRET')
    this.apiIdentifier = env.get('API_RESOURCE_IDENTIFIER', 'http://main.localhost')
  }

  /**
   * Get an access token from Logto
   * Will use cached token if it's still valid
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > DateTime.now()) {
      return this.accessToken
    }

    // Get a new token
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('M2M client credentials not configured')
      }

      // Prepare the token request according to Logto M2M documentation
      const params = new URLSearchParams()
      params.append('grant_type', 'client_credentials')
      params.append('scope', 'read:users read:companies write:users write:companies read:ai_usage write:ai_usage')
      params.append('resource', this.apiIdentifier)

      // Create the Basic auth header with client credentials
      const authHeader = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`

      console.log('Requesting token with params:', {
        grant_type: 'client_credentials',
        resource: this.apiIdentifier,
        scope: 'read:users read:companies write:users write:companies',
      })

      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
        },
        body: params.toString(),
      })

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`)
      }

      const data = (await response.json()) as { access_token: string; expires_in: number }
      this.accessToken = data.access_token

      // Calculate token expiry (subtract 5 minutes for safety margin)
      this.tokenExpiry = DateTime.now().plus({ seconds: data.expires_in - 300 })

      return this.accessToken
    } catch (error) {
      console.error('Error getting access token:', error)
      throw error
    }
  }

  /**
   * Make an authenticated request to the main app API
   */
  async request(path: string, method = 'GET', body?: any): Promise<any> {
    try {
      const token = await this.getAccessToken()

      const url = `${this.baseUrl}${path}`
      console.log(`Making API request to: ${url}`)

      // Log token prefix for debugging
      console.log(`Token prefix: ${token.substring(0, 15)}...`)

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)
      console.log(`Response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API error response: ${errorText}`)
        throw new Error(`API request failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error making request to ${path}:`, error)
      throw error
    }
  }

  /**
   * Get a user by ID
   */
  async getUser(userId: string) {
    return this.request(`/users/${userId}`)
  }

  /**
   * Get a user by external ID (Logto ID)
   */
  async getUserByExternalId(externalId: string) {
    return this.request(`/users/external/${externalId}`)
  }

  /**
   * Get a user's companies
   */
  async getUserCompanies(userId: string) {
    return this.request(`/users/${userId}/companies`)
  }

  /**
   * Get all companies
   */
  async getCompanies() {
    return this.request('/companies')
  }

  /**
   * Get a company by ID
   */
  async getCompany(companyId: string) {
    return this.request(`/companies/${companyId}`)
  }
}

export default new MainAppService()
