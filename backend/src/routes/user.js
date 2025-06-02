const express = require('express');
const router = express.Router();
const fileStorage = require('../utils/fileStorage');

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

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get user settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        us.notion_database_id,
        us.field_mappings,
        us.default_properties,
        us.created_at,
        us.updated_at,
        u.notion_workspace_name,
        u.email
      FROM user_settings us
      LEFT JOIN users u ON us.user_id = u.id
      WHERE us.user_id = $1;
    `;

    const result = await pool.query(query, [req.session.userId]);

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        notion_database_id: null,
        field_mappings: {},
        default_properties: {},
        notion_workspace_name: null,
        email: null,
        created_at: null,
        updated_at: null
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

// Update user settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const {
      notion_database_id,
      field_mappings,
      default_properties
    } = req.body;

    const query = `
      INSERT INTO user_settings (user_id, notion_database_id, field_mappings, default_properties)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        notion_database_id = EXCLUDED.notion_database_id,
        field_mappings = EXCLUDED.field_mappings,
        default_properties = EXCLUDED.default_properties,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await pool.query(query, [
      req.session.userId,
      notion_database_id || null,
      JSON.stringify(field_mappings || {}),
      JSON.stringify(default_properties || {})
    ]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Get user profile information
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        notion_user_id,
        notion_workspace_name,
        email,
        created_at
      FROM users 
      WHERE id = $1;
    `;

    const result = await pool.query(query, [req.session.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Get total book sessions created
    const sessionsQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN approved = true THEN 1 END) as approved_sessions,
        COUNT(CASE WHEN approved = false THEN 1 END) as pending_sessions
      FROM book_sessions 
      WHERE user_id = $1;
    `;

    // Get recent activity (last 30 days)
    const recentActivityQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sessions_created
      FROM book_sessions 
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC;
    `;

    // Get user join date and settings
    const userInfoQuery = `
      SELECT 
        u.created_at as joined_at,
        us.created_at as settings_created_at,
        us.notion_database_id
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
      WHERE u.id = $1;
    `;

    const [sessionsResult, activityResult, userInfoResult] = await Promise.all([
      pool.query(sessionsQuery, [req.session.userId]),
      pool.query(recentActivityQuery, [req.session.userId]),
      pool.query(userInfoQuery, [req.session.userId])
    ]);

    const stats = {
      sessions: {
        total: parseInt(sessionsResult.rows[0].total_sessions),
        approved: parseInt(sessionsResult.rows[0].approved_sessions),
        pending: parseInt(sessionsResult.rows[0].pending_sessions)
      },
      recentActivity: activityResult.rows,
      user: {
        joinedAt: userInfoResult.rows[0]?.joined_at,
        hasSettings: !!userInfoResult.rows[0]?.settings_created_at,
        hasDatabaseConfigured: !!userInfoResult.rows[0]?.notion_database_id
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get user's book sessions (with pagination)
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // 'approved', 'pending', or undefined for all

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.session.userId];

    if (status === 'approved') {
      whereClause += ' AND approved = true';
    } else if (status === 'pending') {
      whereClause += ' AND approved = false';
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM book_sessions 
      ${whereClause};
    `;

    // Get sessions with pagination
    const sessionsQuery = `
      SELECT 
        session_id,
        book_data,
        approved,
        notion_page_id,
        created_at,
        expires_at
      FROM book_sessions 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
    `;

    queryParams.push(limit, offset);

    const [countResult, sessionsResult] = await Promise.all([
      pool.query(countQuery, [req.session.userId]),
      pool.query(sessionsQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      sessions: sessionsResult.rows.map(session => ({
        ...session,
        book_data: typeof session.book_data === 'string' 
          ? JSON.parse(session.book_data) 
          : session.book_data
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

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

// Get user's Notion integration settings (alias for /settings)
router.get('/notion-settings', requireAuth, async (req, res) => {
  try {
    // Check if database is available
    if (pool) {
      try {
        const query = `
          SELECT 
            us.notion_database_id as databaseId,
            us.field_mappings as fieldMapping,
            us.default_properties as defaultValues,
            us.default_published_date_type as defaultPublishedDateType,
            us.created_at,
            us.updated_at,
            u.notion_workspace_name,
            u.email
          FROM user_settings us
          LEFT JOIN users u ON us.user_id = u.id
          WHERE us.user_id = $1;
        `;

        const result = await pool.query(query, [req.session.userId]);

        if (result.rows.length === 0) {
          return res.status(404).json({ 
            success: false,
            message: 'No Notion settings found' 
          });
        }

        const settings = result.rows[0];
        
        // Parse JSON fields
        if (typeof settings.fieldmapping === 'string') {
          settings.fieldMapping = JSON.parse(settings.fieldmapping);
        }
        if (typeof settings.defaultvalues === 'string') {
          settings.defaultValues = JSON.parse(settings.defaultvalues);
        }

        return res.json({
          success: true,
          data: {
            settings
          }
        });
      } catch (dbError) {
        console.log('Database check failed, trying file storage:', dbError.message);
        // Fall through to file storage
      }
    }

    // Try file storage as fallback
    try {
      const userKey = `user_settings_${req.session.userId || req.session.notionUserId || 'default'}`;
      const fileSettings = await fileStorage.get(userKey);
      
      if (fileSettings) {
        console.log('📁 Using file storage for settings');
        return res.json({
          success: true,
          data: {
            settings: fileSettings
          }
        });
      }
    } catch (fileError) {
      console.log('File storage check failed, using session data:', fileError.message);
    }

    // Use session-based storage when database is not available
    const sessionSettings = req.session.notionSettings || {
      databaseId: null,
      fieldMapping: {},
      defaultValues: {},
      defaultPublishedDateType: 'original',
      workspaceName: req.session.notionWorkspaceName || null,
      email: req.session.notionEmail || null
    };

    res.json({
      success: true,
      data: {
        settings: sessionSettings
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

// Update user's Notion integration settings (alias for /settings)
router.put('/notion-settings', requireAuth, async (req, res) => {
  try {
    const {
      databaseId,
      fieldMapping,
      defaultValues,
      defaultPublishedDateType
    } = req.body;

    // Check if database is available
    if (pool) {
      try {
        const query = `
          INSERT INTO user_settings (user_id, notion_database_id, field_mappings, default_properties, default_published_date_type)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            notion_database_id = EXCLUDED.notion_database_id,
            field_mappings = EXCLUDED.field_mappings,
            default_properties = EXCLUDED.default_properties,
            default_published_date_type = EXCLUDED.default_published_date_type,
            updated_at = CURRENT_TIMESTAMP
          RETURNING 
            notion_database_id as databaseId,
            field_mappings as fieldMapping,
            default_properties as defaultValues,
            default_published_date_type as defaultPublishedDateType,
            updated_at;
        `;

        const result = await pool.query(query, [
          req.session.userId,
          databaseId || null,
          JSON.stringify(fieldMapping || {}),
          JSON.stringify(defaultValues || {}),
          defaultPublishedDateType || 'original'
        ]);

        const settings = result.rows[0];
        
        // Parse JSON fields
        if (typeof settings.fieldmapping === 'string') {
          settings.fieldMapping = JSON.parse(settings.fieldmapping);
        }
        if (typeof settings.defaultvalues === 'string') {
          settings.defaultValues = JSON.parse(settings.defaultvalues);
        }

        return res.json({
          success: true,
          data: {
            settings
          }
        });
      } catch (dbError) {
        console.log('Database storage failed, trying file storage:', dbError.message);
        // Fall through to file storage
      }
    }

    // Try file storage as fallback
    try {
      const userKey = `user_settings_${req.session.userId || req.session.notionUserId || 'default'}`;
      const settingsToStore = {
        databaseId: databaseId || null,
        fieldMapping: fieldMapping || {},
        defaultValues: defaultValues || {},
        defaultPublishedDateType: defaultPublishedDateType || 'original',
        workspaceName: req.session.notionWorkspaceName || null,
        email: req.session.notionEmail || null,
        updatedAt: new Date().toISOString()
      };

      const stored = await fileStorage.set(userKey, settingsToStore);
      
      if (stored) {
        console.log('📁 Settings saved to file storage');
        // Also update session for immediate use
        req.session.notionSettings = settingsToStore;
        
        return res.json({
          success: true,
          data: {
            settings: settingsToStore
          }
        });
      }
    } catch (fileError) {
      console.log('File storage failed, using session-only storage:', fileError.message);
    }

    // Use session-based storage as final fallback
    req.session.notionSettings = {
      databaseId: databaseId || null,
      fieldMapping: fieldMapping || {},
      defaultValues: defaultValues || {},
      defaultPublishedDateType: defaultPublishedDateType || 'original',
      workspaceName: req.session.notionWorkspaceName || null,
      email: req.session.notionEmail || null,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        settings: req.session.notionSettings
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