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
const formatBookDataForNotion = async (bookData, fieldMappings = {}, databaseId, token) => {
  const properties = {};

  // Get database schema to understand property types
  let databaseSchema = null;
  try {
    databaseSchema = await notionRequest(token, 'GET', `/databases/${databaseId}`);
    console.log('Available database properties:', Object.keys(databaseSchema?.properties || {}));
  } catch (error) {
    console.error('Failed to fetch database schema:', error);
    // Fall back to basic formatting without type checking
  }

  // Helper function to get property type from database schema
  const getPropertyType = (propertyName) => {
    if (!databaseSchema?.properties) return null;
    const property = databaseSchema.properties[propertyName];
    return property?.type || null;
  };

  // Helper function to format value based on property type
  const formatPropertyValue = (value, propertyType, propertyName) => {
    if (!value) return null;

    switch (propertyType) {
      case 'title':
        return {
          title: [
            {
              text: {
                content: String(value).substring(0, 2000) // Notion title limit
              }
            }
          ]
        };

      case 'rich_text':
        const textContent = Array.isArray(value) ? value.join(', ') : String(value);
        return {
          rich_text: [
            {
              text: {
                content: textContent.substring(0, 2000) // Notion rich text limit
              }
            }
          ]
        };

      case 'multi_select':
        const options = Array.isArray(value) ? value : [value];
        return {
          multi_select: options.slice(0, 10).map(option => ({ // Limit to 10 options
            name: String(option).substring(0, 100) // Notion option name limit
          }))
        };

      case 'select':
        return {
          select: {
            name: String(Array.isArray(value) ? value[0] : value).substring(0, 100)
          }
        };

      case 'number':
        const numValue = parseFloat(value);
        return isNaN(numValue) ? null : { number: numValue };

      case 'date':
        // Try to parse date string
        let dateValue = value;
        if (typeof value === 'string') {
          // Handle various date formats
          const parsedDate = new Date(value);
          if (!isNaN(parsedDate.getTime())) {
            dateValue = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        }
        return {
          date: {
            start: dateValue
          }
        };

      case 'url':
        const urlValue = String(value);
        // Basic URL validation
        if (urlValue.startsWith('http://') || urlValue.startsWith('https://')) {
          return {
            url: urlValue
          };
        }
        return null;

      case 'files':
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
          return {
            files: [
              {
                type: 'external',
                name: 'Cover',
                external: {
                  url: value
                }
              }
            ]
          };
        }
        return null;

      case 'checkbox':
        return {
          checkbox: Boolean(value)
        };

      default:
        // Fallback to rich_text for unknown types
        const fallbackContent = Array.isArray(value) ? value.join(', ') : String(value);
        return {
          rich_text: [
            {
              text: {
                content: fallbackContent.substring(0, 2000)
              }
            }
          ]
        };
    }
  };

  // Map book data to Notion properties using field mappings
  const bookFieldMap = {
    title: bookData.title,
    authors: bookData.authors,
    isbn: bookData.isbn13 || bookData.isbn10,
    isbn13: bookData.isbn13,
    isbn10: bookData.isbn10,
    description: bookData.description,
    categories: bookData.categories,
    publishedDate: bookData.publishedDate,
    publisher: bookData.publisher,
    pageCount: bookData.pageCount,
    thumbnail: bookData.thumbnail,
    rating: bookData.averageRating,
    language: bookData.language,
    ratingsCount: bookData.ratingsCount
  };

  // Process each field mapping
  for (const [bookField, notionPropertyName] of Object.entries(fieldMappings)) {
    if (!notionPropertyName || !bookFieldMap[bookField]) continue;

    const propertyType = getPropertyType(notionPropertyName);
    
    // Skip if property doesn't exist in the database
    if (!propertyType && databaseSchema?.properties) {
      console.warn(`Property "${notionPropertyName}" does not exist in database. Skipping field "${bookField}".`);
      continue;
    }
    
    const formattedValue = formatPropertyValue(bookFieldMap[bookField], propertyType, notionPropertyName);

    if (formattedValue) {
      properties[notionPropertyName] = formattedValue;
    }
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

    const token = await getNotionToken(req);
    
    // Format book data with proper type checking
    const properties = await formatBookDataForNotion(bookData, fieldMappings, databaseId, token);
    
    const pageData = {
      parent: {
        type: 'database_id',
        database_id: databaseId
      },
      properties
    };

    console.log('Field mappings received:', JSON.stringify(fieldMappings, null, 2));
    console.log('Creating Notion page with data:', JSON.stringify(pageData, null, 2));

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
      console.error('Notion API validation error:', error.response.data);
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
    const { isbn, title, fieldMappings } = req.query;
    
    if (!isbn && !title) {
      return res.status(400).json({ error: 'Either ISBN or title is required for search' });
    }

    const token = await getNotionToken(req);
    
    // Parse field mappings if provided
    let mappings = {};
    if (fieldMappings) {
      try {
        mappings = JSON.parse(fieldMappings);
      } catch (e) {
        console.warn('Failed to parse field mappings:', e);
      }
    }

    // Get database properties to find available fields
    const database = await notionRequest(token, 'GET', `/databases/${databaseId}`);
    const availableProperties = Object.keys(database.properties || {});
    
    // Determine which properties to search
    const titleProperty = mappings.title || 'Title';
    const isbnProperty = mappings.isbn || 'ISBN';
    
    // Build search filter only for properties that exist
    const filter = {
      or: []
    };

    if (isbn && availableProperties.includes(isbnProperty)) {
      const isbnProp = database.properties[isbnProperty];
      if (isbnProp.type === 'rich_text') {
        filter.or.push({
          property: isbnProperty,
          rich_text: {
            contains: isbn
          }
        });
      } else if (isbnProp.type === 'title') {
        filter.or.push({
          property: isbnProperty,
          title: {
            contains: isbn
          }
        });
      }
    }

    if (title && availableProperties.includes(titleProperty)) {
      const titleProp = database.properties[titleProperty];
      if (titleProp.type === 'title') {
        filter.or.push({
          property: titleProperty,
          title: {
            contains: title
          }
        });
      } else if (titleProp.type === 'rich_text') {
        filter.or.push({
          property: titleProperty,
          rich_text: {
            contains: title
          }
        });
      }
    }

    // If no valid properties found, return empty results
    if (filter.or.length === 0) {
      return res.json({ books: [] });
    }

    const searchData = {
      filter: filter.or.length > 1 ? filter : filter.or[0]
    };

    const response = await notionRequest(token, 'POST', `/databases/${databaseId}/query`, searchData);
    
    const books = response.results.map(page => {
      // Dynamically extract title and ISBN based on available properties
      let bookTitle = 'Untitled';
      let bookIsbn = '';
      
      if (availableProperties.includes(titleProperty)) {
        const titleProp = page.properties[titleProperty];
        if (titleProp?.title?.[0]?.plain_text) {
          bookTitle = titleProp.title[0].plain_text;
        } else if (titleProp?.rich_text?.[0]?.plain_text) {
          bookTitle = titleProp.rich_text[0].plain_text;
        }
      }
      
      if (availableProperties.includes(isbnProperty)) {
        const isbnProp = page.properties[isbnProperty];
        if (isbnProp?.rich_text?.[0]?.plain_text) {
          bookIsbn = isbnProp.rich_text[0].plain_text;
        } else if (isbnProp?.title?.[0]?.plain_text) {
          bookIsbn = isbnProp.title[0].plain_text;
        }
      }
      
      return {
        id: page.id,
        url: page.url,
        title: bookTitle,
        isbn: bookIsbn,
        created_time: page.created_time
      };
    });

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