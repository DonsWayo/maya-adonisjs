import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'

export default class ErrorGroup extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare projectId: string

  @column()
  declare fingerprintHash: string

  @column()
  declare fingerprint: string[]

  @column()
  declare title: string

  @column()
  declare type: string

  @column()
  declare message: string

  @column()
  declare platform: string

  @column()
  declare status: 'unresolved' | 'resolved' | 'ignored' | 'reviewing'

  @column()
  declare eventCount: number

  @column()
  declare userCount: number

  @column()
  declare metadata: {
    level?: string
    environment?: string
    release?: string
    stats?: {
      last24h: number
      last7d: number
      last30d: number
    }
    lastAnalysisCount?: number
    lastAnalysisDate?: string
    [key: string]: any
  }

  @column()
  declare aiSummary: string | null

  @column()
  declare aiSuggestions: string[] | null

  @column()
  declare assigneeId: string | null

  @column.dateTime()
  declare firstSeen: DateTime

  @column.dateTime()
  declare lastSeen: DateTime

  @column.dateTime()
  declare resolvedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>
}
