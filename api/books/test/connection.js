const { withMiddleware } = require('../../_middleware/handler');
const axios = require('axios');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Testing book service connections...');

    const testResults = {
      googleBooks: { available: false, error: null },
      openLibrary: { available: false, error: null }
    };

    // Test Google Books API
    try {
      const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY;
      if (!googleApiKey) {
        testResults.googleBooks.error = 'API key not configured';
      } else {
        const testQuery = 'harry potter';
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes`, {
          params: {
            q: testQuery,
            maxResults: 1,
            key: googleApiKey
          },
          timeout: 5000
        });

        if (response.data && response.data.items) {
          testResults.googleBooks.available = true;
        } else {
          testResults.googleBooks.error = 'Unexpected response format';
        }
      }
    } catch (error) {
      testResults.googleBooks.error = error.message;
    }

    // Test Open Library API
    try {
      const response = await axios.get('https://openlibrary.org/search.json', {
        params: {
          q: 'harry potter',
          limit: 1
        },
        timeout: 5000
      });

      if (response.data && response.data.docs) {
        testResults.openLibrary.available = true;
      } else {
        testResults.openLibrary.error = 'Unexpected response format';
      }
    } catch (error) {
      testResults.openLibrary.error = error.message;
    }

    const hasWorkingApi = testResults.googleBooks.available || testResults.openLibrary.available;

    return {
      success: hasWorkingApi,
      message: hasWorkingApi ? 'Book services are working' : 'No book services are available',
      data: {
        services: testResults,
        googleBooksConfigured: !!process.env.GOOGLE_BOOKS_API_KEY,
        recommendations: testResults.googleBooks.error === 'API key not configured'
          ? ['Configure GOOGLE_BOOKS_API_KEY environment variable for enhanced search']
          : []
      }
    };

  } catch (error) {
    throw error; // Let middleware handle error formatting
  }
};

module.exports = withMiddleware(handler);