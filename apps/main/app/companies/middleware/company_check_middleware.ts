import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import User from '#users/models/user'

/**
 * Middleware to check if a user has a company
 * If not, redirect them to the company creation page
 */
export default class CompanyCheckMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Skip if not authenticated
    if (!ctx.auth.isAuthenticated) {
      return next()
    }

    const user = ctx.auth.user as User
    
    // Skip if user is admin
    if (user.isAdmin) {
      return next()
    }
    
    // Check if user has a company
    if (!user.companyId) {
      // Get current path
      const currentPath = ctx.request.url(true)
      
      // Skip redirect if already on company creation page or API routes
      if (currentPath.includes('/companies/create') || 
          currentPath.startsWith('/api/') || 
          currentPath.includes('/assets/')) {
        return next()
      }
      
      // Store the original URL to redirect back after company creation
      ctx.session.put('intended_url', currentPath)
      
      // Redirect to company creation page
      return ctx.response.redirect().toPath('/companies/create')
    }
    
    // User has a company, proceed
    return next()
  }
}
