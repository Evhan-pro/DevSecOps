const express = require('express');
const rateLimit = require('express-rate-limit');

const { authenticate } = require('../middlewares/authenticate');
const { login, register, me } = require('./service');

const router = express.Router();

// Rate limiting (Auth failures - brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 25),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, me);

module.exports = router;
