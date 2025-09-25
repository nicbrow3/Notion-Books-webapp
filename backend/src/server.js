require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const notionRoutes = require('./routes/notion');
const userRoutes = require('./routes/user');

const app = express();
// Default to 3002 to avoid conflicts with other projects
const PORT = process.env.PORT || 3002;

// Rate limiting - more permissive in development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' 
    ? 10000 // Very high limit for development
    : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  crossOriginOpenerPolicy: false, // Disable COOP to avoid HTTPS requirement
  crossOriginEmbedderPolicy: false, // Disable COEP 
  contentSecurityPolicy: false, // Disable CSP for now to avoid conflicts
}));

// CORS configuration - allow localhost during development and configurable origins in production
const isDevelopment = (process.env.NODE_ENV || 'development') !== 'production';

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // In development we accept any localhost or loopback origin to simplify setup
    if (isDevelopment) {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Production whitelist (supports Docker and LAN deployments)
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      `http://localhost:${process.env.PORT || 3002}`,
      `https://localhost:${process.env.PORT || 3002}`,
      // Allow common LAN IP ranges
      ...(origin.match(/^https?:\/\/(192\.168\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.|10\.)/i) ? [origin] : []),
      // Allow any other localhost variants
      ...(origin.includes('localhost') || origin.includes('127.0.0.1') ? [origin] : [])
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
};

app.use(cors(corsOptions));

// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing for JWT tokens
app.use(cookieParser());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
}

// Routes
app.use('/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/notion', notionRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    storage: 'browser-local-storage'
  });
});

// Debug endpoint to check static files (only in production for troubleshooting)
app.get('/debug/files', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const staticPath = path.join(__dirname, '../../frontend/build');
    try {
      const files = fs.readdirSync(staticPath, { withFileTypes: true });
      const fileList = files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory()
      }));
      res.json({
        staticPath,
        files: fileList,
        indexExists: fs.existsSync(path.join(staticPath, 'index.html'))
      });
    } catch (error) {
      res.status(500).json({
        error: 'Could not read static files directory',
        staticPath,
        message: error.message
      });
    }
  } else {
    res.status(404).json({ error: 'Debug endpoint only available in production' });
  }
});

// Test route for debugging static file serving
app.get('/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../../frontend/build/test.html'));
  } else {
    res.status(404).json({ error: 'Test page only available in production' });
  }
});

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// 404 handler (only for non-production or API routes)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📱 Using browser local storage for data persistence`);
});

module.exports = app; 
