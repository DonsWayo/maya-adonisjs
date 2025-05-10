import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

// Error event handlers
emitter.on('error:created', async function (data) {
  logger.info(`Error created: ${data.error.id}`)
})

emitter.on('error:updated', async function (data) {
  logger.info(`Error updated: ${data.error.id}`)
})

emitter.on('error:deleted', async function (data) {
  logger.info(`Error deleted: ${data.errorId}`)
})
