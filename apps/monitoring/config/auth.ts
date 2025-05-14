import { defineConfig } from '@adonisjs/auth'
import { sessionGuard } from '@adonisjs/auth/session'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'
import { mainAppUserProvider } from '../app/auth/providers/main_app_user_provider.js'

/**
 * Routes to redirect to after authentication events
 */
export const afterAuthRedirectRoute = '/projects'
export const afterAuthLogoutRedirectRoute = '/login'

/**
 * Define auth configuration
 * 
 * We're using the session guard with a custom user provider that fetches
 * user data from the main app instead of a local database model.
 * This approach avoids duplicating user data and keeps the main app
 * as the source of truth for user information.
 */
const authConfig = defineConfig({
  default: 'web',
  guards: {
    web: sessionGuard({
      useRememberMeTokens: false,
      provider: mainAppUserProvider(),
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
