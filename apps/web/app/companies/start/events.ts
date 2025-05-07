import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

// Company event handlers
emitter.on('company:created', async function (data) {
  logger.info(`Company created: ${data.company.id}`)
})

emitter.on('company:updated', async function (data) {
  logger.info(`Company updated: ${data.company.id}`)
})

emitter.on('company:deleted', async function (data) {
  logger.info(`Company deleted: ${data.companyId}`)
})
