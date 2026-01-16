# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    yarn install --frozen-lockfile; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL=http://72.60.233.159:3050
ARG NEXT_PUBLIC_VNSTOCK_API_URL=http://72.60.233.159:8002

# Set build-time environment variables
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_VNSTOCK_API_URL=$NEXT_PUBLIC_VNSTOCK_API_URL

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create data directory for mutable database
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Copy initial database if it exists (optional)
COPY --from=builder --chown=nextjs:nodejs /app/prisma/dev.db /app/data/

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Runtime environment variables (defaults, can be overridden via docker-compose or runtime)
# Note: NEXT_PUBLIC_* vars are embedded at build time, but these defaults allow runtime override
ENV NEXT_PUBLIC_API_URL=http://72.60.233.159:3050
ENV NEXT_PUBLIC_VNSTOCK_API_URL=http://72.60.233.159:8002

# Start the application
CMD ["node", "server.js"]
