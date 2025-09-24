const express = require('express');
const axios = require('axios');
const router = express.Router();

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
    isbn13: { type: 'rich_text', priority: 1, keywords: ['isbn', 'isbn13', 'isbn-13', 'isbn_13'] },
    isbn10: { type: 'rich_text', priority: 2, keywords: ['isbn10', 'isbn-10'] },
    description: { type: 'rich_text', priority: 1, keywords: ['description', 'summary', 'synopsis', 'about'] },
    categories: { type: 'multi_select', priority: 1, keywords: ['category', 'categories', 'genre', 'genres', 'subject', 'subjects'] },
    releaseDate: { type: 'date', priority: 1, keywords: ['published', 'date', 'publication', 'release', 'edition', 'original', 'first'] },
    publisher: { type: 'select', priority: 1, keywords: ['publisher', 'publishing', 'press'] },
    pageCount: { type: 'number', priority: 1, keywords: ['pages', 'page', 'count', 'length'] },
    thumbnail: { type: 'files', priority: 2, keywords: ['cover', 'image', 'thumbnail', 'picture'] },
    language: { type: 'select', priority: 2, keywords: ['language', 'lang'] },
    averageRating: { type: 'number', priority: 2, keywords: ['rating', 'score', 'stars'] },
    ratingsCount: { type: 'number', priority: 3, keywords: ['ratings', 'reviews', 'count'] },
    // Audiobook-specific fields
    audiobookPublisher: { type: 'select', priority: 2, keywords: ['audiobook', 'audio', 'publisher', 'audible'] },
    audiobookPublishedDate: { type: 'date', priority: 2, keywords: ['audiobook', 'audio', 'published', 'release', 'date'] },
    audiobookChapters: { type: 'number', priority: 2, keywords: ['chapters', 'chapter', 'parts', 'sections', 'audiobook'] },
    audiobookASIN: { type: 'rich_text', priority: 2, keywords: ['asin', 'amazon', 'audible', 'id', 'identifier'] },
    audiobookNarrators: { type: 'multi_select', priority: 2, keywords: ['narrator', 'narrators', 'voice', 'reader', 'audiobook'] },
    audiobookDuration: { type: 'rich_text', priority: 2, keywords: ['duration', 'length', 'time', 'runtime', 'hours', 'minutes', 'audiobook hours', 'audiobook (hours)'] },
    audiobookURL: { type: 'url', priority: 2, keywords: ['url', 'link', 'audible', 'audiobook', 'purchase'] },
    audiobookRating: { type: 'rich_text', priority: 2, keywords: ['rating', 'score', 'stars'] }
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
    'files': ['files', 'url', 'rich_text'],
    'checkbox': ['checkbox']
  };

  return compatibilityMap[googleType]?.includes(notionType) || false;
};

