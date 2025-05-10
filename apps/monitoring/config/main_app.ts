import env from '#config/env'

/**
 * Configuration for connecting to the main app
 */
export default {
  /**
   * URL of the main app
   */
  url: env.get('MAIN_APP_URL', 'http://localhost:3333'),

  /**
   * API token for authenticating with the main app
   * This can also be set via the MAIN_APP_API_TOKEN environment variable
   */
  apiToken: env.get('MAIN_APP_API_TOKEN'),

  /**
   * Endpoints for the main app API
   */
  endpoints: {
    validateToken: '/api/auth/validate',
    user: '/api/users/:id',
    userCompanies: '/api/users/:id/companies',
    userPermissions: '/api/users/:id/permissions',
    company: '/api/companies/:id',
  }
}
