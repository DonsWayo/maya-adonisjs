import type { HttpContext } from '@adonisjs/core/http'
import { sendWelcomeEmail } from '../../mail/index.js'

export default class DashboardController {
  public async handle({ inertia }: HttpContext) {
    await sendWelcomeEmail(
      'user@example.com',
      'John Doe',
      'https://example.com/welcome'
    )
    return inertia.render('analytics/dashboard')
  }
}
