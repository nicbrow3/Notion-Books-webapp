/**
 * CORS middleware for Vercel functions
 */
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  // In development we accept any localhost or loopback origin
  else if (isDevelopment) {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  // Production whitelist
  else {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      `https://localhost:${process.env.PORT || 3001}`,
      // Allow common LAN IP ranges
      ...(origin.match(/^https?:\/\/(192\.168\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.|10\.)/i) ? [origin] : []),
      // Allow any other localhost variants
      ...(origin.includes('localhost') || origin.includes('127.0.0.1') ? [origin] : [])
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With, Content-Type, Authorization, Cookie'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (next) next();
};

module.exports = { corsMiddleware };