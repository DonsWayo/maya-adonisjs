# Use Node 20 LTS Alpine for consistency with project requirements
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files for proper dependency resolution
COPY apps/docs/package.json ./apps/docs/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files
COPY apps/docs/package.json ./apps/docs/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install all dependencies including devDependencies
RUN pnpm install

# Copy workspace packages source code
COPY packages/ ./packages/

# Create app directory for volume mounting
RUN mkdir -p /app/apps/docs

WORKDIR /app/apps/docs

EXPOSE 3300

# Copy and setup development entrypoint
COPY ./apps/docs/docker-entrypoint-dev.sh /app/
RUN chmod +x /app/docker-entrypoint-dev.sh

CMD ["/bin/sh", "/app/docker-entrypoint-dev.sh"]

# Build stage
FROM base AS builder
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all source code
COPY apps/docs/ ./apps/docs/
COPY packages/ ./packages/

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
WORKDIR /app/apps/docs
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3300
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/public ./apps/docs/public

# Create and set permissions for Next.js cache directory
RUN mkdir -p /app/apps/docs/.next/cache
RUN chown -R nextjs:nodejs /app/apps/docs/.next

# Switch to non-root user
USER nextjs

EXPOSE 3300

# Start the application
CMD ["node", "apps/docs/server.js"]
