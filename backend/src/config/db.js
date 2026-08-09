const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// RetailPro reads DB credentials from environment variables. For local Docker
// use these come from docker-compose.yml; for cloud hosts (Render, etc.) set
// them directly in the platform's dashboard before first boot.
// This file is intentionally tolerant of missing env vars *before* install,
// since the API must boot in "not installed" mode to serve the wizard.

const {
  DB_HOST = 'mysql',
  DB_PORT = 3306,
  DB_NAME = 'retailpro',
  DB_USER = 'retailpro',
  DB_PASSWORD = 'retailpro',
  DB_SSL, // set to 'true' for hosts that require TLS, e.g. TiDB Cloud, PlanetScale
} = process.env;

const dialectOptions = {};
if (DB_SSL === 'true') {
  dialectOptions.ssl = {
    minVersion: 'TLSv1.2',
    // TiDB Cloud (and most managed MySQL hosts) use publicly trusted certs,
    // so Node's default CA bundle is sufficient — no custom CA file needed.
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  dialectOptions,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

// Persisted in a Docker-mounted volume (/app/data) for local/self-hosted use
// so re-installation isn't required every time the backend container is
// recreated. Wrapped in try/catch because some hosts (e.g. free-tier PaaS
// instances) provide a read-only or ephemeral filesystem.
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.warn('Could not create local data directory (fine on ephemeral hosts):', e.message);
}

function flagPath() {
  return path.join(DATA_DIR, '.installed');
}

/**
 * Whether RetailPro has completed installation.
 *
 * On hosts with persistent disks (Docker volumes, a VPS) this is answered
 * instantly from a local flag file. On hosts with ephemeral disks (Render
 * free tier spinning down and back up, for example) that flag can be lost
 * even though the database itself is already fully set up — so if the flag
 * is missing, we fall back to asking the database directly whether an admin
 * user already exists, and self-heal the local flag if so.
 */
async function isInstalled() {
  try {
    if (fs.existsSync(flagPath())) return true;
  } catch (_) { /* ignore, fall through to DB check */ }

  try {
    const [rows] = await sequelize.query('SELECT id FROM users LIMIT 1');
    if (rows && rows.length > 0) {
      markInstalled(); // self-heal the local flag for faster checks next time
      return true;
    }
  } catch (_) {
    // users table doesn't exist yet, or the DB isn't reachable — not installed
  }
  return false;
}

function markInstalled() {
  try {
    fs.writeFileSync(flagPath(), new Date().toISOString());
  } catch (e) {
    console.warn('Could not persist install flag to disk (fine on ephemeral hosts):', e.message);
  }
}

module.exports = { sequelize, isInstalled, markInstalled, DATA_DIR };
