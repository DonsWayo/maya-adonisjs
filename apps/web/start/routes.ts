import router from '@adonisjs/core/services/router'

// Import route modules
import authRoutes from '#auth/routes'
import usersRoutes from '#users/routes'
import marketingRoutes from '#marketing/routes'
import analyticsRoutes from '#analytics/routes'
import webhooksRoutes from '#webhooks/routes'

// Register all route modules
router.use(authRoutes)
router.use(usersRoutes)
router.use(marketingRoutes)
router.use(analyticsRoutes)
router.use(webhooksRoutes)

// Default route
router.get('/', async ({ response }) => {
  return response.redirect('/marketing')
})
