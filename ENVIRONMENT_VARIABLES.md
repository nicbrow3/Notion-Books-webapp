# Environment Variables Guide

This guide explains how to configure API keys for the Notion Books application. The primary deployment method is Unraid, where you'll set environment variables through the Unraid Docker UI.

## 🔑 Environment Variables

### Required for Full Functionality
- `NOTION_INTEGRATION_TOKEN` - Your Notion API integration token (required for Notion features)
- `GOOGLE_BOOKS_API_KEY` - Google Books API key for enhanced book search (optional but recommended)

### System Configuration (Auto-configured)
- `SESSION_SECRET` - Secure session encryption (set in Unraid UI)
- `NODE_ENV` - Set to `production` (auto-configured)
- `PORT` - Server port, default 3001 (auto-configured)

## 🖥️ Unraid Deployment (Primary Method)

### Step 1: Deploy Container
Use the deployment script or manual setup to create the container without API keys first.

### Step 2: Add API Keys via Unraid UI
1. Go to **Docker** tab in Unraid WebUI
2. Click the **container name** to edit
3. Scroll to **Environment Variables** section
4. Click **Add another Path, Port, Variable, Label or Device**
5. Add these variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `NOTION_INTEGRATION_TOKEN` | `secret_your_token_here` | Your Notion integration token |
| `GOOGLE_BOOKS_API_KEY` | `your_api_key_here` | Google Books API key (optional) |
| `SESSION_SECRET` | `your-secure-random-string` | Session encryption key |

6. Click **Apply** to restart the container with new settings

### Step 3: Verify Configuration
```bash
# Test the application
curl http://your-unraid-ip:3001/health

# Visit in browser
http://your-unraid-ip:3001
```

## 🔐 Getting API Keys

### Notion Integration Token
1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"New integration"**
3. Give it a name: **"Notion Books"**
4. Select your workspace
5. Copy the **"Internal Integration Token"** (starts with `secret_`)
6. **Important**: Share your book database with this integration!

### Google Books API Key
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable the **"Books API"**
4. Go to **"Credentials"** → **"Create Credentials"** → **"API Key"**
5. Copy the API key
6. (Optional) Restrict the key to Books API only for security

## 🧪 Local Development

For local testing before deploying to Unraid:

1. **Create .env file** (copy from `env.example`):
   ```bash
   cp env.example .env
   ```

2. **Edit .env with your API keys**:
   ```bash
   NOTION_INTEGRATION_TOKEN=secret_your_token_here
   GOOGLE_BOOKS_API_KEY=your_api_key_here
   SESSION_SECRET=local-dev-secret
   ```

3. **Run locally**:
   ```bash
   docker-compose up -d
   ```

4. **Test at**: http://localhost:3001

## 🔒 Security Best Practices

1. **Generate strong session secrets** (32+ random characters)
2. **Never share API keys publicly**
3. **Use different API keys for development vs production**
4. **Rotate API keys periodically**
5. **Ensure Notion integration only has access to necessary databases**

## 🔧 Troubleshooting

### Container Won't Start
- Check Unraid container logs for errors
- Verify all environment variables are set correctly
- Ensure no port conflicts (3001 not in use)

### API Features Not Working
- Verify Notion integration token is correct and starts with `secret_`
- Ensure Notion database is shared with the integration
- Check Google Books API key is valid and has Books API enabled
- Test API keys work by visiting the application and trying to add a book

### Session Issues
- Ensure `SESSION_SECRET` is set and is a long random string
- Clear browser cookies if having login issues

## 📋 Quick Reference

**Unraid Environment Variables to Set:**
```
NOTION_INTEGRATION_TOKEN=secret_your_token_here
GOOGLE_BOOKS_API_KEY=your_google_api_key_here  
SESSION_SECRET=your-32-char-random-string
```

**Container Settings:**
- **Repository**: `ghcr.io/yourusername/notion-books-webapp:latest`
- **Port**: `3001:3001`
- **Network**: `bridge`
- **Restart Policy**: `unless-stopped` 