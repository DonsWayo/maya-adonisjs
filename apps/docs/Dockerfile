FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache libc6-compat
RUN npm install -g corepack@latest
RUN corepack enable pnpm

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/docs/package.json ./apps/docs/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
WORKDIR /app

# Install dependencies including devDependencies
RUN apk add --no-cache libc6-compat
RUN npm install -g corepack@latest
RUN corepack enable pnpm

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/docs/package.json ./apps/docs/
COPY packages/ ./packages/

# Install all dependencies including devDependencies
RUN pnpm install

# We'll mount the source code as a volume in docker-compose
# This is just a placeholder directory
RUN mkdir -p /app/apps/docs

WORKDIR /app/apps/docs

EXPOSE 3300

# Add a script to run development server
COPY ./apps/docs/docker-entrypoint-dev.sh /app/
RUN chmod +x /app/docker-entrypoint-dev.sh

CMD ["/bin/sh", "/app/docker-entrypoint-dev.sh"]

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm in the builder stage
RUN apk add --no-cache libc6-compat
RUN npm install -g corepack@latest
RUN corepack enable pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the Next.js app
WORKDIR /app/apps/docs
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/public ./apps/docs/public

# Set the correct permission for prerender cache
RUN mkdir -p /app/apps/docs/.next/cache
RUN chown -R nextjs:nodejs /app/apps/docs/.next

USER nextjs

EXPOSE 3300

ENV PORT 3300
ENV HOSTNAME "0.0.0.0"

# Start the Next.js app
CMD ["node", "apps/docs/server.js"]
