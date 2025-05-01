#!/bin/bash
set -e

# Wait for database to be ready (optional, can be implemented with a healthcheck)
echo "Waiting for database to be ready..."
sleep 5

# Run migrations in production environment
echo "Running database migrations..."
node ace migration:run

# Start the application
echo "Starting application in production mode..."
exec node bin/server.js
