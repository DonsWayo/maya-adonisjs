#!/usr/bin/env node

// Test script to send error events to the monitoring app

const payload = {
  timestamp: new Date().toISOString(),
  level: 'error',
  message: 'Database connection timeout: Unable to establish connection to PostgreSQL server',
  logger: 'app.database',
  platform: 'node',
  sdk: {
    name: 'sentry.javascript.node',
    version: '7.0.0'
  },
  release: '1.0.0',
  environment: 'production',
  server_name: 'api-server-01',
  transaction: '/api/users/:id',
  exception: {
    values: [{
      type: 'DatabaseConnectionError',
      value: 'Connection timeout after 30000ms',
      module: 'pg',
      stacktrace: {
        frames: [
          {
            filename: 'node_modules/pg/lib/client.js',
            function: 'Client.connect',
            lineno: 245,
            colno: 15,
            in_app: false
          },
          {
            filename: 'app/services/database.js',
            function: 'DatabaseService.query',
            lineno: 42,
            colno: 8,
            in_app: true,
            context_line: '    const result = await this.client.query(sql, params)'
          },
          {
            filename: 'app/controllers/UserController.js',
            function: 'UserController.show',
            lineno: 15,
            colno: 20,
            in_app: true,
            context_line: '    const user = await db.query("SELECT * FROM users WHERE id = $1", [id])'
          }
        ]
      }
    }]
  },
  fingerprint: ['DatabaseConnectionError', 'pg', 'Connection timeout'],
  tags: {
    handled: 'false',
    mechanism: 'unhandledRejection'
  },
  extra: {
    connection_pool_size: 10,
    active_connections: 10,
    pending_connections: 25,
    database_host: 'db.example.com'
  },
  request: {
    url: 'https://api.example.com/api/users/123',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  },
  user: {
    id: 'user-123',
    email: 'test@example.com'
  },
  breadcrumbs: [
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'http',
      category: 'fetch',
      level: 'info',
      message: 'GET /api/auth/verify 200'
    },
    {
      timestamp: new Date(Date.now() - 30000).toISOString(),
      type: 'navigation',
      category: 'navigation',
      data: {
        from: '/dashboard',
        to: '/users/123'
      }
    },
    {
      timestamp: new Date(Date.now() - 5000).toISOString(),
      type: 'error',
      category: 'console',
      level: 'warning',
      message: 'Database connection pool exhausted'
    }
  ]
}

// Get project ID from the database
async function sendError() {
  try {
    // Use the first project's public key
    const projectId = 'e59e321dd2c145a292a4662a6b6ec4f2' // Frontend Application public key
    
    // Send error to Sentry-compatible endpoint
    const response = await fetch(`http://localhost:3334/api/${projectId}/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    console.log('Error sent successfully:', result)
  } catch (error) {
    console.error('Failed to send error:', error)
  }
}

sendError()