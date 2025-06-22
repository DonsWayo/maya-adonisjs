import type AIUsage from '../models/ai_usage.js'
import type AIUsageLimit from '../models/ai_usage_limit.js'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'ai_usage:recorded': {
      usage: AIUsage
      companyId: string
      userId?: string
    }
    'ai_usage:limit_exceeded': {
      usage: AIUsage
      limit: AIUsageLimit
      limitType: 'requests' | 'tokens' | 'cost'
    }
    'ai_usage:limit_warning': {
      limit: AIUsageLimit
      percentage: number
      limitType: 'requests' | 'tokens' | 'cost'
    }
    'ai_usage:cost_threshold_reached': {
      companyId: string
      currentCostCents: number
      thresholdCents: number
    }
  }
}