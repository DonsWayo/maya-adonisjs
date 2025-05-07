import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(3).maxLength(255),
    email: vine.string().email().toLowerCase().trim().unique({ table: 'users', column: 'email' }).nullable(),
    username: vine.string().trim().minLength(3).maxLength(128).nullable(),
    primaryPhone: vine.string().trim().maxLength(20).nullable(),
    roleId: vine.number().exists({ table: 'roles', column: 'id' }),
    externalId: vine.string().trim().maxLength(255).nullable(),
    customData: vine.any().optional(),
  })
)

export const updateProfileValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(3).maxLength(255),
    avatar: vine
      .file({
        extnames: ['png', 'jpg', 'jpeg', 'gif'],
        size: 1 * 1024 * 1014,
      })
      .nullable(),
  })
)

export const createTokenValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255).optional(),
  })
)

export const inviteUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().toLowerCase().trim().unique({ table: 'users', column: 'email' }),
    description: vine.string().trim().optional(),
    roleId: vine.number().exists({ table: 'roles', column: 'id' }),
  })
)

// Removed updatePasswordValidator as we no longer handle passwords with Logto integration

export const editUserValidator = vine.withMetaData<{ userId: string }>().compile(
  vine.object({
    fullName: vine.string().trim().minLength(3).maxLength(255),
    email: vine
      .string()
      .email()
      .toLowerCase()
      .trim()
      .nullable(),
    username: vine.string().trim().minLength(3).maxLength(128).nullable(),
    primaryPhone: vine.string().trim().maxLength(20).nullable(),
    roleId: vine.number().exists({ table: 'roles', column: 'id' }),
    externalId: vine.string().trim().maxLength(255).nullable(),
    customData: vine.any().optional(),
  })
)
