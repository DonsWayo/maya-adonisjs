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
    console.log('Logto user data:', JSON.stringify(socialUser, null, 2))
    console.log('Logto user original data:', JSON.stringify(socialUser.original, null, 2))

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
    } else {
      // Update existing user's externalId if it's not set but available from Logto
      if (!user.externalId && ((socialUser.original && socialUser.original.sub) || socialUser.id)) {
        const externalId = (socialUser.original && socialUser.original.sub) ? socialUser.original.sub : socialUser.id
        console.log(`Updating user ${user.id} with externalId ${externalId}`)
        user.externalId = externalId
        await user.save()
      }
    }

    await auth.use('web').login(user)

    // Check if the user has any companies using the ORM
    await user.load('companies', (query) => {
      query.where('is_primary', true)
    })
    
    // If user has a primary company, redirect to that company
    if (user.companies && user.companies.length > 0) {
      const primaryCompany = user.companies[0]
      return response.redirect().toRoute('companies.show', { id: primaryCompany.id })
    }
    
    // If user has no companies, redirect to company creation page
    // Store the intended URL in case we need to redirect back after company creation
    session.put('intended_url', afterAuthRedirectRoute)
    return response.redirect().toRoute('companies.create')
  }
}
