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

// Dynamic Multi-Origin CORS configuration (Cloudflare & Reverse Proxy Friendly)
const rawOrigins = env.CLIENT_URL || '';
const baseOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/['"]/g, '').replace(/\/$/, ''))
  .filter(Boolean);

const getHost = (urlStr) => {
  if (!urlStr) return '';
  try {
    const u = new URL(urlStr.includes('://') ? urlStr : `http://${urlStr}`);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return urlStr.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
  }
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (baseOrigins.includes('*')) return true;

  const reqHost = getHost(origin);

  // In development, automatically allow localhost & 127.0.0.1 on any port
  if (env.NODE_ENV === 'development') {
    if (reqHost === 'localhost' || reqHost === '127.0.0.1') {
      return true;
    }
  }

  return baseOrigins.some((allowed) => {
    if (allowed === '*') return true;
    return getHost(allowed) === reqHost;
  });
};

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
});

app.use(corsMiddleware);
app.options('*', corsMiddleware);

// CSRF / Origin Verification for State-Changing Requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer;
    if (origin && !baseOrigins.includes('*')) {
      if (!isOriginAllowed(origin)) {
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

