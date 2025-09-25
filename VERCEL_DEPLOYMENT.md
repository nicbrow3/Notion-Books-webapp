# Vercel Deployment Guide

This application has been migrated to work with Vercel's serverless platform. Follow this guide to deploy your Notion Books webapp to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Notion Integration**: Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
3. **Google Books API Key** (Optional): Get from [Google Cloud Console](https://console.developers.google.com/)

## Required Environment Variables

Set these variables in the Vercel dashboard under **Settings > Environment Variables**:

### Essential Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NOTION_INTEGRATION_TOKEN` | Notion integration token (starts with `secret_`) | **Yes** | `secret_ABC123...` |
| `AUTH_COOKIE_SECRET` | Secret for JWT token signing (32+ characters) | **Yes** | `your-super-secure-random-string-here` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GOOGLE_BOOKS_API_KEY` | Google Books API key for enhanced search | None | `AIzaSy...` |
| `NODE_ENV` | Environment mode | `production` | `production` |

### Variable Scopes

Configure these variables for all environments:
- ✅ **Production** (your live site)
- ✅ **Preview** (PR previews)
- ✅ **Development** (local dev with `vercel dev`)

## Quick Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy from Project Root
```bash
# From your project root directory
vercel

# Follow the prompts:
# ? Set up and deploy "~/Projects/Notion-Books-webapp"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Team]
# ? Link to existing project? [y/N] n
# ? What's your project's name? notion-books-webapp
# ? In which directory is your code located? ./
```

### 4. Set Environment Variables
In the Vercel dashboard:
1. Go to your project > **Settings** > **Environment Variables**
2. Add the required variables listed above
3. Make sure they're enabled for Production, Preview, and Development

### 5. Redeploy
```bash
vercel --prod
```

## Local Development with Vercel

Test your Vercel functions locally:

```bash
# Install dependencies
npm run install:all

# Start Vercel dev server
npm run vercel-dev
# or
vercel dev
```

This runs your frontend and API functions exactly as they would on Vercel.

## Project Structure

```
/
├── api/                    # Vercel serverless functions
│   ├── auth/
│   │   ├── setup.js
│   │   ├── status.js
│   │   └── logout.js
│   ├── books/
│   │   └── search.js
│   ├── notion/
│   │   └── databases.js
│   └── user/
│       └── profile.js
├── frontend/               # React application
├── backend/                # Legacy backend (handlers only)
├── vercel.json            # Vercel configuration
└── package.json
```

## API Routes

Your deployed application will have these endpoints:

- `GET /auth/status` - Check authentication status
- `POST /auth/setup` - Setup Notion integration
- `POST /auth/logout` - Logout user
- `GET /api/books/search` - Search for books
- `GET /api/notion/databases` - Get user's Notion databases
- `GET /api/user/profile` - Get user profile
- `GET /api/health` - Health check

## Migration Notes

This version differs from the Docker deployment:

### ✅ What's New
- **Serverless Functions**: Individual API endpoints as Vercel functions
- **Stateless Authentication**: JWT tokens in cookies (no sessions)
- **Local Storage**: User settings stored in browser
- **Auto-scaling**: Handles traffic spikes automatically

### 🚫 What's Removed
- Express sessions (replaced with JWT tokens)
- File storage (replaced with localStorage)
- PostgreSQL dependencies (wasn't used anyway)
- Docker configuration

### 🔄 What's Changed
- API URLs now use relative paths (`/api/...`)
- Frontend detects Vercel environment automatically
- All user data stored client-side for privacy

## Troubleshooting

### Common Issues

**1. "Authentication required" errors**
- Check that `NOTION_INTEGRATION_TOKEN` is set correctly
- Verify the token starts with `secret_`
- Make sure cookies are enabled in your browser

**2. "API route not found" errors**
- Ensure `vercel.json` routes are configured correctly
- Check that function files exist in `/api/` directory

**3. Build failures**
- Verify all environment variables are set
- Check that frontend builds successfully: `cd frontend && npm run build`

**4. Functions timeout**
- Default timeout is 30 seconds
- Check Vercel function logs in dashboard

### Getting Help

1. Check Vercel function logs in dashboard
2. Test API endpoints directly: `/api/health`
3. Use `vercel dev` for local debugging
4. Check browser network tab for API call errors

## Security Notes

- JWT tokens expire after 24 hours
- Cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`
- API keys are only stored server-side in environment variables
- No persistent user data stored on the server

Your Notion Books webapp is now running on Vercel! 🎉