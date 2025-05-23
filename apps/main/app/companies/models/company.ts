import { column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import { attachment, attachmentManager } from '@jrmc/adonis-attachment'
import type { Attachment } from '@jrmc/adonis-attachment/types/attachment'

import BaseModel from '#common/models/base_model'
import User from '#users/models/user'

export default class Company extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare website: string | null
  
  @column()
  declare email: string | null
  
  @column()
  declare phone: string | null
  
  @column()
  declare address: string | null
  
  @column()
  declare city: string | null
  
  @column()
  declare state: string | null
  
  @column()
  declare postalCode: string | null
  
  @column()
  declare country: string | null

  // Owner relationship is managed through user_companies relationship with role='admin'
  
  @column()
  declare externalId: string | null

  @attachment({ preComputeUrl: false })
  declare logo: Attachment

  @column()
  declare logoUrl: string | null

  @column({
    prepare: (value) => (typeof value === 'object' ? JSON.stringify(value) : value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare customData: Record<string, any>
  
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
  
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  // Company-user relationship methods are handled through the ManyToMany relationship

  @manyToMany(() => User, {
    pivotTable: 'user_companies',
    pivotForeignKey: 'company_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['role', 'is_primary', 'custom_data']
  })
  declare users: ManyToMany<typeof User>

  static async preComputeUrls(models: Company | Company[]) {
    if (Array.isArray(models)) {
      await Promise.all(models.map((model) => this.preComputeUrls(model)))
      return
    }

    if (!models.logo) {
      return
    }

    await attachmentManager.computeUrl(models.logo)
  }
}
