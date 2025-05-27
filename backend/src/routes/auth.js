const express = require('express');
const axios = require('axios');
const router = express.Router();

// Database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Notion OAuth configuration
const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize';
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

// Initiate Notion OAuth flow
router.post('/notion', (req, res) => {
  try {
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;

    const authUrl = new URL(NOTION_AUTH_URL);
    authUrl.searchParams.append('client_id', process.env.NOTION_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('owner', 'user');
    authUrl.searchParams.append('redirect_uri', process.env.NOTION_REDIRECT_URI);
    authUrl.searchParams.append('state', state);

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error initiating Notion OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Verify state parameter
    if (state !== req.session.oauthState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(NOTION_TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.NOTION_REDIRECT_URI,
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      }
    });

    const { access_token, owner } = tokenResponse.data;
    
    // Store user information in database
    const userQuery = `
      INSERT INTO users (notion_user_id, notion_access_token, notion_workspace_name, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (notion_user_id) 
      DO UPDATE SET 
        notion_access_token = EXCLUDED.notion_access_token,
        notion_workspace_name = EXCLUDED.notion_workspace_name,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, notion_user_id, notion_workspace_name, email;
    `;

    const userResult = await pool.query(userQuery, [
      owner.user.id,
      access_token,
      owner.workspace ? owner.workspace.name : null,
      owner.user.person ? owner.user.person.email : null
    ]);

    // Store user session
    req.session.userId = userResult.rows[0].id;
    req.session.notionUserId = userResult.rows[0].notion_user_id;
    delete req.session.oauthState;

    // Redirect to frontend success page
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3000';
    
    res.redirect(`${frontendUrl}/auth/success`);

  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3000';
    
    res.redirect(`${frontendUrl}/auth/error`);
  }
});

// Check authentication status
router.get('/status', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ authenticated: false });
    }

    const userQuery = 'SELECT id, notion_user_id, notion_workspace_name, email, created_at FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [req.session.userId]);

    if (userResult.rows.length === 0) {
      req.session.destroy();
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: userResult.rows[0]
    });

  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

module.exports = router; 