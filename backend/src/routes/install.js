const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const router = express.Router();

const { DATA_DIR } = require('../config/db');
const ENV_PATH = path.join(DATA_DIR, '.env');

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
];

router.get('/currencies', (req, res) => res.json(CURRENCIES));

// Lets the wizard prefill the Database step with whatever is actually
// configured via environment variables on this host (Docker defaults locally,
// or e.g. TiDB Cloud credentials on Render) instead of always showing the
// Docker-only defaults. Password is intentionally never returned.
router.get('/db-defaults', (req, res) => {
  res.json({
    host: process.env.DB_HOST || 'mysql',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'retailpro',
    username: process.env.DB_USER || 'retailpro',
  });
});

router.get('/status', async (req, res) => {
  const { isInstalled } = require('../config/db');
  res.json({ installed: await isInstalled() });
});

// Step: test a candidate DB connection before writing anything
router.post('/test-db', async (req, res) => {
  const { host, port, database, username, password } = req.body;
  try {
    const dialectOptions = {};
    if (process.env.DB_SSL === 'true') {
      dialectOptions.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      };
    }
    const testConn = new Sequelize(database, username, password, {
      host, port: port || 3306, dialect: 'mysql', logging: false, dialectOptions,
    });
    await testConn.authenticate();
    await testConn.close();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Final step: persist config, create schema, seed chart of accounts + settings + admin user
router.post('/run', async (req, res) => {
  const { isInstalled, markInstalled } = require('../config/db');
  if (await isInstalled()) return res.status(400).json({ error: 'RetailPro is already installed.' });

  const { db, company, currency, taxRate, admin } = req.body;
  if (!db || !company || !currency || !admin) {
    return res.status(400).json({ error: 'Missing required installation data.' });
  }

  try {
    // 1. Write .env so future boots (and this process going forward) use these creds
    const envContent = [
      `DB_HOST=${db.host}`,
      `DB_PORT=${db.port || 3306}`,
      `DB_NAME=${db.database}`,
      `DB_USER=${db.username}`,
      `DB_PASSWORD=${db.password}`,
      `JWT_SECRET=${require('crypto').randomBytes(32).toString('hex')}`,
      `PORT=${process.env.PORT || 5002}`,
    ].join('\n');
    fs.writeFileSync(ENV_PATH, envContent);

    // Reconnect sequelize with fresh env (kept for persistence across restarts)
    Object.assign(process.env, {
      DB_HOST: db.host, DB_PORT: db.port || 3306, DB_NAME: db.database,
      DB_USER: db.username, DB_PASSWORD: db.password,
    });
    // Use the models module's existing sequelize instance — it's the one all
    // model definitions (Account, Product, Sale, etc.) are actually attached
    // to. Creating a second Sequelize instance here would sync an empty,
    // model-less connection while leaving the real models pointed at a
    // database that was never synced.
    const models = require('../models');
    const { sequelize } = models;

    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); // creates all tables

    // 2. Seed Chart of Accounts
    const { SYSTEM_ACCOUNTS } = require('../utils/accounting');
    const coa = [
      [SYSTEM_ACCOUNTS.CASH, 'Cash on Hand', 'asset'],
      [SYSTEM_ACCOUNTS.BANK, 'Bank Account', 'asset'],
      [SYSTEM_ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Accounts Receivable', 'asset'],
      [SYSTEM_ACCOUNTS.INVENTORY, 'Inventory', 'asset'],
      [SYSTEM_ACCOUNTS.PURCHASE_TAX_INPUT, 'Input Tax (Purchases)', 'asset'],
      [SYSTEM_ACCOUNTS.ACCOUNTS_PAYABLE, 'Accounts Payable', 'liability'],
      [SYSTEM_ACCOUNTS.SALES_TAX_PAYABLE, 'Sales Tax Payable', 'liability'],
      [SYSTEM_ACCOUNTS.OWNERS_EQUITY, "Owner's Equity", 'equity'],
      [SYSTEM_ACCOUNTS.SALES_REVENUE, 'Sales Revenue', 'income'],
      [SYSTEM_ACCOUNTS.COST_OF_GOODS_SOLD, 'Cost of Goods Sold', 'expense'],
      [SYSTEM_ACCOUNTS.INVENTORY_ADJUSTMENT, 'Inventory Adjustment / Shrinkage', 'expense'],
      ['5200', 'Rent Expense', 'expense'],
      ['5210', 'Utilities Expense', 'expense'],
      ['5220', 'Salaries & Wages', 'expense'],
      ['5230', 'General & Administrative', 'expense'],
    ];
    for (const [code, name, type] of coa) {
      await models.Account.findOrCreate({ where: { code }, defaults: { code, name, type, is_system: true } });
    }

    // 3. Seed Settings (currency, company info, tax)
    const settings = {
      company_name: company.name,
      company_address: company.address || '',
      company_phone: company.phone || '',
      company_email: company.email || '',
      currency_code: currency.code,
      currency_symbol: currency.symbol,
      default_tax_rate: String(taxRate ?? 0),
      receipt_footer: 'Thank you for shopping with us!',
    };
    for (const [key, value] of Object.entries(settings)) {
      await models.Setting.upsert({ key, value: String(value) });
    }

    // 4. Seed default categories & a walk-in customer
    await models.Category.findOrCreate({ where: { name: 'General' } });
    await models.Customer.findOrCreate({ where: { name: 'Walk-in Customer' } });

    // 5. Create the admin user
    const password_hash = await bcrypt.hash(admin.password, 10);
    await models.User.create({
      name: admin.name, email: admin.email, password_hash, role: 'admin', active: true,
    });

    markInstalled();
    res.json({ ok: true, message: 'RetailPro 5.0 installed successfully.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
