// Dynamic API URL that works in both development and Docker environments
export const getApiBaseUrl = (): string => {
  // In browser, use current origin if it's the same server (Docker deployment)
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    // If we're on the same port as the backend, use current origin
    if (currentOrigin.includes(':3001')) {
      console.log('🔗 Using dynamic API URL:', currentOrigin);
      return currentOrigin;
    }
  }
  
  // Fallback to environment variable or localhost for development
  const fallbackUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  console.log('🔗 Using fallback API URL:', fallbackUrl);
  return fallbackUrl;
};

export const API_BASE_URL = getApiBaseUrl(); 