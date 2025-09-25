const { notionRequest, getNotionToken } = require('../../lib/notion');
const { AuthenticationError } = require('../../lib/errors');

/**
 * Helper functions from original notion.js router
 */

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

const formatDataSourceForFrontend = async (token, dataSource) => {
  try {
    const details = await notionRequest(token, 'GET', `/data_sources/${dataSource.id}`);
    const properties = details.properties || {};
    const title = details.title?.[0]?.plain_text || dataSource.title?.[0]?.plain_text || 'Untitled';
    const parentDatabaseId = details.database_parent?.database_id || null;

    return {
      id: details.id || dataSource.id,
      title,
      url: details.url || dataSource.url,
      created_time: details.created_time || dataSource.created_time,
      last_edited_time: details.last_edited_time || dataSource.last_edited_time,
      properties,
      is_data_source: true,
      parent_database_id: parentDatabaseId,
      data_sources: [
        {
          id: details.id || dataSource.id,
          name: title,
          database_id: parentDatabaseId,
          properties: Object.keys(properties),
        },
      ],
    };
  } catch (error) {
    console.warn(
      `formatDataSourceForFrontend: Failed to load details for data source ${dataSource.id}:`,
      error.message
    );

    const fallbackTitle = dataSource.title?.[0]?.plain_text || 'Untitled';
    const rawProperties = dataSource.properties || {};
    const propertyKeys = Array.isArray(rawProperties)
      ? rawProperties
      : rawProperties && typeof rawProperties === 'object'
        ? Object.keys(rawProperties)
        : [];

    return {
      id: dataSource.id,
      title: fallbackTitle,
      url: dataSource.url,
      created_time: dataSource.created_time,
      last_edited_time: dataSource.last_edited_time,
      properties: rawProperties,
      is_data_source: true,
      data_sources: [
        {
          id: dataSource.id,
          name: fallbackTitle,
          properties: propertyKeys,
        },
      ],
    };
  }
};

const fetchDataSourceDatabases = async (token) => {
  console.log('Searching for data sources with 2025-09-03 API...');
  try {
    const response = await notionRequest(token, 'POST', '/search', {
      filter: {
        value: 'data_source',
        property: 'object',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    const results = response.results || [];
    const dataSources = results.filter((item) => item.object === 'data_source');
    console.log('Found', dataSources.length, 'data sources');

    if (dataSources.length === 0) {
      return [];
    }

    const formatted = await Promise.all(
      dataSources.map((dataSource) => formatDataSourceForFrontend(token, dataSource))
    );

    const unique = new Map();
    formatted.forEach((entry) => {
      if (entry?.id) {
        unique.set(entry.id, entry);
      }
    });

    return Array.from(unique.values());
  } catch (error) {
    if (error.response?.status === 401) {
      throw error;
    }

    console.log('Data source search failed, will try legacy fallback:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    return [];
  }
};

const fetchLegacyDatabases = async (token) => {
  console.log('Attempting legacy Notion database search flow...');

  let databasesResponse;
  try {
    databasesResponse = await notionRequest(token, 'POST', '/search', {
      filter: {
        value: 'database',
        property: 'object',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });
    console.log('Legacy search found', databasesResponse.results?.length, 'databases');
  } catch (searchError) {
    if (searchError.response?.status === 400) {
      console.log('Legacy database filter not supported on this Notion API version.');
      return [];
    }

    console.log('Legacy database search failed, trying fallback approach:', searchError.response?.data);
    try {
      const allResults = await notionRequest(token, 'POST', '/search', {
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      });
      databasesResponse = {
        results: (allResults.results || []).filter((item) => item.object === 'database'),
      };
      console.log('Legacy fallback search found', databasesResponse.results?.length, 'databases');
    } catch (fallbackError) {
      console.error('Both legacy database search approaches failed:', fallbackError.response?.data);
      return [];
    }
  }

  const databaseResults = databasesResponse?.results || [];

  const databasesWithDataSources = await Promise.all(
    databaseResults.map(async (db) => {
      const dataSources = await getDataSourcesForDatabase(token, db.id);

      return {
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
        data_sources: dataSources,
        properties: dataSources.length > 0 ? dataSources[0].properties : [],
      };
    })
  );

  console.log('Searching for data sources with legacy flow...');
  let dataSourcesResponse;
  try {
    dataSourcesResponse = await notionRequest(token, 'POST', '/search', {
      filter: {
        value: 'data_source',
        property: 'object',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });
    console.log('Legacy flow found', dataSourcesResponse.results?.length, 'data sources');
  } catch (searchError) {
    console.log('Legacy data source search failed, trying fallback:', searchError.response?.data);
    try {
      const allResults = await notionRequest(token, 'POST', '/search', {
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      });
      dataSourcesResponse = {
        results: (allResults.results || []).filter((item) => item.object === 'data_source'),
      };
      console.log('Legacy fallback search found', dataSourcesResponse.results?.length, 'data sources');
    } catch (fallbackError) {
      console.log('Legacy data source search failed completely, continuing without standalone data sources');
      dataSourcesResponse = { results: [] };
    }
  }

  const standaloneDataSources = (dataSourcesResponse.results || []).map((ds) => ({
    id: ds.id,
    title: ds.title?.[0]?.plain_text || 'Untitled',
    url: ds.url,
    created_time: ds.created_time,
    last_edited_time: ds.last_edited_time,
    data_sources: [
      {
        id: ds.id,
        name: ds.title?.[0]?.plain_text || 'Untitled',
        properties: Object.keys(ds.properties || {}),
      },
    ],
    properties: Object.keys(ds.properties || {}),
    is_data_source: true,
  }));

  return [...databasesWithDataSources, ...standaloneDataSources];
};

/**
 * Get list of user's databases and their data sources
 * @param {Object} params - Request parameters
 * @param {Object} params.user - User data from auth token
 * @returns {Promise<Object>} Databases response
 */
const getDatabases = async ({ user }) => {
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }

  const token = getNotionToken(user);

  const dataSourceDatabases = await fetchDataSourceDatabases(token);
  if (dataSourceDatabases.length > 0) {
    return { databases: dataSourceDatabases };
  }

  const legacyDatabases = await fetchLegacyDatabases(token);
  if (legacyDatabases.length > 0) {
    return { databases: legacyDatabases };
  }

  return { databases: [] };
};

module.exports = {
  getDatabases
};