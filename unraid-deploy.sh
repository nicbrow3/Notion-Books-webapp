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
echo "🐳 Docker Run Command:"
echo "======================"
cat << EOF
docker run -d \\
  --name notion-books \\
  --restart unless-stopped \\
  -p $HOST_PORT:3001 \\
  -e SESSION_SECRET="$SESSION_SECRET" \\
  -e NODE_ENV=production \\
  -e PORT=3001 \\
  ghcr.io/$GITHUB_USER/notion-books-webapp:latest
EOF

echo ""
echo "📝 Manual Unraid Setup Instructions:"
echo "===================================="
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
echo "5. Environment Variables:"
echo "   - SESSION_SECRET = $SESSION_SECRET"
echo "   - NODE_ENV = production"
echo "   - PORT = 3001"
echo ""
echo "6. Click 'Apply' to create the container"
echo ""
echo "🌐 Access your app at: http://YOUR_UNRAID_IP:$HOST_PORT"
echo ""
echo "🔍 Troubleshooting:"
echo "   - Check container logs in Unraid Docker tab"
echo "   - Verify port $HOST_PORT is not in use"
echo "   - Test health endpoint: curl http://YOUR_UNRAID_IP:$HOST_PORT/health"
echo ""
echo "✅ Setup complete! Save this information for future reference." 