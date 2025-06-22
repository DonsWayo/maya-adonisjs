import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import BaseModel from '#common/models/base_model'
import Company from '#companies/models/company'
import { DateTime } from 'luxon'

export type UsagePeriod = 'daily' | 'weekly' | 'monthly'

export default class AIUsageLimit extends BaseModel {
  static table = 'ai_usage_limits'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare companyId: string

  @column()
  declare period: UsagePeriod

  @column()
  declare maxRequests: number | null

  @column()
  declare maxTokens: number | null

  @column()
  declare maxCostCents: number | null

  @column()
  declare currentRequests: number

  @column()
  declare currentTokens: number

  @column()
  declare currentCostCents: number

  @column.dateTime()
  declare periodStart: DateTime

  @column.dateTime()
  declare periodEnd: DateTime

  @column()
  declare warningThresholdPercent: number

  @column()
  declare warningSent: boolean

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  /**
   * Check if any limit is exceeded
   */
  isLimitExceeded(): boolean {
    if (this.maxRequests && this.currentRequests >= this.maxRequests) return true
    if (this.maxTokens && this.currentTokens >= this.maxTokens) return true
    if (this.maxCostCents && this.currentCostCents >= this.maxCostCents) return true
    return false
  }

  /**
   * Check if warning threshold is reached
   */
  isWarningThresholdReached(): boolean {
    const threshold = this.warningThresholdPercent / 100

    if (this.maxRequests && this.currentRequests >= this.maxRequests * threshold) return true
    if (this.maxTokens && this.currentTokens >= this.maxTokens * threshold) return true
    if (this.maxCostCents && this.currentCostCents >= this.maxCostCents * threshold) return true
    
    return false
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage(): {
    requests: number | null
    tokens: number | null
    cost: number | null
  } {
    return {
      requests: this.maxRequests ? (this.currentRequests / this.maxRequests) * 100 : null,
      tokens: this.maxTokens ? (this.currentTokens / this.maxTokens) * 100 : null,
      cost: this.maxCostCents ? (this.currentCostCents / this.maxCostCents) * 100 : null
    }
  }

  /**
   * Check if period has expired
   */
  isPeriodExpired(): boolean {
    return DateTime.now() > this.periodEnd
  }
}