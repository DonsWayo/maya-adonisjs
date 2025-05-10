import router from '@adonisjs/core/services/router'

// Import route modules
import authRoutes from '#auth/routes'
import errorRoutes from '#error/routes'


// Register all route modules
router.use(authRoutes)
router.use(errorRoutes)

// Dashboard redirect
router.get('/dashboard', async ({ response }) => {
  return response.redirect('/projects')
})
