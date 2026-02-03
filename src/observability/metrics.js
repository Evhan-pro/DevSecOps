const client = require('prom-client');

// Default Node.js process metrics
client.collectDefaultMetrics();

// Custom metrics for critical actions
const authLoginAttemptTotal = new client.Counter({
  name: 'auth_login_attempt_total',
  help: 'Total login attempts',
  labelNames: ['result'],
});

const authRegisterAttemptTotal = new client.Counter({
  name: 'auth_register_attempt_total',
  help: 'Total register attempts',
  labelNames: ['result'],
});

const fileDownloadTotal = new client.Counter({
  name: 'file_download_total',
  help: 'Total file downloads',
  labelNames: ['result'],
});

const authLoginDurationMs = new client.Histogram({
  name: 'auth_login_duration_ms',
  help: 'Login duration in ms',
  buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2000],
});

const authRegisterDurationMs = new client.Histogram({
  name: 'auth_register_duration_ms',
  help: 'Register duration in ms',
  buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2000],
});

const fileDownloadDurationMs = new client.Histogram({
  name: 'file_download_duration_ms',
  help: 'File download duration in ms',
  buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2000],
});

function metricsMiddleware(req, res, next) {
  // Simple request duration metric could be added here; keep minimal.
  next();
}

async function metricsEndpointHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = {
  metricsMiddleware,
  metricsEndpointHandler,
  metrics: {
    authLoginAttemptTotal,
    authRegisterAttemptTotal,
    fileDownloadTotal,
    authLoginDurationMs,
    authRegisterDurationMs,
    fileDownloadDurationMs,
  },
};
