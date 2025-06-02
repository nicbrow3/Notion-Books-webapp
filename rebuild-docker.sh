#!/bin/bash

echo "🔄 Rebuilding Notion Books Docker container..."

# Stop and remove existing container
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove existing image to force rebuild
echo "🗑️ Removing existing image..."
docker rmi notion-books-webapp-app 2>/dev/null || true

# Rebuild with no cache
echo "🔨 Building new image..."
docker-compose build --no-cache

# Start the container
echo "🚀 Starting container..."
docker-compose up -d

# Wait a moment for startup
echo "⏳ Waiting for container to start..."
sleep 10

# Show container status
echo "📊 Container status:"
docker-compose ps

echo -e "\n🔍 Running diagnostics..."

# Test endpoints
echo -e "\n1. Health check:"
curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health

echo -e "\n2. Debug files endpoint:"
curl -s http://localhost:3001/debug/files | jq . 2>/dev/null || curl -s http://localhost:3001/debug/files

echo -e "\n3. Test static file serving:"
curl -s -I http://localhost:3001/test | head -5

echo -e "\n4. Root path response:"
curl -s -I http://localhost:3001/ | head -5

echo -e "\n5. Container logs (last 10 lines):"
docker-compose logs --tail=10 app

echo -e "\n✅ Rebuild complete!"
echo -e "\n📋 Next steps:"
echo "   • Visit http://localhost:3001/ to test the main application"
echo "   • Visit http://localhost:3001/test to test static file serving"
echo "   • Check browser developer tools for any JavaScript errors"
echo "   • If issues persist, see TROUBLESHOOTING.md for detailed guidance" 