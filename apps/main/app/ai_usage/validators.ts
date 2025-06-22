import vine from '@vinejs/vine'

/**
 * Validator for setting usage limits
 */
export const setUsageLimitsValidator = vine.compile(
  vine.object({
    period: vine.enum(['daily', 'weekly', 'monthly']),
    maxRequests: vine.number().positive().optional(),
    maxTokens: vine.number().positive().optional(),
    maxCostCents: vine.number().positive().optional(),
    warningThresholdPercent: vine.number().positive().range([1, 100]).optional()
  })
)

/**
 * Validator for updating cost configuration
 */
export const updateCostConfigValidator = vine.compile(
  vine.object({
    provider: vine.string().trim().minLength(1),
    model: vine.string().trim().minLength(1),
    operation: vine.enum(['generate', 'embed']),
    promptCostPer1kCents: vine.number().positive(),
    completionCostPer1kCents: vine.number().min(0)
  })
)

/**
 * Validator for usage query parameters
 */
export const usageQueryValidator = vine.compile(
  vine.object({
    startDate: vine.date().optional(),
    endDate: vine.date().optional(),
    provider: vine.string().optional(),
    model: vine.string().optional(),
    feature: vine.string().optional()
  })
)

/**
 * Validator for recording AI usage
 */
export const recordUsageValidator = vine.compile(
  vine.object({
    companyId: vine.string().uuid(),
    userId: vine.string().uuid().optional(),
    projectId: vine.string().uuid().optional(),
    appName: vine.string().trim().minLength(1),
    provider: vine.string().trim().minLength(1),
    model: vine.string().trim().minLength(1),
    operation: vine.enum(['generate', 'embed', 'extract', 'stream']),
    promptTokens: vine.number().positive(),
    completionTokens: vine.number().min(0).optional(),
    latencyMs: vine.number().positive().optional(),
    success: vine.boolean().optional(),
    errorMessage: vine.string().optional(),
    feature: vine.string().optional(),
    prompt: vine.string().optional(),
    completion: vine.string().optional(),
    metadata: vine.object({}).optional()
  })
)