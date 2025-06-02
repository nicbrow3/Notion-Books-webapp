#!/bin/bash

echo "🔍 Testing static file accessibility..."

SERVER_IP="192.168.50.133"
PORT="3001"

echo "1. Testing CSS file:"
curl -I "http://${SERVER_IP}:${PORT}/static/css/main.5eadc01c.css"

echo -e "\n2. Testing JS file:"
curl -I "http://${SERVER_IP}:${PORT}/static/js/main.1c827768.js"

echo -e "\n3. Testing root path:"
curl -I "http://${SERVER_IP}:${PORT}/"

echo -e "\n4. Testing if files exist in container:"
echo "CSS file content (first 100 chars):"
curl -s "http://${SERVER_IP}:${PORT}/static/css/main.5eadc01c.css" | head -c 100

echo -e "\n\nJS file content (first 100 chars):"
curl -s "http://${SERVER_IP}:${PORT}/static/js/main.1c827768.js" | head -c 100

echo -e "\n\n✅ Test complete!" 