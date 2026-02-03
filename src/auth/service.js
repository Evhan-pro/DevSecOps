const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { SpanStatusCode } = require('@opentelemetry/api');

const pool = require('../config/database');
const { metrics } = require('../observability/metrics');
const { getTracer } = require('../observability/tracing');

const tracer = getTracer();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('FATAL: JWT_SECRET is missing. Refusing to continue.');
    process.exit(1);
  }
}

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
});

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  // role non exposé au registre public
});

function signAccessToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn }
  );
}

async function login(req, res, next) {
  const endTimer = metrics.authLoginDurationMs.startTimer();
  metrics.authLoginAttemptTotal.inc({ result: 'attempt' });

  const requestId = req.id || req.headers['x-request-id'];

  return tracer.startActiveSpan(
    'auth.login',
    {
      attributes: {
        'http.request_id': String(requestId || ''),
      },
    },
    async (span) => {
      try {
        const { username, password } = loginSchema.parse(req.body);
        span.setAttribute('enduser.id', username);

    const result = await pool.query('SELECT id, username, password, email, role FROM users WHERE username = $1', [
      username,
    ]);

    if (result.rows.length === 0) {
      metrics.authLoginAttemptTotal.inc({ result: 'failure' });
      endTimer();
      span.setAttribute('auth.result', 'failure');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      metrics.authLoginAttemptTotal.inc({ result: 'failure' });
      endTimer();
      span.setAttribute('auth.result', 'failure');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAccessToken(user);

    // Critical event log (no secrets)
    req.log.info({ event: 'auth.login', userId: user.id, username: user.username }, 'login success');
    metrics.authLoginAttemptTotal.inc({ result: 'success' });
    endTimer();
    span.setAttribute('auth.result', 'success');
    span.setAttribute('app.user_id', String(user.id));
    span.setAttribute('app.role', String(user.role));
    return res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
      } catch (err) {
        metrics.authLoginAttemptTotal.inc({ result: 'error' });
        endTimer();
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return next(err);
      } finally {
        span.end();
      }
    }
  );
}

async function register(req, res, next) {
  const endTimer = metrics.authRegisterDurationMs.startTimer();
  metrics.authRegisterAttemptTotal.inc({ result: 'attempt' });

  const requestId = req.id || req.headers['x-request-id'];

  return tracer.startActiveSpan(
    'auth.register',
    {
      attributes: {
        'http.request_id': String(requestId || ''),
      },
    },
    async (span) => {
      try {
        const { email, password } = registerSchema.parse(req.body);
        const username = email;
        span.setAttribute('enduser.id', username);

    const passwordHash = await bcrypt.hash(password, 12);

    const insert = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, passwordHash, 'user']
    );

    const user = insert.rows[0];
    const token = signAccessToken(user);

    req.log.info({ event: 'auth.register', userId: user.id, username: user.username }, 'register success');
    metrics.authRegisterAttemptTotal.inc({ result: 'success' });
    endTimer();
    span.setAttribute('auth.result', 'success');
    span.setAttribute('app.user_id', String(user.id));
    return res.status(201).json({ token, user });
      } catch (err) {
        // Duplicate key
        if (err && err.code === '23505') {
          metrics.authRegisterAttemptTotal.inc({ result: 'failure' });
          endTimer();
          span.setAttribute('auth.result', 'failure');
          return res.status(409).json({ error: 'User already exists' });
        }
        metrics.authRegisterAttemptTotal.inc({ result: 'error' });
        endTimer();
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return next(err);
      } finally {
        span.end();
      }
    }
  );
}

async function me(req, res) {
  // user comes from authenticate middleware
  res.json({ user: req.user });
}

module.exports = { login, register, me };
