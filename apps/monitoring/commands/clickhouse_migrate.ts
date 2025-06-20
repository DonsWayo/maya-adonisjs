import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import clickhouse from 'adonis-clickhouse/services/main'
import app from '@adonisjs/core/services/app'

/**
 * Command to run ClickHouse migrations using raw SQL queries
 */
export default class ClickhouseMigrate extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  static commandName = 'clickhouse:migrate'

  /**
   * Command description is displayed in the "help" output
   */
  static description = 'Run ClickHouse migrations'

  /**
   * Command options
   */
  static options: CommandOptions = {
    startApp: true,
    staysAlive: false,
  }

  /**
   * Ensure the clickhouse_migrations table exists
   */
  private async ensureMigrationsTableExists() {
    try {
      // Check if the table exists
      const result = await clickhouse.query({
        query:
          "SELECT name FROM system.tables WHERE database = currentDatabase() AND name = 'clickhouse_migrations'",
        format: 'JSONEachRow',
      })

      const tables = await result.json()

      if (!Array.isArray(tables) || tables.length === 0) {
        // Create the migrations table if it doesn't exist
        this.logger.info('Creating clickhouse_migrations table...')
        await clickhouse.query({
          query: `
            CREATE TABLE IF NOT EXISTS clickhouse_migrations (
              id String,
              name String,
              batch UInt32,
              migration_time DateTime DEFAULT now()
            ) ENGINE = MergeTree()
            ORDER BY (name, batch)
          `,
        })
        this.logger.success('Created clickhouse_migrations table')
      } else {
        this.logger.info('clickhouse_migrations table already exists')
      }
    } catch (error) {
      this.logger.error(`Error ensuring migrations table exists: ${error.message}`)
      throw error
    }
  }

  /**
   * Run the command
   */
  async run() {
    this.logger.info('Running ClickHouse migrations...')

    try {
      // Ensure the migrations table exists
      await this.ensureMigrationsTableExists()

      // Get list of already run migrations
      const result = await clickhouse.query({
        query: 'SELECT name FROM clickhouse_migrations',
        format: 'JSONEachRow',
      })

      // Handle the result properly
      const existingMigrations: Array<{ name: string }> = []
      try {
        const jsonResult = await result.json()
        if (Array.isArray(jsonResult)) {
          jsonResult.forEach((item: any) => {
            if (item && typeof item.name === 'string') {
              existingMigrations.push({ name: item.name })
            }
          })
        }
      } catch (error: any) {
        this.logger.warning('Error parsing migrations: ' + error.message)
      }

      // Get all migration files
      const appRootStr = app.appRoot.toString()
      const cwd = process.cwd()
      this.logger.info(`Current working directory: ${cwd}`)
      this.logger.info(`App root: ${appRootStr}`)

      const migrationsPath = join(appRootStr, 'app/error/database/clickhouse_migrations')

      this.logger.info(`Looking for migrations in: ${migrationsPath}`)

      if (!existsSync(migrationsPath)) {
        // Try alternative paths
        const alternativePaths = [
          join(cwd, 'app/error/database/clickhouse_migrations'),
          join(appRootStr, 'app', 'error', 'database', 'clickhouse_migrations'),
          join(appRootStr, '/app/error/database/clickhouse_migrations'),
          '/app/apps/monitoring/app/error/database/clickhouse_migrations',
        ]

        for (const path of alternativePaths) {
          this.logger.info(`Trying alternative path: ${path}`)
          if (existsSync(path)) {
            this.logger.info(`Found migrations in: ${path}`)
            return this.processMigrationsFiles(path, existingMigrations)
          }
        }

        this.logger.warning('Migrations directory not found')
        return
      }

      return this.processMigrationsFiles(migrationsPath, existingMigrations)
    } catch (error: any) {
      this.logger.error(`ClickHouse migration failed: ${error.message}`)
      this.exitCode = 1
    }
  }

  /**
   * Process migrations in the given directory
   */
  private async processMigrationsFiles(
    migrationsPath: string,
    existingMigrations: Array<{ name: string }>
  ) {
    const migrationFiles = readdirSync(migrationsPath)
      .filter((file) => file.endsWith('.ts'))
      .sort()

    if (migrationFiles.length === 0) {
      this.logger.info('No migration files found')
      return
    }

    this.logger.info(`Found ${migrationFiles.length} migration files`)

    // Get the latest batch number
    const batchResult = await clickhouse.query({
      query: 'SELECT MAX(batch) as batch FROM clickhouse_migrations',
      format: 'JSONEachRow',
    })

    let batch = 1
    try {
      const batchJson = await batchResult.json()
      if (Array.isArray(batchJson) && batchJson.length > 0 && batchJson[0].batch) {
        batch = parseInt(batchJson[0].batch) + 1
      }
    } catch (error: any) {
      this.logger.warning('Error getting batch number: ' + error.message)
    }

    // Run each migration that hasn't been run yet
    for (const file of migrationFiles) {
      const migrationName = file.replace('.ts', '')

      // Skip if already run
      if (existingMigrations.some((m: { name: string }) => m.name === migrationName)) {
        this.logger.info(`Migration ${migrationName} already run, skipping`)
        continue
      }

      this.logger.info(`Running migration ${migrationName}`)

      try {
        // Import the migration file
        const migrationPath = join(migrationsPath, file)
        const migration = await import(migrationPath)

        // Run the migration
        if (migration.default) {
          // Handle class-based migrations (instantiate the class first)
          if (typeof migration.default === 'function' || typeof migration.default === 'object') {
            try {
              // Try to instantiate if it's a class
              const instance =
                typeof migration.default === 'function'
                  ? new migration.default()
                  : migration.default

              if (instance && typeof instance.up === 'function') {
                this.logger.info(`Running migration using class instance up method`)

                // Pass clickhouse client explicitly to the migration
                try {
                  await instance.up(clickhouse)
                  this.logger.info('Migration up method executed successfully')
                  // Success, continue to next steps
                } catch (upError: any) {
                  this.logger.error(`Error in migration up method: ${upError.message}`)
                  this.logger.error(`Error stack: ${upError.stack}`)
                  throw upError
                }
              } else {
                throw new Error(`Migration class does not have an up method`)
              }
            } catch (err: any) {
              if (err.message === 'Migration class does not have an up method') {
                throw err
              }
              this.logger.warning(`Failed to instantiate class: ${err.message}`)
              // Fall back to checking if default has an up method directly
              if (typeof migration.default.up === 'function') {
                this.logger.info(`Running migration using default.up method`)
                await migration.default.up()
              } else {
                throw new Error(`Migration ${migrationName} does not export a valid up function`)
              }
            }
          } else if (typeof migration.default.up === 'function') {
            // Direct up method on default export
            this.logger.info(`Running migration using default.up method`)
            await migration.default.up()
          } else {
            throw new Error(`Migration ${migrationName} default export doesn't have an up method`)
          }
        } else if (migration.up && typeof migration.up === 'function') {
          // Direct up method on module
          this.logger.info(`Running migration using up method`)
          await migration.up()
        } else {
          this.logger.info(`Migration structure: ${JSON.stringify(Object.keys(migration))}`)
          if (migration.default) {
            this.logger.info(
              `Default structure: ${JSON.stringify(Object.getOwnPropertyNames(migration.default))}`
            )
          }
          throw new Error(`Migration ${migrationName} does not export an 'up' function`)
        }

        // Record the migration
        try {
          const uuid = randomUUID()

          // Use ClickHouse insert method instead of raw query
          await clickhouse.insert({
            table: 'clickhouse_migrations',
            values: [
              {
                id: uuid,
                name: migrationName,
                batch: batch,
              },
            ],
            format: 'JSONEachRow',
          })

          this.logger.success(`Migration ${migrationName} recorded in clickhouse_migrations table`)
        } catch (insertError: any) {
          this.logger.warning(
            `Failed to record migration in clickhouse_migrations table: ${insertError.message}`
          )
          this.logger.info(
            'Migration was applied successfully but not recorded in the migrations table'
          )
        }

        this.logger.success(`Migration ${migrationName} completed successfully`)
      } catch (error: any) {
        this.logger.error(`Migration ${migrationName} failed: ${error.message}`)
        throw error
      }
    }

    this.logger.success('All migrations completed successfully')
  }
}
