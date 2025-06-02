const express = require('express');
const router = express.Router();
const fileStorage = require('../utils/fileStorage');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get user settings (session-based)
router.get('/settings', requireAuth, async (req, res) => {
  try {
    // Return settings from session or defaults
    const settings = req.session.userSettings || {
      notion_database_id: null,
      field_mappings: {},
      default_properties: {},
      notion_workspace_name: req.session.userData?.workspace_name || null,
      email: req.session.userData?.email || null,
      created_at: null,
      updated_at: null
    };

    res.json(settings);

  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

// Update user settings (session-based)
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const {
      notion_database_id,
      field_mappings,
      default_properties
    } = req.body;

    // Store settings in session
    req.session.userSettings = {
      notion_database_id: notion_database_id || null,
      field_mappings: field_mappings || {},
      default_properties: default_properties || {},
      notion_workspace_name: req.session.userData?.workspace_name || null,
      email: req.session.userData?.email || null,
      created_at: req.session.userSettings?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(req.session.userSettings);

  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Get user profile information (session-based)
router.get('/profile', requireAuth, async (req, res) => {
  try {
    if (!req.session.userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = {
      id: req.session.userId,
      notion_user_id: req.session.notionUserId,
      notion_workspace_name: req.session.userData.workspace_name,
      email: req.session.userData.email,
      created_at: new Date().toISOString() // Session-based, so use current time
    };

    res.json(profile);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user statistics (session-based, simplified)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // For session-based storage, provide simplified stats
    const stats = {
      sessions: {
        total: 0,
        approved: 0,
        pending: 0
      },
      recentActivity: [],
      user: {
        joinedAt: new Date().toISOString(),
        hasSettings: !!req.session.userSettings,
        hasDatabaseConfigured: !!(req.session.userSettings?.notion_database_id)
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get user's book sessions (session-based, simplified)
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    // For session-based storage, return empty sessions list
    // In a real implementation, you might store sessions in browser local storage
    const sessions = {
      sessions: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalSessions: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    };

    res.json(sessions);

  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Failed to fetch user sessions' });
  }
});

// Delete user account (with all associated data)
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const { confirmDelete } = req.body;

    if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ 
        error: 'Invalid confirmation. Please send "DELETE_MY_ACCOUNT" in confirmDelete field.' 
      });
    }

    // Delete user and all associated data (cascading deletes will handle the rest)
    const query = 'DELETE FROM users WHERE id = $1 RETURNING notion_user_id;';
    const result = await pool.query(query, [req.session.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Destroy session
    req.session.destroy();

    res.json({ 
      success: true, 
      message: 'Account deleted successfully',
      deletedUserId: result.rows[0].notion_user_id
    });

  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Failed to delete user account' });
  }
});

// Export user data (GDPR compliance)
router.get('/export', requireAuth, async (req, res) => {
  try {
    // Get user data
    const userQuery = `
      SELECT 
        notion_user_id,
        notion_workspace_name,
        email,
        created_at
      FROM users 
      WHERE id = $1;
    `;

    // Get user settings
    const settingsQuery = `
      SELECT 
        notion_database_id,
        field_mappings,
        default_properties,
        created_at,
        updated_at
      FROM user_settings 
      WHERE user_id = $1;
    `;

    // Get all book sessions
    const sessionsQuery = `
      SELECT 
        session_id,
        book_data,
        approved,
        notion_page_id,
        created_at,
        expires_at
      FROM book_sessions 
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;

    const [userResult, settingsResult, sessionsResult] = await Promise.all([
      pool.query(userQuery, [req.session.userId]),
      pool.query(settingsQuery, [req.session.userId]),
      pool.query(sessionsQuery, [req.session.userId])
    ]);

    const exportData = {
      user: userResult.rows[0] || null,
      settings: settingsResult.rows[0] || null,
      sessions: sessionsResult.rows.map(session => ({
        ...session,
        book_data: typeof session.book_data === 'string' 
          ? JSON.parse(session.book_data) 
          : session.book_data
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=notion-books-export.json');
    res.json(exportData);

  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// Get user's Notion integration settings (alias for /settings) - now returns empty since we use localStorage
router.get('/notion-settings', async (req, res) => {
  try {
    // Return empty settings since we now use localStorage on frontend
    res.json({
      success: true,
      data: {
        settings: {
          databaseId: null,
          fieldMapping: {},
          defaultValues: {},
          defaultPublishedDateType: 'original'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching Notion settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch Notion settings' 
    });
  }
});

// Update user's Notion integration settings (alias for /settings) - now just returns success since we use localStorage
router.put('/notion-settings', async (req, res) => {
  try {
    // Just return success since settings are now stored in localStorage
    res.json({
      success: true,
      data: {
        settings: req.body
      }
    });

  } catch (error) {
    console.error('Error updating Notion settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update Notion settings' 
    });
  }
});

module.exports = router; 