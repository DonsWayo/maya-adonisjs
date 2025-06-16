# Maya AdonisJS Project Context

## Project Overview

Maya AdonisJS is a sophisticated, enterprise-ready monorepo application built with AdonisJS 6. It implements a multi-app ecosystem architecture with a central control plane pattern, designed for infinite horizontal scaling while maintaining consistency and security across all applications.

## Architecture Philosophy

### Control Plane Pattern
The `main` app serves as the central control plane for the entire ecosystem:
- **Entity Management**: Manages all shared core entities (users, companies, projects, teams, permissions)
- **Authentication Hub**: Centralized authentication and authorization using Logto
- **Shared Services**: Email, notifications, file storage, audit logs
- **API Gateway**: Provides standardized APIs for inter-app communication

### Multi-App Ecosystem
- Each app handles its specific domain (monitoring, billing, CRM, etc.)
- Apps consume shared entities via APIs from main
- Lightweight, focused applications with their own specialized databases
- All apps share the same authentication system managed by main

## Technology Stack

### Core Technologies
- **Backend Framework**: AdonisJS 6 (Node.js)
- **Frontend**: React 19 with Inertia.js (SPA experience)
- **UI Components**: Shadcn/UI with Radix primitives (New York style)
- **Styling**: TailwindCSS v4 with CSS custom properties
- **TypeScript**: Full type coverage across all applications
- **Build System**: TurboRepo with pnpm workspaces

### Database & Storage
- **Primary Database**: PostgreSQL with TimescaleDB extension
- **AI Integration**: PgAI extension connected to Ollama (Gemma 3 model)
- **Analytics**: ClickHouse for data warehousing and analytics
- **Caching**: Redis for sessions and caching
- **Object Storage**: MinIO (S3-compatible, optional)

### Authentication & Infrastructure
- **Authentication**: Logto (OpenID Connect provider)
- **Reverse Proxy**: Traefik for service discovery and routing
- **Email Testing**: MailHog for development
- **Containerization**: Docker Compose for development environment

## Project Structure

```
maya-adonisjs/
├── apps/
│   ├── main/           # Central control plane (AdonisJS)
│   ├── monitoring/     # Error monitoring and analytics (AdonisJS)
│   └── docs/          # Documentation site (Next.js + Fumadocs)
├── packages/
│   ├── ui/            # Shared UI component library (Shadcn/UI)
│   ├── eslint-config/ # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
├── docker/            # Docker configurations
├── infra/            # Infrastructure as code (Terraform/Kubernetes)
└── config/           # Shared configuration files
```

## Development Patterns

### Import Conventions
- `#controllers/*` - Controllers
- `#models/*` - Database models
- `#services/*` - Business logic services
- `#config/*` - Configuration files
- `@workspace/ui` - Shared UI components
- `@workspace/*` - Other workspace packages

### Naming Conventions
- **Controllers**: PascalCase with `Controller` suffix (e.g., `UsersController`)
- **Models**: PascalCase singular (e.g., `User`, `Company`)
- **Services**: PascalCase with `Service` suffix (e.g., `UserService`)
- **React Components**: PascalCase (e.g., `UserProfile`)
- **Inertia Pages**: PascalCase with `Page` suffix (e.g., `UsersIndexPage`)

### Code Style Rules
- NO comments unless explicitly requested
- Follow existing patterns in neighboring files
- Use TypeScript interfaces for all props and data structures
- Implement proper error handling
- Use Vine validators for all input validation

## Core Shared Entities

### User Management
- Users with email, roles, permissions
- User preferences and settings
- API tokens and personal access tokens
- Session management across apps

### Company/Organization
- Company profiles with branding
- Company-user relationships
- Subscription and billing information
- Company-wide settings and feature flags

### Projects
- Shared projects across applications
- Project members with roles
- Project-specific settings
- Status tracking (active, archived, draft)

### Authorization
- Role-based access control (RBAC)
- Granular permission system
- API key management
- Comprehensive audit logging

## Development Workflow

### Getting Started
```bash
# Install dependencies
pnpm install

# Start Docker services
docker compose up -d

# Run migrations
pnpm --filter main exec node ace migration:run

# Start development servers
pnpm dev
```

### Common Commands
```bash
# Work with specific app
pnpm --filter main dev
pnpm --filter monitoring build

# Add dependencies
pnpm --filter main add @adonisjs/lucid
pnpm --filter @workspace/ui add react-query

# Run commands in apps
pnpm --filter main exec node ace make:controller Users
pnpm --filter main exec node ace migration:run

# Docker operations
docker compose logs -f main
docker exec -it maya_main sh
```

### Service URLs (Development)
- Main App: http://main.localhost
- Monitoring: http://monitoring.localhost
- Documentation: http://docs.localhost
- Logto Admin: http://logto.localhost:3002
- MailHog: http://localhost:8025
- Traefik Dashboard: http://localhost:8080

## AI Integration Features

### PgAI Capabilities
- Text generation using Gemma 3 model
- Vector embeddings for similarity search
- AI-powered content summarization
- Batch processing with background jobs

### Usage Example
```sql
-- Generate text
SELECT ai.generate_text('gemma3:2b-instruct-q4_0', 'Summarize: ' || content);

-- Create embeddings
SELECT ai.embed('gemma3:2b-instruct-q4_0', 'Content to embed');
```

## API Design Patterns

### RESTful Controllers
```typescript
export default class UsersController {
  async index({ inertia }: HttpContext) {
    const users = await User.all()
    return inertia.render('Users/Index', { users })
  }
}
```

### API Controllers for Inter-App Communication
```typescript
export default class Api_UsersController {
  async show({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    return response.ok(user.serializeForAPI())
  }
}
```

## Testing Strategy
- Check for test commands in package.json
- Use existing test patterns in the codebase
- Never assume specific test frameworks
- Run lint and typecheck before completion

## Security Considerations
- All inter-app communication uses authenticated APIs
- Token validation through main app
- Comprehensive audit logging
- Rate limiting on all API endpoints
- Never commit secrets or API keys

## Performance Optimization
- Turbo cache for build optimization
- Incremental builds in development
- Proper database indexing
- Vector indexes for AI similarity search
- Redis caching for frequently accessed data

## Deployment Considerations
- Multi-stage Dockerfiles (development/production)
- Environment-based configuration
- Health checks for all services
- Proper volume management for persistence
- Kubernetes-ready with Helm charts

## Important Notes

1. **Always check existing patterns** before implementing new features
2. **Use workspace references** for internal dependencies
3. **Follow domain-driven design** principles
4. **Implement proper error handling** and validation
5. **Keep controllers thin**, move logic to services
6. **Use events** for loose coupling between apps
7. **Test thoroughly** and run lint/typecheck
8. **Document API contracts** when adding new endpoints

## Quick Reference

### File Locations
- Controllers: `apps/*/app/controllers/`
- Models: `apps/*/app/models/`
- Services: `apps/*/app/services/`
- Inertia Pages: `apps/*/inertia/pages/`
- UI Components: `packages/ui/src/components/`

### Environment Variables
- Database: `DATABASE_*`
- Redis: `REDIS_*`
- Logto: `LOGTO_*`
- App-specific: Check `.env.example` in each app

This document should be the primary reference for understanding the Maya AdonisJS project structure, patterns, and conventions.