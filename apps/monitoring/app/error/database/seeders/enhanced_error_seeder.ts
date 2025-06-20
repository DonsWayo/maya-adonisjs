import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { faker } from '@faker-js/faker'
import { DateTime } from 'luxon'
import Project from '#error/models/project'
import { ErrorEvent } from '#error/models/error_event'
import ErrorEventService from '#services/error/error_event_service'

export default class EnhancedErrorSeeder extends BaseSeeder {
  private projects: Project[] = []

  // Error templates for realistic patterns
  private errorTemplates = {
    javascript: [
      { type: 'TypeError', message: "Cannot read property '{prop}' of undefined" },
      { type: 'ReferenceError', message: '{var} is not defined' },
      { type: 'SyntaxError', message: 'Unexpected token {token}' },
      { type: 'RangeError', message: 'Maximum call stack size exceeded' },
      { type: 'TypeError', message: 'Cannot convert undefined or null to object' },
      { type: 'TypeError', message: '{method} is not a function' },
      { type: 'NetworkError', message: 'Failed to fetch' },
      { type: 'ChunkLoadError', message: 'Loading chunk {chunk} failed' },
    ],

    api: [
      { type: 'HttpError', message: 'Request failed with status code {status}' },
      { type: 'TimeoutError', message: 'Request timeout after {timeout}ms' },
      { type: 'NetworkError', message: 'Network request failed' },
      { type: 'ValidationError', message: 'Invalid {field}: {reason}' },
      { type: 'AuthenticationError', message: 'Invalid credentials' },
      { type: 'AuthorizationError', message: 'Insufficient permissions for {resource}' },
      { type: 'RateLimitError', message: 'Rate limit exceeded' },
    ],

    database: [
      { type: 'QueryException', message: 'SQLSTATE[{code}]: {detail}' },
      { type: 'ConnectionException', message: 'Database connection failed' },
      { type: 'ConstraintViolation', message: "Duplicate entry '{value}' for key '{key}'" },
      { type: 'DeadlockException', message: 'Deadlock detected' },
      { type: 'DataIntegrityException', message: 'Foreign key constraint failed' },
    ],

    performance: [
      { type: 'MemoryError', message: 'Out of memory' },
      { type: 'TimeoutError', message: 'Script execution timed out' },
      { type: 'ResourceExhausted', message: '{resource} limit exceeded' },
      { type: 'SlowQueryWarning', message: 'Query took {duration}ms' },
    ],
  }

  private browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Mobile Safari', 'Chrome Mobile']
  private environments = ['production', 'staging', 'development']
  private releases = ['1.0.0', '1.0.1', '1.1.0', '1.2.0', '2.0.0', '2.1.0', '2.1.1', '2.2.0']

  // Realistic stack trace patterns
  private stackPatterns = [
    {
      framework: 'react',
      traces: [
        'at Button.handleClick (app.js:1234:15)',
        'at HTMLButtonElement.onClick (vendor.js:5678:20)',
        'at EventHandler.dispatch (vendor.js:3456:10)',
        'at EventHandler.dispatchEvent (vendor.js:3400:5)',
      ],
    },
    {
      framework: 'vue',
      traces: [
        'at VueComponent.mounted (components/User.vue:45:10)',
        'at callHook (vue.runtime.esm.js:3456:20)',
        'at mountComponent (vue.runtime.esm.js:3567:15)',
        'at Vue.$mount (vue.runtime.esm.js:8901:10)',
      ],
    },
    {
      framework: 'nodejs',
      traces: [
        'at processRequest (/app/controllers/UserController.js:25:15)',
        'at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)',
        'at next (/app/node_modules/express/lib/router/route.js:137:13)',
        'at Route.dispatch (/app/node_modules/express/lib/router/route.js:112:3)',
      ],
    },
  ]

