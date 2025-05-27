# Notion Personal Integration Setup

This guide will help you set up a personal Notion integration for the Book to Notion web app.

## Step 1: Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the details:
   - **Name**: "Book Manager" (or any name you prefer)
   - **Logo**: Optional
   - **Associated workspace**: Select your personal workspace
4. Click "Submit"

## Step 2: Get Your Integration Token

1. After creating the integration, you'll see your "Internal Integration Token"
2. Click "Show" and copy the token (it starts with `secret_`)
3. Keep this token secure - treat it like a password

## Step 3: Share Database with Integration

1. Go to the Notion database where you want to add books
2. Click the "Share" button in the top right
3. Click "Invite" and search for your integration name ("Book Manager")
4. Select your integration and click "Invite"

## Step 4: Configure Your Environment

1. In your backend directory, create a `.env` file (copy from `env.example`)
2. Add your integration token:
   ```
   NOTION_INTEGRATION_TOKEN=secret_your_token_here
   ```
3. Configure other required variables:
   ```
   PORT=3001
   NODE_ENV=development
   SESSION_SECRET=your_random_session_secret
   GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   ```

## Step 5: Test the Connection

1. Start your backend server: `npm run dev:backend`
2. Start your frontend: `npm run dev:frontend`
3. Go to the app and click "Connect to Notion"
4. If successful, you should see "Connected to Notion"

## Required Permissions

Your integration needs these permissions (automatically granted for personal integrations):
- Read content
- Update content
- Insert content

## Database Requirements

Your Notion database should have these properties for best results:
- **Title** (Title property) - for book title
- **Authors** (Multi-select or Text) - for book authors
- **ISBN** (Text) - for ISBN numbers
- **Description** (Text) - for book description
- **Published Date** (Date) - for publication date
- **Categories** (Multi-select) - for book genres/categories
- **Cover** (Files & media) - for book cover images

The app will work with any database structure, but these properties will be automatically mapped if they exist.

## Troubleshooting

### "Invalid Notion integration token"
- Double-check your token in the `.env` file
- Make sure there are no extra spaces or quotes around the token
- Verify the token starts with `secret_`

### "No databases found"
- Make sure you've shared at least one database with your integration
- The integration needs to be explicitly invited to each database you want to use

### "Failed to connect to Notion API"
- Check your internet connection
- Verify the integration token is correct
- Make sure the integration hasn't been deleted or disabled

## Security Notes

- Never commit your `.env` file to version control
- Keep your integration token secure
- Only share databases that you want the app to access
- You can revoke the integration at any time from the Notion integrations page 