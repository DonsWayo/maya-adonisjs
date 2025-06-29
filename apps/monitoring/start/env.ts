/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/


import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  APP_URL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  // Email configuration
  // Either SMTP or Resend can be used
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_SECURE: Env.schema.boolean.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string({ format: 'email' }),

  // Optional Resend API key for production
  RESEND_API_KEY: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring ally package
  |----------------------------------------------------------
  */
  GOOGLE_CLIENT_ID: Env.schema.string(),
  GOOGLE_CLIENT_SECRET: Env.schema.string(),

  LOGTO_URL: Env.schema.string(),
  LOGTO_AUTHORIZE_URL: Env.schema.string(),
  LOGTO_ACCESS_TOKEN_URL: Env.schema.string(),
  LOGTO_USER_INFO_URL: Env.schema.string(),
  LOGTO_CLIENT_ID: Env.schema.string(),
  LOGTO_CLIENT_SECRET: Env.schema.string(),
  LOGTO_CALLBACK_URL: Env.schema.string(),
  LOGTO_M2M_CLIENT_ID: Env.schema.string(),
  LOGTO_M2M_CLIENT_SECRET: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the drive package
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['fs'] as const),

  CLICKHOUSE_HOST: Env.schema.string.optional({ format: 'url', tld: false }),
  CLICKHOUSE_USER: Env.schema.string.optional(),
  CLICKHOUSE_PASSWORD: Env.schema.string.optional(),
  CLICKHOUSE_DB: Env.schema.string.optional(),
  CLICKHOUSE_REQUEST_TIMEOUT: Env.schema.number.optional(),
  CLICKHOUSE_COMPRESSION_REQUEST: Env.schema.boolean.optional(),
  CLICKHOUSE_COMPRESSION_RESPONSE: Env.schema.boolean.optional(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  REDIS_DB: Env.schema.number.optional(),
  QUEUE_PORT: Env.schema.number(),

  /*
  |----------------------------------------------------------
  | Variables for configuring AI service
  |----------------------------------------------------------
  */
  AI_PROVIDER: Env.schema.enum.optional(['openai', 'openrouter', 'anthropic', 'google', 'local'] as const),
  AI_API_KEY: Env.schema.string.optional(),
  AI_DEFAULT_MODEL: Env.schema.string.optional(),
  AI_EMBEDDING_MODEL: Env.schema.string.optional(),
  OPENAI_API_KEY: Env.schema.string.optional(),
})
