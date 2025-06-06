#!/bin/bash

# Notion Books - Unraid Deployment Helper
# This script helps you deploy the Notion Books app to Unraid

echo "🚀 Notion Books - Unraid Deployment Helper"
echo "=========================================="

# Check if we're running on Unraid
if [ ! -d "/mnt/user" ]; then
    echo "⚠️  Warning: This doesn't appear to be an Unraid system"
    echo "   This script is designed for Unraid deployment"
    echo ""
fi

# Get user input
read -p "Enter the host port you want to use (default: 3001): " HOST_PORT
HOST_PORT=${HOST_PORT:-3001}

read -p "Enter your GitHub username (for container registry): " GITHUB_USER
if [ -z "$GITHUB_USER" ]; then
    echo "❌ GitHub username is required"
    exit 1
fi

read -p "Enter a secure session secret (or press Enter for auto-generated): " SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "auto-generated-secret-$(date +%s)")
fi

echo ""
echo "📋 Configuration Summary:"
echo "   Host Port: $HOST_PORT"
echo "   Container: ghcr.io/$GITHUB_USER/notion-books-webapp:latest"
echo "   Session Secret: [HIDDEN]"
echo ""

# Generate docker run command
echo "🐳 Docker Run Command (Basic Setup):"
echo "===================================="
cat << EOF
docker run -d \\
  --name notion-books \\
  --restart unless-stopped \\
  -p $HOST_PORT:3001 \\
  -e SESSION_SECRET="$SESSION_SECRET" \\
  -e NODE_ENV=production \\
  -e PORT=3001 \\
  -e FRONTEND_URL=http://YOUR_UNRAID_IP:$HOST_PORT \\
  -e NOTION_INTEGRATION_TOKEN="" \\
  -e GOOGLE_BOOKS_API_KEY="" \\
  ghcr.io/$GITHUB_USER/notion-books-webapp:latest
EOF

echo ""
echo "📝 Unraid Setup Instructions:"
echo "============================="
echo "1. Go to Docker tab in Unraid WebUI"
echo "2. Click 'Add Container'"
echo "3. Fill in the following:"
echo "   - Name: notion-books"
echo "   - Repository: ghcr.io/$GITHUB_USER/notion-books-webapp:latest"
echo "   - Network Type: bridge"
echo "   - Console shell command: Bash"
echo ""
echo "4. Port Mappings:"
echo "   - Container Port: 3001"
echo "   - Host Port: $HOST_PORT"
echo "   - Connection Type: TCP"
echo ""
echo "5. Environment Variables (COPY AND PASTE THESE):"
echo "   Add each variable by clicking 'Add another Path, Port, Variable, Label or Device'"
echo ""
echo "   Variable: SESSION_SECRET"
echo "   Value: $SESSION_SECRET"
echo ""
echo "   Variable: NODE_ENV"
echo "   Value: production"
echo ""
echo "   Variable: FRONTEND_URL"
echo "   Value: http://YOUR_UNRAID_IP:$HOST_PORT"
echo "   (Replace YOUR_UNRAID_IP with your actual server IP)"
echo ""
echo "   Variable: NOTION_INTEGRATION_TOKEN"
echo "   Value: [LEAVE EMPTY FOR NOW - Add after container is created]"
echo ""
echo "   Variable: GOOGLE_BOOKS_API_KEY"
echo "   Value: [LEAVE EMPTY FOR NOW - Add after container is created]"
echo ""
echo "6. Click 'Apply' to create the container"
echo ""
echo "🔑 Adding API Keys (REQUIRED - Do this after container is running):"
echo "=================================================================="
echo "1. The container will start but show warnings about missing API keys"
echo "2. In Unraid Docker tab, click the container name to edit"
echo "3. Find the Environment Variables section"
echo "4. Update these variables with your actual keys:"
echo ""
echo "   NOTION_INTEGRATION_TOKEN:"
echo "   - Go to: https://www.notion.so/my-integrations"
echo "   - Create new integration or use existing one"
echo "   - Copy the 'Internal Integration Token' (starts with 'secret_')"
echo "   - Paste it as the value for NOTION_INTEGRATION_TOKEN"
echo ""
echo "   GOOGLE_BOOKS_API_KEY (Optional but recommended):"
echo "   - Go to: https://console.developers.google.com/"
echo "   - Enable the Books API"
echo "   - Create an API Key"
echo "   - Copy the API key"
echo "   - Paste it as the value for GOOGLE_BOOKS_API_KEY"
echo ""
echo "5. Click 'Apply' to restart container with API keys"
echo ""
echo "🌐 Access your app at: http://YOUR_UNRAID_IP:$HOST_PORT"
echo ""
echo "🔍 Troubleshooting:"
echo "   - Check container logs in Unraid Docker tab"
echo "   - Look for startup messages showing environment configuration"
echo "   - Verify port $HOST_PORT is not in use"
echo "   - Test health endpoint: curl http://YOUR_UNRAID_IP:$HOST_PORT/health"
echo "   - Test book service: curl http://YOUR_UNRAID_IP:$HOST_PORT/api/books/test/connection"
echo ""
echo "💡 Pro Tips:"
echo "   - The container will work without API keys, but with limited functionality"
echo "   - NOTION_INTEGRATION_TOKEN is required for Notion features"
echo "   - GOOGLE_BOOKS_API_KEY enhances book search quality"
echo "   - All configuration is done through environment variables in Unraid UI"
echo ""
echo "✅ Setup complete! Follow the steps above to configure your container." 