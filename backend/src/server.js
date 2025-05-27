require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const notionRoutes = require('./routes/notion');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
let pool = null;
let dbConnected = false;

try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Test database connection
  pool.connect((err, client, release) => {
    if (err) {
      console.warn('⚠️  Database connection failed:', err.message);
      console.log('🚀 Server will start without database (some features will be limited)');
      dbConnected = false;
    } else {
      console.log('✅ Connected to PostgreSQL database');
      dbConnected = true;
      release();
    }
  });
} catch (error) {
  console.warn('⚠️  Database setup failed:', error.message);
  console.log('🚀 Server will start without database (some features will be limited)');
}

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
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true
}));
// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Only use database session store if database is connected
if (pool && dbConnected) {
  sessionConfig.store = new pgSession({
    pool: pool,
    tableName: 'session'
  });
} else {
  console.log('💾 Using memory session store (sessions will not persist across restarts)');
}

app.use(session(sessionConfig));

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
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
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
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app; 