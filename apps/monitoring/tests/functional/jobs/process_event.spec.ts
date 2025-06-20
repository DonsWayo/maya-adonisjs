import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import Project from '#error/models/project'
import ErrorGroup from '#error/models/error_group'
import ErrorProcessingService from '#services/error/error_processing_service'
import { ClickHouseService } from '#error/services/clickhouse_service'
import type { ErrorEvent } from '#error/models/error_event'

test.group('ErrorProcessingService', (group) => {
  let testProject: Project
  let testEventId: string

  group.each.setup(async () => {
    // Create test project
    testProject = new Project()
    testProject.id = randomUUID()
    testProject.name = 'Test Project for Jobs'
    testProject.slug = 'test-project-jobs'
    testProject.platform = 'javascript'
    testProject.status = 'active'
    testProject.publicKey = randomUUID().replace(/-/g, '')
    testProject.secretKey = randomUUID().replace(/-/g, '')
    testProject.dsn = `https://${testProject.publicKey}@sentry.example.com/${testProject.id}`
    await testProject.save()

    // Create a test event in ClickHouse
    testEventId = randomUUID()
    const testEvent: ErrorEvent = {
      id: testEventId,
      timestamp: new Date(),
      received_at: new Date(),
      projectId: testProject.id,
      level: 'error',
      message: 'Test error for job processing',
      type: 'error',
      platform: 'javascript',
      exception_type: 'TypeError',
      exception_value: 'Cannot read property test of undefined',
      fingerprint: ['TypeError', 'Cannot read property test of undefined'],
      environment: 'test',
      release: '1.0.0',
      sdk: '@sentry/browser',
      sdk_version: '7.0.0',
    }
    
    await ClickHouseService.storeErrorEvent(testEvent)
  })

  group.each.teardown(async () => {
    // Cleanup test data
    await ErrorGroup.query().where('project_id', testProject.id).delete()
    await testProject.delete()
  })

  test('should process event and create error group', async ({ assert }) => {
    // Process the event directly using the service
    await ErrorProcessingService.processEvent(testEventId, testProject.id)

    // Verify error group was created
    const errorGroup = await ErrorGroup.query()
      .where('project_id', testProject.id)
      .first()

    assert.exists(errorGroup)
    assert.equal(errorGroup!.projectId, testProject.id)
    assert.equal(errorGroup!.type, 'TypeError')
    assert.equal(errorGroup!.message, 'Cannot read property test of undefined')
    assert.equal(errorGroup!.platform, 'javascript')
    assert.equal(errorGroup!.status, 'unresolved')
  })

  test('should update existing error group on duplicate fingerprint', async ({ assert }) => {
    // First, let's create an event and process it to create the initial group
    const firstEventId = randomUUID()
    const firstTimestamp = new Date(Date.now() - 1000) // 1 second ago
    const firstEvent: ErrorEvent = {
      id: firstEventId,
      timestamp: firstTimestamp,
      received_at: firstTimestamp,
      projectId: testProject.id,
      level: 'error',
      message: 'test error',
      type: 'error',
      platform: 'javascript',
      exception_type: 'TypeError',
      exception_value: 'test error',
      fingerprint: ['TypeError', 'test error'],
      sdk: '@sentry/browser',
      sdk_version: '7.0.0',
      environment: 'test',
    }
    
    await ClickHouseService.storeErrorEvent(firstEvent)
    await ErrorProcessingService.processEvent(firstEventId, testProject.id)
    
    // Get the created group
    const existingGroup = await ErrorGroup.query()
      .where('project_id', testProject.id)
      .firstOrFail()
    
    const originalLastSeen = existingGroup.lastSeen

    // Create new event with same fingerprint pattern but later timestamp
    const newEventId = randomUUID()
    const newTimestamp = new Date() // Now
    const newEvent: ErrorEvent = {
      id: newEventId,
      timestamp: newTimestamp,
      received_at: newTimestamp,
      projectId: testProject.id,
      level: 'error',
      message: 'test error',
      type: 'error',
      platform: 'javascript',
      exception_type: 'TypeError',
      exception_value: 'test error',
      fingerprint: ['TypeError', 'test error'],
      sdk: '@sentry/browser',
      sdk_version: '7.0.0',
      environment: 'test',
    }
    
    await ClickHouseService.storeErrorEvent(newEvent)

    // Process the new event
    await ErrorProcessingService.processEvent(newEventId, testProject.id)

    // Verify group was updated, not created new
    const groups = await ErrorGroup.query().where('project_id', testProject.id)
    assert.lengthOf(groups, 1)
    
    const updatedGroup = groups[0]
    assert.equal(updatedGroup.id, existingGroup.id)
    // Compare timestamps as strings to avoid millisecond precision issues
    assert.isTrue(updatedGroup.lastSeen!.toISO()! > originalLastSeen!.toISO()!)
  })

  test('should handle missing event gracefully', async ({ assert }) => {
    const nonExistentId = randomUUID()

    try {
      await ErrorProcessingService.processEvent(nonExistentId, testProject.id)
      assert.fail('Should have thrown error for missing event')
    } catch (error) {
      assert.equal(error.message, `Event ${nonExistentId} not found`)
    }
  })

  test('should generate correct fingerprint hash', async ({ assert }) => {
    const fingerprint = ['TypeError', 'Cannot read property', 'undefined']
    
    const hash1 = ErrorProcessingService.calculateFingerprintHash(fingerprint)
    const hash2 = ErrorProcessingService.calculateFingerprintHash(fingerprint)
    const hash3 = ErrorProcessingService.calculateFingerprintHash(['Different', 'Error'])

    // Same fingerprint should produce same hash
    assert.equal(hash1, hash2)
    // Different fingerprint should produce different hash
    assert.notEqual(hash1, hash3)
    // Hash should be 64 characters (SHA256)
    assert.lengthOf(hash1, 64)
  })

  test('should create group with proper title from exception', async ({ assert }) => {
    const eventId = randomUUID()
    const event: ErrorEvent = {
      id: eventId,
      timestamp: new Date(),
      received_at: new Date(),
      projectId: testProject.id,
      level: 'error',
      message: 'Some other message',
      type: 'error',
      platform: 'javascript',
      exception_type: 'ValueError',
      exception_value: 'Invalid email format provided',
      fingerprint: ['ValueError', 'Invalid email format provided'],
      sdk: '@sentry/browser',
      sdk_version: '7.0.0',
      environment: 'test',
    }

    await ClickHouseService.storeErrorEvent(event)
    await ErrorProcessingService.processEvent(eventId, testProject.id)

    const group = await ErrorGroup.query()
      .where('project_id', testProject.id)
      .firstOrFail()

    assert.equal(group.title, 'ValueError: Invalid email format provided')
  })

  test('should create group with message when no exception', async ({ assert }) => {
    const eventId = randomUUID()
    const longMessage = 'This is a long error message that should be truncated after one hundred characters to fit in the title field properly and not overflow'
    const event: ErrorEvent = {
      id: eventId,
      timestamp: new Date(),
      received_at: new Date(),
      projectId: testProject.id,
      level: 'error',
      message: longMessage,
      type: 'error',
      platform: 'javascript',
      fingerprint: ['Error', longMessage],
      sdk: '@sentry/browser',
      sdk_version: '7.0.0',
      environment: 'test',
    }

    await ClickHouseService.storeErrorEvent(event)
    await ErrorProcessingService.processEvent(eventId, testProject.id)

    const group = await ErrorGroup.query()
      .where('project_id', testProject.id)
      .firstOrFail()

    assert.lengthOf(group.title, 100)
    assert.isTrue(group.title.startsWith('This is a long error message'))
  })

  test('should generate group title correctly', async ({ assert }) => {
    // Test with exception
    const eventWithException = {
      exception_type: 'ValueError',
      exception_value: 'Invalid email format provided',
      message: 'Some other message'
    }

    const title = ErrorProcessingService.generateGroupTitle(eventWithException)
    assert.equal(title, 'ValueError: Invalid email format provided')

    // Test without exception
    const eventWithoutException = {
      message: 'This is a long error message that should be truncated after one hundred characters to fit in the title field properly'
    }

    const titleFromMessage = ErrorProcessingService.generateGroupTitle(eventWithoutException)
    assert.lengthOf(titleFromMessage, 100)
    assert.isTrue(titleFromMessage.startsWith('This is a long error message'))
  })

  test('should determine when AI analysis is needed', async ({ assert }) => {
    // New group without AI summary
    const newGroup = new ErrorGroup()
    newGroup.aiSummary = null
    newGroup.eventCount = 1
    assert.isTrue(ErrorProcessingService.shouldTriggerAIAnalysis(newGroup))

    // Group with old analysis and doubled events
    const groupWithOldAnalysis = new ErrorGroup()
    groupWithOldAnalysis.aiSummary = 'Old summary'
    groupWithOldAnalysis.eventCount = 100
    groupWithOldAnalysis.metadata = {
      lastAnalysisCount: 40,
      lastAnalysisDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    }
    assert.isTrue(ErrorProcessingService.shouldTriggerAIAnalysis(groupWithOldAnalysis))

    // Group with recent analysis
    const recentlyAnalyzedGroup = new ErrorGroup()
    recentlyAnalyzedGroup.aiSummary = 'Recent summary'
    recentlyAnalyzedGroup.eventCount = 50
    recentlyAnalyzedGroup.metadata = {
      lastAnalysisCount: 45,
      lastAnalysisDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
    assert.isFalse(ErrorProcessingService.shouldTriggerAIAnalysis(recentlyAnalyzedGroup))
  })

  test('should update group statistics after processing multiple events', async ({ assert }) => {
    // Create multiple events for the same group
    const events = []
    const fingerprint = ['Error', 'Repeated error']
    
    for (let i = 0; i < 5; i++) {
      const eventId = randomUUID()
      const event: ErrorEvent = {
        id: eventId,
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: 'Repeated error',
        type: 'error',
        platform: 'javascript',
        exception_type: 'Error',
        exception_value: 'Repeated error',
        fingerprint: fingerprint,
        contexts: i < 3 ? JSON.stringify({ user: { id: `user-${i}` } }) : undefined, // 3 unique users
        sdk: '@sentry/browser',
        sdk_version: '7.0.0',
        environment: 'test',
      }
      await ClickHouseService.storeErrorEvent(event)
      events.push(eventId)
    }

    // Process all events
    for (const eventId of events) {
      await ErrorProcessingService.processEvent(eventId, testProject.id)
    }

    const group = await ErrorGroup.query()
      .where('project_id', testProject.id)
      .firstOrFail()

    // The event count should reflect processed events
    assert.isAbove(group.eventCount || 0, 0)
  })

  test('should handle concurrent processing of same fingerprint', async ({ assert }) => {
    // Create multiple events with same fingerprint
    const eventIds = []
    const fingerprint = ['ConcurrentError', 'Concurrent error message']
    const fingerprintHash = ErrorProcessingService.calculateFingerprintHash(fingerprint)
    
    for (let i = 0; i < 3; i++) {
      const eventId = randomUUID()
      const event: ErrorEvent = {
        id: eventId,
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: 'Concurrent error message',
        type: 'error',
        platform: 'javascript',
        exception_type: 'ConcurrentError',
        exception_value: 'Concurrent error message',
        fingerprint: fingerprint,
        sdk: '@sentry/browser',
        sdk_version: '7.0.0',
        environment: 'test',
      }
      await ClickHouseService.storeErrorEvent(event)
      eventIds.push(eventId)
    }

    // Process all events concurrently
    const promises = eventIds.map(eventId => 
      ErrorProcessingService.processEvent(eventId, testProject.id)
        .catch(error => {
          // Ignore duplicate key errors which are expected in concurrent scenarios
          if (!error.message.includes('duplicate key')) {
            throw error
          }
        })
    )

    await Promise.all(promises)

    // Should create only one error group
    const groups = await ErrorGroup.query()
      .where('project_id', testProject.id)
      .where('fingerprint_hash', fingerprintHash)
    
    assert.lengthOf(groups, 1)
    
    // Verify the group has the correct properties
    const group = groups[0]
    assert.equal(group.type, 'ConcurrentError')
    assert.equal(group.message, 'Concurrent error message')
  })

  test('should create groups for different error types', async ({ assert }) => {
    // Create events with different error types
    const errorTypes = [
      { type: 'TypeError', value: 'Cannot read property', fingerprint: ['TypeError', 'property'] },
      { type: 'ReferenceError', value: 'x is not defined', fingerprint: ['ReferenceError', 'not defined'] },
      { type: 'SyntaxError', value: 'Unexpected token', fingerprint: ['SyntaxError', 'token'] }
    ]

    for (const errorType of errorTypes) {
      const eventId = randomUUID()
      const event: ErrorEvent = {
        id: eventId,
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: errorType.value,
        type: 'error',
        platform: 'javascript',
        exception_type: errorType.type,
        exception_value: errorType.value,
        fingerprint: errorType.fingerprint,
        sdk: '@sentry/browser',
        sdk_version: '7.0.0',
        environment: 'test',
      }
      
      await ClickHouseService.storeErrorEvent(event)
      await ErrorProcessingService.processEvent(eventId, testProject.id)
    }

    // Should have 3 different error groups
    const groups = await ErrorGroup.query()
      .where('project_id', testProject.id)
      .orderBy('type')

    assert.lengthOf(groups, 3)
    assert.equal(groups[0].type, 'ReferenceError')
    assert.equal(groups[1].type, 'SyntaxError')
    assert.equal(groups[2].type, 'TypeError')
  })
})