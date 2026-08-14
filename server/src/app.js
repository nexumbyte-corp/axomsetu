import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import routes, { healthCheckHandler } from './routes/index.js';
import { generalLimiter, authLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiError } from './utils/ApiError.js';

import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable Trust Proxy if specified or in production behind reverse proxies / load balancers
if (env.TRUST_PROXY || env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// High Performance Compression (Gzip / Deflate)
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Compress responses larger than 1KB
  })
);

// Security Middlewares with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Let custom CSP header or client handle scripts/assets cleanly
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cookie Parser Middleware
app.use(cookieParser(env.SESSION_SECRET));

// Dynamic Multi-Origin CORS configuration
const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy does not allow access from this origin.'));
    },
    credentials: true,
  })
);

// CSRF / Origin Verification for State-Changing Requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer;
    if (origin && !allowedOrigins.includes('*')) {
      const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));
      if (!isAllowed) {
        return next(ApiError.forbidden('Forbidden cross-origin request.'));
      }
    }
  }
  next();
});

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply Authentication Rate Limiter
app.use('/api/v1/auth', authLimiter);

// Direct Health Check Route Alias
app.get('/health', healthCheckHandler);

// Root Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AxomSetu Backend API',
    health: '/api/v1/health',
    version: 'v1',
  });
});

// API Base Route
app.use('/api/v1', routes);

// Serve Client static build in unified deployment mode if SERVE_CLIENT is set
if (env.SERVE_CLIENT) {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Handle 404
app.use((req, res, next) => {
  next(ApiError.notFound(`Cannot find ${req.originalUrl} on this server`));
});

// Centralized Global Error Handler
app.use(errorHandler);

export default app;

