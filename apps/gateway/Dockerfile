# Multi-stage hardened build for Thenar Hardware Gateway Service
FROM node:22.14.0-alpine3.21 AS builder

WORKDIR /app

# Install build tools for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/gateway/ ./apps/gateway/

RUN npm ci

FROM node:22.14.0-alpine3.21 AS runner

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S thenar && \
    adduser -u 1001 -S thenar -G thenar

COPY --chown=thenar:thenar --from=builder /app ./

RUN mkdir -p /data && chown -R thenar:thenar /data

USER thenar

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--loader", "tsx", "apps/gateway/src/server.ts"]
