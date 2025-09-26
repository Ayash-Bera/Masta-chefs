const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const kycRoutes = require('./routes/kyc');
const stealthKycRoutes = require('./routes/stealthKyc');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// Security Middleware
// ========================================

// Helmet for security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://alfajores-forno.celo-testnet.org", "https://forno.celo.org"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const kycLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_KYC_MAX_REQUESTS) || 10,
  message: {
    error: 'Too many KYC requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// ========================================
// General Middleware
// ========================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request ID for tracing
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ========================================
// Health Check Routes
// ========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    requestId: req.requestId,
  });
});

app.get('/health/detailed', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    requestId: req.requestId,
    environment: process.env.NODE_ENV || 'development',
    celo: {
      network: process.env.CELO_NETWORK || 'alfajores',
      contractAddress: process.env.SELFKYC_CONTRACT_ADDRESS_ALFAJORES || 'not_deployed',
    },
    self: {
      endpoint: process.env.SELF_API_ENDPOINT || 'https://staging-api.self.xyz',
      scope: process.env.SELF_APP_SCOPE || 'your-app-kyc-v1',
    },
  });
});

// ========================================
// API Routes
// ========================================

// Apply KYC-specific rate limiting to KYC routes
app.use('/api/kyc', kycLimiter);
app.use('/api/kyc', kycRoutes);

// Apply rate limiting to stealth KYC routes
app.use('/api/stealth-kyc', kycLimiter);
app.use('/api/stealth-kyc', stealthKycRoutes);

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Self.xyz Onchain KYC API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    endpoints: {
      health: '/health',
      kyc: '/api/kyc',
      stealthKyc: '/api/stealth-kyc',
    },
  });
});

// ========================================
// Error Handling
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    requestId: req.requestId,
  });
});

// Global error handler
app.use(errorHandler);

// ========================================
// Database Connection
// ========================================

const connectDB = require('./config/database');

// ========================================
// Server Startup
// ========================================

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Validate required environment variables
    const requiredEnvVars = [
      'CELO_PRIVATE_KEY',
      'SELF_APP_SCOPE',
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      console.warn('⚠️  Warning: Missing environment variables:', missingEnvVars.join(', '));
      console.warn('⚠️  Some features may not work correctly. Please check your .env file.');
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log('🚀 Self.xyz Onchain KYC Backend Server Started');
      console.log('==========================================');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Celo Network: ${process.env.CELO_NETWORK || 'alfajores'}`);
      console.log(`🔐 Self.xyz Scope: ${process.env.SELF_APP_SCOPE || 'your-app-kyc-v1'}`);
      console.log(`📋 API Base URL: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log('==========================================');

      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Development Mode - Additional Logging Enabled');
        console.log('🔧 Missing env vars (if any) are listed above');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;