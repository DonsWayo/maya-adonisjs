import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
//import mail from '@adonisjs/mail/services/main'

/**
 * Listen for AI usage limit warnings
 */
emitter.on('ai_usage:limit_warning', async (event) => {
  const { limit, percentage, limitType } = event
  
  logger.warn({
    companyId: limit.companyId,
    limitType,
    percentage,
    period: limit.period
  }, `AI usage warning: ${limitType} at ${percentage.toFixed(1)}% for ${limit.period} period`)
  
  // TODO: Send email notification to company admin
})

/**
 * Listen for AI usage limit exceeded
 */
emitter.on('ai_usage:limit_exceeded', async (event) => {
  const { usage, limit, limitType } = event
  
  logger.error({
    companyId: limit.companyId,
    limitType,
    period: limit.period,
    usageId: usage.id
  }, `AI usage limit exceeded: ${limitType} for ${limit.period} period`)
  
  // TODO: Send email notification to company admin
  // TODO: Consider blocking further AI requests
})