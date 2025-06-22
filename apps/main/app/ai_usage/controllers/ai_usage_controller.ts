import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import AIUsage from '../models/ai_usage.js'
import AIUsageLimit from '../models/ai_usage_limit.js'
import AIUsageDto from '../dtos/ai_usage_dto.js'
import AIUsageService from '../services/ai_usage_service.js'
import { usageQueryValidator, setUsageLimitsValidator, recordUsageValidator } from '../validators.js'

export default class AIUsageController {
  /**
   * Get usage statistics for the current company
   */
  async index({ request, auth, response, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const company = await user.related('companies').query().firstOrFail()
    
    const { startDate, endDate } = await request.validateUsing(usageQueryValidator)
    
    const start = startDate ? DateTime.fromJSDate(startDate) : DateTime.now().minus({ days: 30 })
    const end = endDate ? DateTime.fromJSDate(endDate) : DateTime.now()

    const aiUsageService = new AIUsageService()
    const summary = await aiUsageService.getUsageSummary(
      company.id,
      start,
      end
    )

    // For API requests
    if (request.header('accept')?.includes('application/json')) {
      return response.json(summary)
    }

    // For web UI
    return inertia.render('ai_usage/ui/pages/index', {
      summary
    })
  }

  /**
   * Get detailed usage records
   */
  async show({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const company = await user.related('companies').query().firstOrFail()

    const usage = await AIUsage.query()
      .where('id', params.id)
      .where('companyId', company.id)
      .firstOrFail()

    return response.json(new AIUsageDto(usage))
  }

  /**
   * Check if the company can make AI requests
   */
  async canMakeRequest({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const company = await user.related('companies').query().firstOrFail()

    const aiUsageService = new AIUsageService()
    const result = await aiUsageService.canMakeRequest(company.id)
    
    return response.json(result)
  }

  /**
   * Get current usage limits
   */
  async limits({ auth, response, request, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const company = await user.related('companies').query().firstOrFail()

    const limits = await AIUsageLimit.query()
      .where('companyId', company.id)
      .where('periodEnd', '>', DateTime.now().toSQL())

    // For API requests
    if (request.header('accept')?.includes('application/json')) {
      return response.json(limits)
    }

    // For web UI
    return inertia.render('ai_usage/ui/pages/limits', {
      limits
    })
  }

  /**
   * Set usage limits for the company
   */
  async setLimits({ request, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const company = await user.related('companies').query().firstOrFail()

    const validated = await request.validateUsing(setUsageLimitsValidator)

    const aiUsageService = new AIUsageService()
    const limit = await aiUsageService.setUsageLimits(
      company.id,
      validated.period,
      {
        maxRequests: validated.maxRequests,
        maxTokens: validated.maxTokens,
        maxCostCents: validated.maxCostCents,
        warningThresholdPercent: validated.warningThresholdPercent
      }
    )

    return response.json(limit)
  }

  /**
   * Record AI usage (for M2M calls from other apps)
   */
  async record({ request, response }: HttpContext) {
    const data = await request.validateUsing(recordUsageValidator)
    
    const aiUsageService = new AIUsageService()
    const usage = await aiUsageService.recordUsage(data)
    
    return response.json({ 
      success: true, 
      usageId: usage.id 
    })
  }
}