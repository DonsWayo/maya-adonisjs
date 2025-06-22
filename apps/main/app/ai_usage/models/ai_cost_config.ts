import { column } from '@adonisjs/lucid/orm'
import BaseModel from '#common/models/base_model'
import { DateTime } from 'luxon'

export default class AICostConfig extends BaseModel {
  static table = 'ai_cost_config'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare provider: string

  @column()
  declare model: string

  @column()
  declare operation: 'generate' | 'embed'

  @column({ columnName: 'prompt_cost_per_1k_cents' })
  declare promptCostPer1kCents: number

  @column({ columnName: 'completion_cost_per_1k_cents' })
  declare completionCostPer1kCents: number

  @column.dateTime({ columnName: 'effective_from' })
  declare effectiveFrom: DateTime

  @column.dateTime({ columnName: 'effective_to' })
  declare effectiveTo: DateTime | null

  /**
   * Calculate cost for token usage
   */
  calculateCost(promptTokens: number, completionTokens: number = 0): {
    promptCostCents: number
    completionCostCents: number
    totalCostCents: number
  } {
    const promptCostCents = Math.ceil((promptTokens / 1000) * this.promptCostPer1kCents)
    const completionCostCents = Math.ceil((completionTokens / 1000) * this.completionCostPer1kCents)
    
    return {
      promptCostCents,
      completionCostCents,
      totalCostCents: promptCostCents + completionCostCents
    }
  }

  /**
   * Check if config is currently active
   */
  isActive(date: DateTime = DateTime.now()): boolean {
    return date >= this.effectiveFrom && (!this.effectiveTo || date <= this.effectiveTo)
  }

  /**
   * Get active config for provider/model/operation
   */
  static async getActiveConfig(
    provider: string,
    model: string,
    operation: 'generate' | 'embed'
  ): Promise<AICostConfig | null> {
    return await this.query()
      .where('provider', provider)
      .where('model', model)
      .where('operation', operation)
      .where('effectiveFrom', '<=', DateTime.now().toSQL())
      .where((query) => {
        query.whereNull('effectiveTo').orWhere('effectiveTo', '>', DateTime.now().toSQL())
      })
      .orderBy('effectiveFrom', 'desc')
      .first()
  }
}