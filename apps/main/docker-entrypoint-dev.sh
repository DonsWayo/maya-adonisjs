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
exec node ace serve --hmr
