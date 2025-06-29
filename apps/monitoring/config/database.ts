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
          'app/users/database/migrations',
          'app/companies/database/migrations',
          'app/error/database/migrations',
        ],
      },
      seeders: {
        paths: [
          'app/users/database/seeders',
          'app/companies/database/seeders',
          'app/error/database/seeders',
        ],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
