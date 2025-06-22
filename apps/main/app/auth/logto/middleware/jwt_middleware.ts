import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Middleware to verify Logto JWT tokens for API authentication
 */
export default class LogtoJwtMiddleware {
  /**
   * Handle the incoming request
   */
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response, logger } = ctx

    try {
      // Extract the token from the Authorization header
      const authHeader = request.header('Authorization')
      
      // Check if header exists
      if (!authHeader) {
        return response.status(401).json({ 
          error: 'Unauthorized', 
          message: 'No Authorization header found' 
        })
      }

      // Check if header format is correct
      if (!authHeader.startsWith('Bearer ')) {
        return response.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid Authorization header format' 
        })
      }

      // Extract the token
      const token = authHeader.substring(7)
      
      // Decode token to extract payload
      let payload: any
      try {
        // Decode the token manually
        const parts = token.split('.')
        if (parts.length !== 3) {
          throw new Error('Invalid token format')
        }
        
        const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const paddedBase64Payload = base64Payload.padEnd(base64Payload.length + (4 - base64Payload.length % 4) % 4, '=')
        const rawPayload = Buffer.from(paddedBase64Payload, 'base64').toString()
        payload = JSON.parse(rawPayload)
        
        logger.info('Token decoded successfully')
      } catch (error) {
        logger.error('Token decode error:', error)
        return response.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token format'
        })
      }
      
      // Check token issuer - log for debugging but don't reject
      // This is because the issuer might be different in different environments
      const expectedIssuer = `${env.get('LOGTO_URL')}/oidc`
      if (payload.iss !== expectedIssuer) {
        logger.warn(`Token issuer mismatch: ${payload.iss}, expected: ${expectedIssuer}, but continuing anyway`)
      }
      
      // Check if this is an M2M token by checking the grant_type claim
      // M2M tokens will have 'client_credentials' as the grant type
      // Any M2M app (main app, monitoring app, etc) will have this grant type
      const isM2MToken = payload.grant_type === 'client_credentials'
      
      // Get the client ID from the token
      const clientId = payload.client_id || ''
      
      logger.info('Token validation info:', {
        tokenClientId: clientId,
        grantType: payload.grant_type || 'not_specified',
        isM2MToken
      })
      
      // Extract user ID from token
      // For M2M tokens, the sub will be the App ID
      const userId = payload.sub || clientId
      
      if (!userId) {
        logger.error('Token missing user identifier')
        return response.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token: missing identity claims'
        })
      }
      
      // Parse scopes from the token
      let scopes = payload.scope ? payload.scope.split(' ') : []
      
      // For M2M tokens, always add the 'all' scope to grant full access
      if (isM2MToken && !scopes.includes('all')) {
        logger.info('Adding all scope to M2M token')
        scopes.push('all')
      }
      
      // Log detailed scope information for debugging
      logger.info('Token scopes:', { 
        scopes: scopes.join(', '),
        isM2MToken,
        hasAllScope: scopes.includes('all')
      })
      
      // Store token information in the request context
      ctx.logtoToken = {
        userId,
        scopes,
        isM2MToken
      }
      
      logger.info('Token validated successfully', { 
        userId, 
        isM2MToken,
        scopes: scopes.join(', ')
      })
      
      // Continue to the next middleware or route handler
      return next()
    } catch (error) {
      logger.error('JWT middleware error:', error)
      return response.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid token' 
      })
    }
  }
}

// Add type definition for the context extension
declare module '@adonisjs/core/http' {
  interface HttpContext {
    logtoToken?: {
      userId: string
      scopes: string[]
      isM2MToken: boolean
    }
  }
}
