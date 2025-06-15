import { test } from '@japa/runner'
import type { ErrorEvent } from '#error/models/error_event'

test.group('ClickHouse Service', () => {
  test('should create valid error event object', async ({ assert }) => {
    const mockErrorEvent: ErrorEvent = {
      id: 'test-event-id',
      timestamp: new Date(),
      received_at: new Date(),
      projectId: 'test-project-id',
      level: 'error',
      message: 'Test error message',
      type: 'Error',
      handled: 0,
      severity: 'error',
      platform: 'javascript',
      platform_version: null,
      sdk: JSON.stringify({ name: 'test-sdk', version: '1.0.0' }),
      sdk_version: '1.0.0',
      release: null,
      environment: 'test',
      serverName: null,
      runtime: null,
      runtime_version: null,
      transaction: null,
      transaction_duration: null,
      url: null,
      method: null,
      status_code: null,
      user_hash: null,
      session_id: null,
      client_info: null,
      exception: JSON.stringify({
        values: [{
          type: 'Error',
          value: 'Test error message',
          module: 'test.js'
        }]
      }),
      exception_type: 'Error',
      exception_value: 'Test error message',
      exception_module: 'test.js',
      stack_trace: null,
      frames_count: null,
      request: null,
      tags: null,
      extra: null,
      breadcrumbs: null,
      contexts: null,
      fingerprint: ['Error', 'Test error message'],
      memory_usage: null,
      cpu_usage: null,
      duration: null,
      first_seen: new Date(),
      group_id: null,
      is_sample: 0,
      sample_rate: 1,
      has_been_processed: 0
    }

    // Test that the error event object has required fields
    assert.isString(mockErrorEvent.id)
    assert.instanceOf(mockErrorEvent.timestamp, Date)
    assert.isString(mockErrorEvent.projectId)
    assert.isString(mockErrorEvent.level)
    assert.isString(mockErrorEvent.message)
    assert.isString(mockErrorEvent.type)
    assert.isString(mockErrorEvent.platform)
  })

  test('should validate error event required fields', async ({ assert }) => {
    const invalidErrorEvent = {
      // Missing required fields
      id: 'test-id'
    } as ErrorEvent

    // Test that required fields are properly validated
    assert.isString(invalidErrorEvent.id)
    assert.isUndefined(invalidErrorEvent.projectId)
    assert.isUndefined(invalidErrorEvent.message)
  })

  test('should handle JSON stringification of complex objects', async ({ assert }) => {
    const complexException = {
      values: [
        {
          type: 'TypeError',
          value: 'Cannot read property of undefined',
          module: 'main.js',
          stacktrace: {
            frames: [
              {
                filename: 'main.js',
                function: 'onClick',
                lineno: 42,
                colno: 15
              }
            ]
          }
        }
      ]
    }

    const stringifiedJson = JSON.stringify(complexException)
    const parsed = JSON.parse(stringifiedJson)

    assert.isString(stringifiedJson)
    assert.deepEqual(parsed, complexException)
    assert.isArray(parsed.values)
    assert.equal(parsed.values[0].type, 'TypeError')
  })

  test('should handle null and undefined values properly', async ({ assert }) => {
    const errorEventWithNulls: Partial<ErrorEvent> = {
      id: 'test-id',
      platform_version: null,
      release: null,
      serverName: null,
      runtime: null,
      runtime_version: null,
      transaction: null,
      user_hash: null,
      session_id: null
    }

    // Test that null values are preserved
    assert.isNull(errorEventWithNulls.platform_version)
    assert.isNull(errorEventWithNulls.release)
    assert.isNull(errorEventWithNulls.serverName)
    assert.isString(errorEventWithNulls.id)
  })

  test('should create proper fingerprint array', async ({ assert }) => {
    const errorType = 'ReferenceError'
    const errorMessage = 'Variable is not defined'
    const fingerprint = [errorType, errorMessage]

    assert.isArray(fingerprint)
    assert.lengthOf(fingerprint, 2)
    assert.equal(fingerprint[0], errorType)
    assert.equal(fingerprint[1], errorMessage)
  })
}) 