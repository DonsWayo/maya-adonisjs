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
            module: 'test.js'
          }
        ]
      },
      environment: 'test',
      timestamp: new Date().toISOString()
    }

    const response = await client
      .post(`/api/${testProject.id}/store`)
      .json(errorEventData)

    response.assertStatus(200)
    response.assertBodyContains({ id: response.body().id })
    assert.isString(response.body().id)
  })

  test('should return 401 for invalid project ID', async ({ client }) => {
    const errorEventData = {
      platform: 'javascript',
      level: 'error',
      message: 'Test error message'
    }

    const response = await client
      .post('/api/invalid-project-id/store')
      .json(errorEventData)

    response.assertStatus(401)
    response.assertBodyContains({ error: 'Invalid project ID or authentication' })
  })

  test('should return error events index page', async ({ client }) => {
    const response = await client
      .get(`/projects/${testProject.id}/errors`)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/errors/index')
    response.assertInertiaPropsContains({
      project: { id: testProject.id, name: testProject.name }
    })
  })

  test('should return project dashboard page', async ({ client }) => {
    const response = await client
      .get(`/projects/${testProject.id}/dashboard`)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/projects/dashboard')
    response.assertInertiaPropsContains({
      project: { id: testProject.id, name: testProject.name }
    })
  })

  test('should redirect to projects list for invalid project', async ({ client }) => {
    const response = await client
      .get('/projects/invalid-project-id/errors')
      .withInertia()

    response.assertRedirectsTo('/projects')
  })

  test('should handle error event with minimal data', async ({ client, assert }) => {
    const minimalErrorData = {
      platform: 'javascript'
    }

    const response = await client
      .post(`/api/${testProject.id}/store`)
      .json(minimalErrorData)

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
        email: 'test@example.com'
      },
      contexts: {
        session: {
          id: 'session123'
        }
      },
      tags: {
        component: 'navbar',
        version: '1.0.0'
      }
    }

    const response = await client
      .post(`/api/${testProject.id}/store`)
      .json(errorEventData)

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
      filters: { level: 'error' }
    })
  })

  test('should filter error events by environment', async ({ client }) => {
    const response = await client
      .get(`/projects/${testProject.id}/errors`)
      .qs({ environment: 'production' })
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/errors/index')
    response.assertInertiaPropsContains({
      filters: { environment: 'production' }
    })
  })

  test('should paginate error events', async ({ client }) => {
    const response = await client
      .get(`/projects/${testProject.id}/errors`)
      .qs({ page: 2, limit: 10 })
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('error/errors/index')
    response.assertInertiaPropsContains({
      pagination: { page: 2, limit: 10 }
    })
  })
}) 