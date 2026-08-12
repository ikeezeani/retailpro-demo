require('dotenv').config();
const { sequelize } = require('../models');
const { isInstalled } = require('../config/db');

/**
 * Applies schema changes to an already-installed database using explicit,
 * minimal ALTER TABLE statements — one column at a time, each independently
 * safe to re-run.
 *
 * Why not just sequelize.sync({alter:true})? That works fine against local
 * MySQL, but TiDB Cloud doesn't support the exact ALTER TABLE style
 * Sequelize's automatic diffing generates (particularly around unique
 * constraints), and rejects it outright. Explicit statements here are
 * simple enough that both MySQL and TiDB accept them the same way.
 */
const ALTERATIONS = [
  // ---- products: pack/case selling ----
  { table: 'products', sql: `ALTER TABLE products ADD COLUMN pack_size INT DEFAULT 1` },
  { table: 'products', sql: `ALTER TABLE products ADD COLUMN pack_price DECIMAL(14,2) NULL` },
  { table: 'products', sql: `ALTER TABLE products ADD COLUMN pack_barcode VARCHAR(255) NULL` },
  { table: 'products', sql: `ALTER TABLE products ADD UNIQUE INDEX pack_barcode_unique (pack_barcode)`, allowFail: true },

  // ---- sales: refunds + split payments ----
  { table: 'sales', sql: `ALTER TABLE sales ADD COLUMN refunded_total DECIMAL(14,2) DEFAULT 0` },
  { table: 'sales', sql: `ALTER TABLE sales ADD COLUMN split_cash_amount DECIMAL(14,2) NULL` },
  { table: 'sales', sql: `ALTER TABLE sales ADD COLUMN split_electronic_amount DECIMAL(14,2) NULL` },
  { table: 'sales', sql: `ALTER TABLE sales MODIFY COLUMN payment_method ENUM('cash','card','mobile_money','bank_transfer','credit','split') DEFAULT 'cash'`, allowFail: true },

  // ---- sale_items: pack/each display + refund tracking ----
  { table: 'sale_items', sql: `ALTER TABLE sale_items ADD COLUMN mode ENUM('each','pack') DEFAULT 'each'` },
  { table: 'sale_items', sql: `ALTER TABLE sale_items ADD COLUMN sold_qty DECIMAL(14,3) NULL` },
  { table: 'sale_items', sql: `ALTER TABLE sale_items ADD COLUMN refunded_qty DECIMAL(14,3) DEFAULT 0` },

  // ---- purchase_items: pack/each receiving ----
  { table: 'purchase_items', sql: `ALTER TABLE purchase_items ADD COLUMN mode ENUM('each','pack') DEFAULT 'each'` },
  { table: 'purchase_items', sql: `ALTER TABLE purchase_items ADD COLUMN entered_qty DECIMAL(14,3) NULL` },
];

async function run() {
  if (!(await isInstalled())) {
    console.log('RetailPro is not installed yet — run the installation wizard first, not this script.');
    process.exit(1);
  }
  await sequelize.authenticate();
  console.log('Connected. Applying schema updates one column at a time...\n');

  let applied = 0, skipped = 0, failed = 0;
  for (const { table, sql, allowFail } of ALTERATIONS) {
    try {
      await sequelize.query(sql);
      console.log(`  ✓ ${table}: applied`);
      applied++;
    } catch (e) {
      const already = /duplicate column|duplicate key name|already exists/i.test(e.message);
      if (already) {
        console.log(`  · ${table}: already up to date, skipping`);
        skipped++;
      } else if (allowFail) {
        console.log(`  · ${table}: skipped (${e.message.split('\n')[0]})`);
        skipped++;
      } else {
        console.log(`  ✗ ${table}: FAILED — ${e.message.split('\n')[0]}`);
        failed++;
      }
    }
  }

  console.log(`\nDone. ${applied} applied, ${skipped} already up to date, ${failed} failed.`);
  if (failed > 0) {
    console.log('Some changes could not be applied — copy the FAILED lines above and share them for help.');
    process.exit(1);
  }
  console.log('Your existing data is untouched.');
  process.exit(0);
}

run().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
