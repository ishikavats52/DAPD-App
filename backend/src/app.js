const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const yaml = require('yaml');
const swaggerUi = require('swagger-ui-express');

const { mountRoutes } = require('./routes');
const {
  resolveCorsOrigins,
  resolveProductionApiUrl,
  resolveProductionWebUrl
} = require('./urls');
const { isS3Enabled } = require('./services/s3.service');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const requestId = require('./middleware/requestId');

const app = express();

app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

const corsOrigins = resolveCorsOrigins();

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true
  })
);

// We will skip swagger logic since we don't have the yaml right now, or create a dummy one if it crashes
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

if (!isS3Enabled()) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'ok',
    service: 'medicine-api',
    env: process.env.NODE_ENV || 'development',
    urls: {
      api: resolveProductionApiUrl(),
      web: resolveProductionWebUrl()
    }
  });
});

app.get('/', (req, res) => {
  res.type('html').send(`
    <div style="font-family:sans-serif;text-align:center;margin-top:50px;">
      <h2>Made with ❤️ by Manya Shukla 2026</h2>
      <p>📞 Contact me on WhatsApp</p>
      <a href="https://wa.me/918005586588" target="_blank" rel="noopener noreferrer"
         style="padding:10px 20px;background:green;color:white;text-decoration:none;border-radius:5px;">
        Chat Now
      </a>
      <p style="margin-top:28px;">
        <a href="/api-docs" style="color:#0366d6;">API docs (Swagger UI)</a>
        ·
        <a href="/openapi.yaml" style="color:#0366d6;">openapi.yaml</a>
      </p>
    </div>
  `);
});

app.use(
  '/api/auth/admin-signup',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many signup attempts. Try again later.' }
  })
);

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 25 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Try again in 15 minutes.' }
  })
);

app.use(
  '/api/auth/verify-login-otp',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 20 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many code attempts. Try again in 15 minutes.' }
  })
);

app.use(
  '/api/auth/resend-login-otp',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many resend requests. Try again later.' }
  })
);

app.use(
  '/api/auth/forgot-password',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many reset requests. Try again in 15 minutes.' }
  })
);

app.use(
  '/api/auth/reset-password',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many reset attempts. Try again in 15 minutes.' }
  })
);

app.use(
  '/api/auth/change-password',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Try again later.' }
  })
);

app.use(
  '/api/auth/change-password/request-otp',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many code requests. Try again later.' }
  })
);

app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET' && req.path.endsWith('/health'),
    message: { message: 'Too many requests. Slow down.' }
  })
);

mountRoutes(app);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
