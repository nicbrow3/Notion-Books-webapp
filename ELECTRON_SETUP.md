# Electron App Setup Guide

## Quick Setup for Authentication

The Electron app needs your Notion integration token to work properly. Here's how to set it up:

### Option 1: Using config.json (Recommended)

1. **Mount the .dmg file and copy the app to Applications**
2. **Right-click** on the installed app → **"Show Package Contents"**
3. **Navigate to**: `Contents` → `Resources` → `backend`
4. **Edit the config.json file** with your Notion integration token:

```json
{
  "notionIntegrationToken": "YOUR_ACTUAL_NOTION_TOKEN_HERE",
  "sessionSecret": "your_session_secret_here",
  "googleBooksApiKey": "",
  "port": 3001
}
```

5. **Get your Notion Integration Token**:
   - Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Find your existing integration or create a new one
   - Copy the "Internal Integration Token"
   - Paste it in the config.json file

### Alternative: Direct Path Access

You can also edit the config.json file directly:
- **Location**: `[App Location]/Notion Books.app/Contents/Resources/backend/config.json`
- **If installed to Applications**: `/Applications/Notion Books.app/Contents/Resources/backend/config.json`

### Option 2: Using Environment Variables

Set these environment variables on your system:
- `NOTION_INTEGRATION_TOKEN=your_token_here`
- `SESSION_SECRET=your_session_secret`

### Option 3: For Development

If you're running the app in development mode, you can create a `.env` file in the `backend` directory:

```
NOTION_INTEGRATION_TOKEN=your_token_here
SESSION_SECRET=your_session_secret
GOOGLE_BOOKS_API_KEY=your_google_books_key
NODE_ENV=development
PORT=3001
```

## Troubleshooting

### Getting 401 (Unauthorized) Errors?

This usually means:
1. Your Notion integration token is not set correctly
2. The token doesn't have access to your Notion workspace
3. The token is invalid or expired

### To fix:
1. Double-check your token in config.json (located in the backend folder)
2. Make sure your Notion integration has access to your databases
3. Try creating a new integration token if the current one isn't working

### Testing Your Setup

1. Edit the config.json file with your actual token
2. Start the Electron app
3. The app should automatically authenticate using your integration token
4. You should see your Notion databases without needing to manually authenticate

## What this fixes

The Electron app creates a fresh session each time it starts, unlike a web browser that maintains sessions. The auto-authentication feature detects when you have a valid Notion integration token and automatically logs you in.

## Security Notes

- Keep your integration token secure
- Don't share your config.json file with others
- If distributing the app, consider removing the token from config.json first

## Important Note

The config.json file is now included in the .dmg distribution files, so when you install the app from the .dmg, it will contain the config.json file ready for you to edit with your credentials. 