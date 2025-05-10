/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const SignOutController = () => import('#auth/controllers/sign_out_controller')
const SignUpController = () => import('#auth/controllers/sign_up_controller')
const SocialController = () => import('#auth/controllers/social_controller')

router.get('/logout', [SignOutController])

router.get('/sign-up', [SignUpController, 'show']).use(middleware.guest()).as('auth.sign_up.show')

router.post('/sign-up', [SignUpController]).use(middleware.guest()).as('auth.sign_up.handle')


router
  .get('/:provider/redirect', [SocialController, 'redirect'])
  .where('provider', /google|logto/)
  .as('social.create')

router.get('/:provider/callback', [SocialController, 'callback'])
  .where('provider', /google|logto/)

