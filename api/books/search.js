const { withMiddleware } = require('../_middleware/handler');
const { searchBooks } = require('../../backend/src/handlers/books/search');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      q: query,
      type = 'general',
      limit = 10,
      includeAudiobooks = 'false'
    } = req.query;

    const result = await searchBooks({
      query,
      type,
      limit,
      includeAudiobooks
    });

    return result;

  } catch (error) {
    throw error; // Let middleware handle error formatting
  }
};

module.exports = withMiddleware(handler);