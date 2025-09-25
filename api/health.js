const { withMiddleware } = require('./_middleware/handler');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: 'Vercel',
    storage: 'browser-local-storage'
  };
};

module.exports = withMiddleware(handler);