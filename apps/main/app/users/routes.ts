/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const UsersController = () => import('#users/controllers/users_controller')
const ProfileController = () => import('#users/controllers/profile_controller')
const TokensController = () => import('#users/controllers/tokens_controller')
// Removed controllers that will be handled by Logto

router
  .resource('/users', UsersController)
  .only(['index', 'store', 'update', 'destroy'])
  .use('*', middleware.auth())

// Removed invite and impersonate routes - will be handled by Logto

router
  .get('/settings', ({ response }) => {
    return response.redirect().toRoute('profile.show')
  })
  .middleware(middleware.auth())

router.put('/settings/profile', [ProfileController]).middleware(middleware.auth())
router
  .get('/settings/profile', [ProfileController, 'show'])
  .middleware(middleware.auth())
  .as('profile.show')

router
  .resource('/settings/tokens', TokensController)
  .only(['index', 'destroy'])
  .middleware('*', middleware.auth())
  .as('tokens')

router.post('/api/tokens', [TokensController, 'store'])
  .middleware([middleware.auth(), middleware.logtoJwt()])
  // Apply permission check for token creation
  .middleware(middleware.logtoPermission())

/**
 * API routes for M2M communication
 * These routes are protected by the Logto JWT middleware
 * and require specific permissions
 */
router
  .group(() => {
    // User endpoints
    router.get('/users', [UsersController, 'indexApi'])
    // Define the more specific route first
    router.get('/users/external/:externalId', [UsersController, 'showByExternalId'])
    // Then the generic routes
    router.get('/users/:id', [UsersController, 'show'])
    router.get('/users/:id/companies', [UsersController, 'companies'])
  })
  .prefix('/api/v1')
  .middleware([middleware.logtoJwt()])
  // For API routes, we need to check for specific permissions
  .middleware([middleware.logtoPermission()])

