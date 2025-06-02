#!/bin/bash

echo "🔄 Quick rebuild with security header fixes..."

# Stop container
docker-compose down

# Rebuild and start
docker-compose up -d --build

echo "⏳ Waiting for startup..."
sleep 5

echo "✅ Container restarted with security header fixes!"
echo "🌐 Try visiting http://192.168.50.133:3001 again" 