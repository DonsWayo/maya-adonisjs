import vine from '@vinejs/vine'

/**
 * Validator for creating a new project
 */
export const createProjectValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255),
    slug: vine.string().trim().minLength(3).maxLength(100).regex(/^[a-z0-9-]+$/),
    platform: vine.string().trim(),
    description: vine.string().trim().nullable(),
    organizationId: vine.string().trim().nullable(),
    teamId: vine.string().trim().nullable(),
  })
)

/**
 * Validator for updating an existing project
 */
export const updateProjectValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255).optional(),
    slug: vine.string().trim().minLength(3).maxLength(100).regex(/^[a-z0-9-]+$/).optional(),
    platform: vine.string().trim().optional(),
    status: vine.string().trim().optional(),
    description: vine.string().trim().nullable().optional(),
    organizationId: vine.string().trim().nullable().optional(),
    teamId: vine.string().trim().nullable().optional(),
  })
)

/**
 * Validator for Sentry-compatible store endpoint
 * This is a simplified version as Sentry's actual schema is very complex
 */
export const storeErrorEventValidator = vine.compile(
  vine.object({
    event_id: vine.string().optional(),
    timestamp: vine.string().optional(),
    platform: vine.string(),
    level: vine.string().optional(),
    message: vine.string().optional(),
    logger: vine.string().optional(),
    transaction: vine.string().optional(),
    server_name: vine.string().optional(),
    release: vine.string().optional(),
    tags: vine.object({}).optional(),
    environment: vine.string().optional(),
    modules: vine.object({}).optional(),
    extra: vine.object({}).optional(),
    fingerprint: vine.array(vine.string()).optional(),
    user: vine.object({}).optional(),
    breadcrumbs: vine.array(vine.object({})).optional(),
    contexts: vine.object({}).optional(),
    request: vine.object({}).optional(),
    sdk: vine.object({
      name: vine.string().optional(),
      version: vine.string().optional(),
    }).optional(),
    exception: vine.object({
      values: vine.array(
        vine.object({
          type: vine.string(),
          value: vine.string(),
          module: vine.string().optional(),
          stacktrace: vine.object({}).optional(),
        })
      ).optional(),
    }).optional(),
  })
)
