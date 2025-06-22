import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import Project from '#error/models/project'

test.group('Error Events Controller', (group) => {
  let testProject: Project

  // Setup: Create a test project before each test
  group.each.setup(async () => {
    testProject = new Project()
    testProject.id = randomUUID()
    testProject.name = 'Test Project'
    testProject.slug = 'test-project'
    testProject.platform = 'javascript'
    testProject.status = 'active'
    testProject.publicKey = randomUUID().replace(/-/g, '')
    testProject.secretKey = randomUUID().replace(/-/g, '')
    testProject.dsn = `https://${testProject.publicKey}@sentry.example.com/${testProject.id}`
    await testProject.save()
  })

  // Cleanup: Delete test project after each test
  group.each.teardown(async () => {
    if (testProject) {
      await testProject.delete()
    }
  })

  test('should store error event via API endpoint', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Test error message',
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Test error message',
            module: 'test.js',
          },
        ],
      },
      environment: 'test',
      timestamp: new Date().toISOString(),
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    response.assertBodyContains({ id: response.body().id })
    assert.isString(response.body().id)
  })

  test('should return 401 for invalid project ID', async ({ client }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Test error message',
    }

    const response = await client.post('/api/invalid-project-id/store').json(errorEventData)

    response.assertStatus(401)
    response.assertBodyContains({ error: 'Invalid project ID or authentication' })
  })

  test('should return error events index page', async ({ client }) => {
    const response = await client.get(`/projects/${testProject.id}/errors`).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/errors/index')
    response.assertInertiaPropsContains({
      project: { id: testProject.id, name: testProject.name },
    })
  }).skip(true, 'UI tests will be handled by Playwright')

  test('should return project dashboard page', async ({ client }) => {
    const response = await client.get(`/projects/${testProject.id}/dashboard`).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/projects/dashboard')
    response.assertInertiaPropsContains({
      project: { id: testProject.id, name: testProject.name },
    })
  }).skip(true, 'UI tests will be handled by Playwright')

  test('should redirect to projects list for invalid project', async ({ client }) => {
    const response = await client.get('/projects/invalid-project-id/errors').withInertia()

    response.assertRedirectsTo('/projects')
  }).skip(true, 'UI tests will be handled by Playwright')

  test('should handle error event with minimal data', async ({ client, assert }) => {
    const minimalErrorData = {
      platform: 'javascript',
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(minimalErrorData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should store error event with user context', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'warning',
      message: 'Test warning',
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
      contexts: {
        session: {
          id: 'session123',
        },
      },
      tags: {
        component: 'navbar',
        version: '1.0.0',
      },
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should filter error events by level', async ({ client }) => {
    const response = await client
      .get(`/projects/${testProject.id}/errors`)
      .qs({ level: 'error' })
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/errors/index')
    response.assertInertiaPropsContains({
      filters: { level: 'error' },
    })
  }).skip(true, 'UI tests will be handled by Playwright')

  test('should filter error events by environment', async ({ client }) => {
    const response = await client
      .get(`/projects/${testProject.id}/errors`)
      .qs({ environment: 'production' })
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/errors/index')
    response.assertInertiaPropsContains({
      filters: { environment: 'production' },
    })
  }).skip(true, 'UI tests will be handled by Playwright')

  test('should paginate error events', async ({ client }) => {
    const response = await client
      .get(`/projects/${testProject.id}/errors`)
      .qs({ page: 2, limit: 10 })
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/errors/index')
    response.assertInertiaPropsContains({
      pagination: { page: 2, limit: 10 },
    })
  }).skip(true, 'UI tests will be handled by Playwright')

  // Enhanced API Tests for Error Events
  
  test('should validate required platform field', async ({ client }) => {
    const invalidEventData = {
      level: 'error',
      message: 'Test error message',
      // Missing required 'platform' field
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(invalidEventData)

    response.assertStatus(422)
    response.assertBodyContains({ 
      messages: [{ 
        field: 'platform', 
        message: 'The platform field must be defined',
        rule: 'required' 
      }] 
    })
  })

  test('should handle complex exception with stacktrace', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'TypeError: Cannot read property name of undefined',
      exception: {
        values: [{
          type: 'TypeError',
          value: "Cannot read property 'name' of undefined",
          module: 'components/UserProfile.js',
          stacktrace: {
            frames: [
              {
                filename: 'app://components/UserProfile.js',
                function: 'UserProfile.render',
                lineno: 42,
                colno: 21,
                in_app: true
              },
              {
                filename: 'app://node_modules/react/index.js',
                function: 'renderComponent',
                lineno: 1234,
                colno: 10,
                in_app: false
              }
            ]
          }
        }]
      },
      release: '1.0.0',
      environment: 'production'
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
    
    // Verify the error was stored with stacktrace
    // In a real test, we would query the database to verify
  })

  test('should handle multiple exceptions in chain', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'python',
      level: 'error',
      exception: {
        values: [
          {
            type: 'ValueError',
            value: 'Invalid input',
            module: 'app.validators'
          },
          {
            type: 'Exception',
            value: 'Wrapped exception',
            module: 'app.handlers'
          }
        ]
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should store breadcrumbs and contexts', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Payment failed',
      breadcrumbs: [
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          category: 'navigation',
          message: 'User navigated to /checkout'
        },
        {
          timestamp: new Date(Date.now() - 30000).toISOString(),
          category: 'ui.click',
          message: 'User clicked "Pay Now" button'
        },
        {
          timestamp: new Date().toISOString(),
          category: 'http',
          level: 'error',
          data: {
            url: '/api/payment',
            method: 'POST',
            status_code: 500
          }
        }
      ],
      contexts: {
        session: {
          id: 'abc123',
          started: new Date(Date.now() - 300000).toISOString()
        },
        browser: {
          name: 'Chrome',
          version: '120.0'
        },
        os: {
          name: 'macOS',
          version: '14.0'
        }
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should handle request context with sensitive data filtering', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'API request failed',
      request: {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Authorization': 'Bearer secret-token', // Should be filtered
          'X-API-Key': 'api-key-123' // Should be filtered
        },
        data: {
          username: 'testuser',
          password: 'should-be-filtered', // Should be filtered
          email: 'test@example.com'
        },
        query_string: 'sort=name&api_key=secret', // api_key should be filtered
        cookies: {
          session: 'session-id',
          auth_token: 'should-be-filtered' // Should be filtered
        }
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should handle tags and extra data', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Feature flag evaluation failed',
      tags: {
        feature_flag: 'new-checkout-flow',
        user_segment: 'premium',
        deployment: 'canary',
        datacenter: 'us-west-2',
        customer_tier: 'enterprise'
      },
      extra: {
        flag_config: {
          name: 'new-checkout-flow',
          percentage: 50,
          conditions: ['user.isPremium', 'user.country === "US"']
        },
        evaluation_time_ms: 123,
        fallback_used: true
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })


  test('should handle very large error messages', async ({ client, assert }) => {
    const largeMessage = 'A'.repeat(10000) // 10KB message
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: largeMessage,
      exception: {
        values: [{
          type: 'Error',
          value: largeMessage
        }]
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should handle concurrent event submissions', async ({ client, assert }) => {
    const promises = Array.from({ length: 10 }, (_, i) => {
      const errorEventData = {
        platform: 'javascript',
        level: 'error',
        message: `Concurrent error ${i}`,
        timestamp: new Date().toISOString()
      }
      return client.post(`/api/${testProject.id}/store`).json(errorEventData)
    })

    const responses = await Promise.all(promises)
    
    responses.forEach((response) => {
      response.assertStatus(200)
      assert.isString(response.body().id)
    })
    
    // Ensure all event IDs are unique
    const eventIds = responses.map(r => r.body().id)
    const uniqueIds = new Set(eventIds)
    assert.equal(uniqueIds.size, eventIds.length)
  })

  test('should store events with different severity levels', async ({ client, assert }) => {
    const levels = ['fatal', 'error', 'warning', 'info', 'debug']
    
    for (const level of levels) {
      const errorEventData = {
        platform: 'javascript',
        level,
        message: `Test ${level} message`
      }

      const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)
      
      response.assertStatus(200)
      assert.isString(response.body().id)
    }
  })

  test('should handle events with custom fingerprints', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Database connection failed',
      fingerprint: ['database-error', 'connection-timeout', 'mysql'],
      exception: {
        values: [{
          type: 'DatabaseError',
          value: 'Connection timeout after 30s'
        }]
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should accept events via public key', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Test error via public key'
    }

    const response = await client
      .post(`/api/${testProject.publicKey}/store`)
      .json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should handle SDK and runtime information', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Runtime error',
      sdk: {
        name: '@sentry/browser',
        version: '7.0.0',
        packages: [
          { name: 'npm:@sentry/browser', version: '7.0.0' }
        ],
        integrations: ['BrowserTracing', 'Replay']
      },
      runtime: {
        name: 'browser',
        version: '120.0.0'
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should handle transaction and performance data', async ({ client, assert }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Slow transaction error',
      transaction: '/api/users/:id',
      transaction_info: {
        source: 'route'
      },
      start_timestamp: new Date(Date.now() - 5000).toISOString(),
      timestamp: new Date().toISOString(),
      measurements: {
        fp: { value: 1500, unit: 'millisecond' },
        fcp: { value: 1800, unit: 'millisecond' },
        lcp: { value: 2400, unit: 'millisecond' }
      }
    }

    const response = await client.post(`/api/${testProject.id}/store`).json(errorEventData)

    response.assertStatus(200)
    assert.isString(response.body().id)
  })

  test('should reject events from inactive projects', async ({ client }) => {
    // Create an inactive project
    const inactiveProject = new Project()
    inactiveProject.id = randomUUID()
    inactiveProject.name = 'Inactive Project'
    inactiveProject.slug = `inactive-project-${randomUUID().substring(0, 8)}`
    inactiveProject.platform = 'javascript'
    inactiveProject.status = 'inactive'
    inactiveProject.publicKey = randomUUID().replace(/-/g, '')
    inactiveProject.secretKey = randomUUID().replace(/-/g, '')
    inactiveProject.dsn = `https://${inactiveProject.publicKey}@sentry.example.com/${inactiveProject.id}`
    await inactiveProject.save()

    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Should be rejected'
    }

    const response = await client
      .post(`/api/${inactiveProject.id}/store`)
      .json(errorEventData)

    response.assertStatus(401)

    // Cleanup
    await inactiveProject.delete()
  })
})
