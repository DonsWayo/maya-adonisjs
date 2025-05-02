import { createHmac } from 'node:crypto'
import { HttpContext } from '@adonisjs/core/http'
import User from '#users/models/user'
import Roles from '#users/enums/role'
import env from '#start/env'

/**
 * Controller to handle Logto webhook events
 * 
 * This controller processes webhook events from Logto, such as:
 * - User.Created: When a user is created in Logto
 * - User.Data.Updated: When user data is updated in Logto
 * - Organization.Created: When an organization is created in Logto
 * - Organization.Data.Updated: When organization data is updated in Logto
 * - Organization.User.Added: When a user is added to an organization
 * - Organization.User.Removed: When a user is removed from an organization
 */
export default class LogtoWebhookController {
  /**
   * Verify the webhook signature
   * 
   * Implementation directly from Logto documentation:
   * https://docs.logto.io/developers/webhooks/secure-webhooks
   */
  /**
   * Verify the webhook signature using HMAC SHA-256
   * 
   * Implementation directly from Logto documentation:
   * https://docs.logto.io/developers/webhooks/secure-webhooks
   */
  private verifySignature(signingKey: string, rawBody: Buffer | string, expectedSignature: string, logger: any): boolean {
    try {
      // Create HMAC using the signing key
      const hmac = createHmac('sha256', signingKey)
      
      // Update HMAC with the raw body
      hmac.update(rawBody)
      
      // Get the calculated signature
      const calculatedSignature = hmac.digest('hex')
      
      // Log signature details for debugging
      logger.info({
        signingKey,
        expectedSignature,
        calculatedSignature,
        matches: calculatedSignature === expectedSignature,
        bodyType: typeof rawBody,
        isBuffer: Buffer.isBuffer(rawBody),
        bodyLength: rawBody.length,
        bodySample: Buffer.isBuffer(rawBody) 
          ? `Buffer: ${rawBody.toString('hex').substring(0, 30)}...` 
          : `String: ${String(rawBody).substring(0, 30)}...`,
      }, 'SIGNATURE VERIFICATION DETAILS')
      
      // Return true if signatures match
      return calculatedSignature === expectedSignature
    } catch (error) {
      logger.error({ err: error }, 'Error in signature verification')
      return false
    }
  }
  /**
   * Handle the webhook request
   */
  async handle({ request, response, logger }: HttpContext) {
    try {
      // Get the webhook event data from the request body
      const payload = request.body()
      const event = payload.event

      // Log the webhook request details with EVERYTHING
      logger.info({
        url: request.url(),
        method: request.method(),
        headers: JSON.stringify(request.headers()),
        body: JSON.stringify(request.body()),
        params: JSON.stringify(request.params()),
        qs: JSON.stringify(request.qs()),
        event: request.input('event'),
        hookId: request.input('hookId'),
        requestId: request.id(),
      }, 'WEBHOOK REQUEST RECEIVED - FULL DETAILS')

      // Get the raw request body for signature verification
      // IMPORTANT: This must be the exact raw body that Logto sent
      const rawBody = request.raw()

      // Get the signature from the header - check both original and forwarded headers
      // This is important when behind a proxy
      const signature = request.header('logto-signature-sha-256') || 
                        request.header('x-forwarded-logto-signature-sha-256')

      // Get the webhook signing key from environment variables
      const signingKey = env.get('LOGTO_WEBHOOK_SIGNING_KEY')

      console.log('SIGNING_KEY:', signingKey)

      // Log the signature and key information - FULL DETAILS
      logger.info({
        signature: signature || 'MISSING',
        signingKey: signingKey ? `${signingKey.substring(0, 5)}...${signingKey.substring(signingKey.length - 5)}` : 'MISSING',
        signatureLength: signature?.length || 0,
        signingKeyLength: signingKey?.length || 0,
        allHeaders: JSON.stringify(request.headers()),
        allEnvVars: JSON.stringify({
          NODE_ENV: env.get('NODE_ENV'),
          APP_KEY: env.get('APP_KEY')?.substring(0, 5) + '...',
        }),
      }, 'WEBHOOK SIGNATURE DETAILS - FULL')

      // Verify the signature
      if (!signature || !signingKey || !rawBody) {
        logger.error({
          hasSignature: !!signature, 
          hasSigningKey: !!signingKey, 
          hasRawBody: !!rawBody,
          requestId: request.id(),
        }, 'MISSING WEBHOOK REQUIREMENTS')
        return response.status(401).json({
          error: 'Missing signature, signing key, or request body',
        })
      }

      // Log raw body information - COMPLETE DUMP
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)
      
      logger.info({
        bodyType: typeof rawBody,
        isBuffer: Buffer.isBuffer(rawBody),
        bodyLength: rawBody.length,
        bodyHex: Buffer.isBuffer(rawBody) ? rawBody.toString('hex').substring(0, 100) + '...' : 'N/A',
        bodyUtf8: bodyStr.substring(0, 1000) + (bodyStr.length > 1000 ? '...' : ''), // Limit the log size
        requestId: request.id(),
      }, 'RAW BODY DUMP')
      
      try {
        // Also log the parsed JSON for debugging
        const parsedBody = JSON.parse(bodyStr)
        logger.info({
          parsedBody: JSON.stringify(parsedBody).substring(0, 1000) + '...',
          requestId: request.id(),
        }, 'PARSED BODY SAMPLE')
      } catch (e) {
        logger.warn({ error: e.message, requestId: request.id() }, 'Failed to parse body as JSON')
      }

      // Verify the signature
      if (!this.verifySignature(signingKey, rawBody, signature, logger)) {
        logger.error({
          event: request.input('event'),
          requestId: request.id(),
        }, 'INVALID WEBHOOK SIGNATURE - ALL METHODS FAILED')
        return response.status(401).json({
          error: 'Invalid signature',
        })
      }

      logger.info({ event, hookId: payload.hookId }, 'Processing Logto webhook event')

      // Log the full payload for debugging
      logger.debug({ payload }, 'Full webhook payload')
      
      // Handle different event types
      // Note: We need to be careful with case sensitivity in the event names
      switch (event) {
        // User events
        case 'User.Created':
          await this.handleUserCreated(payload)
          break
        case 'User.Updated':
        case 'User.Data.Updated':
          await this.handleUserUpdated(payload)
          break
        case 'User.Deleted':
          await this.handleUserDeleted(payload)
          break

        // Organization events
        case 'Organization.Created':
          await this.handleOrganizationCreated(payload)
          break
        case 'Organization.Updated':
        case 'Organization.Data.Updated':
          logger.info({ organizationId: payload.data?.id }, 'Handling organization update event')
          await this.handleOrganizationUpdated(payload)
          break
        case 'Organization.Deleted':
          await this.handleOrganizationDeleted(payload)
          break
        case 'Organization.User.Added':
          await this.handleOrganizationUserAdded(payload)
          break
        case 'Organization.User.Removed':
          await this.handleOrganizationUserRemoved(payload)
          break

        // Post events
        case 'PostSignIn':
        case 'Post.SignIn':
          await this.handlePostSignIn(payload)
          break
        case 'PostRegister':
        case 'Post.Register':
          await this.handlePostRegister(payload)
          break
        case 'PostResetPassword':
        case 'Post.ResetPassword':
          logger.info('Received password reset event')
          break

        // Organization scope and role events
        case 'OrganizationScope.Data.Updated':
        case 'OrganizationScope.Deleted':
        case 'OrganizationScope.Created':
        case 'OrganizationRole.Data.Updated':
        case 'OrganizationRole.Deleted':
        case 'OrganizationRole.Created':
        case 'OrganizationRole.Scopes.Updated':
        case 'Organization.Membership.Updated':
          // These events are seen in the logs but not explicitly handled yet
          logger.info({ event, data: payload.data }, 'Received organization management event')
          break

        default:
          logger.warn({ event, hookId: payload.hookId }, `Unhandled Logto webhook event: ${event}`)
      }

      return response.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      })
    } catch (error) {
      logger.error({ err: error }, 'Error processing webhook')
      return response.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Handle User.Created event
   * This event is triggered when a user is created in Logto
   */
  private async handleUserCreated(payload: any) {
    const { data } = payload
    
    // Check if user already exists in our database
    const existingUser = await User.findBy('email', data.primaryEmail)
    
    if (existingUser) {
      console.log(`User with email ${data.primaryEmail} already exists, updating...`)
      
      // Update the existing user with Logto data
      existingUser.merge({
        fullName: data.name,
        email: data.primaryEmail,
        avatarUrl: data.avatar,
        // Store the Logto user ID in customData
        customData: {
          ...existingUser.customData,
          logtoUserId: data.id,
        },
      })
      
      await existingUser.save()
      return
    }
    
    // Create a new user in our database
    await User.create({
      fullName: data.name,
      email: data.primaryEmail,
      avatarUrl: data.avatar,
      roleId: Roles.USER, // Default role
      // Store the Logto user ID in customData
      customData: {
        logtoUserId: data.id,
      },
    })
    
    console.log(`Created new user with email ${data.primaryEmail} from Logto`)
  }
  
  /**
   * Handle User.Data.Updated event
   * This event is triggered when user data is updated in Logto
   */
  private async handleUserUpdated(payload: any) {
    const { data } = payload
    
    // Find the user in our database by Logto user ID or email
    let user = await User.query()
      .where('customData->logtoUserId', data.id)
      .first()
    
    if (!user && data.primaryEmail) {
      user = await User.findBy('email', data.primaryEmail)
    }
    
    if (!user) {
      console.log(`User with Logto ID ${data.id} not found, creating...`)
      await this.handleUserCreated(payload)
      return
    }
    
    // Update the user with the latest data from Logto
    user.merge({
      fullName: data.name,
      email: data.primaryEmail,
      avatarUrl: data.avatar,
      // Update the Logto user ID in customData
      customData: {
        ...user.customData,
        logtoUserId: data.id,
      },
    })
    
    await user.save()
    console.log(`Updated user with email ${data.primaryEmail} from Logto`)
  }
  
  /**
   * Handle Organization.Created event
   * This event is triggered when an organization is created in Logto
   */
  private async handleOrganizationCreated(payload: any) {
    // Implement organization creation logic if needed
    console.log('Organization created in Logto:', payload.data)
  }
  
  /**
   * Handle Organization.Data.Updated event
   * This event is triggered when organization data is updated in Logto
   */
  private async handleOrganizationUpdated(payload: any) {
    // Implement organization update logic if needed
    console.log('Organization updated in Logto:', payload.data)
  }
  
  /**
   * Handle Organization.User.Added event
   * This event is triggered when a user is added to an organization in Logto
   */
  private async handleOrganizationUserAdded(payload: any) {
    // Implement organization user added logic if needed
    console.log('User added to organization in Logto:', payload.data)
  }
  
  /**
   * Handle Organization.User.Removed event
   * This event is triggered when a user is removed from an organization in Logto
   */
  private async handleOrganizationUserRemoved(payload: any) {
    // Implementation for handling organization user removed event
    // Log the event for auditing purposes
    const organizationId = payload.data?.organizationId
    const userId = payload.data?.userId
    if (organizationId && userId) {
      // Log the user removal from organization event
    }
  }

  /**
   * Handle User.Deleted event
   */
  private async handleUserDeleted(payload: any) {
    // Implementation for handling user deleted event
    // Log the event for auditing purposes
    const userId = payload.data?.id
    if (userId) {
      // Log the user deletion event
    }
  }

  /**
   * Handle Organization.Deleted event
   */
  private async handleOrganizationDeleted(payload: any) {
    // Implementation for handling organization deleted event
    // Log the event for auditing purposes
    const organizationId = payload.data?.id
    if (organizationId) {
      // Log the organization deletion event
    }
  }

  /**
   * Handle PostSignIn event
   * This event is triggered after a user signs in through Logto
   */
  private async handlePostSignIn(payload: any) {
    const { user } = payload
    
    // Find the user in our database
    let localUser = await User.query()
      .where('customData->logtoUserId', user.id)
      .first()
    
    if (!localUser && user.primaryEmail) {
      localUser = await User.findBy('email', user.primaryEmail)
    }
    
    if (!localUser) {
      console.log(`User with Logto ID ${user.id} not found on sign-in, creating...`)
      
      // Create a new user in our database
      await User.create({
        fullName: user.name,
        email: user.primaryEmail,
        avatarUrl: user.avatar,
        roleId: Roles.USER, // Default role
        // Store the Logto user ID in customData
        customData: {
          logtoUserId: user.id,
        },
      })
      
      console.log(`Created new user with email ${user.primaryEmail} from Logto sign-in`)
    } else {
      // Update the user's last sign-in timestamp
      localUser.merge({
        customData: {
          ...localUser.customData,
          lastSignInAt: new Date().toISOString(),
        },
      })
      
      await localUser.save()
      console.log(`Updated last sign-in time for user with email ${user.primaryEmail}`)
    }
  }
  
  /**
   * Handle PostRegister event
   * This event is triggered after a user registers through Logto
   */
  private async handlePostRegister(payload: any) {
    // This is similar to User.Created but specifically for registration
    await this.handleUserCreated(payload)
  }
}
