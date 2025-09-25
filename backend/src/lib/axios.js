const axios = require('axios');

// Shared axios configuration
const createAxiosInstance = (baseURL, defaultHeaders = {}) => {
  return axios.create({
    baseURL,
    timeout: 30000, // 30 second timeout
    headers: defaultHeaders
  });
};

// Notion API instance
const createNotionAxios = (token) => {
  return createAxiosInstance('https://api.notion.com/v1', {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': '2025-09-03',
    'Content-Type': 'application/json'
  });
};

// Google Books API instance
const createGoogleBooksAxios = (apiKey) => {
  const instance = createAxiosInstance('https://www.googleapis.com/books/v1');

  // Add API key to all requests if provided
  if (apiKey) {
    instance.interceptors.request.use((config) => {
      config.params = config.params || {};
      config.params.key = apiKey;
      return config;
    });
  }

  return instance;
};

// Open Library API instance
const createOpenLibraryAxios = () => {
  return createAxiosInstance('https://openlibrary.org');
};

module.exports = {
  createAxiosInstance,
  createNotionAxios,
  createGoogleBooksAxios,
  createOpenLibraryAxios
};