  public async run() {
    // Get existing projects or create new ones
    this.projects = await Project.all()

    if (this.projects.length === 0) {
      console.log('No projects found. Please run project seeder first.')
      return
    }

    // Skip or reduce in test environment
    const isTest = process.env.NODE_ENV === 'test'
    const totalEvents = isTest ? 50 : 10000 // Generate fewer events in test mode
    const batchSize = isTest ? 10 : 100

    console.log(`Generating ${totalEvents} error events... (${isTest ? 'TEST MODE' : 'FULL MODE'})`)

    // Generate events in batches
    for (let i = 0; i < totalEvents; i += batchSize) {
      const batch = []
      const currentBatchSize = Math.min(batchSize, totalEvents - i)

      for (let j = 0; j < currentBatchSize; j++) {
        batch.push(this.generateErrorEvent())
      }

      // Insert batch into ClickHouse
      await this.insertBatch(batch)

      console.log(`Progress: ${i + currentBatchSize}/${totalEvents}`)
    }

    console.log('Error seeding completed!')
  }

  private generateErrorEvent(): ErrorEvent {
    const project = faker.helpers.arrayElement(this.projects)
    const errorCategory = faker.helpers.arrayElement(Object.keys(this.errorTemplates)) as keyof typeof this.errorTemplates
    const template = faker.helpers.arrayElement(this.errorTemplates[errorCategory])

    // Generate temporal distribution (more errors during business hours)
    const timestamp = this.generateRealisticTimestamp()

    // Fill in template variables
    const message = this.fillTemplate(template.message)
    const type = template.type

    // Generate fingerprint based on error type and normalized message
    const fingerprint = [type, this.normalizeForFingerprint(message)]

    // Simulate error spikes (10% chance of being part of a spike)
    const isSpike = faker.number.float() < 0.1
    const severity = isSpike ? 'error' : faker.helpers.arrayElement(['error', 'warning', 'info'])

    // Generate realistic stack trace
    const stackPattern = faker.helpers.arrayElement(this.stackPatterns)
    const stackTrace = this.generateStackTrace(stackPattern, type, message)

    // User context (30% of events have user data)
    const hasUser = faker.number.float() < 0.3
    const userId = hasUser ? faker.string.uuid() : null

    // Generate breadcrumbs
    const breadcrumbs = this.generateBreadcrumbs(timestamp)

    return {
      id: faker.string.uuid().replace(/-/g, ''),
      timestamp,
      received_at: timestamp,
      projectId: project.id,
      level: severity as any,
      message,
      type,
      handled: faker.number.int({ min: 0, max: 1 }) as any,
      severity: severity as any,
      platform: 'javascript',
      platform_version: faker.system.semver(),
      sdk: JSON.stringify({
        name: '@sentry/browser',
        version: faker.system.semver(),
      }),
      sdk_version: faker.system.semver(),
      release: faker.helpers.arrayElement(this.releases),
      environment: faker.helpers.arrayElement(this.environments),
      serverName: faker.internet.domainName(),
      runtime: 'browser',
      runtime_version: faker.system.semver(),
      transaction: this.generateTransaction(),
      transaction_duration: faker.number.float({ min: 10, max: 5000 }),
      url: faker.internet.url(),
      method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
      status_code: isSpike ? 500 : faker.helpers.arrayElement([200, 404, 500, 503]),
      user_hash: userId ? userId.substring(0, 8) : null,
      session_id: faker.string.uuid(),
      client_info: JSON.stringify({
        browser: faker.helpers.arrayElement(this.browsers),
        os: faker.helpers.arrayElement(['Windows', 'macOS', 'Linux', 'iOS', 'Android']),
        device: faker.helpers.arrayElement(['Desktop', 'Mobile', 'Tablet']),
      }),
      exception: JSON.stringify({
        values: [
          {
            type,
            value: message,
            module: `app.${faker.helpers.arrayElement(['js', 'ts', 'jsx', 'tsx'])}`,
            stacktrace: { frames: stackTrace },
          },
        ],
      }),
      exception_type: type,
      exception_value: message,
      exception_module: 'app.js',
      stack_trace: JSON.stringify({ frames: stackTrace }),
      frames_count: stackTrace.length,
      request: JSON.stringify({
        url: faker.internet.url(),
        method: faker.helpers.arrayElement(['GET', 'POST']),
        headers: {
          'User-Agent': faker.internet.userAgent(),
        },
      }),
      tags: JSON.stringify(this.generateTags()),
      extra: JSON.stringify(this.generateExtra()),
      breadcrumbs: JSON.stringify(breadcrumbs),
      contexts: JSON.stringify(this.generateContexts()),
      fingerprint,
      memory_usage: faker.number.int({ min: 1000000, max: 500000000 }),
      cpu_usage: faker.number.float({ min: 0, max: 100 }),
      duration: faker.number.int({ min: 1, max: 1000 }),
      first_seen: timestamp,
      group_id: null, // Will be set by processing job
      is_sample: 0,
      sample_rate: 1.0,
      has_been_processed: 0,
    }
  }

