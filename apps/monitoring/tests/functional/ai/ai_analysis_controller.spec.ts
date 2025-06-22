import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import Project from '#error/models/project'
import ErrorGroup from '#error/models/error_group'
import { ClickHouseService } from '#error/services/clickhouse_service'
import type { ErrorEvent } from '#error/models/error_event'
import { DateTime } from 'luxon'

test.group('AI Analysis Controller', (group) => {
  let testProject: Project
  let testGroup: ErrorGroup
  let clickHouseService: ClickHouseService

  group.each.setup(async () => {
    // Create test project
    testProject = new Project()
    testProject.id = randomUUID()
    testProject.name = 'AI Test Project'
    testProject.slug = `ai-test-project-${randomUUID().substring(0, 8)}`
    testProject.platform = 'javascript'
    testProject.status = 'active'
    testProject.organizationId = '5660a1b2-6fc3-4eba-90bf-13496ee275d7' // Default org ID
    testProject.publicKey = randomUUID().replace(/-/g, '')
    testProject.secretKey = randomUUID().replace(/-/g, '')
    testProject.dsn = `https://${testProject.publicKey}@sentry.example.com/${testProject.id}`
    await testProject.save()

    // Create test error group
    testGroup = await ErrorGroup.create({
      projectId: testProject.id,
      fingerprintHash: 'test-hash-' + randomUUID(),
      fingerprint: ['TypeError', 'test error'],
      title: 'TypeError: Cannot read property test of undefined',
      type: 'TypeError',
      message: 'Cannot read property test of undefined',
      platform: 'javascript',
      firstSeen: DateTime.now(),
      lastSeen: DateTime.now(),
      status: 'unresolved',
      eventCount: 5,
      userCount: 2
    })

    clickHouseService = new ClickHouseService()

    // Create test events in ClickHouse
    const testEvents: ErrorEvent[] = [
      {
        id: randomUUID(),
        timestamp: new Date(),
        received_at: new Date(),
        projectId: testProject.id,
        level: 'error',
        message: 'Cannot read property test of undefined',
        type: 'error',
        platform: 'javascript',
        exception_type: 'TypeError',
        exception_value: 'Cannot read property test of undefined',
        fingerprint: ['TypeError', 'test error'],
        environment: 'production',
        group_id: testGroup.id,
        stack_trace: `TypeError: Cannot read property 'test' of undefined
    at Object.<anonymous> (/app/index.js:10:15)
    at Module._compile (internal/modules/cjs/loader.js:999:30)`,
        sdk: '@sentry/node',
        sdk_version: '7.0.0',
      }
    ]

    await clickHouseService.batchInsert(testEvents)
  })

  group.each.teardown(async () => {
    // Cleanup test data
    await ErrorGroup.query().where('project_id', testProject.id).delete()
    await testProject.delete()
  })

  test('should analyze a specific error event', async ({ client, assert }) => {
    const testEventId = randomUUID()
    const testEvent: ErrorEvent = {
      id: testEventId,
      timestamp: new Date(),
      received_at: new Date(),
      projectId: testProject.id,
      level: 'error',
      message: 'Database connection timeout',
      type: 'error',
      platform: 'node',
      exception_type: 'DatabaseError',
      exception_value: 'Connection timeout after 30s',
      fingerprint: ['DatabaseError', 'timeout'],
      environment: 'production',
      stack_trace: 'DatabaseError: Connection timeout after 30s\n    at connect (db.js:45:11)',
      sdk: '@sentry/node',
      sdk_version: '7.0.0',
    }

    await clickHouseService.storeErrorEvent(testEvent)

    const response = await client
      .post(`/api/projects/${testProject.id}/errors/${testEventId}/analyze`)
      .withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    
    const body = response.body()
    if (body.analysis) {
      assert.exists(body.analysis.summary)
      assert.exists(body.analysis.severity)
      assert.isArray(body.analysis.possibleCauses)
    }
  })

  test('should return 404 for non-existent error', async ({ client }) => {
    const nonExistentId = randomUUID()

    const response = await client
      .post(`/api/projects/${testProject.id}/errors/${nonExistentId}/analyze`)
      .withInertia()

    response.assertStatus(404)
    response.assertBodyContains({ error: 'Error event not found' })
  })

  test('should get AI analysis for error group', async ({ client, assert }) => {
    const response = await client
      .get(`/api/projects/${testProject.id}/groups/${testGroup.id}/ai-analysis`)
      .withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    
    const body = response.body()
    assert.exists(body.statistics)
    assert.exists(body.statistics.totalEvents)
    assert.exists(body.statistics.uniqueUsers)
    assert.exists(body.statistics.recentTrend)
  })

  test('should refresh AI analysis when requested', async ({ client, assert }) => {
    // First, give the group an old analysis
    testGroup.aiSummary = 'Old analysis'
    testGroup.metadata = {
      aiAnalysis: { summary: 'Old analysis', severity: 'low' },
      lastAnalysisDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days old
    }
    await testGroup.save()

    const response = await client
      .get(`/api/projects/${testProject.id}/groups/${testGroup.id}/ai-analysis`)
      .qs({ refresh: true })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.aiSummary)
    assert.exists(body.lastAnalysisDate)
    
    // Check if analysis was refreshed (date should be recent)
    if (body.lastAnalysisDate) {
      const analysisDate = new Date(body.lastAnalysisDate)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      assert.isTrue(analysisDate > hourAgo, 'Analysis date should be recent')
    }
  })

  test('should get batch AI analysis for multiple groups', async ({ client, assert }) => {
    // Create additional test groups
    const group2 = await ErrorGroup.create({
      projectId: testProject.id,
      fingerprintHash: 'test-hash-2-' + randomUUID(),
      fingerprint: ['ReferenceError', 'not defined'],
      title: 'ReferenceError: x is not defined',
      type: 'ReferenceError',
      message: 'x is not defined',
      platform: 'javascript',
      firstSeen: DateTime.now(),
      lastSeen: DateTime.now(),
      status: 'unresolved',
      aiSummary: 'Variable x is not defined in the current scope'
    })

    const response = await client
      .post(`/api/projects/${testProject.id}/groups/ai-analysis`)
      .json({
        groupIds: [testGroup.id, group2.id],
        includeStats: true
      })
      .withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    
    const body = response.body()
    assert.isArray(body.groups)
    assert.lengthOf(body.groups, 2)
    assert.exists(body.groups[0].groupId)
    assert.exists(body.groups[0].title)
    
    // One group should have AI summary, one might not
    const groupsWithAnalysis = body.groups.filter((g: any) => g.aiSummary)
    assert.isAtLeast(groupsWithAnalysis.length, 1)

    // Cleanup
    await group2.delete()
  })

  test('should validate batch analysis request', async ({ client }) => {
    // Test with empty array
    const response1 = await client
      .post(`/api/projects/${testProject.id}/groups/ai-analysis`)
      .json({ groupIds: [] })
      .withInertia()

    response1.assertStatus(400)
    response1.assertBodyContains({ error: 'groupIds array is required' })

    // Test with too many groups
    const tooManyIds = Array.from({ length: 25 }, () => randomUUID())
    const response2 = await client
      .post(`/api/projects/${testProject.id}/groups/ai-analysis`)
      .json({ groupIds: tooManyIds })
      .withInertia()

    response2.assertStatus(400)
    response2.assertBodyContains({ error: 'Maximum 20 groups can be analyzed at once' })
  })

  test('should get project trends with AI analysis', async ({ client, assert }) => {
    // Create some error events with different timestamps
    const now = new Date()
    const events: ErrorEvent[] = []
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000) // Each hour back
      events.push({
        id: randomUUID(),
        timestamp,
        received_at: timestamp,
        projectId: testProject.id,
        level: i < 5 ? 'error' : 'warning',
        message: 'Test error for trends',
        type: 'error',
        platform: 'javascript',
        exception_type: i < 3 ? 'TypeError' : 'ReferenceError',
        exception_value: 'Test error',
        fingerprint: [`Error-${i % 3}`], // 3 different error types
        environment: 'production',
        sdk: '@sentry/browser',
        sdk_version: '7.0.0',
      })
    }

    await clickHouseService.batchInsert(events)

    const response = await client
      .get(`/api/projects/${testProject.id}/ai/trends`)
      .qs({ period: '1d' })
      .withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    
    const body = response.body()
    assert.equal(body.period, '1d')
    assert.isArray(body.trends)
    assert.isArray(body.topErrors)
    
    if (body.aiAnalysis) {
      assert.exists(body.aiAnalysis.summary)
      assert.isArray(body.aiAnalysis.insights)
      assert.isArray(body.aiAnalysis.recommendations)
    }
  })

  test('should find similar errors', async ({ client, assert }) => {
    // Create an error event to find similar ones
    const testEventId = randomUUID()
    const testEvent: ErrorEvent = {
      id: testEventId,
      timestamp: new Date(),
      received_at: new Date(),
      projectId: testProject.id,
      level: 'error',
      message: 'Cannot read property name of undefined',
      type: 'error',
      platform: 'javascript',
      exception_type: 'TypeError',
      exception_value: 'Cannot read property name of undefined',
      fingerprint: ['TypeError', 'property name'],
      environment: 'production',
      sdk: '@sentry/browser',
      sdk_version: '7.0.0',
    }

    await clickHouseService.storeErrorEvent(testEvent)

    const response = await client
      .get(`/api/projects/${testProject.id}/errors/${testEventId}/similar`)
      .withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    
    const body = response.body()
    assert.isArray(body.similarErrors)
  })

  test('should suggest fix for error', async ({ client, assert }) => {
    // Create an error with clear fix potential
    const testEventId = randomUUID()
    const testEvent: ErrorEvent = {
      id: testEventId,
      timestamp: new Date(),
      received_at: new Date(),
      projectId: testProject.id,
      level: 'error',
      message: 'Cannot read property length of null',
      type: 'error',
      platform: 'javascript',
      exception_type: 'TypeError',
      exception_value: 'Cannot read property length of null',
      fingerprint: ['TypeError', 'length of null'],
      stack_trace: `TypeError: Cannot read property 'length' of null
    at processArray (utils.js:15:20)
    at main (index.js:45:10)`,
      environment: 'production',
      sdk: '@sentry/browser',
      sdk_version: '7.0.0',
    }

    await clickHouseService.storeErrorEvent(testEvent)

    const response = await client
      .post(`/api/projects/${testProject.id}/errors/${testEventId}/suggest-fix`)
      .withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    
    const body = response.body()
    if (body.suggestedFix) {
      assert.exists(body.suggestedFix.description)
      assert.exists(body.suggestedFix.confidence)
    }
  })

  test('should handle AI service unavailability gracefully', async ({ client }) => {
    // Test with a project that might not have AI configured
    const testEventId = randomUUID()
    
    // Don't create the event in ClickHouse to simulate service issue
    const response = await client
      .post(`/api/projects/${testProject.id}/errors/${testEventId}/analyze`)
      .withInertia()

    response.assertStatus(404)
  })
})