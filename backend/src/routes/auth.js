const express = require('express');
const axios = require('axios');
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
    
    // Check if this is a first-time connection (session-based)
    const isFirstTime = !req.session.userId;
    const userId = req.session.userId || Date.now(); // Simple ID generation

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

        // Store user session
        req.session.userId = req.session.userId || Date.now();
        req.session.notionUserId = integrationUser.id;
        req.session.notionToken = integrationToken;
        req.session.userData = {
          id: integrationUser.id,
          name: workspaceInfo.owner?.name || 'User',
          workspace_name: workspaceInfo.name,
          email: workspaceInfo.owner?.person?.email,
          owner: workspaceInfo.owner
        };

        return res.json({
          authenticated: true,
          user: req.session.userData
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
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.json({ 
      success: true, 
      message: 'Successfully logged out' 
    });
  });
});

module.exports = router; 