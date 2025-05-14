import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'

import WelcomeNotification from '#users/mails/welcome_notification'
export default class DashboardController {
  public async handle({ inertia, auth }: HttpContext) {
    await mail.send(new WelcomeNotification(auth.user!, "message"))

    console.log('user', auth.user)
    return inertia.render('analytics/dashboard')
  }
}
