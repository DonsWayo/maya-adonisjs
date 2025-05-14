import type { HttpContext } from '@adonisjs/core/http'
import { afterAuthRedirectRoute } from '#config/auth'
import mainAppService from '#services/main_app_service'

export default class SocialController {
  async redirect({ ally, params }: HttpContext) {
    console.log('SocialController.redirect called with provider:', params.provider)
    
    const driverInstance = ally.use(params.provider)
    
    // Log the driver instance configuration
    console.log('Driver instance:', {
      provider: params.provider,
      // @ts-ignore - Access internal config for debugging
      clientId: driverInstance.config?.clientId,
      // @ts-ignore - Access internal config for debugging
      callbackUrl: driverInstance.config?.callbackUrl
    })
    
    return driverInstance.redirect()
  }

  async callback({ ally, auth, params, response, session }: HttpContext) {
    const social = ally.use(params.provider)

    /**
     * User has denied access by canceling the login flow
     */
    if (social.accessDenied()) {
      session.flash('errors', 'auth.social.error.access_denied')
      return response.redirect('/logto/redirect')
    }

    /**
     * OAuth state verification failed. This happens when the
     * CSRF cookie gets expired.
     */
    if (social.stateMisMatch()) {
      session.flash('errors', 'auth.social.error.state_mismatch')
      return response.redirect('/logto/redirect')
    }

    /**
     * Provider responded with some error
     */
    if (social.hasError()) {
      session.flash('errors', 'auth.social.error.unknown')
      return response.redirect('/logto/redirect')
    }

    /**
     * Access user info from Logto
     */
    const socialUser = await social.user()
    
    // Log the social user data for debugging
    console.log('Logto user data:', socialUser)

    try {
      // Check if user exists in main app by fetching with Logto ID (sub)
      let mainAppUser = null
      
      try {
        // Try to get user by external ID from main app using the Logto sub field
        mainAppUser = await mainAppService.getUserByExternalId(socialUser.sub)
        console.log('User found in main app by external ID:', socialUser.sub)
      } catch (error) {
        console.log('User not found in main app by external ID, will need to be created')
      }
      
      // If user doesn't exist in main app, we need to create it
      if (!mainAppUser) {
        console.log('User needs to be created in main app with Logto ID:', socialUser.sub)
        
        // Prepare user data for creation
        const userData = {
          externalId: socialUser.sub,
          email: socialUser.email,
          fullName: socialUser.name || socialUser.username,
          username: socialUser.username,
          avatarUrl: socialUser.picture
        }
        
        try {
          // Call API to create the user
          mainAppUser = await mainAppService.request('/users', 'POST', userData)
          console.log('User created in main app:', mainAppUser)
        } catch (createError) {
          console.error('Failed to create user in main app:', createError)
          
          // Fallback to using the social user data directly if creation fails
          mainAppUser = {
            id: socialUser.sub,
            email: socialUser.email,
            name: socialUser.name || socialUser.username,
            externalId: socialUser.sub
          }
        }
      }
      
      // Login the user using our session guard
      await auth.use('web').login(mainAppUser)
      
      return response.redirect(afterAuthRedirectRoute)
    } catch (error) {
      console.error('Error during authentication:', error)
      session.flash('errors', 'auth.social.error.authentication_failed')
      return response.redirect('/logto/redirect')
    }
  }
}
