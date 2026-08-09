# RetailPro 5.0 — Installation Guide

This guide covers installing RetailPro with Docker (recommended for production) and
manually without Docker (for development).

---

## Option A: Docker Installation (Recommended)

### 1. Prerequisites

- Docker Engine 24+ and Docker Compose v2
- Ports **5175** (frontend), **5002** (backend API) and **3306** (MySQL) free on the host
- 2GB free RAM minimum

Check Docker is installed:

```bash
docker --version
docker compose version
```

### 2. Get the project files

Unzip/copy the `retailpro/` folder onto your server, then move into it:

```bash
cd retailpro
```

### 3. Build and start the stack

```bash
docker compose up -d --build
```

This starts three containers:

| Container            | Purpose                          |
|-----------------------|-----------------------------------|
| `retailpro_mysql`     | MySQL 8 database                 |
| `retailpro_backend`   | Node.js/Express API (port 5002)  |
| `retailpro_frontend`  | React app served by Nginx (port 5175) |

Wait about 20–30 seconds on first boot for MySQL to finish initializing (the backend
waits on a health check automatically).

### 4. Open the Installation Wizard

Visit **http://localhost:5175** in your browser. Because no installation has run yet,
you are redirected to `/install` automatically.

**Step 1 — Welcome.** Read the requirements, click *Get Started*.

**Step 2 — Database Connection.** If you're using the bundled Docker Compose stack, the
defaults are already correct:
- Host: `mysql`
- Port: `3306`
- Database: `retailpro`
- Username: `retailpro`
- Password: `retailpro`

Click **Test Connection**. You should see it succeed and move to the next step. If it
fails, confirm the `mysql` container is healthy: `docker compose ps`.

**Step 3 — Company & Currency.** Enter your company name, phone, email and address.
Then **choose your currency** from the dropdown (15 major currencies are built in —
USD, EUR, GBP, NGN, GHS, KES, ZAR, INR, AED, CAD, AUD, JPY, CNY, BRL, EGP) and set your
default sales tax rate (e.g. `7.5` for 7.5%). This currency is used everywhere in the
app — POS, invoices, reports — and can be changed later from **Settings**.

**Step 4 — Admin Account.** Create your administrator login (name, email, password).
This account can manage users, accounting, and every module.

**Step 5 — Review & Install.** Double-check everything, then click **Install RetailPro
5.0**. The wizard will:
1. Create all database tables
2. Seed a standard Chart of Accounts
3. Save your company/currency settings
4. Create your administrator user

**Step 6 — Done.** Click **Go to Login** and sign in with the admin account you just created.

### 5. (Optional) Load demo data

To explore the system pre-populated with realistic data instead of a blank install:

```bash
docker compose exec backend npm run seed
```

This creates:
- 10 categories and 50 products (with barcodes ready to scan) across a realistic retail mix
- 5 suppliers and 12 customers
- 8 historical purchase orders (6 received into stock, 2 still pending — good for testing the Purchasing module)
- Roughly 100–150 historical sales spread across the last 22 days, so the Dashboard trend
  chart, Accounting reports, and Inventory levels all look like a real, active store
- 3 extra staff logins so you can see how each role's access differs:

| Role | Email | Password |
|---|---|---|
| Manager | `manager@retailpro.demo` | `Demo1234!` |
| Cashier | `cashier@retailpro.demo` | `Demo1234!` |
| Accountant | `accountant@retailpro.demo` | `Demo1234!` |

The seed script is safe to re-run — it won't duplicate products/suppliers/customers, and it
skips regenerating sales history if it detects some already exists.

### 6. Managing the stack

```bash
docker compose ps            # see running containers
docker compose logs -f backend   # tail backend logs
docker compose down          # stop everything (data is preserved in volumes)
docker compose down -v       # stop and WIPE all data (use with care)
```

Your database and the installer's saved configuration live in Docker named volumes
(`retailpro_mysql_data`, `retailpro_backend_data`), so `docker compose down` followed by
`docker compose up -d` will **not** ask you to reinstall — RetailPro remembers it's
already set up.

---

## Option B: Manual Installation (Development, no Docker)

### 1. Prerequisites

- Node.js 20+
- MySQL 8.0+ running locally, with a database and user created:
  ```sql
  CREATE DATABASE retailpro;
  CREATE USER 'retailpro'@'localhost' IDENTIFIED BY 'retailpro';
  GRANT ALL PRIVILEGES ON retailpro.* TO 'retailpro'@'localhost';
  ```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

The API starts on **http://localhost:5002**. It will report itself as "not installed"
until you complete the wizard.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app opens on **http://localhost:5175** and proxies `/api` calls to the backend.

### 4. Run the Installation Wizard

Visit http://localhost:5175 and follow the same steps as the Docker walkthrough above.
For the database step, use `host: localhost` instead of `host: mysql`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Test Connection" fails | Confirm MySQL is running and reachable, and the credentials/host/port are correct. In Docker, the host must be `mysql` (the service name), not `localhost`. |
| Stuck redirecting to `/install` after installing | Clear your browser's local storage for the site and refresh, or check `docker compose logs backend` for errors during the install step. |
| Port already in use | Another process is using 5175, 5002, or 3306. Stop it, or edit the port mappings in `docker-compose.yml`. |
| Need to start over completely | `docker compose down -v` wipes the database and install state, then `docker compose up -d --build` to reinstall from scratch. |
