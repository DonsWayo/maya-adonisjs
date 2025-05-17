import router from '@adonisjs/core/services/router'
import apiResourceService from '#auth/logto/services/api_resource_service'

const LogtoWebhookController = () => import('#auth/logto/controllers/logto_webhook_controller')

// Route to verify API resource scopes
router.get('/api/logto/verify-scopes', async ({ response }) => {
  const result = await apiResourceService.verifyApiResourceScopes()
  return response.json(result)
})

// Webhook route for Logto events
router.post('/api/webhooks/logto', [LogtoWebhookController, 'handle'])
