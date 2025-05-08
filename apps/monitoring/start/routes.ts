import router from '@adonisjs/core/services/router'

// Import route modules
import authRoutes from '#auth/routes'


// Register all route modules
router.use(authRoutes)

