import { createHmac, randomUUID } from 'node:crypto'
import { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
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
        signingKey: signingKey ? `${signingKey.substring(0, 5)}...${signingKey.substring(signingKey.length - 5)}` : 'MISSING',
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

      // Emit the webhook event
      await emitter.emit('logto:webhook', { event, data: payload })
      
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
      const rawBody = request.raw() || ''

      // Get the signature from the header - check both original and forwarded headers
      // This is important when behind a proxy
      const signature = request.header('logto-signature-sha-256') || 
                        request.header('x-forwarded-logto-signature-sha-256') || ''

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
          LOGTO_WEBHOOK_SIGNING_KEY: signingKey ? `${signingKey.substring(0, 5)}...` : 'MISSING',
        }),
      }, 'SIGNATURE VERIFICATION INFO')

      // Verify the signature if a signing key is provided
      if (signingKey && signature) {
        const isValid = this.verifySignature(signingKey, rawBody, signature, logger)
        
        if (!isValid) {
          logger.error('Invalid webhook signature')
          return response.status(401).send({ error: 'Invalid signature' })
        }
        
        logger.info('Webhook signature verified successfully')
      } else {
        logger.warn('Skipping signature verification - missing key or signature')
      }

      // Process the webhook based on the event type
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
          console.log(`Handling organization update event: ${payload.data?.id}`)
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
          console.log('Received password reset event')
          break

        // Organization scope and role events
        case 'OrganizationScope.Data.Updated':
          await this.handleOrganizationScopeUpdated(payload)
          break
        case 'OrganizationScope.Deleted':
          await this.handleOrganizationScopeDeleted(payload)
          break
        case 'OrganizationScope.Created':
          await this.handleOrganizationScopeCreated(payload)
          break
        case 'OrganizationRole.Data.Updated':
          await this.handleOrganizationRoleUpdated(payload)
          break
        case 'OrganizationRole.Deleted':
          await this.handleOrganizationRoleDeleted(payload)
          break
        case 'OrganizationRole.Created':
          await this.handleOrganizationRoleCreated(payload)
          break
        case 'OrganizationRole.Scopes.Updated':
          await this.handleOrganizationRoleScopesUpdated(payload)
          break
        case 'Organization.Membership.Updated':
          await this.handleOrganizationMembershipUpdated(payload)
          break
        default:
          console.log(`Unhandled Logto webhook event: ${event} - Hook ID: ${payload.hookId}`)
      }

      return response.status(200).send({ status: 'success' })
    } catch (error) {
      logger.error({ err: error }, 'Error processing webhook')
      return response.status(500).send({ error: 'Internal server error' })
    }
  }

  /**
   * Handle User.Created event
   * This event is triggered when a user is created in Logto
   */
  private async handleUserCreated(payload: any) {
    const data = payload.data
    
    // Check if the user already exists in our database
    let user = await User.findBy('email', data.primaryEmail)
    
    if (user) {
      console.log(`User with email ${data.primaryEmail} already exists, updating Logto ID`)
      
      // Update the existing user with Logto data
      user.merge({
        externalId: data.id, // Set the external ID
        // Also update in customData for backward compatibility
        customData: {
          ...user.customData,
          logtoUserId: data.id,
        },
      })
      
      await user.save()
      
      // Emit user updated event
      await emitter.emit('user:updated', { user, source: 'logto_webhook' })
    } else {
      console.log(`Creating new user with email ${data.primaryEmail} from Logto`)
      
      // Create a new user in our database with UUID
      user = new User()
      user.id = randomUUID()
      user.merge({
        fullName: data.name,
        email: data.primaryEmail,
        avatarUrl: data.avatar,
        roleId: Roles.USER, // Default role
        externalId: data.id, // Store the Logto user ID as external ID
        // Also store in customData for backward compatibility
        customData: {
          logtoUserId: data.id,
        },
      })
      
      await user.save()
      
      // Emit user created event
      await emitter.emit('user:created', { user, source: 'logto_webhook' })
      
      console.log(`Created new user with email ${data.primaryEmail} from Logto`)
    }
  }

  /**
   * Handle User.Data.Updated event
   * This event is triggered when user data is updated in Logto
   */
  private async handleUserUpdated(payload: any) {
    const data = payload.data
    
    // Find the user by Logto ID in customData or by email
    let user = await User.query()
      .where('customData->logtoUserId', data.id)
      .first()
    
    if (!user && data.primaryEmail) {
      user = await User.findBy('email', data.primaryEmail)
    }
    
    if (!user) {
      console.log(`User with Logto ID ${data.id} not found, creating...`)
      return await this.handleUserCreated(payload)
    }
    
    // Update the user with the latest data from Logto
    user.merge({
      fullName: data.name,
      email: data.primaryEmail,
      avatarUrl: data.avatar,
      externalId: data.id, // Update the external ID
      // Also update in customData for backward compatibility
      customData: {
        ...user.customData,
        logtoUserId: data.id,
      },
    })
    
    await user.save()
    
    // Emit user updated event
    await emitter.emit('user:updated', { user, source: 'logto_webhook' })
    
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
      console.log(`User ${userId} removed from organization ${organizationId}`)
    }
  }

  /**
   * Handle User.Deleted event
   */
  private async handleUserDeleted(payload: any) {
    const logtoUserId = payload.data?.id
    
    if (!logtoUserId) {
      console.log('No user ID provided in User.Deleted event')
      return
    }
    
    // Find the user by Logto ID in customData
    const user = await User.query()
      .where('customData->logtoUserId', logtoUserId)
      .first()
    
    if (!user) {
      console.log(`User with Logto ID ${logtoUserId} not found for deletion`)
      return
    }
    
    const userId = user.id
    
    // Delete the user
    await user.delete()
    
    // Emit user deleted event
    await emitter.emit('user:deleted', { userId })
    
    console.log(`Deleted user with ID ${userId} and Logto ID ${logtoUserId}`)
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
      console.log(`Organization deleted: ${organizationId}`)
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
      
      // Create a new user in our database with UUID
      localUser = new User()
      localUser.id = randomUUID()
      localUser.merge({
        fullName: user.name,
        email: user.primaryEmail,
        avatarUrl: user.avatar,
        roleId: Roles.USER, // Default role
        externalId: user.id, // Store the Logto user ID as external ID
        // Also store in customData for backward compatibility
        customData: {
          logtoUserId: user.id,
          lastSignInAt: new Date().toISOString(),
        },
      })
      
      await localUser.save()
      
      // Emit user created event
      await emitter.emit('user:created', { user: localUser, source: 'logto_signin' })
      
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
      
      // Emit user updated event
      await emitter.emit('user:updated', { user: localUser, source: 'logto_signin' })
      
      console.log(`Updated last sign-in time for user with email ${user.primaryEmail}`)
    }
  }
  
  /**
   * Handle PostRegister event
   * This event is triggered after a user registers through Logto
   */
  private async handlePostRegister(payload: any) {
    // PostRegister has a different structure - user data is in payload.user
    // Convert it to match User.Created structure
    const userCreatedPayload = {
      ...payload,
      data: payload.user
    }
    await this.handleUserCreated(userCreatedPayload)
  }

  /**
   * Handle OrganizationScope.Created event
   */
  private async handleOrganizationScopeCreated(payload: any) {
    const data = payload.data
    console.log(`Organization scope created: ${data?.id} - ${data?.name}`)
    // Emit event for organization scope creation
    await emitter.emit('logto:webhook', { event: 'OrganizationScope.Created', data: payload })
  }

  /**
   * Handle OrganizationScope.Data.Updated event
   */
  private async handleOrganizationScopeUpdated(payload: any) {
    const data = payload.data
    console.log(`Organization scope updated: ${data?.id} - ${data?.name}`)
    // Emit event for organization scope update
    await emitter.emit('logto:webhook', { event: 'OrganizationScope.Data.Updated', data: payload })
  }

  /**
   * Handle OrganizationScope.Deleted event
   */
  private async handleOrganizationScopeDeleted(payload: any) {
    const data = payload.data
    console.log(`Organization scope deleted: ${data?.id}`)
    // Emit event for organization scope deletion
    await emitter.emit('logto:webhook', { event: 'OrganizationScope.Deleted', data: payload })
  }

  /**
   * Handle OrganizationRole.Created event
   */
  private async handleOrganizationRoleCreated(payload: any) {
    const data = payload.data
    console.log(`Organization role created: ${data?.id} - ${data?.name}`)
    // Emit event for organization role creation
    await emitter.emit('logto:webhook', { event: 'OrganizationRole.Created', data: payload })
  }

  /**
   * Handle OrganizationRole.Data.Updated event
   */
  private async handleOrganizationRoleUpdated(payload: any) {
    const data = payload.data
    console.log(`Organization role updated: ${data?.id} - ${data?.name}`)
    // Emit event for organization role update
    await emitter.emit('logto:webhook', { event: 'OrganizationRole.Data.Updated', data: payload })
  }

  /**
   * Handle OrganizationRole.Deleted event
   */
  private async handleOrganizationRoleDeleted(payload: any) {
    const data = payload.data
    console.log(`Organization role deleted: ${data?.id}`)
    // Emit event for organization role deletion
    await emitter.emit('logto:webhook', { event: 'OrganizationRole.Deleted', data: payload })
  }

  /**
   * Handle OrganizationRole.Scopes.Updated event
   */
  private async handleOrganizationRoleScopesUpdated(payload: any) {
    const data = payload.data
    console.log(`Organization role scopes updated: ${data?.id} - Scopes: ${JSON.stringify(data?.scopes)}`)
    // Emit event for organization role scopes update
    await emitter.emit('logto:webhook', { event: 'OrganizationRole.Scopes.Updated', data: payload })
  }

  /**
   * Handle Organization.Membership.Updated event
   */
  private async handleOrganizationMembershipUpdated(payload: any) {
    const data = payload.data
    console.log(`Organization membership updated: Organization ${data?.organizationId} - User ${data?.userId}`)
    // Emit event for organization membership update
    await emitter.emit('logto:webhook', { event: 'Organization.Membership.Updated', data: payload })
  }
}