// Get user's Notion access token
const getNotionToken = async (req) => {
  // For personal use, try session first, then environment variable
  if (req.session.notionToken) {
    return req.session.notionToken;
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
      'Notion-Version': '2025-09-03',
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

// Helper function to discover data sources for a database
const getDataSourcesForDatabase = async (token, databaseId) => {
  try {
    // First, get the database to find its data sources
    const database = await notionRequest(token, 'GET', `/databases/${databaseId}`);

    // Extract data sources from the database response
    const dataSources = database.data_sources || [];

    // For each data source, get its detailed properties
    const dataSourcesWithDetails = await Promise.all(
      dataSources.map(async (ds) => {
        try {
          const dataSourceDetails = await notionRequest(token, 'GET', `/data_sources/${ds.id}`);
          return {
            id: ds.id,
            name: ds.name || dataSourceDetails.title?.[0]?.plain_text || 'Untitled',
            database_id: databaseId,
            database_parent: dataSourceDetails.database_parent,
            properties: Object.keys(dataSourceDetails.properties || {}),
            created_time: dataSourceDetails.created_time,
            last_edited_time: dataSourceDetails.last_edited_time
          };
        } catch (error) {
          console.warn(`Failed to fetch details for data source ${ds.id}:`, error.message);
          return {
            id: ds.id,
            name: ds.name || 'Untitled',
            database_id: databaseId,
            properties: [],
            created_time: null,
            last_edited_time: null
          };
        }
      })
    );

    return dataSourcesWithDetails;
  } catch (error) {
    console.error(`Error getting data sources for database ${databaseId}:`, error.message);
    return [];
  }
};

// Get list of user's databases and their data sources
router.get('/databases', requireAuth, async (req, res) => {
  try {
    const token = await getNotionToken(req);

    // First, search for databases (not data sources) to get the parent databases
    console.log('Searching for databases with 2025-09-03 API...');
    let databasesResponse;
    try {
      databasesResponse = await notionRequest(token, 'POST', '/search', {
        filter: {
          value: 'database',
          property: 'object'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });
      console.log('Found', databasesResponse.results?.length, 'databases');
    } catch (searchError) {
      console.log('Database search with new API failed, trying fallback approach:', searchError.response?.data);
      // Fallback: search without specific filter (get all objects and filter client-side)
      try {
        const allResults = await notionRequest(token, 'POST', '/search', {
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          }
        });
        databasesResponse = {
          results: allResults.results.filter(item => item.object === 'database')
        };
        console.log('Fallback search found', databasesResponse.results?.length, 'databases');
      } catch (fallbackError) {
        console.error('Both database search approaches failed:', fallbackError.response?.data);
        throw fallbackError;
      }
    }

    // For each database, get its data sources
    const databasesWithDataSources = await Promise.all(
      databasesResponse.results.map(async (db) => {
        const dataSources = await getDataSourcesForDatabase(token, db.id);

        return {
          id: db.id,
          title: db.title?.[0]?.plain_text || 'Untitled',
          url: db.url,
          created_time: db.created_time,
          last_edited_time: db.last_edited_time,
          data_sources: dataSources,
          // For backward compatibility, include the first data source's properties
          properties: dataSources.length > 0 ? dataSources[0].properties : []
        };
      })
    );

    // Also search for data sources directly for compatibility
    console.log('Searching for data sources with 2025-09-03 API...');
    let dataSourcesResponse;
    try {
      dataSourcesResponse = await notionRequest(token, 'POST', '/search', {
        filter: {
          value: 'data_source',
          property: 'object'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });
      console.log('Found', dataSourcesResponse.results?.length, 'data sources');
    } catch (searchError) {
      console.log('Data source search with new API failed, trying fallback:', searchError.response?.data);
      // Fallback: search all objects and filter for data sources
      try {
        const allResults = await notionRequest(token, 'POST', '/search', {
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          }
        });
        dataSourcesResponse = {
          results: allResults.results.filter(item => item.object === 'data_source')
        };
        console.log('Fallback search found', dataSourcesResponse.results?.length, 'data sources');
      } catch (fallbackError) {
        console.log('Data source search failed completely, continuing without standalone data sources');
        dataSourcesResponse = { results: [] };
      }
    }

    // Format data sources as databases for frontend compatibility
    const standaloneDataSources = dataSourcesResponse.results.map(ds => ({
      id: ds.id,
      title: ds.title?.[0]?.plain_text || 'Untitled',
      url: ds.url,
      created_time: ds.created_time,
      last_edited_time: ds.last_edited_time,
      data_sources: [{
        id: ds.id,
        name: ds.title?.[0]?.plain_text || 'Untitled',
        properties: Object.keys(ds.properties || {})
      }],
      properties: Object.keys(ds.properties || {}),
      is_data_source: true // Flag to identify these as standalone data sources
    }));

    // Combine databases with their data sources and standalone data sources
    const allDatabases = [...databasesWithDataSources, ...standaloneDataSources];

    res.json({ databases: allDatabases });

  } catch (error) {
    console.error('Error fetching databases:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: error.stack
    });

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }

    // Return more detailed error information for debugging
    res.status(500).json({
      error: 'Failed to fetch databases',
      details: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});

// Get database schema/properties - now supports both databases and data sources
router.get('/database/:databaseId/properties', requireAuth, async (req, res) => {
  try {
    const { databaseId } = req.params;
    const token = await getNotionToken(req);
    const { data_source_id } = req.query; // Optional: specific data source ID

    let database, properties, dataSourceId, title;

    try {
      // Try to get as database first
      database = await notionRequest(token, 'GET', `/databases/${databaseId}`);

      if (data_source_id) {
        // User specified a specific data source
        const dataSource = await notionRequest(token, 'GET', `/data_sources/${data_source_id}`);
        properties = Object.entries(dataSource.properties || {}).map(([name, prop]) => ({
          name,
          type: prop.type,
          id: prop.id,
          config: prop[prop.type] || {}
        }));
        dataSourceId = data_source_id;
        title = dataSource.title?.[0]?.plain_text || 'Untitled';
      } else if (database.data_sources && database.data_sources.length > 0) {
        // Get the first data source (for compatibility)
        const firstDataSourceId = database.data_sources[0].id;
        const dataSource = await notionRequest(token, 'GET', `/data_sources/${firstDataSourceId}`);
        properties = Object.entries(dataSource.properties || {}).map(([name, prop]) => ({
          name,
          type: prop.type,
          id: prop.id,
          config: prop[prop.type] || {}
        }));
        dataSourceId = firstDataSourceId;
        title = database.title?.[0]?.plain_text || 'Untitled';
      } else {
        // Fallback to database properties (older databases without data sources)
        properties = Object.entries(database.properties || {}).map(([name, prop]) => ({
          name,
          type: prop.type,
          id: prop.id,
          config: prop[prop.type] || {}
        }));
        title = database.title?.[0]?.plain_text || 'Untitled';
      }
    } catch (dbError) {
      // If database fetch failed, try as data source directly
      try {
        const dataSource = await notionRequest(token, 'GET', `/data_sources/${databaseId}`);
        properties = Object.entries(dataSource.properties || {}).map(([name, prop]) => ({
          name,
          type: prop.type,
          id: prop.id,
          config: prop[prop.type] || {}
        }));
        dataSourceId = databaseId;
        title = dataSource.title?.[0]?.plain_text || 'Untitled';
      } catch (dsError) {
        throw dbError; // Throw the original database error
      }
    }

    // Generate suggested field mappings
    const suggestedMappings = generateFieldMappings(properties);

    res.json({
      id: database?.id || databaseId,
      data_source_id: dataSourceId,
      title,
      properties,
      suggestedMappings,
      url: database?.url,
      data_sources: database?.data_sources || []
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

// Helper function to resolve data source ID from database ID
const resolveDataSourceId = async (token, databaseId, dataSourceId = null) => {
  if (dataSourceId) {
    return dataSourceId;
  }

  try {
    // Try to get database and find its first data source
    const database = await notionRequest(token, 'GET', `/databases/${databaseId}`);
    if (database.data_sources && database.data_sources.length > 0) {
      console.log(`Found ${database.data_sources.length} data sources for database ${databaseId}`);
      return database.data_sources[0].id;
    }
    // If no data sources, use database ID (for backward compatibility with old databases)
    console.log(`No data sources found for database ${databaseId}, using database ID for backward compatibility`);
    return databaseId;
  } catch (error) {
    // If database fetch fails, assume the ID is already a data source ID
    console.log(`Failed to fetch database ${databaseId}, assuming it's already a data source ID:`, error.message);
    return databaseId;
  }
};

// Create a new page in a Notion database
router.post('/pages', requireAuth, async (req, res) => {
  try {
    const { databaseId, dataSourceId, properties, children } = req.body;

    if (!databaseId || !properties) {
      return res.status(400).json({ error: 'Database ID and properties are required' });
    }

    const token = await getNotionToken(req);

    // Resolve the correct data source ID
    const resolvedDataSourceId = await resolveDataSourceId(token, databaseId, dataSourceId);

    let pageData = {
      parent: {
        type: 'data_source_id',
        data_source_id: resolvedDataSourceId
      },
      properties
    };

    if (children && children.length > 0) {
      pageData.children = children;
    }

    console.log('Creating page with data source parent:', {
      original_database_id: databaseId,
      resolved_data_source_id: resolvedDataSourceId,
      parent: pageData.parent
    });

    let response;
    try {
      response = await notionRequest(token, 'POST', '/pages', pageData);
    } catch (error) {
      // If data source approach fails, fall back to database approach for backward compatibility
      if (error.response?.status === 400 && resolvedDataSourceId !== databaseId) {
        console.log('Data source approach failed, trying database approach for backward compatibility');
        pageData.parent = {
          type: 'database_id',
          database_id: databaseId
        };
        response = await notionRequest(token, 'POST', '/pages', pageData);
      } else {
        throw error;
      }
    }

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

  // Get data source schema to understand property types
  let dataSourceSchema = null;
  try {
    // Try to resolve data source ID first
    const resolvedDataSourceId = await resolveDataSourceId(token, databaseId);
    try {
      dataSourceSchema = await notionRequest(token, 'GET', `/data_sources/${resolvedDataSourceId}`);
      console.log('Available data source properties:', Object.keys(dataSourceSchema?.properties || {}));
    } catch (dsError) {
      // Fallback to database for backward compatibility
      dataSourceSchema = await notionRequest(token, 'GET', `/databases/${databaseId}`);
      console.log('Available database properties (fallback):', Object.keys(dataSourceSchema?.properties || {}));
    }
  } catch (error) {
    console.error('Failed to fetch database/data source schema:', error);
    // Fall back to basic formatting without type checking
  }

  // Helper function to get property type from data source schema
  const getPropertyType = (propertyName) => {
    if (!dataSourceSchema?.properties) return null;
    const property = dataSourceSchema.properties[propertyName];
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
            name: String(option)
              .replace(/,/g, ' -') // Replace commas with dashes
              .substring(0, 100) // Notion option name limit
              .trim()
          }))
        };

      case 'select':
        return {
          select: {
            name: String(Array.isArray(value) ? value[0] : value)
              .replace(/,/g, ' -') // Replace commas with dashes
              .substring(0, 100)
              .trim()
          }
        };

      case 'number':
        const numValue = parseFloat(value);
        return isNaN(numValue) ? null : { number: numValue };

      case 'date':
        // ⚠️ CRITICAL: ALWAYS USE ACTUAL FOUND DATES - DO NOT REMOVE THIS LOGIC
        // Users report seeing "Jan 1" fallbacks when real dates exist
        // This logic ensures we preserve any actual date data we have
        let dateValue = value;
        console.log(`📅 Processing date field "${propertyName}":`, {
          originalValue: value,
          valueType: typeof value
        });
        
        if (typeof value === 'string' && value.trim()) {
          // Check if it's already in YYYY-MM-DD format
          if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
            // Already in correct format, use as-is
            dateValue = value.trim();
            console.log(`📅 Date already in YYYY-MM-DD format for "${propertyName}":`, dateValue);
          } else {
            // ⚠️ CRITICAL: Try multiple date parsing strategies before falling back to Jan 1st
            let parsedSuccessfully = false;
            
            // Strategy 1: Try direct Date parsing
            const parsedDate = new Date(value);
            console.log(`📅 Parsed date for "${propertyName}":`, {
              originalString: value,
              parsedDate: parsedDate,
              isValidDate: !isNaN(parsedDate.getTime()),
              isoString: !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : 'invalid'
            });
            
            if (!isNaN(parsedDate.getTime())) {
              // To avoid timezone issues, if the original string was in YYYY-MM-DD format
              // or looks like a date, extract the date components directly
              const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (isoMatch) {
                dateValue = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
              } else {
                dateValue = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              }
              parsedSuccessfully = true;
            } else {
              // Strategy 2: Try parsing various formats manually before giving up
              // Format: "MM/DD/YYYY" or "MM-DD-YYYY"
              const mdyMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
              if (mdyMatch) {
                const month = mdyMatch[1].padStart(2, '0');
                const day = mdyMatch[2].padStart(2, '0');
                const year = mdyMatch[3];
                dateValue = `${year}-${month}-${day}`;
                parsedSuccessfully = true;
                console.log(`📅 Parsed M/D/Y format for "${propertyName}":`, dateValue);
              }
              
              // Format: "DD/MM/YYYY" or "DD-MM-YYYY" (try if M/D/Y didn't work)
              if (!parsedSuccessfully) {
                const dmyMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                if (dmyMatch) {
                  const day = dmyMatch[1].padStart(2, '0');
                  const month = dmyMatch[2].padStart(2, '0');
                  const year = dmyMatch[3];
                  // Only use if day > 12 (impossible month) or month <= 12
                  if (parseInt(day) > 12 || parseInt(month) <= 12) {
                    dateValue = `${year}-${month}-${day}`;
                    parsedSuccessfully = true;
                    console.log(`📅 Parsed D/M/Y format for "${propertyName}":`, dateValue);
                  }
                }
              }
              
              // Format: "YYYY" only - extract full year if available
              if (!parsedSuccessfully) {
                const yearOnlyMatch = value.match(/^\d{4}$/);
                if (yearOnlyMatch) {
                  dateValue = `${yearOnlyMatch[0]}-01-01`;
                  parsedSuccessfully = true;
                  console.log(`📅 Year-only format for "${propertyName}":`, dateValue);
                }
              }
              
              // ⚠️ ONLY FALL BACK TO JAN 1ST AS LAST RESORT
              // And only if we found at least a 4-digit year in the string
              if (!parsedSuccessfully) {
                const yearMatch = value.match(/\d{4}/);
                if (yearMatch) {
                  console.log(`📅 FALLBACK: Date parsing failed for "${value}", using year ${yearMatch[0]} with January 1st`);
                  dateValue = `${yearMatch[0]}-01-01`;
                } else {
                  // No year found at all, skip this date
                  console.log(`📅 ERROR: No valid date or year found in "${value}", skipping date field`);
                  return null;
                }
              }
            }
          }
        }
        
        console.log(`📅 Final date value for "${propertyName}":`, dateValue);
        
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
          // Format as external file with image extension to help Notion recognize it as an image
          // Add timestamp to prevent caching issues and ensure each upload is treated as unique
          const timestamp = Date.now();
          const fileName = `book_cover_${timestamp}.jpg`;
          
          return {
            files: [
              {
                type: 'external',
                name: fileName,
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
    originalPublishedDate: bookData.originalPublishedDate,
    // Consolidated releaseDate field (maps to the selected publishedDate from frontend)
    releaseDate: bookData.publishedDate,
    publisher: bookData.publisher,
    pageCount: bookData.pageCount,
    thumbnail: bookData.thumbnail,
    rating: bookData.averageRating,
    language: bookData.language,
    ratingsCount: bookData.ratingsCount,
    // Audiobook-specific fields
    audiobookPublisher: bookData.audiobookData?.publisher,
    audiobookPublishedDate: bookData.audiobookData?.publishedDate,
    audiobookChapters: bookData.audiobookData?.chapters || bookData.audiobookData?.chapterCount,
    audiobookASIN: bookData.audiobookData?.asin,
    audiobookNarrators: bookData.audiobookData?.narrators,
    audiobookDuration: (() => {
      // Format duration from totalDurationHours if available
      if (bookData.audiobookData?.totalDurationHours) {
        return bookData.audiobookData.totalDurationHours < 1 
          ? `${Math.round(bookData.audiobookData.totalDurationHours * 60)} min`
          : `${bookData.audiobookData.totalDurationHours.toFixed(1)} hrs`;
      }
      return bookData.audiobookData?.duration || null;
    })(),
    audiobookURL: bookData.audiobookData?.audibleUrl,
    audiobookRating: (() => {
      if (bookData.audiobookData?.rating) {
        return bookData.audiobookData.ratingCount 
          ? `${bookData.audiobookData.rating}/5 (${bookData.audiobookData.ratingCount} reviews)`
          : `${bookData.audiobookData.rating}/5`;
      }
      return null;
    })()
  };

  console.log('Book data received:', {
    title: bookData.title,
    publishedDate: bookData.publishedDate,
    editionPublishedDate: bookData.editionPublishedDate,
    originalPublishedDate: bookData.originalPublishedDate,
    thumbnail: bookData.thumbnail,
    thumbnailLength: bookData.thumbnail ? bookData.thumbnail.length : 'null',
    thumbnailType: typeof bookData.thumbnail
  });

  // ⚠️ CRITICAL DEBUGGING: Trace exactly what date values we received
  console.log('🔍 DEBUGGING: Complete book data received for date processing:', {
    title: bookData.title,
    fullBookData: {
      publishedDate: bookData.publishedDate,
      originalPublishedDate: bookData.originalPublishedDate,
      editionPublishedDate: bookData.editionPublishedDate,
      audiobookPublishedDate: bookData.audiobookData?.publishedDate
    },
    dataTypes: {
      publishedDate: typeof bookData.publishedDate,
      originalPublishedDate: typeof bookData.originalPublishedDate,
      editionPublishedDate: typeof bookData.editionPublishedDate,
      audiobookPublishedDate: typeof bookData.audiobookData?.publishedDate
    },
    stringLengths: {
      publishedDate: bookData.publishedDate ? String(bookData.publishedDate).length : 'null',
      originalPublishedDate: bookData.originalPublishedDate ? String(bookData.originalPublishedDate).length : 'null',
      editionPublishedDate: bookData.editionPublishedDate ? String(bookData.editionPublishedDate).length : 'null',
      audiobookPublishedDate: bookData.audiobookData?.publishedDate ? String(bookData.audiobookData.publishedDate).length : 'null'
    },
    note: 'Frontend claims it has "Dec 31, 2022" but we may be receiving just "2023"'
  });

  // Process each field mapping with priority handling
  // First pass: collect all mappings and identify conflicts
  const mappingPriority = {
    isbn13: 1,
    isbn: 2,
    isbn10: 3
  };

  // Dynamic priority for date fields based on completeness
  const getDatePriority = (bookField, value) => {
    if (!value) return 999;
    
    // Check if it's a complete date (YYYY-MM-DD format or contains more than just year)
    const isCompleteDate = typeof value === 'string' && 
      (value.length > 4 || value.includes('-') || value.includes('/'));
    
    if (bookField === 'originalPublishedDate') {
      return isCompleteDate ? 1 : 3; // Complete original date gets priority 1, year-only gets 3
    } else if (bookField === 'publishedDate') {
      return isCompleteDate ? 2 : 4; // Complete edition date gets priority 2, year-only gets 4
    } else if (bookField === 'releaseDate') {
      return isCompleteDate ? 1 : 2; // Consolidated releaseDate gets high priority since it's user-selected
    }
    
    return 999;
  };

  const propertyMappings = new Map();
  
  // Collect all mappings
  for (const [bookField, notionPropertyName] of Object.entries(fieldMappings)) {
    // Improved filtering for "Don't map" values
    if (!notionPropertyName || 
        notionPropertyName === '' || 
        notionPropertyName === 'Don\'t map' ||
        notionPropertyName === 'undefined' ||
        notionPropertyName === 'null' ||
        !bookFieldMap[bookField]) {
      console.log(`⏭️ Skipping field "${bookField}" - mapping value: "${notionPropertyName}", has book data: ${!!bookFieldMap[bookField]}`);
      continue;
    }

    const propertyType = getPropertyType(notionPropertyName);
    
    // Skip if property doesn't exist in the data source
    if (!propertyType && dataSourceSchema?.properties) {
      console.warn(`Property "${notionPropertyName}" does not exist in data source. Skipping field "${bookField}".`);
      continue;
    }

    // Check if this property is already mapped
    const existing = propertyMappings.get(notionPropertyName);
    const currentPriority = bookField.includes('Date') ? 
      getDatePriority(bookField, bookFieldMap[bookField]) : 
      (mappingPriority[bookField] || 999);
    const existingPriority = existing ? 
      (existing.bookField.includes('Date') ? 
        getDatePriority(existing.bookField, existing.value) : 
        (mappingPriority[existing.bookField] || 999)) : 999;

    // Use higher priority mapping (lower number = higher priority)
    if (!existing || currentPriority < existingPriority) {
      if (existing) {
        console.log(`🔄 Overriding mapping for "${notionPropertyName}": ${existing.bookField} (priority ${existingPriority}) → ${bookField} (priority ${currentPriority})`);
      }
      propertyMappings.set(notionPropertyName, {
        bookField,
        value: bookFieldMap[bookField],
        propertyType
      });
    }
  }

  // Second pass: apply the final mappings
  for (const [notionPropertyName, mapping] of propertyMappings) {
    const formattedValue = formatPropertyValue(mapping.value, mapping.propertyType, notionPropertyName);

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
    
    // Resolve the correct data source ID
    const resolvedDataSourceId = await resolveDataSourceId(token, databaseId, req.body.dataSourceId);

    let pageData = {
      parent: {
        type: 'data_source_id',
        data_source_id: resolvedDataSourceId
      },
      properties
    };

    // Add page icon if enabled and thumbnail is available
    if (fieldMappings?.pageIcon && bookData.thumbnail) {
      console.log('Using thumbnail as page icon:', bookData.thumbnail);
      pageData.icon = {
        type: 'external',
        external: {
          url: bookData.thumbnail
        }
      };
    }

    console.log('Field mappings received:', JSON.stringify(fieldMappings, null, 2));
    console.log('🔍 DETAILED FIELD MAPPING DEBUG:', {
      receivedFieldMappings: fieldMappings,
      publishedDateMapping: fieldMappings?.publishedDate,
      originalPublishedDateMapping: fieldMappings?.originalPublishedDate,
      audiobookPublishedDateMapping: fieldMappings?.audiobookPublishedDate,
      releaseDateMapping: fieldMappings?.releaseDate, // New consolidated mapping
      allMappingKeys: Object.keys(fieldMappings || {}),
      allMappingValues: Object.values(fieldMappings || {}),
      problematicMappings: Object.entries(fieldMappings || {}).filter(([key, value]) =>
        value === 'Published' || (typeof value === 'string' && value.includes('Published'))
      )
    });
    console.log('Creating Notion page with data:', JSON.stringify(pageData, null, 2));

    let response;
    try {
      response = await notionRequest(token, 'POST', '/pages', pageData);
    } catch (error) {
      // If data source approach fails, fall back to database approach for backward compatibility
      if (error.response?.status === 400 && resolvedDataSourceId !== databaseId) {
        console.log('Data source approach failed for book creation, trying database approach for backward compatibility');
        pageData.parent = {
          type: 'database_id',
          database_id: databaseId
        };
        response = await notionRequest(token, 'POST', '/pages', pageData);
      } else {
        throw error;
      }
    }
    
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

// Update an existing book page with formatted properties
router.patch('/pages/:pageId/book', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { databaseId, bookData, fieldMappings } = req.body;
    
    if (!pageId || !databaseId || !bookData) {
      return res.status(400).json({ error: 'Page ID, database ID and book data are required' });
    }

    const token = await getNotionToken(req);
    
    // Format book data with proper type checking (same as create)
    const properties = await formatBookDataForNotion(bookData, fieldMappings, databaseId, token);
    
    console.log('Updating book page with data:', JSON.stringify({ pageId, properties }, null, 2));

    const response = await notionRequest(token, 'PATCH', `/pages/${pageId}`, {
      properties
    });
    
    res.json({
      id: response.id,
      url: response.url,
      last_edited_time: response.last_edited_time,
      properties: response.properties,
      bookData
    });

  } catch (error) {
    console.error('Error updating book page:', error);
    
    if (error.response?.status === 400) {
      console.error('Notion API validation error:', error.response.data);
      return res.status(400).json({ 
        error: 'Invalid book data or field mappings',
        details: error.response.data
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Page not found or access denied' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    res.status(500).json({ error: 'Failed to update book page' });
  }
});

// Search for existing books in a database
router.post('/database/:databaseId/search', requireAuth, async (req, res) => {
  try {
    console.log('Search request received:', {
      databaseId: req.params.databaseId,
      body: req.body,
      isbn: req.body?.isbn,
      title: req.body?.title,
      fieldMappings: req.body?.fieldMappings ? 'Present' : 'Missing'
    });

    const { databaseId } = req.params;
    const { isbn, title, fieldMappings } = req.body;
    
    if (!isbn && !title) {
      console.log('Validation failed: No ISBN or title provided');
      return res.status(400).json({ error: 'Either ISBN or title is required for search' });
    }

    const token = await getNotionToken(req);
    
    // Use field mappings directly (no need to parse since it's already an object)
    const mappings = fieldMappings || {};

    // Get data source properties to find available fields
    const resolvedDataSourceId = await resolveDataSourceId(token, databaseId);
    let dataSource;
    try {
      dataSource = await notionRequest(token, 'GET', `/data_sources/${resolvedDataSourceId}`);
    } catch (error) {
      // Fallback to database for backward compatibility
      dataSource = await notionRequest(token, 'GET', `/databases/${databaseId}`);
    }
    const availableProperties = Object.keys(dataSource.properties || {});
    
    // Determine which properties to search
    const titleProperty = mappings.title || 'Title';
    const isbnProperty = mappings.isbn || 'ISBN';
    
    // Build search filter only for properties that exist
    const filter = {
      or: []
    };

    if (isbn && availableProperties.includes(isbnProperty)) {
      const isbnProp = dataSource.properties[isbnProperty];
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
      const titleProp = dataSource.properties[titleProperty];
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

    let response;
    try {
      response = await notionRequest(token, 'POST', `/data_sources/${resolvedDataSourceId}/query`, searchData);
    } catch (error) {
      // If data source query fails, fall back to database query for backward compatibility
      if (error.response?.status === 404 && resolvedDataSourceId !== databaseId) {
        console.log('Data source query failed, trying database query for backward compatibility');
        response = await notionRequest(token, 'POST', `/databases/${databaseId}/query`, searchData);
      } else {
        throw error;
      }
    }
    
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Database not found or access denied' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Notion access token invalid or expired' });
    }
    
    // Return the actual error for debugging
    res.status(500).json({ 
      error: 'Failed to search database',
      details: error.message,
      notionError: error.response?.data
    });
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