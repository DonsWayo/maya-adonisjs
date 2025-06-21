#!/bin/bash
set -e

echo "DEVELOPMENT"

# Wait for database to be ready (optional, can be implemented with a healthcheck)
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
echo "Running database migrations..."
# Run default migrations
node ace migration:run

# Run seeds in development environment
echo "Seeding database..."
node ace db:seed

# Start the application
echo "Starting application in development mode..."
# Use polling for file watching in Docker (fixes hot reload on Mac/Windows)
# Use --poll without --watch or --hmr for proper file watching in Docker
exec node ace serve --watch --poll
