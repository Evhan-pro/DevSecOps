const express = require('express');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const { authenticate } = require('../middlewares/authenticate');
const { metrics } = require('../observability/metrics');
const { getTracer } = require('../observability/tracing');
const { SpanStatusCode } = require('@opentelemetry/api');

const tracer = getTracer();

const router = express.Router();

// Whitelist stricte : on n'accepte QUE des noms de fichiers simples.
const filenameSchema = z.string().regex(/^[a-zA-Z0-9_-]+\.(jpg|png|pdf|txt)$/).max(200);

router.get('/files', authenticate, (req, res, next) => {
  const endTimer = metrics.fileDownloadDurationMs.startTimer();
  metrics.fileDownloadTotal.inc({ result: 'attempt' });

  const requestId = req.id || req.headers['x-request-id'];

  return tracer.startActiveSpan(
    'file.download',
    {
      attributes: {
        'http.request_id': String(requestId || ''),
        'app.user_id': String(req.user?.id || ''),
      },
    },
    (span) => {
      try {
        const filename = filenameSchema.parse(req.query.name);
        const uploadsDir = path.join(__dirname, '../../uploads');
        const safePath = path.join(uploadsDir, path.basename(filename));

        // Fail-safe : vérifie que le path reste dans uploads
        if (!safePath.startsWith(uploadsDir)) {
          metrics.fileDownloadTotal.inc({ result: 'blocked' });
          endTimer();
          span.setAttribute('file.result', 'blocked');
          return res.status(400).json({ error: 'Invalid file name' });
        }

        const content = fs.readFileSync(safePath);
        req.log.info({ event: 'file.download', file: filename, userId: req.user.id }, 'file download');
        metrics.fileDownloadTotal.inc({ result: 'success' });
        endTimer();
        span.setAttribute('file.name', filename);
        span.setAttribute('file.result', 'success');
        return res.send(content);
      } catch (err) {
        metrics.fileDownloadTotal.inc({ result: 'failure' });
        endTimer();
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR });

        // Zod error -> 400, sinon 404
        if (err && err.name === 'ZodError') {
          return res.status(400).json({ error: 'Invalid file name' });
        }
        if (err && (err.code === 'ENOENT' || String(err.message || '').includes('no such file'))) {
          return res.status(404).json({ error: 'File not found' });
        }
        return next(err);
      } finally {
        span.end();
      }
    }
  );
});

module.exports = router;