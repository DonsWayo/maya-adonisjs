# Base stage for shared dependencies
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable pnpm

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/monitoring/package.json ./apps/monitoring/
COPY packages/ ./packages/

# Development stage
FROM base AS development

WORKDIR /app

# Install all dependencies including devDependencies
RUN pnpm install

# Build workspace packages
RUN pnpm --filter "@workspace/*" build

# We'll mount the source code as a volume in docker-compose
# This is just a placeholder directory
RUN mkdir -p /app/apps/monitoring

WORKDIR /app/apps/monitoring

ENV PORT=3334
EXPOSE 3334

# Add a script to run migrations and seeds in development
COPY ./apps/monitoring/docker-entrypoint-dev.sh /app/
RUN chmod +x /app/docker-entrypoint-dev.sh

# Command to start the development server with hot reloading
CMD ["/bin/sh", "/app/docker-entrypoint-dev.sh"]

# Production build stage
FROM base AS build

WORKDIR /app

# Install all dependencies for build
ENV CI=true
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build workspace packages first
RUN pnpm --filter "@workspace/*" build

# Build the application
WORKDIR /app/apps/monitoring
RUN node ace build

# Production stage
FROM node:22-alpine AS production

RUN apk add --no-cache libc6-compat bash

WORKDIR /app

# Copy only the built application from the build stage
COPY --from=build /app/apps/monitoring/build /app
COPY --from=build /app/node_modules /app/node_modules

# Add a script to run migrations in production
COPY --chown=node:node ./apps/monitoring/docker-entrypoint-prod.sh /app/docker-entrypoint-prod.sh
RUN chmod +x /app/docker-entrypoint-prod.sh

EXPOSE 3334
ENV PORT=3334

CMD ["node", "bin/server.js"]
