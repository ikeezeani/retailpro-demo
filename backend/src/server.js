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

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

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