  private fillTemplate(template: string): string {
    return template
      .replace('{prop}', faker.helpers.arrayElement(['user', 'data', 'response', 'config']))
      .replace('{var}', faker.helpers.arrayElement(['userConfig', 'apiKey', 'sessionData']))
      .replace('{token}', faker.helpers.arrayElement(['{', '}', ';', ':']))
      .replace('{method}', faker.helpers.arrayElement(['map', 'filter', 'reduce', 'forEach']))
      .replace('{chunk}', faker.number.int({ min: 1, max: 20 }).toString())
      .replace('{status}', faker.helpers.arrayElement(['400', '401', '403', '404', '500', '503']))
      .replace('{timeout}', faker.helpers.arrayElement(['3000', '5000', '10000', '30000']))
      .replace('{field}', faker.helpers.arrayElement(['email', 'password', 'username', 'age']))
      .replace('{reason}', faker.helpers.arrayElement(['too short', 'invalid format', 'required']))
      .replace('{resource}', faker.helpers.arrayElement(['users', 'posts', 'admin', 'settings']))
      .replace('{code}', faker.helpers.arrayElement(['23505', '23503', 'HY000', '42P01']))
      .replace('{detail}', faker.lorem.sentence())
      .replace('{value}', faker.string.alphanumeric(10))
      .replace('{key}', faker.helpers.arrayElement(['email', 'username', 'slug']))
      .replace('{duration}', faker.number.int({ min: 1000, max: 30000 }).toString())
  }

  private normalizeForFingerprint(message: string): string {
    return message
      .replace(/\b\d+\b/g, 'N')
      .replace(/\b[a-f0-9-]{36}\b/gi, 'UUID')
      .replace(/\b0x[0-9a-f]+\b/gi, '0xHEX')
      .replace(/'[^']*'/g, "'...'")
  }

  private generateRealisticTimestamp(): Date {
    const now = DateTime.now()
    const daysAgo = faker.number.int({ min: 0, max: 30 })
    const date = now.minus({ days: daysAgo })

    // More errors during business hours (9-17)
    const hour = faker.helpers.weightedArrayElement([
      { value: faker.number.int({ min: 0, max: 8 }), weight: 1 },
      { value: faker.number.int({ min: 9, max: 17 }), weight: 5 },
      { value: faker.number.int({ min: 18, max: 23 }), weight: 2 },
    ])

    return date
      .set({
        hour,
        minute: faker.number.int({ min: 0, max: 59 }),
        second: faker.number.int({ min: 0, max: 59 }),
      })
      .toJSDate()
  }

