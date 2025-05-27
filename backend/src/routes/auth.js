const express = require('express');
const axios = require('axios');
const router = express.Router();

// Database connection (optional for personal use)
const { Pool } = require('pg');
let pool = null;

// Only initialize database if DATABASE_URL is provided
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Simple authentication using personal integration token
router.post('/setup', async (req, res) => {
  try {
    // For personal use, we'll use the integration token from environment variables
    const integrationToken = process.env.NOTION_INTEGRATION_TOKEN;
    
    if (!integrationToken) {
      return res.status(400).json({ 
        error: 'Notion integration token not configured. Please add NOTION_INTEGRATION_TOKEN to your environment variables.' 
      });
    }

    // Test the token by making a request to Notion API
    const response = await axios.get('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${integrationToken}`,
        'Notion-Version': '2022-06-28',
      }
    });

    const user = response.data;
    
    // Store user information in session (with optional database storage)
    let userId = 1; // Default user ID for personal use
    
    if (pool) {
      try {
        // Store or update user information in database if available
        const userQuery = `
          INSERT INTO users (notion_user_id, notion_access_token, notion_workspace_name, email)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (notion_user_id) 
          DO UPDATE SET 
            notion_access_token = EXCLUDED.notion_access_token,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, notion_user_id, notion_workspace_name, email;
        `;

        const userResult = await pool.query(userQuery, [
          user.id,
          integrationToken,
          user.name || 'Personal Workspace',
          user.person?.email || null
        ]);
        
        userId = userResult.rows[0].id;
      } catch (dbError) {
        console.warn('Database storage failed, using session-only storage:', dbError.message);
      }
    }

    // Store user session
    req.session.userId = userId;
    req.session.notionUserId = user.id;
    req.session.notionToken = integrationToken;
    req.session.userData = {
      id: user.id,
      name: user.name,
      workspace_name: user.name || 'Personal Workspace',
      email: user.person?.email
    };

    res.json({
      success: true,
      message: 'Successfully connected to Notion',
      user: req.session.userData
    });

  } catch (error) {
    console.error('Error setting up Notion integration:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid Notion integration token. Please check your token and try again.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to setup Notion integration' 
    });
  }
});

// Check authentication status
router.get('/status', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.userData) {
      return res.json({ authenticated: false });
    }

    // For personal use, we can rely on session data
    // Optionally verify with database if available
    if (pool) {
      try {
        const userQuery = 'SELECT notion_user_id, notion_workspace_name, email FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [req.session.userId]);

        if (userResult.rows.length === 0) {
          // Fall back to session data if database record not found
          console.warn('User not found in database, using session data');
        } else {
          // Update session with database data
          const dbUser = userResult.rows[0];
          req.session.userData = {
            id: dbUser.notion_user_id,
            workspace_name: dbUser.notion_workspace_name,
            email: dbUser.email
          };
        }
      } catch (dbError) {
        console.warn('Database check failed, using session data:', dbError.message);
      }
    }
    
    res.json({
      authenticated: true,
      user: req.session.userData
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
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router; 