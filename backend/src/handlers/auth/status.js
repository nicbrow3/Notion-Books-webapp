const { createNotionAxios } = require('../../lib/axios');
const { ExternalAPIError } = require('../../lib/errors');

/**
 * Check authentication status and optionally auto-authenticate
 * @param {Object} params - Request parameters
 * @param {Object|null} params.user - Current user from token (if any)
 * @param {string} params.integrationToken - Notion integration token from env
 * @returns {Promise<Object>} Authentication status
 */
const checkAuthStatus = async ({ user, integrationToken }) => {
  // If user is already authenticated via token, return their data
  if (user && user.userData) {
    return {
      authenticated: true,
      user: user.userData
    };
  }

  // If not authenticated but integration token is configured, auto-authenticate
  if (integrationToken) {
    try {
      const notionAxios = createNotionAxios(integrationToken);

      // Test the token by making a request to Notion API
      const userResponse = await notionAxios.get('/users/me');
      const integrationUser = userResponse.data;

      // For personal integrations, get workspace info by listing users to find the workspace owner
      let workspaceInfo = {
        name: 'Personal Workspace',
        owner: null
      };

      try {
        const usersResponse = await notionAxios.get('/users');

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

      return {
        authenticated: true,
        user: userData,
        userSession: {
          userId,
          notionUserId: integrationUser.id,
          notionToken: integrationToken,
          userData
        }
      };

    } catch (error) {
      console.error('Auto-authentication failed:', error);
      // Don't throw error for auto-auth failures, just return unauthenticated
    }
  }

  return {
    authenticated: false,
    message: 'Not authenticated'
  };
};

module.exports = {
  checkAuthStatus
};