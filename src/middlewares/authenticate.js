const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { authenticate };
