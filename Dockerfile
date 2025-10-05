# Multi-stage Dockerfile for Fingrow API

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Stage 2: Production stage
FROM node:18-alpine

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm rebuild better-sqlite3

# Copy application code
COPY --from=builder /app/api ./api
COPY --from=builder /app/admin ./admin
COPY --from=builder /app/mobile ./mobile
COPY --from=builder /app/components ./components
COPY --from=builder /app/services ./services
COPY --from=builder /app/database ./database
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/App.js ./App.js
COPY --from=builder /app/app.json ./app.json
COPY --from=builder /app/babel.config.js ./babel.config.js
COPY --from=builder /app/index.html ./index.html

# Create necessary directories
RUN mkdir -p data uploads/profiles uploads/products uploads/qrcodes

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of necessary directories
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Start the API server
CMD ["node", "api/server.js"]