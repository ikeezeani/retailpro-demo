require('dotenv').config();
const { sequelize } = require('../models');
const { isInstalled } = require('../config/db');

/**
 * Applies model changes (new columns, etc.) to an already-installed database
 * without touching existing data — safe to run any time RetailPro's code is
 * updated with new fields. This is what you run instead of reinstalling.
 */
async function run() {
  if (!(await isInstalled())) {
    console.log('RetailPro is not installed yet — run the installation wizard first, not this script.');
    process.exit(1);
  }
  await sequelize.authenticate();
  console.log('Connected. Applying schema updates (this only adds/adjusts columns, never deletes data)...');
  await sequelize.sync({ alter: true });
  console.log('Migration complete. Your existing data is untouched.');
  process.exit(0);
}

run().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
