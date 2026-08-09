# RetailPro 5.0

A production-ready Retail Management System — POS with barcode scanning, Purchasing,
Inventory, and Nominal (double-entry) Accounting — built with React/Vite, Node.js/Express,
MySQL, and Sequelize, fully containerized with Docker.

## Stack

| Layer     | Technology                                   |
|-----------|-----------------------------------------------|
| Frontend  | React 18, Vite, React Router, Recharts        |
| Backend   | Node.js, Express, Sequelize ORM               |
| Database  | MySQL 8.0                                     |
| Auth      | JWT, bcrypt password hashing                  |
| Packaging | Docker, Docker Compose                        |

## Quick Start (Docker)

```bash
docker compose up -d --build
```

Then open **http://localhost:5175** in your browser. Since this is a first run, you'll
be redirected straight into the **Installation Wizard**, where you'll:

1. Confirm the database connection
2. Set your company name, address and **currency**
3. Create your administrator account
4. Review and install

See [`docs/INSTALLATION.md`](docs/INSTALLATION.md) for the full step-by-step guide and
[`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) for how to use every module day to day.

## Ports

| Service   | URL                          |
|-----------|-------------------------------|
| Frontend  | http://localhost:5175         |
| Backend API | http://localhost:5002/api   |
| MySQL     | localhost:3306                |

## Project Structure

```
retailpro/
├── backend/            Node.js/Express API + Sequelize models
│   ├── src/
│   │   ├── config/      Database connection & install-state
│   │   ├── models/      Sequelize models (Product, Sale, Account, etc.)
│   │   ├── routes/      REST endpoints (auth, sales, purchases, accounting…)
│   │   ├── middleware/  JWT auth & role guards
│   │   ├── utils/       Double-entry accounting posting engine
│   │   └── seed/        Optional demo data seeder
│   └── Dockerfile
├── frontend/            React/Vite SPA
│   └── src/
│       ├── pages/        Install Wizard, POS, Inventory, Accounting, etc.
│       ├── components/   Shared layout & modal components
│       └── context/      Auth/settings context
├── docker-compose.yml
└── docs/
    ├── INSTALLATION.md
    └── USER_MANUAL.md
```

## Core Features

- **POS (Sales)** — barcode-scanner-ready checkout, cash/card/mobile money/bank
  transfer/credit payments, live receipt, automatic stock deduction
- **Purchasing** — purchase orders, goods receiving that updates stock & cost price
- **Inventory** — stock levels, reorder alerts, manual adjustments, full movement audit trail
- **Nominal Accounting** — chart of accounts, auto-posted double-entry journal for every
  sale and purchase, manual journal entries, Trial Balance, Profit & Loss, Balance Sheet
- **Multi-currency setup** — chosen once at install time, editable later in Settings
- **Role-based access** — Admin, Manager, Accountant, Cashier

## License

Provided as a foundation for you to extend and deploy for your own business or clients.
