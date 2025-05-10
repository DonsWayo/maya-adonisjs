/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import router from '@adonisjs/core/services/router'

const LogtoWebhookController = () => import('#webhooks/controllers/logto_webhook_controller')

router.post('/api/webhooks/logto', [LogtoWebhookController, 'handle'])

