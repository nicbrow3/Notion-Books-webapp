const { createNotionAxios } = require('./axios');
const { ExternalAPIError, NotFoundError } = require('./errors');

/**
 * Make authenticated request to Notion API
 * @param {string} token - Notion integration token
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} data - Request data
 * @returns {Promise<Object>} API response data
 */
const notionRequest = async (token, method, endpoint, data = null) => {
  try {
    const notionAxios = createNotionAxios(token);

    const config = {
      method,
      url: endpoint,
    };

    if (data) {
      config.data = data;
    }

    const response = await notionAxios(config);
    return response.data;
  } catch (error) {
    console.error('Notion API error:', error.response?.data || error.message);

    if (error.response?.status === 404) {
      throw new NotFoundError('Notion resource not found');
    }

    if (error.response?.status === 401) {
      throw new ExternalAPIError('Notion access token invalid or expired', 401);
    }

    throw new ExternalAPIError(
      `Notion API error: ${error.message}`,
      error.response?.status || 502,
      error.response?.data
    );
  }
};

/**
 * Get notion token from request or environment
 * @param {Object} user - User data from auth token
 * @returns {string} Notion integration token
 */
const getNotionToken = (user) => {
  // Try token from user session first
  if (user && user.notionToken) {
    return user.notionToken;
  }

  // Fallback to environment variable for personal use
  if (process.env.NOTION_INTEGRATION_TOKEN) {
    return process.env.NOTION_INTEGRATION_TOKEN;
  }

  throw new ExternalAPIError('No Notion token available', 401);
};

module.exports = {
  notionRequest,
  getNotionToken
};