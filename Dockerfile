# Build stage for frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Set build-time environment variables for React
# This ensures the React app knows where to find the API
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

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

# Copy startup script and test files
COPY docker-start.sh ./
COPY test-static.html ./frontend/build/test.html

# Make startup script executable
RUN chmod +x docker-start.sh

# Verify frontend files were copied correctly
RUN ls -la frontend/build/ && echo "Frontend files copied to production stage"

# ==============================================
# Environment Variables (visible in Docker UIs)
# ==============================================

# Application Configuration
ENV NODE_ENV=production
ENV PORT=3001
ENV SESSION_SECRET=change-this-in-production

# Frontend URL - update to match your server
ENV FRONTEND_URL=http://your-server-ip:3001

# Security & Performance Settings
ENV RATE_LIMIT_WINDOW_MS=900000
ENV RATE_LIMIT_MAX_REQUESTS=100
ENV SESSION_COOKIE_MAX_AGE=86400000

# ==============================================
# API KEYS - Configure these in your Docker UI
# ==============================================

# REQUIRED: Notion Integration Token
# Get from https://www.notion.so/my-integrations
ENV NOTION_INTEGRATION_TOKEN=""

# OPTIONAL: Google Books API Key  
# Get from https://console.developers.google.com/
ENV GOOGLE_BOOKS_API_KEY=""

# ==============================================
# Docker Labels for UI Configuration
# ==============================================

# Labels to help Docker UIs show these as configurable options
LABEL io.hass.name="Notion Books"
LABEL io.hass.description="Web application for managing book collections with Notion integration"
LABEL io.hass.url="https://github.com/yourusername/notion-books-webapp"
LABEL io.hass.version="latest"
LABEL io.hass.type="addon"
LABEL io.hass.arch="amd64|aarch64"

# Environment variable descriptions for Docker UIs
LABEL io.hass.config.NOTION_INTEGRATION_TOKEN="Notion integration token from https://www.notion.so/my-integrations (required)"
LABEL io.hass.config.GOOGLE_BOOKS_API_KEY="Google Books API key from Google Cloud Console (optional)"
LABEL io.hass.config.SESSION_SECRET="Secure session encryption key (32+ characters recommended)"
LABEL io.hass.config.FRONTEND_URL="Frontend URL matching your server IP (e.g., http://192.168.1.100:3001)"

# Expose the backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use startup script instead of direct node command
CMD ["./docker-start.sh"] 