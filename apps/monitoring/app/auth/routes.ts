/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import router from '@adonisjs/core/services/router'

const SocialController = () => import('#auth/controllers/social_controller')


router
  .get('/:provider/redirect', [SocialController, 'redirect'])
  .where('provider', /google|logto/)
  .as('social.create')

router.get('/:provider/callback', [SocialController, 'callback'])
  .where('provider', /google|logto/)
