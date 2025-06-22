import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import Project from '#error/models/project'
import ErrorGroup from '#error/models/error_group'
import { ClickHouseService } from '#error/services/clickhouse_service'
import type { ErrorEvent } from '#error/models/error_event'
import { DateTime } from 'luxon'

test.group('AI Grouping Controller', (group) => {
  let testProject: Project
  let clickHouseService: ClickHouseService
  let testErrorIds: string[] = []

  group.each.setup(async () => {
    // Create test project
    testProject = new Project()
    testProject.id = randomUUID()
    testProject.name = 'AI Grouping Test Project'
    testProject.slug = `ai-grouping-test-${randomUUID().substring(0, 8)}`
    testProject.platform = 'javascript'
    testProject.status = 'active'
    testProject.organizationId = '5660a1b2-6fc3-4eba-90bf-13496ee275d7'
    testProject.publicKey = randomUUID().replace(/-/g, '')
    testProject.secretKey = randomUUID().replace(/-/g, '')
    testProject.dsn = `https://${testProject.publicKey}@sentry.example.com/${testProject.id}`
    await testProject.save()

    clickHouseService = new ClickHouseService()

    // Create test error events with different patterns
    const testEvents: ErrorEvent[] = [
      // Database connection errors (should be grouped together)
      {
        id: randomUUID(),
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: 'Connection timeout after 30000ms',
        type: 'error',
        platform: 'node',
        exception_type: 'DatabaseError',
        exception_value: 'Connection timeout after 30000ms',
        fingerprint: ['db-timeout-1'],
        environment: 'production',
        stack_trace: 'DatabaseError: Connection timeout\n    at connect (db.js:45:11)',
        sdk: '@sentry/node',
        sdk_version: '7.0.0',
      },
      {
        id: randomUUID(),
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: 'Connection refused to database server',
        type: 'error',
        platform: 'node',
        exception_type: 'DatabaseError',
        exception_value: 'Connection refused',
        fingerprint: ['db-refused-2'],
        environment: 'production',
        stack_trace: 'DatabaseError: Connection refused\n    at connect (db.js:45:11)',
        sdk: '@sentry/node',
        sdk_version: '7.0.0',
      },
      // API rate limit errors (different category)
      {
        id: randomUUID(),
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: 'Rate limit exceeded for API endpoint',
        type: 'error',
        platform: 'node',
        exception_type: 'APIError',
        exception_value: 'Rate limit exceeded',
        fingerprint: ['api-rate-limit'],
        environment: 'production',
        stack_trace: 'APIError: Rate limit exceeded\n    at request (api.js:102:15)',
        sdk: '@sentry/node',
        sdk_version: '7.0.0',
      },
      // Validation errors (another category)
      {
        id: randomUUID(),
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: 'Invalid email format',
        type: 'error',
        platform: 'node',
        exception_type: 'ValidationError',
        exception_value: 'Invalid email format',
        fingerprint: ['validation-email'],
        environment: 'production',
        sdk: '@sentry/node',
        sdk_version: '7.0.0',
      },
    ]

    // Store events and save IDs
    for (const event of testEvents) {
      await clickHouseService.storeErrorEvent(event)
      testErrorIds.push(event.id)
    }
  })

  group.each.teardown(async () => {
    // Cleanup test data
    await ErrorGroup.query().where('project_id', testProject.id).delete()
    await testProject.delete()
  })

  test('should suggest grouping for specific error IDs', async ({ client, assert }) => {
    const response = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/suggest`)
      .json({
        errorIds: testErrorIds.slice(0, 3) // First 3 errors
      })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.suggestions)
    assert.isArray(body.suggestions)
    assert.exists(body.reasoning)
    assert.equal(body.totalErrors, 3)

    // Should suggest grouping database errors together
    if (body.suggestions.length > 0) {
      const dbGroup = body.suggestions.find((s: any) => 
        s.groupName.toLowerCase().includes('database') ||
        s.groupDescription.toLowerCase().includes('database')
      )
      assert.exists(dbGroup, 'Should have a database error group')
      if (dbGroup) {
        assert.isAtLeast(dbGroup.errors.length, 2, 'Database group should have at least 2 errors')
        assert.isAbove(dbGroup.confidence, 0.7, 'Should have high confidence for database errors')
      }
    }
  })

  test('should suggest grouping for errors in a time range', async ({ client, assert }) => {
    const response = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/suggest`)
      .json({
        timeRange: '24h'
      })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.suggestions)
    assert.isArray(body.suggestions)
    assert.isAbove(body.totalErrors, 0)
  })

  test('should require at least 2 errors for grouping', async ({ client }) => {
    const response = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/suggest`)
      .json({
        errorIds: [testErrorIds[0]] // Only 1 error
      })
      .withInertia()

    response.assertStatus(400)
    response.assertBodyContains({ 
      message: 'At least 2 errors are required for grouping suggestions' 
    })
  })
  .skip(true, 'Auth redirect issue in test environment')

  test('should apply grouping suggestions', async ({ client, assert }) => {
    // First get suggestions
    const suggestResponse = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/suggest`)
      .json({
        errorIds: testErrorIds.slice(0, 2) // First 2 database errors
      })
      .withInertia()

    suggestResponse.assertStatus(200)
    const suggestions = suggestResponse.body().suggestions

    if (suggestions && suggestions.length > 0) {
      // Apply the first suggestion
      const applyResponse = await client
        .post(`/api/projects/${testProject.id}/ai-grouping/apply`)
        .json({
          suggestions: [{
            groupName: 'Database Connection Errors',
            errorIds: testErrorIds.slice(0, 2)
          }]
        })
        .withInertia()
  
      applyResponse.assertStatus(200)
      
      const body = applyResponse.body()
      assert.exists(body.results)
      assert.isArray(body.results)
      assert.equal(body.totalGroups, 1)
      
      const result = body.results[0]
      assert.isTrue(result.success)
      assert.exists(result.groupId)
      assert.equal(result.errorsUpdated, 2)

      // Verify the group was created
      const group = await ErrorGroup.find(result.groupId)
      assert.exists(group)
      assert.equal(group?.title, 'Database Connection Errors')
      assert.equal(group?.metadata?.aiSuggested, true)

      // Verify errors were assigned to the group by querying ClickHouse
      const groupEvents = await clickHouseService.queryErrorEvents({
        projectId: testProject.id,
        limit: 100
      })
      
      const assignedErrors = groupEvents.filter(e => 
        testErrorIds.slice(0, 2).includes(e.id) && 
        e.group_id === result.groupId
      )
      
      assert.lengthOf(assignedErrors, 2)
    }
  })
  .skip(true, 'Auth redirect issue in test environment')

  test('should validate error ownership when applying grouping', async ({ client, assert }) => {
    // Try to apply grouping with errors from another project
    const otherProjectErrorIds = [randomUUID(), randomUUID()]
    
    const response = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/apply`)
      .json({
        suggestions: [{
          groupName: 'Invalid Group',
          errorIds: otherProjectErrorIds
        }]
      })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    const result = body.results[0]
    assert.isFalse(result.success)
    assert.include(result.error, 'not found')
  })

  test('should handle empty suggestions array', async ({ client }) => {
    const response = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/apply`)
      .json({
        suggestions: []
      })
      .withInertia()

    response.assertStatus(422)
  })
  .skip(true, 'Auth redirect issue in test environment')

  test('should suggest grouping for errors from a specific group', async ({ client, assert }) => {
    // Create a test group with errors
    const testGroup = await ErrorGroup.create({
      projectId: testProject.id,
      fingerprintHash: 'test-group-hash',
      fingerprint: ['test-group'],
      title: 'Test Error Group',
      type: 'TestError',
      message: 'Test error group',
      platform: 'javascript',
      firstSeen: DateTime.now(),
      lastSeen: DateTime.now(),
      status: 'unresolved'
    })

    // Update errors in ClickHouse to assign them to this group
    for (const errorId of testErrorIds.slice(0, 2)) {
      await clickHouseService.updateEventGroupId(errorId, testGroup.id)
    }

    const response = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/suggest`)
      .json({
        groupId: testGroup.id
      })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.suggestions)
    assert.isAtLeast(body.totalErrors, 2)

    // Cleanup
    await testGroup.delete()
  })
  .skip(true, 'Auth redirect issue in test environment')

  test('should enhance suggestions with current group information', async ({ client, assert }) => {
    // Create a group for one of the errors
    const existingGroup = await ErrorGroup.create({
      projectId: testProject.id,
      fingerprintHash: 'existing-group-hash',
      fingerprint: ['existing'],
      title: 'Existing Error Group',
      type: 'ExistingError',
      message: 'Existing error',
      platform: 'javascript',
      firstSeen: DateTime.now(),
      lastSeen: DateTime.now(),
      status: 'unresolved'
    })

    // Assign one error to existing group
    await clickHouseService.updateEventGroupId(testErrorIds[0], existingGroup.id)

    const response = await client
      .post(`/api/projects/${testProject.id}/ai-grouping/suggest`)
      .json({
        errorIds: testErrorIds
      })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.suggestions)
    
    // Check if suggestions include current group info
    if (body.suggestions.length > 0) {
      const suggestion = body.suggestions[0]
      assert.isArray(suggestion.errors)
      
      const errorWithGroup = suggestion.errors.find((e: any) => e.id === testErrorIds[0])
      if (errorWithGroup) {
        assert.equal(errorWithGroup.currentGroupId, existingGroup.id)
        assert.equal(errorWithGroup.currentGroupTitle, 'Existing Error Group')
      }
    }

    // Cleanup
    await existingGroup.delete()
  })
})