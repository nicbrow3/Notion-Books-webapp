# Build stage for frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the React app with verbose output
RUN npm run build && ls -la build/ && echo "Frontend build completed successfully"

# Build stage for backend
FROM node:18-alpine as backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy backend from builder
COPY --from=backend-builder /app/backend ./backend

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy test file to frontend build directory
COPY test-static.html ./frontend/build/test.html

# Verify frontend files were copied correctly
RUN ls -la frontend/build/ && echo "Frontend files copied to production stage"

# Set default environment variables (these will show up in Unraid UI)
ENV NODE_ENV=production
ENV PORT=3001
ENV SESSION_SECRET=change-this-in-production
ENV FRONTEND_URL=http://your-server-ip:3001
ENV RATE_LIMIT_WINDOW_MS=900000
ENV RATE_LIMIT_MAX_REQUESTS=100
ENV SESSION_COOKIE_MAX_AGE=86400000

# API Keys - set as empty by default, users will fill these in via Unraid UI
ENV NOTION_INTEGRATION_TOKEN=""
ENV GOOGLE_BOOKS_API_KEY=""

# Expose the backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the backend server
CMD ["node", "backend/src/server.js"] 