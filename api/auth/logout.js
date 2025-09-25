const { withMiddleware } = require('../_middleware/handler');
const { logoutUser } = require('../../backend/src/handlers/auth/logout');
const authToken = require('../../backend/src/utils/authToken');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await logoutUser();

    // Clear authentication cookie
    authToken.clearAuthCookie(res);

    return result;

  } catch (error) {
    throw error; // Let middleware handle error formatting
  }
};

module.exports = withMiddleware(handler);