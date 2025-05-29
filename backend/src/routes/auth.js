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
    const userResponse = await axios.get('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${integrationToken}`,
        'Notion-Version': '2022-06-28',
      }
    });

    const integrationUser = userResponse.data;
    
    // For personal integrations, get workspace info by listing users to find the workspace owner
    let workspaceInfo = {
      name: 'Personal Workspace',
      owner: null
    };
    
    try {
      const usersResponse = await axios.get('https://api.notion.com/v1/users', {
        headers: {
          'Authorization': `Bearer ${integrationToken}`,
          'Notion-Version': '2022-06-28',
        }
      });
      
      // Find the workspace owner (person type user)
      const owner = usersResponse.data.results.find(user => user.type === 'person');
      if (owner) {
        workspaceInfo.owner = owner;
        workspaceInfo.name = owner.name ? `${owner.name}'s Workspace` : 'Personal Workspace';
      }
    } catch (workspaceError) {
      console.warn('Could not fetch workspace info:', workspaceError.message);
    }
    
    // Check if this is a first-time connection
    let isFirstTime = false;
    let userId = 1;
    
    if (pool) {
      try {
        // Check if user already exists
        const existingUserQuery = 'SELECT id FROM users WHERE notion_user_id = $1';
        const existingUserResult = await pool.query(existingUserQuery, [integrationUser.id]);
        
        isFirstTime = existingUserResult.rows.length === 0;
        
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
          integrationUser.id,
          integrationToken,
          workspaceInfo.name,
          workspaceInfo.owner?.person?.email || null
        ]);
        
        userId = userResult.rows[0].id;
      } catch (dbError) {
        console.warn('Database storage failed, using session-only storage:', dbError.message);
        // For session-only storage, check if session already exists
        isFirstTime = !req.session.userId;
      }
    } else {
      // For session-only storage, check if session already exists
      isFirstTime = !req.session.userId;
    }

    // Store user session
    req.session.userId = userId;
    req.session.notionUserId = integrationUser.id;
    req.session.notionToken = integrationToken;
    req.session.userData = {
      id: integrationUser.id,
      name: workspaceInfo.owner?.name || 'User',
      workspace_name: workspaceInfo.name,
      email: workspaceInfo.owner?.person?.email,
      owner: workspaceInfo.owner
    };

    res.json({
      success: true,
      message: 'Successfully connected to Notion',
      user: req.session.userData,
      isFirstTime: isFirstTime
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
    // If already authenticated, return session data
    if (req.session.userId && req.session.userData) {
      // Optionally verify with database if available
      if (pool) {
        try {
          const userQuery = 'SELECT notion_user_id, notion_workspace_name, email FROM users WHERE id = $1';
          const userResult = await pool.query(userQuery, [req.session.userId]);

          if (userResult.rows.length === 0) {
            // Fall back to session data if database record not found
            console.warn('User not found in database, using session data');
          } else {
            // Update session with database data, but preserve owner info from session
            const dbUser = userResult.rows[0];
            req.session.userData = {
              ...req.session.userData, // Preserve existing owner info
              id: dbUser.notion_user_id,
              workspace_name: dbUser.notion_workspace_name,
              email: dbUser.email
            };
          }
        } catch (dbError) {
          console.warn('Database check failed, using session data:', dbError.message);
        }
      }
      
      return res.json({
        authenticated: true,
        user: req.session.userData
      });
    }

    // If not authenticated but integration token is configured, auto-authenticate
    const integrationToken = process.env.NOTION_INTEGRATION_TOKEN;
    
    if (integrationToken) {
      try {
        // Test the token by making a request to Notion API
        const userResponse = await axios.get('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${integrationToken}`,
            'Notion-Version': '2022-06-28',
          }
        });

        const integrationUser = userResponse.data;
        
        // For personal integrations, get workspace info by listing users to find the workspace owner
        let workspaceInfo = {
          name: 'Personal Workspace',
          owner: null
        };
        
        try {
          const usersResponse = await axios.get('https://api.notion.com/v1/users', {
            headers: {
              'Authorization': `Bearer ${integrationToken}`,
              'Notion-Version': '2022-06-28',
            }
          });
          
          // Find the workspace owner (person type user)
          const owner = usersResponse.data.results.find(user => user.type === 'person');
          if (owner) {
            workspaceInfo.owner = owner;
            workspaceInfo.name = owner.name ? `${owner.name}'s Workspace` : 'Personal Workspace';
          }
        } catch (workspaceError) {
          console.warn('Could not fetch workspace info:', workspaceError.message);
        }
        
        let userId = 1;
        
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
              integrationUser.id,
              integrationToken,
              workspaceInfo.name,
              workspaceInfo.owner?.person?.email || null
            ]);
            
            userId = userResult.rows[0].id;
          } catch (dbError) {
            console.warn('Database storage failed, using session-only storage:', dbError.message);
          }
        }

        // Store user session
        req.session.userId = userId;
        req.session.notionUserId = integrationUser.id;
        req.session.notionToken = integrationToken;
        req.session.userData = {
          id: integrationUser.id,
          name: workspaceInfo.owner?.name || 'User',
          workspace_name: workspaceInfo.name,
          email: workspaceInfo.owner?.person?.email,
          owner: workspaceInfo.owner
        };

        console.log('Auto-authenticated user with Notion integration token');
        
        return res.json({
          authenticated: true,
          user: req.session.userData,
          autoAuthenticated: true
        });

      } catch (error) {
        console.error('Auto-authentication failed:', error);
        // If auto-auth fails, fall through to return not authenticated
      }
    }
    
    // No session and no valid token, return not authenticated
    res.json({ authenticated: false });

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