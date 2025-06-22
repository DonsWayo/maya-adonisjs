import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { apiClient } from '@japa/api-client'
import { inertiaApiClient } from '@adonisjs/inertia/plugins/api_client'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import testUtils from '@adonisjs/core/services/test_utils'
import ace from '@adonisjs/core/services/ace'
import Redis from 'ioredis'
import { browserClient } from '@japa/browser-client'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  apiClient(),
  browserClient({
    runInSuites: ['browser']
  }),
  inertiaApiClient(app),
  authApiClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    async () => {
      // Clear Redis test database
      try {
        const redisClient = new Redis.default({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '15'),
        })
        await redisClient.flushdb()
        await redisClient.quit()
        console.log('Redis test database cleared')
      } catch (error) {
        console.error('Error clearing Redis test database:', error)
      }

      // Run PostgreSQL migrations
      await testUtils.db().migrate()
      
      // Run ClickHouse migrations
      await ace.exec('clickhouse:migrate', [])
    },
  ],
  teardown: [
    async () => {
      // Truncate PostgreSQL tables
      await testUtils.db().truncate()
      
      // Clean up ClickHouse tables
      const clickhouse = (await import('adonis-clickhouse/services/main')).default
      try {
        await clickhouse.query({
          query: 'TRUNCATE TABLE IF EXISTS error_events',
        })
      } catch (error) {
        console.error('Error truncating ClickHouse error_events table:', error)
      }
      
      // Clear Redis test database
      try {
        const redisClient = new Redis.default({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '15'),
        })
        await redisClient.flushdb()
        await redisClient.quit()
        console.log('Redis test database cleared')
      } catch (error) {
        console.error('Error clearing Redis test database:', error)
      }
    },
  ],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
