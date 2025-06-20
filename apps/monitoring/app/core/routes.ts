import router from '@adonisjs/core/services/router'

// Core routes
router.get('version', () => {
  return { version: '1.0.0' }
})

// Authentication routes
router.get('login', async ({ response }) => {
  // Redirect to Logto for authentication
  return response.redirect('/logto/redirect')
})

// Home route
router.get('/', async ({ response }) => {
  return response.redirect('/projects')
})
