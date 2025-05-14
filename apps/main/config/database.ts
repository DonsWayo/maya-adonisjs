import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import app from '@adonisjs/core/services/app'

const dbConfig = defineConfig({
  connection: 'postgres',
  prettyPrintDebugQueries: app.inDev,
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: [
          // First run the basic setup migrations
          'app/users/database/migrations/1737139066939_enable_uuid_extension.ts',
          'app/users/database/migrations/1737139066940_create_roles_table.ts',
          'app/users/database/migrations/1737139066942_create_users_table.ts',
          // Then create the companies table
          'app/companies/database/migrations/1737139066943_create_companies_table.ts',
          // Then create the user_companies table
          'app/users/database/migrations/1737139066946_create_user_companies_table.ts',
          // Then add foreign keys
          'app/users/database/migrations/1737139066947_add_foreign_keys.ts',
          // Finally run the rest of the migrations
          'app/users/database/migrations',
          'app/companies/database/migrations',
        ],
      },
      seeders: {
        paths: ['app/users/database/seeders', 'app/companies/database/seeders'],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