  private generateStackTrace(pattern: any, _errorType: string, _message: string): any[] {
    const frames = pattern.traces.map((trace: string, index: number) => ({
      filename: trace.match(/\(([^:]+):/)?.[1] || 'unknown',
      function: trace.match(/at ([^ ]+)/)?.[1] || 'anonymous',
      lineno: faker.number.int({ min: 1, max: 2000 }),
      colno: faker.number.int({ min: 1, max: 150 }),
      in_app: index < 2,
    }))

    // Add the actual error frame at the top
    frames.unshift({
      filename: 'app.js',
      function: 'throwError',
      lineno: faker.number.int({ min: 1, max: 1000 }),
      colno: faker.number.int({ min: 1, max: 150 }),
      in_app: true,
    })

    return frames
  }

  private generateTransaction(): string {
    const routes = [
      '/users/:id',
      '/api/v1/posts',
      '/dashboard',
      '/settings/profile',
      '/auth/login',
      '/products/:id/reviews',
      '/checkout',
      '/search',
    ]

    return faker.helpers.arrayElement(routes)
  }

  private generateTags(): Record<string, string> {
    const tags: Record<string, string> = {
      environment: faker.helpers.arrayElement(this.environments),
      release: faker.helpers.arrayElement(this.releases),
      component: faker.helpers.arrayElement(['frontend', 'backend', 'api', 'worker']),
    }

    // Add some optional tags
    if (faker.number.float() < 0.5) {
      tags.customer_tier = faker.helpers.arrayElement(['free', 'pro', 'enterprise'])
    }

    if (faker.number.float() < 0.3) {
      tags.feature_flag = faker.helpers.arrayElement(['new_ui', 'beta_features', 'ab_test_1'])
    }

    return tags
  }

  private generateExtra(): Record<string, any> {
    return {
      memory_available: faker.number.int({ min: 1000000, max: 8000000000 }),
      storage_available: faker.number.int({ min: 1000000, max: 100000000000 }),
      battery_level: faker.number.float({ min: 0, max: 1 }),
      network_type: faker.helpers.arrayElement(['4g', 'wifi', '3g', '5g']),
      viewport: {
        width: faker.helpers.arrayElement([1920, 1366, 1280, 768, 375]),
        height: faker.helpers.arrayElement([1080, 768, 720, 1024, 812]),
      },
    }
  }

  private generateContexts(): Record<string, any> {
    return {
      device: {
        family: faker.helpers.arrayElement(['iPhone', 'Samsung', 'Pixel', 'Desktop']),
        model: faker.helpers.arrayElement(['13 Pro', 'Galaxy S22', 'Pixel 6', 'Unknown']),
        arch: faker.helpers.arrayElement(['arm64', 'x86_64', 'x86']),
      },
      os: {
        name: faker.helpers.arrayElement(['iOS', 'Android', 'Windows', 'macOS', 'Linux']),
        version: faker.system.semver(),
      },
      runtime: {
        name: 'browser',
        version: faker.system.semver(),
      },
    }
  }

  private generateBreadcrumbs(timestamp: Date): any[] {
    const breadcrumbs = []
    const count = faker.number.int({ min: 3, max: 10 })

    for (let i = 0; i < count; i++) {
      const bcTimestamp = new Date(
        timestamp.getTime() - (count - i) * 1000 * faker.number.int({ min: 1, max: 60 })
      )

      breadcrumbs.push({
        timestamp: bcTimestamp.toISOString(),
        type: faker.helpers.arrayElement(['navigation', 'http', 'console', 'user']),
        category: faker.helpers.arrayElement(['navigation', 'xhr', 'console', 'ui.click']),
        level: faker.helpers.arrayElement(['info', 'warning', 'error']),
        message: faker.lorem.sentence(),
        data: {
          url: faker.internet.url(),
          method: faker.helpers.arrayElement(['GET', 'POST']),
        },
      })
    }

    return breadcrumbs
  }

  private async insertBatch(events: ErrorEvent[]): Promise<void> {
    for (const event of events) {
      try {
        // Use the service to store the event and dispatch job
        await ErrorEventService.storeDirectly(event)
      } catch (error) {
        console.error('Failed to insert event:', error)
      }
    }
  }
}
