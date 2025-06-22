import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AIUsageController = () => import('./controllers/ai_usage_controller.js')

// Web routes (protected by auth)
router.group(() => {
  router.get('/ai-usage', [AIUsageController, 'index']).as('ai_usage.index')
  router.get('/ai-usage/limits', [AIUsageController, 'limits']).as('ai_usage.limits')
  router.get('/ai-usage/:id', [AIUsageController, 'show']).as('ai_usage.show')
}).middleware(middleware.auth())

// API routes (user authenticated)
router.group(() => {
  router.get('/ai-usage', [AIUsageController, 'index'])
  router.get('/ai-usage/:id', [AIUsageController, 'show'])
  router.get('/ai-usage/can-make-request', [AIUsageController, 'canMakeRequest'])
  router.get('/ai-usage/limits', [AIUsageController, 'limits'])
  router.post('/ai-usage/limits/:period', [AIUsageController, 'setLimits'])
}).prefix('/api/v1').middleware(middleware.auth())

// M2M API routes (JWT authenticated)
router.group(() => {
  router.post('/ai-usage/record', [AIUsageController, 'record'])
}).prefix('/api/v1')
  .middleware([middleware.logtoJwt()])
  .middleware([middleware.logtoPermission({ permissions: ['write:ai_usage'] })])