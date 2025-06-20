#!/bin/bash
# set -e

echo "DEVELOPMENT"

# Wait for PostgreSQL to be ready (optional, can be implemented with a healthcheck)
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Run PostgreSQL migrations
echo "Running PostgreSQL migrations..."
node ace migration:run 2>&1 || echo "PostgreSQL migration error: $?"

# Wait for ClickHouse to be ready
echo "Waiting for ClickHouse to be ready..."
sleep 5

# Run ClickHouse migrations
echo "Running ClickHouse migrations..."
node ace clickhouse:migrate

# Run seeds in development environment
echo "Seeding database..."
node ace db:seed

# Start the application
echo "Starting application in development mode..."
exec node ace serve --hmr
