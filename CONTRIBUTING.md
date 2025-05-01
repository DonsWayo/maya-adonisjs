# Contributing to Maya AdonisJS Project

This document provides comprehensive guidelines for setting up the development environment and contributing to the Maya AdonisJS project.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Docker Compose Configuration](#docker-compose-configuration)
- [Available Services](#available-services)
- [Service Configuration](#service-configuration)
  - [Web Application](#web-application)
  - [PostgreSQL with PgAI](#postgresql-with-pgai)
  - [Ollama AI](#ollama-ai)
  - [MailHog](#mailhog)
  - [Logto Authentication](#logto-authentication)
  - [Redis](#redis)
  - [ClickHouse](#clickhouse)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)

## Development Environment Setup

The project uses Docker Compose to create a complete development environment with all necessary services.

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development outside Docker)
- pnpm (for package management)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/maya-adonisjs.git
   cd maya-adonisjs
   ```

2. Start the development environment:
   ```bash
   docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
   ```

3. Access the web application:
   ```
   http://localhost:3333
   ```
   or via the Nginx proxy:
   ```
   http://localhost
   ```

## Docker Compose Configuration

The project uses a modular Docker Compose structure:

- `docker-compose.yaml`: Core services definition
- `docker-compose.prod.yaml`: Development environment configuration
- `apps/web/docker-compose.yaml`: Web application-specific configuration

### Multi-Stage Dockerfile

The web application uses a multi-stage Dockerfile that supports both development and production environments:

- **Development**: Uses hot module reloading for rapid development
- **Production**: Creates an optimized build for deployment

To specify which stage to use:
```yaml
build:
  context: .
  dockerfile: apps/web/Dockerfile
  target: development  # or production
```

## Available Services

| Service | Local URL | Description |
|---------|-----------|-------------|
| Web App | http://localhost:3333 | AdonisJS web application |
| Nginx Proxy | http://localhost | Proxy for all services |
| PostgreSQL | localhost:5432 | Database with PgAI extension |
| Ollama | http://localhost:11434 | AI model inference |
| MailHog UI | http://localhost:8025 | Email testing interface |
| MailHog SMTP | localhost:1025 | SMTP server for development |
| Logto Admin | http://localhost:3002 | Authentication admin panel |
| Logto API | http://localhost:3001 | Authentication service |
| Redis | localhost:6379 | Caching and session storage |
| ClickHouse | http://localhost:8123 | Analytics database |

## Service Configuration

### Web Application

The web application is built with AdonisJS and uses Inertia.js with React for the frontend.

#### Environment Variables

Key environment variables for the web application:
```
HOST=localhost
PORT=3333
NODE_ENV=development
DB_HOST=pgsql
REDIS_HOST=redis
CLICKHOUSE_HOST=clickhouse
SMTP_HOST=mailhog
SMTP_PORT=1025
```

### PostgreSQL with PgAI

The project uses PostgreSQL with the PgAI extension for AI capabilities.

#### Connection Details
- Host: `pgsql`
- Port: `5432`
- Username: `postgres` (default)
- Password: `secret` (default)
- Database: `default` (default)

#### Using PgAI with Ollama

```sql
-- Install the extension
CREATE EXTENSION pgai;

-- Generate text with Gemma 3
SELECT ai.generate_text('gemma3:2b-instruct-q4_0', 'Write a short poem about databases');

-- Create embeddings for vector search
SELECT ai.embed('gemma3:2b-instruct-q4_0', 'This is some text to embed');
```

### Ollama AI

Ollama provides AI model inference capabilities.

#### API Endpoints
- Base URL: `http://ollama:11434`
- Generate: `POST /api/generate`
- List Models: `GET /api/tags`

#### Available Models
- `gemma3:2b-instruct-q4_0`: Small instruction-tuned Gemma 3 model

### MailHog

MailHog provides email testing capabilities for development.

#### SMTP Configuration
- Host: `mailhog` (from within Docker) or `localhost` (from host)
- Port: `1025`
- Authentication: None required (set to `null`)
- TLS: Disabled

#### Email Testing UI
- URL: `http://localhost:8025`
- Features:
  - View all sent emails
  - Inspect HTML content
  - View attachments
  - Search and filter

#### Logto SMTP Configuration

When configuring SMTP in Logto:
1. Set Host to `mailhog`
2. Set Port to `1025`
3. Set Auth to `null` (no authentication)
4. Enable "Ignore TLS"

![Logto SMTP Configuration](https://github.com/your-username/maya-adonisjs/raw/main/docs/images/logto-smtp-config.png)

### Logto Authentication

Logto provides authentication and user management.

#### Admin Panel
- URL: `http://localhost:3002`
- Default credentials: Created during first run

#### API Endpoints
- Base URL: `http://localhost:3001`
- OIDC Auth: `http://localhost:3001/oidc/auth`
- OIDC Token: `http://localhost:3001/oidc/token`
- OIDC User Info: `http://localhost:3001/oidc/me`

#### AdonisJS Integration

The project uses the Ally package for Logto integration:

```typescript
// config/ally.ts
logto: logto({
  driver: 'logto',
  logtoUrl: env.get('LOGTO_URL'),
  authorizeUrl: env.get('LOGTO_AUTHORIZE_URL'),
  accessTokenUrl: env.get('LOGTO_ACCESS_TOKEN_URL'),
  userInfoUrl: env.get('LOGTO_USER_INFO_URL'),
  clientId: env.get('LOGTO_CLIENT_ID'),
  clientSecret: env.get('LOGTO_CLIENT_SECRET'),
  callbackUrl: env.get('LOGTO_CALLBACK_URL'),
})
```

### Redis

Redis is used for caching, session storage, and pub/sub.

#### Connection Details
- Host: `redis`
- Port: `6379`

### ClickHouse

ClickHouse is used for analytics.

#### Connection Details
- HTTP Interface: `http://clickhouse:8123`
- Native Interface: `clickhouse:9000`

## Development Workflow

1. **Start the environment**:
   ```bash
   docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
   ```

2. **Make changes**: The development environment uses volume mounts, so changes to the source code are immediately reflected.

3. **View logs**:
   ```bash
   docker logs maya_web -f
   ```

4. **Run commands in the container**:
   ```bash
   docker exec -it maya_web sh -c "node ace make:controller User"
   ```

5. **Stop the environment**:
   ```bash
   docker compose -f docker-compose.yaml -f docker-compose.prod.yaml down
   ```

## Commit Guidelines

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

1. Commits must be prefixed with a type:
   - `feat:` - A new feature
   - `fix:` - A bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code changes that neither fix bugs nor add features
   - `perf:` - Performance improvements
   - `test:` - Adding or fixing tests
   - `build:` - Changes to the build system
   - `ci:` - Changes to CI configuration
   - `chore:` - Other changes that don't modify src or test files

2. The type may be followed by a scope in parentheses:
   ```
   feat(api): add user authentication endpoint
   ```

3. The type/scope is followed by a description in the imperative mood:
   ```
   fix(database): resolve connection pooling issue
   ```

4. Breaking changes should be indicated by an exclamation mark:
   ```
   feat!: change API response format
   ```
   or by using `BREAKING CHANGE:` in the footer:
   ```
   feat: change API response format

   BREAKING CHANGE: The response format has changed from XML to JSON
   ```
