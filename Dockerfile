# ─────────────────────────────────────────────────────────────────────────────
#  ArchLens — Multi-stage Dockerfile
#
#  Stage 1 (builder):  installs all deps + builds the React client
#  Stage 2 (runtime):  lean Node.js image with only production deps
#
#  Build:  docker build -t archlens:latest .
#  Run:    docker run -p 3000:3000 -v archlens-data:/app/data archlens:latest
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Copy root package files and install server dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy client package files and install ALL client deps (including devDeps for build)
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci

# Copy all source files
COPY server/ ./server/
COPY client/src/ ./client/src/
COPY client/public/ ./client/public/

# Build the React app — output goes to client/build/
RUN cd client && npm run build

# Prune dev deps from client (they are no longer needed)
RUN cd client && npm prune --omit=dev


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: install dumb-init for proper signal handling (PID 1 problem)
RUN apk add --no-cache dumb-init

# Create a non-root user and group
RUN addgroup -g 1001 -S archlens && \
    adduser  -u 1001 -S archlens -G archlens

WORKDIR /app

# Copy server production deps from builder
COPY --from=builder --chown=archlens:archlens /build/node_modules ./node_modules
COPY --from=builder --chown=archlens:archlens /build/package.json ./package.json

# Copy server source
COPY --chown=archlens:archlens server/ ./server/

# Copy React build output
COPY --from=builder --chown=archlens:archlens /build/client/build ./client/build

# Create the data directory for the SQLite volume
RUN mkdir -p /app/data && chown archlens:archlens /app/data

# Switch to non-root user
USER archlens

# ── Environment defaults ──────────────────────────────────────────────────────
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data \
    DB_TYPE=sqlite

# ── Volume ────────────────────────────────────────────────────────────────────
# Mount this volume to persist the SQLite database across container restarts.
# Example: docker run -v archlens-data:/app/data archlens:latest
VOLUME ["/app/data"]

# ── Port ──────────────────────────────────────────────────────────────────────
EXPOSE 3000

# ── Health check ─────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# ── Start ─────────────────────────────────────────────────────────────────────
# dumb-init ensures signals (SIGTERM, SIGINT) are forwarded correctly to Node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
