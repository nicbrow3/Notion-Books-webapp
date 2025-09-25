const { AuthenticationError } = require('../../lib/errors');

/**
 * Get user profile information
 * @param {Object} params - Request parameters
 * @param {Object} params.user - User data from auth token
 * @returns {Promise<Object>} User profile
 */
const getUserProfile = async ({ user }) => {
  if (!user || !user.userData) {
    throw new AuthenticationError('User not found');
  }

  const profile = {
    id: user.userId,
    notion_user_id: user.notionUserId,
    notion_workspace_name: user.userData.workspace_name,
    email: user.userData.email,
    created_at: new Date().toISOString() // Session-based, so use current time
  };

  return profile;
};

/**
 * Get user settings (stateless - returns empty since stored in localStorage)
 * @param {Object} params - Request parameters
 * @param {Object} params.user - User data from auth token
 * @returns {Promise<Object>} User settings
 */
const getUserSettings = async ({ user }) => {
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }

  // Return settings from localStorage (empty since stored client-side)
  const settings = {
    notion_database_id: null,
    field_mappings: {},
    default_properties: {},
    notion_workspace_name: user.userData?.workspace_name || null,
    email: user.userData?.email || null,
    created_at: null,
    updated_at: null,
    note: 'Settings are now stored locally in your browser'
  };

  return settings;
};

/**
 * Update user settings (stateless - just returns the input)
 * @param {Object} params - Request parameters
 * @param {Object} params.user - User data from auth token
 * @param {Object} params.settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
const updateUserSettings = async ({ user, settings }) => {
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }

  // Return the input settings (they're stored in localStorage on frontend)
  return {
    ...settings,
    notion_workspace_name: user.userData?.workspace_name || null,
    email: user.userData?.email || null,
    updated_at: new Date().toISOString(),
    note: 'Settings are stored locally in your browser'
  };
};

/**
 * Export user data (GDPR compliance) - stateless version
 * @param {Object} params - Request parameters
 * @param {Object} params.user - User data from auth token
 * @returns {Promise<Object>} Export data
 */
const exportUserData = async ({ user }) => {
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }

  const exportData = {
    user: {
      notion_user_id: user.notionUserId,
      notion_workspace_name: user.userData?.workspace_name,
      email: user.userData?.email,
      created_at: new Date().toISOString()
    },
    settings: {
      notion_database_id: null, // Settings now stored in localStorage
      field_mappings: {},
      default_properties: {},
      note: 'Settings are now stored locally in your browser'
    },
    sessions: [], // No persistent sessions in stateless mode
    exportedAt: new Date().toISOString(),
    version: '2.0-stateless'
  };

  return exportData;
};

module.exports = {
  getUserProfile,
  getUserSettings,
  updateUserSettings,
  exportUserData
};