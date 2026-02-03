const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

const pool = require('../config/database');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { getTracer } = require('../observability/tracing');
const { SpanStatusCode } = require('@opentelemetry/api');

const tracer = getTracer();

const router = express.Router();

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  role: z.enum(['user','admin']).optional(),
});

// Admin only: create a user with optional role
router.post('/users', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const requestId = req.id || req.headers['x-request-id'];

    return tracer.startActiveSpan(
      'user.create',
      {
        attributes: {
          'http.request_id': String(requestId || ''),
          'app.user_id': String(req.user?.id || ''),
          'app.role': String(req.user?.role || ''),
        },
      },
      async (span) => {
        try {
    const { email, password, role } = createUserSchema.parse(req.body);

    const passwordHash = await bcrypt.hash(password, 12);

    const insert = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [email, email, passwordHash, role || 'user']
    );

          req.log.info({ event: 'user.create', createdUserId: insert.rows[0].id, by: req.user.id }, 'user created');
          span.setAttribute('user.created_id', String(insert.rows[0].id));
          span.setAttribute('user.result', 'success');
          return res.status(201).json({ success: true, user: insert.rows[0] });
        } catch (err) {
          span.recordException(err);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw err;
        } finally {
          span.end();
        }
      }
    );
  } catch (err) {
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'User already exists' });
    }
    return next(err);
  }
});

module.exports = router;
