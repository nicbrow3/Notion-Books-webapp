const express = require('express');
const axios = require('axios');
const authToken = require('../utils/authToken');
const router = express.Router();

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
        'Notion-Version': '2025-09-03',
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
          'Notion-Version': '2025-09-03',
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
    
    // Generate user data for token
    const userId = Date.now(); // Simple ID generation
    const userData = {
      id: integrationUser.id,
      name: workspaceInfo.owner?.name || 'User',
      workspace_name: workspaceInfo.name,
      email: workspaceInfo.owner?.person?.email,
      owner: workspaceInfo.owner
    };

    // Create JWT token with user data
    const token = authToken.signToken({
      userId,
      notionUserId: integrationUser.id,
      notionToken: integrationToken,
      userData
    });

    // Set authentication cookie
    authToken.setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Successfully connected to Notion',
      user: userData,
      isFirstTime: true // Always first time for stateless tokens
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
    // Check for existing token first
    const token = authToken.extractTokenFromRequest(req);

    if (token) {
      const decoded = authToken.verifyToken(token);
      if (decoded) {
        return res.json({
          authenticated: true,
          user: decoded.userData
        });
      }
    }

    // If not authenticated but integration token is configured, auto-authenticate
    const integrationToken = process.env.NOTION_INTEGRATION_TOKEN;

    if (integrationToken) {
      try {
        // Test the token by making a request to Notion API
        const userResponse = await axios.get('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${integrationToken}`,
            'Notion-Version': '2025-09-03',
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
              'Notion-Version': '2025-09-03',
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

        // Create new token for auto-authentication
        const userId = Date.now();
        const userData = {
          id: integrationUser.id,
          name: workspaceInfo.owner?.name || 'User',
          workspace_name: workspaceInfo.name,
          email: workspaceInfo.owner?.person?.email,
          owner: workspaceInfo.owner
        };

        const newToken = authToken.signToken({
          userId,
          notionUserId: integrationUser.id,
          notionToken: integrationToken,
          userData
        });

        authToken.setAuthCookie(res, newToken);

        return res.json({
          authenticated: true,
          user: userData
        });

      } catch (error) {
        console.error('Auto-authentication failed:', error);
      }
    }

    res.json({
      authenticated: false,
      message: 'Not authenticated'
    });

  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      error: 'Failed to check authentication status'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // Clear authentication cookie
  authToken.clearAuthCookie(res);

  res.json({
    success: true,
    message: 'Successfully logged out'
  });
});

module.exports = router; 