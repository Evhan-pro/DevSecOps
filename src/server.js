require('dotenv').config();

// Tracing must be initialized before importing the rest (auto-instrumentations)
const { initTracing } = require('./observability/tracing');
initTracing();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const { pinoHttp } = require('pino-http');
const { randomUUID } = require('crypto');

const { metricsMiddleware, metricsEndpointHandler } = require('./observability/metrics');
const logger = require('./observability/logger');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// ------------------------
// Security by Default
// ------------------------

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // API-only; laisse CSP à un front reverse-proxy si besoin
  })
);

// CORS restrictif (par défaut : rien)
const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function origin(origin, cb) {
      // Autorise les appels sans origin (curl, server-to-server)
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(new Error('CORS blocked'), false);
      return cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging + requestId
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = req.headers['x-request-id'] || randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: function (res, err) {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// Metrics (Prometheus)
app.use(metricsMiddleware);

// ------------------------
// Bootstrap uploads dir (local demo)
// ------------------------
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, 'photo.jpg'), 'fake image content');
  fs.writeFileSync(path.join(uploadsDir, 'document.pdf'), 'fake pdf content');
}

// ------------------------
// Routes
// ------------------------
const authRouter = require('./auth/routes');
const filesRouter = require('./api/files');
const usersRouter = require('./api/users');

app.get('/', (req, res) => {
  res.json({
    message: 'API DevSecOps - Version sécurisée',
    endpoints: [
      { method: 'POST', path: '/api/auth/register' },
      { method: 'POST', path: '/api/auth/login' },
      { method: 'GET', path: '/api/auth/me' },
      { method: 'GET', path: '/api/files?name=photo.jpg' },
      { method: 'POST', path: '/api/users (admin only)' },
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/metrics' },
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api', filesRouter);
app.use('/api', usersRouter);

app.get('/metrics', metricsEndpointHandler);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler (no stack leakage)
app.use((err, req, res, _next) => {
  const status = Number(err.statusCode || err.status || 500);
  const code = err.code || 'INTERNAL_ERROR';

  // Log full error server-side
  req.log.error({ err, code }, 'request failed');

  const isDev = process.env.NODE_ENV === 'development';
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    code,
    ...(isDev ? { stack: err.stack } : {}),
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'server started');
  });
}

module.exports = app;
