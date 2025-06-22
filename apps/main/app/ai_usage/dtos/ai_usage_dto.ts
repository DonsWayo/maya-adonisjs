import { BaseModelDto } from '@adocasts.com/dto/base'
import AIUsage from '../models/ai_usage.js'

export default class AIUsageDto extends BaseModelDto {
  declare id: string
  declare companyId: string
  declare userId: string | null
  declare projectId: string | null
  declare appName: string
  declare provider: string
  declare model: string
  declare operation: string
  declare promptTokens: number
  declare completionTokens: number
  declare totalTokens: number
  declare promptCostCents: number
  declare completionCostCents: number
  declare totalCostCents: number
  declare totalCostDollars: number
  declare currency: string
  declare latencyMs: number | null
  declare cached: boolean
  declare success: boolean
  declare errorMessage: string | null
  declare feature: string | null
  declare metadata: Record<string, any> | null
  declare createdAt: string
  declare updatedAt: string

  constructor(usage?: AIUsage) {
    super()

    if (!usage) return

    this.id = usage.id
    this.companyId = usage.companyId
    this.userId = usage.userId
    this.projectId = usage.projectId
    this.appName = usage.appName
    this.provider = usage.provider
    this.model = usage.model
    this.operation = usage.operation
    this.promptTokens = usage.promptTokens
    this.completionTokens = usage.completionTokens
    this.totalTokens = usage.totalTokens
    this.promptCostCents = usage.promptCostCents
    this.completionCostCents = usage.completionCostCents
    this.totalCostCents = usage.totalCostCents
    this.totalCostDollars = usage.totalCostDollars
    this.currency = usage.currency
    this.latencyMs = usage.latencyMs
    this.cached = usage.cached
    this.success = usage.success
    this.errorMessage = usage.errorMessage
    this.feature = usage.feature
    this.metadata = usage.metadata
    this.createdAt = usage.createdAt.toISO()!
    this.updatedAt = usage.updatedAt?.toISO() ?? usage.createdAt.toISO()!
  }
}