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

const ProjectsController = () => import('#error/controllers/projects_controller')
const ErrorEventsController = () => import('#error/controllers/error_events_controller')

// UI Routes (require authentication)

// Projects routes
router
  .resource('/projects', ProjectsController)
  .only(['index', 'create', 'store', 'show', 'edit', 'update', 'destroy'])
  .use('*', middleware.auth())

// Error events UI routes
router
  .get('/errors', [ErrorEventsController, 'allErrors'])
  .middleware(middleware.auth())

router
  .get('/projects/:projectId/errors', [ErrorEventsController, 'index'])
  .middleware(middleware.auth())

router
  .get('/projects/:projectId/errors/:id', [ErrorEventsController, 'show'])
  .middleware(middleware.auth())

// Project dashboard route
router
  .get('/projects/:projectId/dashboard', [ErrorEventsController, 'dashboard'])
  .middleware(middleware.auth())

// API Routes (no authentication required for error reporting)

// Sentry-compatible API endpoints for error reporting
router.post('/api/:projectId/store', [ErrorEventsController, 'store'])
router.post('/api/:publicKey/store', [ErrorEventsController, 'store'])
router.post('/api/:projectId/envelope/', [ErrorEventsController, 'store'])
router.post('/api/:publicKey/envelope/', [ErrorEventsController, 'store'])
