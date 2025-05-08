import type { HttpContext } from '@adonisjs/core/http'
import { afterAuthRedirectRoute } from '#config/auth'

import User from '#users/models/user'
import Roles from '#users/enums/role'

export default class SocialController {
  async redirect({ ally, params }: HttpContext) {
    const driverInstance = ally.use(params.provider)

    return driverInstance.redirect()
  }

  async callback({ ally, auth, params, response, session }: HttpContext) {
    const social = ally.use(params.provider)

    /**
     * User has denied access by canceling
     * the login flow
     */
    if (social.accessDenied()) {
      session.flash('errors', 'auth.social.error.access_denied')

      return response.redirect().toRoute('auth.sign_up.show')
    }

    /**
     * OAuth state verification failed. This happens when the
     * CSRF cookie gets expired.
     */
    if (social.stateMisMatch()) {
      session.flash('errors', 'auth.social.error.state_mismatch')

      return response.redirect().toRoute('auth.sign_up.show')
    }

    /**
     * Provider responded with some error
     */
    if (social.hasError()) {
      session.flash('errors', 'auth.social.error.uknown')

      return response.redirect().toRoute('auth.sign_up.show')
    }

    /**
     * Access user info
     */
    const socialUser = await social.user()
    
    // Log the social user data for debugging
    console.log('Logto user data:', socialUser)
    console.log('Logto user original data:', socialUser.original)

    let user = await User.findBy('email', socialUser.email)

    if (!user) {
      // Create user with safe access to original sub field
      const userData = {
        fullName: socialUser.name,
        email: socialUser.email,
        avatarUrl: socialUser.avatarUrl,
        roleId: Roles.USER, // Add default user role
      }
      
      // Add externalId if available
      if (socialUser.original && socialUser.original.sub) {
        Object.assign(userData, { externalId: socialUser.original.sub })
      } else if (socialUser.id) {
        // Fallback to id if sub not available
        Object.assign(userData, { externalId: socialUser.id })
      }
      
      user = await User.create(userData)
    }

    await auth.use('web').login(user)

    return response.redirect().toRoute(afterAuthRedirectRoute)
  }
}
