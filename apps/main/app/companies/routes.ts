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

const CompaniesController = () => import('#companies/controllers/companies_controller')

router
  .resource('/companies', CompaniesController)
  .only(['index', 'create', 'store', 'show', 'update', 'destroy'])
  .use('*', middleware.auth())

/**
 * API routes for M2M communication
 * These routes are protected by the Logto JWT middleware
 * and require specific permissions
 */
router
  .group(() => {
    // Company endpoints
    router.get('/companies', [CompaniesController, 'indexApi'])
    router.get('/companies/:id', [CompaniesController, 'showApi'])
  })
  .prefix('/api/v1')
  .middleware([middleware.logtoJwt()])
  // Temporarily disabled permission checks for debugging M2M authentication
  // .middleware([middleware.logtoPermission()])
