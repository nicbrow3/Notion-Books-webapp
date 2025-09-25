const { createNotionAxios } = require('../../lib/axios');
const { ValidationError, ExternalAPIError } = require('../../lib/errors');

/**
 * Setup Notion integration and create auth token
 * @param {Object} params - Request parameters
 * @param {string} params.integrationToken - Notion integration token from env
 * @returns {Promise<Object>} Setup result with user data
 */
const setupNotionIntegration = async ({ integrationToken }) => {
  if (!integrationToken) {
    throw new ValidationError(
      'Notion integration token not configured. Please add NOTION_INTEGRATION_TOKEN to your environment variables.'
    );
  }

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

    // Generate user data for token
    const userId = Date.now(); // Simple ID generation
    const userData = {
      id: integrationUser.id,
      name: workspaceInfo.owner?.name || 'User',
      workspace_name: workspaceInfo.name,
      email: workspaceInfo.owner?.person?.email,
      owner: workspaceInfo.owner
    };

    return {
      success: true,
      message: 'Successfully connected to Notion',
      userSession: {
        userId,
        notionUserId: integrationUser.id,
        notionToken: integrationToken,
        userData
      },
      user: userData,
      isFirstTime: true // Always first time for stateless tokens
    };

  } catch (error) {
    console.error('Error setting up Notion integration:', error);

    if (error.response?.status === 401) {
      throw new ExternalAPIError(
        'Invalid Notion integration token. Please check your token and try again.',
        401
      );
    }

    if (error.isOperational) {
      throw error; // Re-throw custom errors
    }

    throw new ExternalAPIError('Failed to setup Notion integration');
  }
};

module.exports = {
  setupNotionIntegration
};