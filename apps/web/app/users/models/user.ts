import { belongsTo, column, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { DateTime } from 'luxon'

import { attachment, attachmentManager } from '@jrmc/adonis-attachment'
import type { Attachment } from '@jrmc/adonis-attachment/types/attachment'

import BaseModel from '#common/models/base_model'
import Role from '#users/models/role'

import Roles from '#users/enums/role'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare roleId: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string | null
  
  @column()
  declare username: string | null
  
  @column()
  declare primaryPhone: string | null
  
  @column()
  declare applicationId: string | null
  
  @column.dateTime()
  declare lastSignInAt: DateTime | null
  
  @column()
  declare externalId: string | null

  @attachment({ preComputeUrl: false })
  declare avatar: Attachment

  @column()
  declare avatarUrl: string | null

  @column({
    prepare: (value) => (typeof value === 'object' ? JSON.stringify(value) : value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare customData: Record<string, any>
  
  @column({
    prepare: (value) => (typeof value === 'object' ? JSON.stringify(value) : value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare profile: Record<string, any> | null
  
  @column({
    prepare: (value) => (typeof value === 'object' ? JSON.stringify(value) : value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare identities: Record<string, any> | null
  
  @column({
    prepare: (value) => (typeof value === 'object' ? JSON.stringify(value) : value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare ssoIdentities: Record<string, any> | null

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @computed()
  get isAdmin() {
    return this.roleId === Roles.ADMIN
  }

  static async preComputeUrls(models: User | User[]) {
    if (Array.isArray(models)) {
      await Promise.all(models.map((model) => this.preComputeUrls(model)))
      return
    }

    if (!models.avatar) {
      return
    }

    await attachmentManager.computeUrl(models.avatar)
  }

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
