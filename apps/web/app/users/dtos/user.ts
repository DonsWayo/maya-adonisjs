import { BaseModelDto } from '@adocasts.com/dto/base'

import User from '#users/models/user'

export default class UserDto extends BaseModelDto {
  declare id: string
  declare roleId: number
  declare fullName: string | null
  declare role: string | null
  declare email: string | null
  declare username: string | null
  declare primaryPhone: string | null
  declare avatarUrl: string | null
  declare externalId: string | null
  declare lastSignInAt: string | null
  declare createdAt: string
  declare updatedAt: string | null

  constructor(user?: User) {
    super()

    if (!user) return

    this.id = user.id
    this.roleId = user.roleId
    this.role = user.role?.name
    this.fullName = user.fullName
    this.email = user.email
    this.username = user.username
    this.primaryPhone = user.primaryPhone
    this.externalId = user.externalId
    this.avatarUrl = user.avatar && user.avatar.url ? user.avatar.url : user.avatarUrl
    this.lastSignInAt = user.lastSignInAt ? user.lastSignInAt.toISO() : null
    this.createdAt = user.createdAt.toISO() || ''
    this.updatedAt = user.updatedAt ? user.updatedAt.toISO() || null : null
  }
}
