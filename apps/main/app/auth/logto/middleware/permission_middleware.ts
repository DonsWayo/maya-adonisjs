import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware to check for specific Logto permissions in the JWT token
 */
export default class LogtoPermissionMiddleware {
  /**
   * Create a new middleware instance with required permissions
   * If no permissions are provided, the middleware will extract permissions
   * based on the route path and HTTP method.
   */
  constructor(private requiredPermissions?: string[]) {}

  /**
   * Handle the incoming request
   */
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx
    
    // Check if the token was verified by LogtoJwtMiddleware
    if (!ctx.logtoToken) {
      return response.status(401).json({
        error: 'Authentication required',
      })
    }
    
    const { scopes } = ctx.logtoToken
    
    // If no specific permissions were provided, derive them from the route
    const permissions = this.requiredPermissions || this.derivePermissionsFromRoute(request)
    
    // If no permissions are required, continue
    if (!permissions.length) {
      return next()
    }
    
    // Check if the user has all the required permissions
    const hasAllPermissions = permissions.every(
      permission => scopes.includes(permission)
    )
    
    if (!hasAllPermissions) {
      return response.status(403).json({
        error: 'Insufficient permissions',
        required: permissions,
        provided: scopes,
      })
    }
    
    // Continue to the next middleware or route handler
    return next()
  }
  
  /**
   * Derive permissions from the route path and HTTP method
   * Format: resource:action
   * Example: /api/users (GET) -> users:read
   */
  private derivePermissionsFromRoute(request: any): string[] {
    const path = request.url()
    const method = request.method().toLowerCase()
    
    // Extract resource from path
    // Example: /api/v1/users -> users
    const matches = path.match(/\/api(?:\/v\d+)?\/(\w+)(?:\/|$)/)
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
    
    return [`${resource}:${action}`]
  }
}
