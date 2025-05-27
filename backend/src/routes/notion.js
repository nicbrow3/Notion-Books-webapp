const express = require('express');
const axios = require('axios');
const router = express.Router();

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

// Smart field mapping function
const generateFieldMappings = (notionProperties) => {
  // Google Books API fields that we want to map
  const googleBooksFields = {
    title: { type: 'title', priority: 1, keywords: ['title', 'name', 'book'] },
    authors: { type: 'multi_select', priority: 1, keywords: ['author', 'authors', 'writer', 'by'] },
    isbn13: { type: 'rich_text', priority: 1, keywords: ['isbn', 'isbn13', 'isbn-13'] },
    isbn10: { type: 'rich_text', priority: 2, keywords: ['isbn10', 'isbn-10'] },
    description: { type: 'rich_text', priority: 1, keywords: ['description', 'summary', 'synopsis', 'about'] },
    categories: { type: 'multi_select', priority: 1, keywords: ['category', 'categories', 'genre', 'genres', 'subject', 'subjects'] },
    publishedDate: { type: 'date', priority: 1, keywords: ['published', 'date', 'publication', 'release'] },
    publisher: { type: 'select', priority: 1, keywords: ['publisher', 'publishing', 'press'] },
    pageCount: { type: 'number', priority: 1, keywords: ['pages', 'page', 'count', 'length'] },
    thumbnail: { type: 'url', priority: 2, keywords: ['cover', 'image', 'thumbnail', 'picture'] },
    language: { type: 'select', priority: 2, keywords: ['language', 'lang'] },
    averageRating: { type: 'number', priority: 2, keywords: ['rating', 'score', 'stars'] },
    ratingsCount: { type: 'number', priority: 3, keywords: ['ratings', 'reviews', 'count'] }
  };

  const mappings = {};
  const usedProperties = new Set();

  // Function to calculate similarity score between two strings
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Exact match
    if (s1 === s2) return 100;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 80;
    
    // Keyword match
    for (const keyword of googleBooksFields[str1]?.keywords || []) {
      if (s2.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(s2)) {
        return 70;
      }
    }
    
    // Levenshtein distance for fuzzy matching
    const matrix = Array(s1.length + 1).fill().map(() => Array(s2.length + 1).fill(0));
    
    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return Math.max(0, (maxLength - distance) / maxLength * 100);
  };

  // Sort Google Books fields by priority
  const sortedFields = Object.entries(googleBooksFields).sort((a, b) => a[1].priority - b[1].priority);

  // Find best matches for each Google Books field
  for (const [googleField, fieldInfo] of sortedFields) {
    let bestMatch = null;
    let bestScore = 0;

    for (const notionProp of notionProperties) {
      if (usedProperties.has(notionProp.name)) continue;

      // Check type compatibility
      const typeCompatible = isTypeCompatible(fieldInfo.type, notionProp.type);
      if (!typeCompatible) continue;

      // Calculate similarity score
      let score = calculateSimilarity(googleField, notionProp.name);
      
      // Check keyword matches
      for (const keyword of fieldInfo.keywords) {
        const keywordScore = calculateSimilarity(keyword, notionProp.name);
        score = Math.max(score, keywordScore);
      }

      // Boost score for type compatibility
      if (fieldInfo.type === notionProp.type) {
        score += 10;
      }

      // Cap score at 100%
      score = Math.min(score, 100);

      if (score > bestScore && score > 50) { // Minimum threshold
        bestMatch = notionProp;
        bestScore = score;
      }
    }

    if (bestMatch) {
      mappings[googleField] = {
        notionProperty: bestMatch.name,
        notionType: bestMatch.type,
        confidence: Math.round(bestScore),
        googleType: fieldInfo.type
      };
      usedProperties.add(bestMatch.name);
    }
  }

  return mappings;
};

// Check if Google Books field type is compatible with Notion property type
const isTypeCompatible = (googleType, notionType) => {
  const compatibilityMap = {
    'title': ['title'],
    'rich_text': ['rich_text', 'title'],
    'multi_select': ['multi_select', 'select', 'rich_text'],
    'select': ['select', 'multi_select', 'rich_text'],
    'date': ['date', 'rich_text'],
    'number': ['number', 'rich_text'],
    'url': ['url', 'rich_text'],
    'checkbox': ['checkbox']
  };

  return compatibilityMap[googleType]?.includes(notionType) || false;
};

// Get user's Notion access token
const getNotionToken = async (req) => {
  // For personal use, try session first, then database
  if (req.session.notionToken) {
    return req.session.notionToken;
  }
  
  if (pool && req.session.userId) {
    try {
      const query = 'SELECT notion_access_token FROM users WHERE id = $1';
      const result = await pool.query(query, [req.session.userId]);
      
      if (result.rows.length > 0) {
        return result.rows[0].notion_access_token;
      }
    } catch (error) {
      console.warn('Database token lookup failed:', error.message);
    }
  }
  
  // Fallback to environment variable for personal use
  if (process.env.NOTION_INTEGRATION_TOKEN) {
    return process.env.NOTION_INTEGRATION_TOKEN;
  }
  
  throw new Error('No Notion token available');
};

