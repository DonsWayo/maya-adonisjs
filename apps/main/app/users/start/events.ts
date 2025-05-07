import emitter from '@adonisjs/core/services/emitter'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'

import WelcomeNotification from '#users/mails/welcome_notification'

// Keep existing welcome notification
emitter.on('user:registered', async function (data) {
  await mail.send(new WelcomeNotification(data.user, data.message))
})

// Add user event handlers
emitter.on('user:created', async function (data) {
  logger.info(`User created: ${data.user.id}`)
})

emitter.on('user:updated', async function (data) {
  logger.info(`User updated: ${data.user.id}`)
})

emitter.on('user:deleted', async function (data) {
  logger.info(`User deleted: ${data.userId}`)
})

// Add Logto webhook handler
emitter.on('logto:webhook', async function (data) {
  logger.info(`Logto webhook received: ${data.event}`)
})
