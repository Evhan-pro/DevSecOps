const pino = require('pino');

/**
 * Logger JSON prêt pour prod.
 * - Pas de données sensibles (password/token).
 * - Niveau configurable.
 */

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

module.exports = pino({
  level,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      'password',
      'token',
    ],
    remove: true,
  },
});
