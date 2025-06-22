import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import BaseModel from '#common/models/base_model'
import User from '#users/models/user'
import Company from '#companies/models/company'

export default class AIUsage extends BaseModel {
  static table = 'ai_usage'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare companyId: string

  @column()
  declare userId: string | null

  @column()
  declare projectId: string | null

  @column()
  declare appName: string

  @column()
  declare provider: string

  @column()
  declare model: string

  @column()
  declare operation: 'generate' | 'embed' | 'extract' | 'stream'

  @column()
  declare promptTokens: number

  @column()
  declare completionTokens: number

  @column()
  declare totalTokens: number

  @column()
  declare promptCostCents: number

  @column()
  declare completionCostCents: number

  @column()
  declare totalCostCents: number

  @column()
  declare currency: string

  @column()
  declare latencyMs: number | null

  @column()
  declare cached: boolean

  @column()
  declare success: boolean

  @column()
  declare errorMessage: string | null

  @column()
  declare feature: string | null

  @column()
  declare prompt: string | null

  @column()
  declare completion: string | null

  @column()
  declare metadata: Record<string, any> | null

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  /**
   * Get cost in dollars (converts from cents)
   */
  get totalCostDollars(): number {
    return this.totalCostCents / 100
  }

  get promptCostDollars(): number {
    return this.promptCostCents / 100
  }

  get completionCostDollars(): number {
    return this.completionCostCents / 100
  }
}