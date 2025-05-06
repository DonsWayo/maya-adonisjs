# Docker Compose Configuration

This document provides comprehensive information about the Docker Compose setup for the Maya AdonisJS project, including service endpoints, configuration details, and how the services interact.

## Table of Contents

- [Overview](#overview)
- [Service Endpoints](#service-endpoints)
- [Service Details](#service-details)
  - [Main Application (AdonisJS)](#main-application-adonisjs)
  - [Documentation App](#documentation-app)
  - [PostgreSQL with PgAI](#postgresql-with-pgai)
  - [Redis](#redis)
  - [ClickHouse](#clickhouse)
  - [Logto Authentication](#logto-authentication)
  - [MailHog](#mailhog)
  - [Traefik](#traefik)
  - [MinIO](#minio)
  - [Ollama AI](#ollama-ai)
- [Network Configuration](#network-configuration)
- [Volume Management](#volume-management)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Overview

The project uses Docker Compose to orchestrate a suite of services that work together to provide a complete development environment. The setup includes:

- Main AdonisJS application with Inertia.js and React
- Documentation site built with Next.js
- PostgreSQL database with TimescaleDB and PgAI integration
- Redis for caching and session management
- ClickHouse for analytics
- Logto for authentication
- Traefik for routing and service discovery
- Additional supporting services (MailHog, MinIO, Ollama)

## Service Endpoints

All services are accessible through Traefik, which provides routing based on hostnames. Here are the main endpoints:

| Service | URL | Description |
|---------|-----|-------------|
| Main Application | http://main.localhost or http://localhost | The main AdonisJS application |
| Documentation | http://docs.localhost | Documentation site |
| Traefik Dashboard | http://localhost:8080 | Traefik admin dashboard |
| Logto Auth | http://logto.localhost | Logto authentication service |
| Logto Admin | http://admin.logto.localhost | Logto admin interface |
| MailHog | http://mailhog.localhost | Email testing interface |
| MinIO API | http://minio.localhost | MinIO S3-compatible storage API |
| MinIO Console | http://minio-console.localhost | MinIO admin console |

Direct port mappings:

| Service | Port | Description |
|---------|------|-------------|
| Main Application | 3333 | Direct access to the AdonisJS app |
| Documentation | 3300 | Direct access to the docs app |
| PostgreSQL | 5432 | Database connection |
| Redis | 6379 | Redis connection |
| ClickHouse HTTP | 8123 | ClickHouse HTTP interface |
| ClickHouse Native | 9000 | ClickHouse native protocol |
| Logto | 3001-3002 | Logto service and admin |
| MailHog SMTP | 1025 | SMTP server for testing |
| MailHog UI | 8025 | Web UI for email testing |
| Ollama | 11434 | AI model API |
| Traefik | 80, 443, 8080 | HTTP, HTTPS, and dashboard |

## Service Details

### Main Application (AdonisJS)

The main application is an AdonisJS 6 app with Inertia.js and React 19 integration.

```yaml
main:
  build:
    context: .
    dockerfile: ./apps/web/Dockerfile
    target: development
  container_name: 'maya_main'
  restart: unless-stopped
  volumes:
    - ./apps/web:/app/apps/web
    - /app/apps/web/node_modules
    - main_uploads:/app/apps/web/uploads
    - main_tmp:/app/apps/web/tmp
  ports:
    - '${WEB_PORT:-3333}:3333'
```

- **Development Mode**: The application runs in development mode with hot reloading (Vite HMR)
- **Volume Mounts**: Source code is mounted for live editing
- **Environment Variables**: Configuration via environment variables
- **Dependencies**: Requires PostgreSQL, Redis, and MailHog
- **Host Configuration**: Uses `HOST=0.0.0.0` to allow connections from outside the container
- **URL Configuration**: Uses `main.localhost` as the primary domain

### Documentation App

A Next.js application serving project documentation.

```yaml
docs:
  build:
    context: .
    dockerfile: ./apps/docs/Dockerfile
    target: development
  container_name: 'maya_docs'
  restart: unless-stopped
  volumes:
    - ./apps/docs:/app/apps/docs
    - /app/apps/docs/node_modules
  ports:
    - '${DOCS_PORT:-3300}:3300'
```

- **Development Mode**: Runs with hot reloading
- **Volume Mounts**: Source code is mounted for live editing

### PostgreSQL with PgAI

TimescaleDB with PostgreSQL 17 and PgAI integration for AI-powered database features.

```yaml
pgsql:
  image: 'timescale/timescaledb-ha:pg17'
  container_name: 'maya_pgsql'
  ports:
    - '${DB_PORT:-5432}:5432'
  environment:
    POSTGRES_DB: '${DB_DATABASE:-default}'
    POSTGRES_USER: '${DB_USER:-postgres}'
    POSTGRES_PASSWORD: '${DB_PASSWORD:-secret}'
  volumes:
    - 'pgsql_data:/home/postgres/pgdata/data'
  command: ["-c", "ai.ollama_host=http://ollama:11434"]
```

- **PgAI Integration**: Connected to Ollama for AI capabilities
- **Persistent Storage**: Data stored in a named volume
- **Environment Variables**: Configurable database name, user, and password

### Redis

Redis 7 for caching, session storage, and pub/sub messaging.

```yaml
redis:
  image: 'redis:7-alpine'
  container_name: 'maya_redis'
  ports:
    - '${REDIS_PORT:-6379}:6379'
  volumes:
    - 'redis_data:/data'
```

- **Persistent Storage**: Data stored in a named volume
- **Alpine-based**: Lightweight container image

### ClickHouse

ClickHouse for analytics and data warehousing.

```yaml
clickhouse:
  image: 'clickhouse/clickhouse-server:23.8-alpine'
  container_name: 'maya_clickhouse'
  ports:
    - '${CLICKHOUSE_PORT:-8123}:8123'
    - '${CLICKHOUSE_NATIVE_PORT:-9000}:9000'
  volumes:
    - 'clickhouse_data:/var/lib/clickhouse'
```

- **HTTP and Native Interfaces**: Both protocols exposed
- **Persistent Storage**: Data stored in a named volume

### Logto Authentication

Logto for identity and access management.

```yaml
logto:
  image: 'svhd/logto:latest'
  container_name: 'maya_logto'
  depends_on:
    logto_postgres:
      condition: service_healthy
  ports:
    - '${LOGTO_PORT:-3001}:3001'
    - '${LOGTO_ADMIN_PORT:-3002}:3002'
  environment:
    - TRUST_PROXY_HEADER=1
    - DB_URL=postgres://postgres:p0stgr3s@logto_postgres:5432/logto
    - ENDPOINT=http://logto.localhost
    - ADMIN_ENDPOINT=http://admin.logto.localhost
    - COOKIE_DOMAIN=.localhost
  volumes:
    - 'logto_data:/opt/logto/packages/core/data'
```

- **Dedicated Database**: Uses its own PostgreSQL instance
- **Traefik Integration**: Configured for proper routing
- **Default Admin**: Seeded with default admin credentials
- **Callback URL**: Configured to use `http://main.localhost/logto/callback`
- **Authentication Flow**: Integrated with the main application

### MailHog

MailHog for email testing.

```yaml
mailhog:
  image: 'mailhog/mailhog:latest'
  container_name: 'maya_mailhog'
  ports:
    - '${MAILHOG_SMTP_PORT:-1025}:1025'
    - '${MAILHOG_UI_PORT:-8025}:8025'
```

- **SMTP Server**: Captures all outgoing emails
- **Web UI**: Visual interface for viewing emails

### Traefik

Traefik for routing and service discovery.

```yaml
traefik:
  image: traefik:v2.9
  container_name: 'maya_traefik'
  restart: unless-stopped
  command:
    - "--api.insecure=true"
    - "--providers.docker=true"
    - "--providers.docker.exposedbydefault=false"
    - "--entrypoints.web.address=:80"
    - "--entrypoints.web.forwardedHeaders.insecure=true"
    - "--entrypoints.websecure.address=:443"
    - "--entrypoints.websecure.forwardedHeaders.insecure=true"
  ports:
    - '${TRAEFIK_PORT:-80}:80'
    - '${TRAEFIK_SECURE_PORT:-443}:443'
    - '${TRAEFIK_DASHBOARD_PORT:-8080}:8080'
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
```

- **Docker Integration**: Auto-discovers services
- **Dashboard**: Admin interface on port 8080
- **HTTP and HTTPS**: Both protocols supported

### MinIO

MinIO for S3-compatible object storage.

```yaml
minio:
  image: minio/minio:latest
  container_name: 'maya_minio'
  restart: unless-stopped
  profiles: ["dev"]
  command: server /data --console-address ":9001"
  environment:
    - MINIO_ROOT_USER=minioadmin
    - MINIO_ROOT_PASSWORD=minioadmin
  volumes:
    - minio_data:/data
```

- **S3 Compatible**: API compatible with Amazon S3
- **Web Console**: Admin interface
- **Default Credentials**: minioadmin/minioadmin

### Ollama AI

Ollama for AI capabilities with Gemma 3 model.

```yaml
ollama:
  image: 'ollama/ollama:latest'
  container_name: 'maya_ollama'
  volumes:
    - 'ollama_data:/root/.ollama'
  ports:
    - '${OLLAMA_PORT:-11434}:11434'
  command: ["serve"]
  profiles: [ai]
```

- **AI Models**: Serves AI models for application use
- **Gemma 3**: Default model is Gemma 3 (2B parameter version)
- **Optional**: Enabled with the "ai" profile

## Network Configuration

All services are connected to a common network:

```yaml
networks:
  maya_network:
    name: maya-adonisjs_maya_network
    driver: bridge
```

This allows services to communicate with each other using their service names as hostnames.

## Volume Management

Persistent data is stored in Docker volumes:

```yaml
volumes:
  pgsql_data:
  redis_data:
  clickhouse_data:
  logto_postgres_data:
  logto_data:
  ollama_data:
  main_uploads:
  main_tmp:
  minio_data:
```

These volumes persist data between container restarts and updates.

## Development Workflow

1. Start the environment:
   ```bash
   docker compose up -d
   ```

2. Start with AI capabilities:
   ```bash
   docker compose --profile ai up -d
   ```

3. View logs:
   ```bash
   docker compose logs -f main
   ```

4. Stop the environment:
   ```bash
   docker compose down
   ```

5. Rebuild a specific service:
   ```bash
   docker compose build main
   ```

## Troubleshooting

### Container Fails to Start

Check the logs:
```bash
docker compose logs main
```

### Database Connection Issues

Ensure PostgreSQL is healthy:
```bash
docker compose ps pgsql
```

### Traefik Routing Problems

1. Check Traefik dashboard at http://localhost:8080
2. Verify service labels in docker-compose.yaml
3. Ensure hostnames resolve to 127.0.0.1 in your hosts file

### Rebuilding Containers

If you encounter issues after configuration changes:
```bash
docker compose down
docker compose up -d --build
```
