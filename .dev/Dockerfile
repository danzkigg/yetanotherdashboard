# Use Node.js runtime
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install ALL dependencies for build
COPY package.json package-lock.json* ./
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js anonymous telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_LINT=false

# Build the Next.js application
RUN npm run build

# Production dependencies stage
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/* /var/cache/apk/* && \
    # Remove unnecessary files from node_modules to reduce size
    find node_modules -name "*.md" -delete && \
    find node_modules -name "*.txt" -delete && \
    find node_modules -name "*.map" -delete && \
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "*.spec.js" -delete 2>/dev/null || true && \
    find node_modules -name "*.test.js" -delete 2>/dev/null || true

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create config directory
RUN mkdir -p /app/config && chown nextjs:nodejs /app/config

# Copy only production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built Next.js application
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy backend server and related files
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./
COPY --from=builder --chown=nextjs:nodejs /app/integrations ./integrations/
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Copy example config
COPY --from=builder --chown=nextjs:nodejs /app/config.yml ./config.yml.example

USER nextjs

# Expose ports
EXPOSE 3000 3001

# Set default environment variables
ENV PORT=3000
ENV BACKEND_PORT=3001

# Volume for configuration
VOLUME ["/app/config"]

# Start both servers with config handling
USER root
CMD ["sh", "-c", "chown -R nextjs:nodejs /app/config && if [ ! -f /app/config/config.yml ]; then cp /app/config.yml.example /app/config/config.yml && chown nextjs:nodejs /app/config/config.yml; fi && ln -sf /app/config/config.yml /app/config.yml && su nextjs -s /bin/sh -c 'npx concurrently \"PORT=3001 npm run start:backend\" \"PORT=3000 npm run start:frontend\"'"]