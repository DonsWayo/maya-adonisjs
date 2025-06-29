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
          'app/common/database/migrations',
          'app/ai_usage/database/migrations'
        ],
      },
      seeders: {
        paths: [
          'app/users/database/seeders', 
          'app/companies/database/seeders',
          'app/ai_usage/database/seeders'
        ],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
