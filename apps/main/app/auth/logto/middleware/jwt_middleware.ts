import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import env from '#start/env'

/**
 * Middleware to verify Logto JWT tokens for API authentication
 */
export default class LogtoJwtMiddleware {
  /**
   * URL for Logto JWKS (JSON Web Key Set)
   */
  private jwks = createRemoteJWKSet(
    new URL(`${env.get('LOGTO_URL')}/oidc/jwks`)
  )

  /**
   * Handle the incoming request
   */
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx

    try {
      // Extract the token from the Authorization header
      const token = this.extractBearerToken(request.header('Authorization'))
      
      // Verify the JWT token
      const { payload } = await jwtVerify(
        token,
        this.jwks,
        {
          // Expected issuer of the token
          issuer: `${env.get('LOGTO_URL')}/oidc`,
          // Expected audience token (API resource identifier)
          audience: 'https://default.logto.app/api',
        }
      )
      
      // Extract user ID and scopes from the token
      const { sub, scope } = payload
      
      if (!sub) {
        return response.status(401).json({
          error: 'Invalid token: missing subject claim',
        })
      }
      
      // Store token information in the request for later use
      ctx.logtoToken = {
        userId: sub as string,
        scopes: scope ? (scope as string).split(' ') : [],
      }
      
      // Continue to the next middleware or route handler
      return next()
    } catch (error) {
      console.error('JWT verification error:', error)
      return response.status(401).json({
        error: 'Invalid or expired token',
      })
    }
  }

  /**
   * Extract the Bearer token from the Authorization header
   */
  private extractBearerToken(authHeader?: string): string {
    if (!authHeader) {
      throw new Error('Authorization header is missing')
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header is not in the Bearer scheme')
    }

    return authHeader.slice(7) // Remove 'Bearer ' prefix
  }
}

// Add type definition for the context extension
declare module '@adonisjs/core/http' {
  interface HttpContext {
    logtoToken?: {
      userId: string
      scopes: string[]
    }
  }
}
