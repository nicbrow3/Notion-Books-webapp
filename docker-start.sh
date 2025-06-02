#!/bin/sh

# Docker startup script for Notion Books
echo "🚀 Starting Notion Books..."

# Print environment info for debugging
echo "📊 Environment Info:"
echo "  - NODE_ENV: ${NODE_ENV:-not set}"
echo "  - PORT: ${PORT:-not set}"
echo "  - NOTION_INTEGRATION_TOKEN: ${NOTION_INTEGRATION_TOKEN:+configured}"
echo "  - GOOGLE_BOOKS_API_KEY: ${GOOGLE_BOOKS_API_KEY:+configured}"
echo "  - FRONTEND_URL: ${FRONTEND_URL:-not set}"

# Validate required environment variables
if [ -z "$NOTION_INTEGRATION_TOKEN" ]; then
    echo "⚠️  WARNING: NOTION_INTEGRATION_TOKEN is not set!"
    echo "   The app will not work without a Notion integration token."
    echo "   Please set this environment variable in your Docker configuration."
    echo ""
fi

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "change-this-in-production" ]; then
    echo "⚠️  WARNING: SESSION_SECRET is not properly configured!"
    echo "   Using a default session secret is not secure for production."
    echo ""
fi

# Start the application
echo "🌟 Starting backend server..."
exec node backend/src/server.js 