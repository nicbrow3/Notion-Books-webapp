// Dynamic API URL that works in both development and Vercel deployment
export const getApiBaseUrl = (): string => {
  // In browser, check if we're running with Vercel (production or preview)
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;

    // If we're on Vercel domain or localhost with Vercel dev, use relative paths
    if (
      currentOrigin.includes('vercel.app') ||
      currentOrigin.includes('localhost') ||
      process.env.NODE_ENV === 'production'
    ) {
      console.log('🔗 Using relative API URLs for Vercel:', '');
      return ''; // Use relative paths for Vercel serverless functions
    }
  }

  // Fallback to environment variable for local development with separate backend
  const fallbackUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
  console.log('🔗 Using fallback API URL:', fallbackUrl);
  return fallbackUrl;
};

export const API_BASE_URL = getApiBaseUrl(); 
