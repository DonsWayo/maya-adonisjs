import vine from '@vinejs/vine'

export const createCompanyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    description: vine.string().trim().nullable(),
    website: vine.string().trim().url().nullable(),
    email: vine.string().email().toLowerCase().trim().nullable(),
    phone: vine.string().trim().maxLength(20).nullable(),
    address: vine.string().trim().nullable(),
    city: vine.string().trim().nullable(),
    state: vine.string().trim().nullable(),
    postalCode: vine.string().trim().nullable(),
    country: vine.string().trim().nullable(),
    // Owner is now managed through user_companies relationship
    logo: vine
      .file({
        extnames: ['png', 'jpg', 'jpeg', 'svg'],
        size: 2 * 1024 * 1024, // 2MB
      })
      .nullable(),
    customData: vine.any().optional(),
  })
)

export const editCompanyValidator = vine.withMetaData<{ companyId: string }>().compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    description: vine.string().trim().nullable(),
    website: vine.string().trim().url().nullable(),
    email: vine.string().email().toLowerCase().trim().nullable(),
    phone: vine.string().trim().maxLength(20).nullable(),
    address: vine.string().trim().nullable(),
    city: vine.string().trim().nullable(),
    state: vine.string().trim().nullable(),
    postalCode: vine.string().trim().nullable(),
    country: vine.string().trim().nullable(),
    // Owner is now managed through user_companies relationship
    logo: vine
      .file({
        extnames: ['png', 'jpg', 'jpeg', 'svg'],
        size: 2 * 1024 * 1024, // 2MB
      })
      .nullable(),
    customData: vine.any().optional(),
  })
)