// Make authenticated request to Notion API
const notionRequest = async (token, method, endpoint, data = null) => {
  const config = {
    method,
    url: `https://api.notion.com/v1${endpoint}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Notion API error:', error.response?.data || error.message);
    throw error;
  }
};

// Get list of user's databases
router.get('/databases', requireAuth, async (req, res) => {
  try {
    const token = await getNotionToken(req);
    
    const response = await notionRequest(token, 'POST', '/search', {
      filter: {
        value: 'database',
        property: 'object'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    const databases = response.results.map(db => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled',
      url: db.url,
      created_time: db.created_time,
      last_edited_time: db.last_edited_time,
      properties: Object.keys(db.properties || {})
    }));

    res.json({ databases });

  } catch (error) {
    console.error('Error fetching databases:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch databases' });
  }
});

// Get database schema/properties
router.get('/database/:databaseId/properties', requireAuth, async (req, res) => {
  try {
    const { databaseId } = req.params;
    const token = await getNotionToken(req);
    
    const database = await notionRequest(token, 'GET', `/databases/${databaseId}`);
    
    const properties = Object.entries(database.properties || {}).map(([name, prop]) => ({
      name,
      type: prop.type,
      id: prop.id,
      config: prop[prop.type] || {}
    }));

    // Generate suggested field mappings
    const suggestedMappings = generateFieldMappings(properties);

    res.json({
      id: database.id,
      title: database.title?.[0]?.plain_text || 'Untitled',
      properties,
      suggestedMappings,
      url: database.url
    });

  } catch (error) {
    console.error('Error fetching database properties:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Database not found or access denied' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch database properties' });
  }
});

// Create a new page in a Notion database
router.post('/pages', requireAuth, async (req, res) => {
  try {
    const { databaseId, properties, children } = req.body;
    
    if (!databaseId || !properties) {
      return res.status(400).json({ error: 'Database ID and properties are required' });
    }

    const token = await getNotionToken(req);
    
    const pageData = {
      parent: {
        type: 'database_id',
        database_id: databaseId
      },
      properties
    };

    if (children && children.length > 0) {
      pageData.children = children;
    }

    const response = await notionRequest(token, 'POST', '/pages', pageData);
    
    res.json({
      id: response.id,
      url: response.url,
      created_time: response.created_time,
      properties: response.properties
    });

  } catch (error) {
    console.error('Error creating Notion page:', error);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid page data',
        details: error.response.data
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to create Notion page' });
  }
});

// Update an existing Notion page
router.patch('/pages/:pageId', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { properties } = req.body;
    
    if (!properties) {
      return res.status(400).json({ error: 'Properties are required' });
    }

    const token = await getNotionToken(req);
    
    const response = await notionRequest(token, 'PATCH', `/pages/${pageId}`, {
      properties
    });
    
    res.json({
      id: response.id,
      url: response.url,
      last_edited_time: response.last_edited_time,
      properties: response.properties
    });

  } catch (error) {
    console.error('Error updating Notion page:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Page not found or access denied' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to update Notion page' });
  }
});

// Get a specific page
router.get('/pages/:pageId', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const token = await getNotionToken(req);
    
    const response = await notionRequest(token, 'GET', `/pages/${pageId}`);
    
    res.json({
      id: response.id,
      url: response.url,
      created_time: response.created_time,
      last_edited_time: response.last_edited_time,
      properties: response.properties
    });

  } catch (error) {
    console.error('Error fetching Notion page:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Page not found or access denied' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch Notion page' });
  }
});

// Helper function to format book data for Notion properties
const formatBookDataForNotion = (bookData, fieldMappings = {}) => {
  const properties = {};

  // Default mappings
  const defaultMappings = {
    title: 'Title',
    authors: 'Authors',
    isbn13: 'ISBN',
    description: 'Description',
    categories: 'Categories',
    publishedDate: 'Published Date',
    publisher: 'Publisher',
    pageCount: 'Page Count',
    thumbnail: 'Cover'
  };

  const mappings = { ...defaultMappings, ...fieldMappings };

  // Title (required for most databases)
  if (mappings.title && bookData.title) {
    properties[mappings.title] = {
      title: [
        {
          text: {
            content: bookData.title
          }
        }
      ]
    };
  }

  // Authors (multi-select or rich text)
  if (mappings.authors && bookData.authors?.length > 0) {
    properties[mappings.authors] = {
      rich_text: [
        {
          text: {
            content: bookData.authors.join(', ')
          }
        }
      ]
    };
  }

  // ISBN (number or rich text)
  if (mappings.isbn13 && bookData.isbn13) {
    properties[mappings.isbn13] = {
      rich_text: [
        {
          text: {
            content: bookData.isbn13
          }
        }
      ]
    };
  }

  // Description (rich text)
  if (mappings.description && bookData.description) {
    const truncatedDescription = bookData.description.length > 2000 
      ? bookData.description.substring(0, 2000) + '...'
      : bookData.description;
    
    properties[mappings.description] = {
      rich_text: [
        {
          text: {
            content: truncatedDescription
          }
        }
      ]
    };
  }

  // Categories (multi-select or rich text)
  if (mappings.categories && bookData.categories?.length > 0) {
    properties[mappings.categories] = {
      rich_text: [
        {
          text: {
            content: bookData.categories.join(', ')
          }
        }
      ]
    };
  }

  // Published Date (date)
  if (mappings.publishedDate && bookData.publishedDate) {
    properties[mappings.publishedDate] = {
      rich_text: [
        {
          text: {
            content: bookData.publishedDate
          }
        }
      ]
    };
  }

  // Publisher (rich text)
  if (mappings.publisher && bookData.publisher) {
    properties[mappings.publisher] = {
      rich_text: [
        {
          text: {
            content: bookData.publisher
          }
        }
      ]
    };
  }

  // Page Count (number)
  if (mappings.pageCount && bookData.pageCount) {
    properties[mappings.pageCount] = {
      number: parseInt(bookData.pageCount) || 0
    };
  }

  // Cover/Thumbnail (files)
  if (mappings.thumbnail && bookData.thumbnail) {
    properties[mappings.thumbnail] = {
      files: [
        {
          type: 'external',
          name: 'Cover',
          external: {
            url: bookData.thumbnail
          }
        }
      ]
    };
  }

  // Rating (number)
  if (mappings.rating && bookData.averageRating) {
    properties[mappings.rating] = {
      number: parseFloat(bookData.averageRating) || 0
    };
  }

  return properties;
};

// Create book page with formatted properties
router.post('/pages/book', requireAuth, async (req, res) => {
  try {
    const { databaseId, bookData, fieldMappings } = req.body;
    
    if (!databaseId || !bookData) {
      return res.status(400).json({ error: 'Database ID and book data are required' });
    }

    const properties = formatBookDataForNotion(bookData, fieldMappings);
    
    const token = await getNotionToken(req);
    
    const pageData = {
      parent: {
        type: 'database_id',
        database_id: databaseId
      },
      properties
    };

    const response = await notionRequest(token, 'POST', '/pages', pageData);
    
    res.json({
      id: response.id,
      url: response.url,
      created_time: response.created_time,
      properties: response.properties,
      bookData
    });

  } catch (error) {
    console.error('Error creating book page:', error);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid book data or field mappings',
        details: error.response.data
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to create book page' });
  }
});

// Search for existing books in a database
router.get('/database/:databaseId/search', requireAuth, async (req, res) => {
  try {
    const { databaseId } = req.params;
    const { isbn, title } = req.query;
    
    if (!isbn && !title) {
      return res.status(400).json({ error: 'Either ISBN or title is required for search' });
    }

    const token = await getNotionToken(req);
    
    // Build search filter
    const filter = {
      or: []
    };

    if (isbn) {
      filter.or.push({
        property: 'ISBN',
        rich_text: {
          contains: isbn
        }
      });
    }

    if (title) {
      filter.or.push({
        property: 'Title',
        title: {
          contains: title
        }
      });
    }

    const searchData = {
      filter: filter.or.length > 1 ? filter : filter.or[0]
    };

    const response = await notionRequest(token, 'POST', `/databases/${databaseId}/query`, searchData);
    
    const books = response.results.map(page => ({
      id: page.id,
      url: page.url,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      isbn: page.properties.ISBN?.rich_text?.[0]?.plain_text || '',
      created_time: page.created_time
    }));

    res.json({ books });

  } catch (error) {
    console.error('Error searching database:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Database not found or access denied' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to search database' });
  }
});

// Test Notion API connection
router.get('/test', requireAuth, async (req, res) => {
  try {
    const token = await getNotionToken(req);
    
    // Test connection by making a simple API call
    const response = await notionRequest(token, 'GET', '/users/me');
    
    res.json({
      success: true,
      message: 'Notion connection is working!',
      user: {
        id: response.id,
        name: response.name,
        type: response.type
      }
    });

  } catch (error) {
    console.error('Notion connection test failed:', error);
    
    if (error.response?.status === 401) {
      return res.json({
        success: false,
        message: 'Notion access token invalid or expired'
      });
    }
    
    res.json({
      success: false,
      message: 'Failed to connect to Notion API'
    });
  }
});

module.exports = router; 