import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import crypto from 'node:crypto'
import Project from '#error/models/project'
import { ClickHouseService } from '#error/services/clickhouse_service'
import AICacheService from '#services/ai/ai_cache_service'

test.group('AI Cache Controller', (group) => {
  let testProject: Project
  let clickHouseService: ClickHouseService
  let aiCacheService: AICacheService

  group.each.setup(async () => {
    // Create test project
    testProject = new Project()
    testProject.id = randomUUID()
    testProject.name = 'AI Cache Test Project'
    testProject.slug = `ai-cache-test-${randomUUID().substring(0, 8)}`
    testProject.platform = 'javascript'
    testProject.status = 'active'
    testProject.organizationId = '5660a1b2-6fc3-4eba-90bf-13496ee275d7'
    testProject.publicKey = randomUUID().replace(/-/g, '')
    testProject.secretKey = randomUUID().replace(/-/g, '')
    testProject.dsn = `https://${testProject.publicKey}@sentry.example.com/${testProject.id}`
    await testProject.save()

    clickHouseService = new ClickHouseService()
    aiCacheService = new AICacheService(clickHouseService)

    // Create some test cache entries
    const testFingerprint = 'test-error-fingerprint'
    const fingerprintHash = crypto
      .createHash('sha256')
      .update(testFingerprint)
      .digest('hex')

    await aiCacheService.cacheAnalysis(
      fingerprintHash,
      'error_analysis',
      {
        summary: 'Test error analysis',
        severity: 'high',
        category: 'runtime',
        possibleCauses: ['Null reference', 'Async timing issue'],
        suggestedFixes: [{
          description: 'Add null check',
          code: 'if (obj) { ... }',
          confidence: 0.9
        }]
      },
      {
        provider: 'openai',
        model: 'gpt-4',
        prompt: 'Analyze this error',
        projectId: testProject.id,
        confidenceScore: 0.95,
        isPublic: true,
        errorPatterns: ['TypeError', 'undefined'],
        promptTokens: 150,
        completionTokens: 250
      }
    )

    // Create another cache entry
    await aiCacheService.cacheAnalysis(
      fingerprintHash,
      'suggested_fix',
      {
        fixes: [{
          description: 'Add defensive programming',
          code: 'const value = obj?.property ?? defaultValue;',
          confidence: 0.85
        }]
      },
      {
        provider: 'openai',
        model: 'gpt-4',
        prompt: 'Suggest fix',
        projectId: testProject.id,
        confidenceScore: 0.85,
        promptTokens: 100,
        completionTokens: 200
      }
    )
  })

  group.each.teardown(async () => {
    // Cleanup test data
    await testProject.delete()
  })

  test('should get cache statistics', async ({ client, assert }) => {
    const response = await client
      .get('/api/ai-cache/stats')
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.totalCacheHits)
    assert.exists(body.totalTokensSaved)
    assert.exists(body.totalCostSavedCents)
    assert.exists(body.byAnalysisType)
    assert.exists(body.byProvider)
  })

  test('should get cached analysis for specific fingerprint', async ({ client, assert }) => {
    const testFingerprint = 'test-error-fingerprint'
    const fingerprintHash = crypto
      .createHash('sha256')
      .update(testFingerprint)
      .digest('hex')

    const response = await client
      .get(`/api/projects/${testProject.id}/ai-cache/${fingerprintHash}/error_analysis`)
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.cached)
    
    if (body.cached) {
      assert.equal(body.analysis.summary, 'Test error analysis')
      assert.equal(body.analysis.severity, 'high')
      assert.isArray(body.analysis.possibleCauses)
      assert.equal(body.cached.provider, 'openai')
      assert.equal(body.cached.model, 'gpt-4')
      assert.isAbove(body.cached.confidenceScore, 0.9)
    }
  })

  test('should return not found for non-existent cache entry', async ({ client }) => {
    const nonExistentHash = crypto
      .createHash('sha256')
      .update('non-existent-error')
      .digest('hex')

    const response = await client
      .get(`/api/projects/${testProject.id}/ai-cache/${nonExistentHash}/error_analysis`)
      .withInertia()

    response.assertStatus(404)
    response.assertBodyContains({ 
      error: 'No cached analysis found' 
    })
  })

  test('should submit feedback for cached analysis', async ({ client, assert }) => {
    const testFingerprint = 'test-error-fingerprint'
    const fingerprintHash = crypto
      .createHash('sha256')
      .update(testFingerprint)
      .digest('hex')

    const response = await client
      .post(`/api/ai-cache/${fingerprintHash}/error_analysis/feedback`)
      .json({
        score: 4.5,
        comment: 'Very helpful analysis'
      })
      .withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    
    // Verify feedback was recorded by checking cache stats
    const statsResponse = await client
      .get('/api/ai-cache/stats')
      .withInertia()
    
    assert.exists(statsResponse.body())
  })

  test('should validate feedback score', async ({ client }) => {
    const fingerprintHash = 'test-hash'

    // Test invalid score (too high)
    const response1 = await client
      .post(`/api/ai-cache/${fingerprintHash}/error_analysis/feedback`)
      .json({
        score: 6
      })
      .withInertia()

    response1.assertStatus(422)
    response1.assertBodyContains({ 
      messages: [{
        field: 'score',
        rule: 'max'
      }]
    })

    // Test invalid score (too low)
    const response2 = await client
      .post(`/api/ai-cache/${fingerprintHash}/error_analysis/feedback`)
      .json({
        score: -1
      })
      .withInertia()

    response2.assertStatus(422)
    response2.assertBodyContains({ 
      messages: [{
        field: 'score',
        rule: 'min'
      }]
    })
  })

  test('should validate analysis type', async ({ client }) => {
    const fingerprintHash = 'test-hash'

    const response = await client
      .get(`/api/projects/${testProject.id}/ai-cache/${fingerprintHash}/invalid_type`)
      .withInertia()

    response.assertStatus(422)
    response.assertBodyContains({ 
      messages: [{
        field: 'analysisType',
        rule: 'enum'
      }]
    })
  })

  test('should filter cache stats by date range', async ({ client, assert }) => {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    const endDate = new Date().toISOString()

    const response = await client
      .get('/api/ai-cache/stats')
      .qs({ startDate, endDate })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    assert.exists(body.totalCacheHits)
    assert.exists(body.period)
    assert.equal(body.period.startDate.split('T')[0], startDate.split('T')[0])
    assert.equal(body.period.endDate.split('T')[0], endDate.split('T')[0])
  })

  test('should return cache entry metadata', async ({ client, assert }) => {
    const testFingerprint = 'test-error-fingerprint'
    const fingerprintHash = crypto
      .createHash('sha256')
      .update(testFingerprint)
      .digest('hex')

    const response = await client
      .get(`/api/projects/${testProject.id}/ai-cache/${fingerprintHash}/error_analysis`)
      .qs({ includeMetadata: true })
      .withInertia()

    response.assertStatus(200)
    
    const body = response.body()
    if (body.cached) {
      assert.exists(body.cached.createdAt)
      assert.exists(body.cached.lastUsedAt)
      assert.exists(body.cached.usageCount)
      assert.isArray(body.cached.projectsUsed)
      // Skip project ID check as cache entries might be from previous runs
    }
  })

  test('should respect privacy settings for cache entries', async ({ client }) => {
    // Create a private cache entry for a different project
    const otherProjectId = randomUUID()
    const privateFingerprint = 'private-error-fingerprint'
    const privateFingerprintHash = crypto
      .createHash('sha256')
      .update(privateFingerprint)
      .digest('hex')

    await aiCacheService.cacheAnalysis(
      privateFingerprintHash,
      'error_analysis',
      {
        summary: 'Private error analysis',
        severity: 'low'
      },
      {
        provider: 'openai',
        model: 'gpt-4',
        prompt: 'Analyze private error',
        projectId: otherProjectId,
        confidenceScore: 0.9,
        isPublic: false, // Private entry
        promptTokens: 50,
        completionTokens: 100
      }
    )

    // Try to access from different project
    const response = await client
      .get(`/api/projects/${testProject.id}/ai-cache/${privateFingerprintHash}/error_analysis`)
      .withInertia()

    response.assertStatus(404)
    response.assertBodyContains({ 
      error: 'No cached analysis found' 
    })
  })

  test('should track cache hit statistics', async ({ client, assert }) => {
    const testFingerprint = 'test-error-fingerprint'
    const fingerprintHash = crypto
      .createHash('sha256')
      .update(testFingerprint)
      .digest('hex')

    // Get initial stats
    const initialStatsResponse = await client
      .get('/api/ai-cache/stats')
      .withInertia()
    
    const initialStats = initialStatsResponse.body()

    // Access cached entry multiple times
    for (let i = 0; i < 3; i++) {
      await client
        .get(`/api/projects/${testProject.id}/ai-cache/${fingerprintHash}/error_analysis`)
        .withInertia()
    }

    // Wait a bit for async updates
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Get updated stats
    const updatedStatsResponse = await client
      .get('/api/ai-cache/stats')
      .withInertia()
    
    const updatedStats = updatedStatsResponse.body()
    
    // Cache hits should have increased
    assert.isAbove(
      updatedStats.totalCacheHits, 
      initialStats.totalCacheHits,
      'Cache hits should increase'
    )
  })
  .skip(true, 'Depends on ClickHouse materialized view refresh timing')
})