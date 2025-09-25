const { withMiddleware } = require('../_middleware/handler');
const { requireAuth } = require('../_middleware/auth');
const { getUserProfile } = require('../../backend/src/handlers/user/profile');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require authentication
    const user = requireAuth(req, res);

    const result = await getUserProfile({ user });

    return result;

  } catch (error) {
    throw error; // Let middleware handle error formatting
  }
};

module.exports = withMiddleware(handler);