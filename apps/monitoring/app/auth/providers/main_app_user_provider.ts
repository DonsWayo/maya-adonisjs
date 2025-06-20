import mainAppService from '#services/main_app_service'
import { symbols } from '@adonisjs/auth'
import type { SessionGuardUser, SessionUserProviderContract } from '@adonisjs/auth/types/session'

/**
 * Type definition for a user from the main app
 */
type MainAppUser = {
  id: string | number
  email: string
  name: string
  [key: string]: any
}

/**
 * A user provider that fetches users from the main app
 *
 * This provider implements the SessionUserProviderContract interface
 * required by AdonisJS, but instead of using a local database model,
 * it fetches user data from the main app via MainAppService.
 */
export class MainAppUserProvider implements SessionUserProviderContract<MainAppUser> {
  /**
   * Symbol required by the SessionUserProviderContract interface
   */
  declare [symbols.PROVIDER_REAL_USER]: MainAppUser

  /**
   * Find a user by ID
   * This method tries to find a user by both regular ID and external ID (Logto ID)
   */
  async findById(id: string | number): Promise<SessionGuardUser<MainAppUser> | null> {
    try {
      let user = null
      const idStr = id.toString()

      // First try to get the user by UUID if it looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const isUuid = uuidRegex.test(idStr)

      if (isUuid) {
        try {
          user = await mainAppService.getUser(idStr)
          console.log(`User found by UUID: ${idStr}`)
        } catch (error) {
          // Silently handle UUID lookup failure
          console.log(`User not found by UUID: ${idStr}`)
        }
      } else {
        console.log(`ID ${idStr} is not a UUID, skipping UUID lookup`)
      }

      // If not found or not a UUID, try to get by external ID
      if (!user) {
        try {
          user = await mainAppService.getUserByExternalId(idStr)
          console.log(`User found by external ID: ${idStr}`, user)
        } catch (error) {
          // Only log this as an error if both lookups failed
          if (!isUuid) {
            console.log(`User not found by external ID: ${idStr}`)
          }
        }
      }

      if (!user) {
        return null
      }

      return this.createUserForGuard(user)
    } catch (error) {
      console.error('Error fetching user from main app:', error)
      return null
    }
  }

  /**
   * Create a user object for the auth guard
   */
  async createUserForGuard(user: MainAppUser): Promise<SessionGuardUser<MainAppUser>> {
    return {
      // Required methods for SessionGuardUser
      getId() {
        return user.id
      },
      getOriginal() {
        return user
      },
    }
  }
}

/**
 * Create a new main app user provider
 */
export function mainAppUserProvider() {
  return new MainAppUserProvider()
}
