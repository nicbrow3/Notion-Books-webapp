# Troubleshooting Docker Container UI Issues

## Problem
The backend health endpoint works (`/health` returns OK), but the frontend UI is not loading when visiting the root URL.

## Diagnostic Steps

### Step 1: Check Container Status
```bash
docker-compose ps
docker-compose logs app
```

### Step 2: Test Debug Endpoints
```bash
# Check what files are available in the container
curl http://localhost:3001/debug/files

# Test the static file serving with our test page
curl http://localhost:3001/test
```

### Step 3: Test Root Path Response
```bash
# Check what's being returned at the root path
curl -v http://localhost:3001/

# Check if index.html is being served
curl -H "Accept: text/html" http://localhost:3001/
```

### Step 4: Check Browser Network Tab
1. Open browser developer tools (F12)
2. Go to Network tab
3. Visit http://localhost:3001/
4. Look for:
   - Failed requests (red entries)
   - 404 errors for CSS/JS files
   - CORS errors

## Common Issues and Solutions

### Issue 1: Frontend Build Failed During Docker Build
**Symptoms:** `/debug/files` shows empty or missing files
**Solution:** Rebuild with no cache
```bash
docker-compose down
docker rmi notion-books-webapp-app
docker-compose build --no-cache
docker-compose up -d
```

### Issue 2: Static Files Not Being Served
**Symptoms:** `/test` endpoint returns 404 or error
**Solution:** Check the static file middleware configuration

### Issue 3: React Router Issues
**Symptoms:** Root path works but shows blank page
**Solution:** Check browser console for JavaScript errors

### Issue 4: Path Resolution Issues
**Symptoms:** CSS/JS files return 404
**Solution:** Check the `homepage` field in `frontend/package.json`

## Quick Fix Script

Run this on your server:

```bash
#!/bin/bash
echo "🔍 Diagnosing Notion Books Docker container..."

echo "1. Container status:"
docker-compose ps

echo -e "\n2. Debug files endpoint:"
curl -s http://localhost:3001/debug/files | jq . 2>/dev/null || curl -s http://localhost:3001/debug/files

echo -e "\n3. Test static file serving:"
curl -s -I http://localhost:3001/test | head -5

echo -e "\n4. Root path response:"
curl -s -I http://localhost:3001/ | head -5

echo -e "\n5. Health check:"
curl -s http://localhost:3001/health

echo -e "\n6. Container logs (last 20 lines):"
docker-compose logs --tail=20 app
```

## If All Else Fails

1. **Complete rebuild:**
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Check the actual container contents:**
   ```bash
   docker exec -it $(docker-compose ps -q app) ls -la /app/frontend/build/
   docker exec -it $(docker-compose ps -q app) cat /app/frontend/build/index.html
   ```

3. **Test locally first:**
   ```bash
   cd frontend
   npm run build
   cd ../backend
   NODE_ENV=production npm start
   ```

## Expected Working State

When everything is working correctly:
- `/health` returns JSON with status OK
- `/debug/files` shows index.html, static/ directory, and other build files
- `/test` returns the test HTML page
- `/` returns the React app HTML
- Browser shows the Notion Books application UI 