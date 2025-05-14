import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware to check for specific Logto permissions in the JWT token
 */
export default class LogtoPermissionMiddleware {
  /**
   * Optional required permissions to check
   * If not provided, permissions will be derived from the route
   */
  requiredPermissions?: string[]

  /**
   * Handle the incoming request
   * @param ctx HttpContext
   * @param next NextFn
   * @param options Optional permissions to check
   */
  async handle(
    ctx: HttpContext, 
    next: NextFn,
    options: { permissions?: string[] } = {}
  ) {
    try {
      const { request, response, logger } = ctx
      
      // Check if the token was verified by JwtMiddleware
      if (!ctx.logtoToken) {
        logger.warn('No token information found in request')
        return response.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      }
      
      const { scopes = [], isM2MToken = false } = ctx.logtoToken
      
      // Log the token information for debugging
      logger.info('Token information:', { scopes, isM2MToken })
      
      // IMPORTANT: For M2M tokens, bypass permission checks completely
      if (isM2MToken) {
        logger.info('M2M token detected, bypassing permission checks')
        return next()
      }
      
      // Check for 'all' scope which grants all permissions
      if (scopes.includes('all')) {
        logger.info('All-scope token detected, access granted')
        return next()
      }
      
      // Get required permissions from options or derive from route
      const permissions = options.permissions || this.requiredPermissions || this.derivePermissionsFromRoute(request)
      
      // Log the permission check
      logger.info('Checking permissions:', {
        required: permissions,
        provided: scopes,
        isM2M: isM2MToken
      })
      
      // If no permissions are required, continue
      if (!permissions.length) {
        logger.info('No permissions required, access granted')
        return next()
      }
      
      // Check for 'all' scope which grants all permissions
      if (scopes.includes('all')) {
        logger.info('All-scope token detected, access granted')
        return next()
      }
      
      // Check if the user has all the required permissions
      if (this.hasRequiredPermissions(scopes, permissions)) {
        logger.info('User has required permissions, access granted')
        return next()
      }
      
      // If we get here, the user doesn't have the required permissions
      logger.warn('Insufficient permissions', { required: permissions, provided: scopes })
      return response.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: permissions,
        provided: scopes
      })
    } catch (error) {
      const { logger, response } = ctx
      logger.error('Error in permission middleware:', error)
      return response.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while checking permissions'
      })
    }
  }
  
  /**
   * Check if the user has all the required permissions
   */
  private hasRequiredPermissions(userScopes: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => {
      // Check for direct match
      if (userScopes.includes(permission)) return true
      
      // Check for wildcard matches (e.g., 'users:*' should match 'users:read')
      const [resource, action] = permission.split(':')
      const wildcardPermission = `${resource}:*`
      
      // Check for alternative format (e.g., 'users:read' vs 'read:users')
      const alternativePermission = `${action}:${resource}`
      
      return userScopes.includes(wildcardPermission) || userScopes.includes(alternativePermission)
    })
  }
  
  /**
   * Derive permissions from the route path and HTTP method
   * Format: resource:action and action:resource
   * Example: /api/v1/users (GET) -> users:read and read:users
   */
  private derivePermissionsFromRoute(request: any): string[] {
    const path = request.url()
    const method = request.method().toLowerCase()
    
    // Extract resource from path
    // Example: /api/v1/users -> users
    const matches = path.match(/\/api(?:\/v\d+)?\/([\w]+)(?:\/|$)/)
    if (!matches) return []
    
    const resource = matches[1]
    
    // Map HTTP method to action
    const actionMap: Record<string, string> = {
      get: 'read',
      post: 'create',
      put: 'update',
      patch: 'update',
      delete: 'delete'
    }
    
    const action = actionMap[method] || 'access'
    
    // Return both formats to support different permission naming conventions
    return [
      `${resource}:${action}`,  // Standard format (e.g., users:read)
      `${action}:${resource}`   // Alternative format (e.g., read:users)
    ]
  }
}

// Type definitions are already defined in jwt_middleware.ts
