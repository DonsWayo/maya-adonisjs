#!/bin/bash
set -e

# Wait for PostgreSQL to be ready (optional, can be implemented with a healthcheck)
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Run PostgreSQL migrations in production environment
echo "Running PostgreSQL migrations..."
node ace migration:run

# Wait for ClickHouse to be ready
echo "Waiting for ClickHouse to be ready..."
sleep 5

# Run ClickHouse migrations
echo "Running ClickHouse migrations..."
node ace clickhouse:migrate

# Start the application
echo "Starting application in production mode..."
exec node bin/server.js
