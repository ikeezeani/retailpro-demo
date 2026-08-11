require('dotenv').config(); // picks up backend/.env for local (non-Docker) dev
const fs = require('fs');
const path = require('path');
// The install wizard persists DB credentials to data/.env (a mounted volume in
// Docker) so they survive container recreation. Load them over any defaults.
const persistedEnv = path.join(__dirname, '..', 'data', '.env');
if (fs.existsSync(persistedEnv)) {
  require('dotenv').config({ path: persistedEnv, override: true });
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Required on hosts that sit behind a reverse proxy (Render, Railway, most
// PaaS providers) — without this, express-rate-limit throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR because it can't trust the client IP in
// the X-Forwarded-For header. Harmless to leave on for local Docker too.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Brute-force protection on login: 10 attempts per 15 minutes per IP. This
// is intentionally only on /auth/login, not the whole API, since generic
// API rate limiting would also throttle a busy till doing many legitimate
// requests per minute.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

// Install wizard routes are always reachable, even before installation.
app.use('/api/install', require('./routes/install'));

// Everything else requires RetailPro to be installed first.
app.use('/api', async (req, res, next) => {
  const { isInstalled } = require('./config/db');
  if (!(await isInstalled())) {
    return res.status(503).json({ error: 'RetailPro is not installed yet. Please run the installation wizard.', notInstalled: true });
  }
  next();
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));
const { productsRouter, categoriesRouter } = require('./routes/products');
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
const { suppliersRouter, customersRouter } = require('./routes/parties');
app.use('/api/suppliers', suppliersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/sales', require('./routes/sales'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/reports', require('./routes/reports'));
const { settingsRouter, usersRouter } = require('./routes/settings');
app.use('/api/settings', settingsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'RetailPro 5.0 API' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`RetailPro 5.0 API listening on port ${PORT}`));
