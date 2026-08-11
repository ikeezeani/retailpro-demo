# RetailPro 5.0 — Windows Installation Guide

A complete, step-by-step guide to installing RetailPro on a Windows machine using Docker
Desktop and PowerShell — written from real experience getting it running, including the
issues people actually hit along the way.

---

## Before You Begin

RetailPro runs inside Docker containers, so Windows itself only needs one thing
installed: **Docker Desktop**. Everything else — Node.js, MySQL, Nginx — lives inside the
containers and never touches your system directly.

**You'll need:**
- Windows 10 or 11 (64-bit)
- Docker Desktop for Windows
- WSL2 enabled (Docker Desktop sets this up for you during install)
- 2GB+ free RAM
- Ports **5175**, **5002**, and **3307** free on your machine

**Run everything from PowerShell** — not Command Prompt. Right-click the Start menu and
choose **Windows PowerShell** (or **Terminal** on Windows 11).

---

## Step 1 — Install Docker Desktop

1. Download Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) and run the installer.
2. Accept the default option to use **WSL2**.
3. Restart Windows if the installer asks you to, to finish enabling WSL2.
4. Open Docker Desktop from the Start menu and wait for the whale icon in your system
   tray (bottom-right, near the clock) to go solid/steady — this means it's fully running.
   If any `docker` command says *"error during connect"*, this is almost always why:
   Docker Desktop just isn't finished starting yet.
5. Verify it works:
   ```powershell
   docker --version
   docker compose version
   ```
   Both should print a version number.

---

## Step 2 — Extract the Project

You'll have received RetailPro as a `.zip` file. **Windows PowerShell has no built-in
`unzip` command** — trying to run `unzip` directly will fail with *"not recognized"*. Use
one of these instead:

**Option A — PowerShell**
```powershell
cd C:\Users\<you>\Desktop
Expand-Archive -Path RetailPro-5.0.zip -DestinationPath .
cd retailpro
```

**Option B — File Explorer**
Right-click the zip → **Extract All…** → choose a destination → open the extracted
`retailpro` folder.

**Confirm you're in the right folder** before continuing — it should directly contain
`docker-compose.yml`:
```powershell
dir docker-compose.yml
```
If that lists the file, you're in the right place.

---

## Step 3 — Launch the Stack

1. **Build and start all three containers:**
   ```powershell
   docker compose up -d --build
   ```
   This downloads base images and builds the frontend and backend. On a fresh machine
   this can take several minutes the first time — that's normal.

2. **Wait for MySQL to report healthy:**
   ```powershell
   docker compose ps
   ```
   You want all three containers — `retailpro_mysql`, `retailpro_backend`,
   `retailpro_frontend` — showing `Up`, with MySQL specifically showing `healthy`. This
   can take 20–30 seconds after the build finishes.

3. **Open the app:**
   ```
   http://localhost:5175
   ```
   Since nothing is installed yet, you'll land directly on the Installation Wizard.

> **Note on the `version` warning:** you may see `the attribute 'version' is obsolete, it
> will be ignored...` when running compose commands. This is a harmless warning, not an
> error — newer Docker Compose no longer needs that line in the file. Safe to ignore.

---

## Step 4 — Run the Installation Wizard

The wizard has six steps:

1. **Welcome** — click **Get Started**.

2. **Database Connection** — the fields are pre-filled to match the bundled MySQL
   container automatically:

   | Field | Value |
   |---|---|
   | Host | `mysql` |
   | Port | `3306` |
   | Database | `retailpro` |
   | Username | `retailpro` |
   | Password | `retailpro` |

   Click **Test Connection** — it should succeed immediately with these defaults.

3. **Company & Currency** — enter your company name, phone, email, and address (these
   print on receipts), choose your currency from 15 built-in options, and set your
   default sales tax rate.

4. **Admin Account** — create your administrator login.
   > **Write this password down somewhere safe right now.** There is no self-service
   > "forgot password" flow yet, and losing this is the single most common thing people
   > get stuck on after installing. A sticky note, a notes app, a password manager —
   > anything durable works.

5. **Review & Install** — click **Install RetailPro 5.0**. This creates every database
   table, seeds the chart of accounts, saves your settings, and creates your admin user.

6. **Done** — click **Go to Login** and sign in.

---

## Step 5 — (Optional) Load Demo Data

To explore RetailPro pre-populated instead of starting from a blank store:

```powershell
docker compose exec backend npm run seed
```

This adds 50 products across 10 categories, 5 suppliers, 12 customers, 8 historical
purchase orders, and roughly 100–150 historical sales spread across the last 22 days —
enough for the Dashboard and Accounting reports to look like a genuinely active store.
It also creates three extra staff logins for demoing different roles:

| Role | Email | Password |
|---|---|---|
| Manager | `manager@retailpro.demo` | `Demo1234!` |
| Cashier | `cashier@retailpro.demo` | `Demo1234!` |
| Accountant | `accountant@retailpro.demo` | `Demo1234!` |

The script is safe to re-run — it won't duplicate master data, and skips regenerating
sales history if some already exists.

---

## Day-to-Day Commands

Once installed, this is the full command set you'll need going forward, run from inside
the `retailpro` folder:

| Task | Command |
|---|---|
| Start the store | `docker compose up -d` |
| Stop the store (keeps all data) | `docker compose down` |
| Check what's running | `docker compose ps` |
| View backend logs | `docker compose logs -f backend` |
| Rebuild after a code update | `docker compose up -d --build` |
| Full reset — **wipes all data** | `docker compose down -v` |

Your database and install state live in named Docker volumes, so stopping and restarting
(`down` then `up -d`) never asks you to reinstall. Only `down -v` erases data.

---

## What's Already Built In

A few things worth knowing exist out of the box, so you don't go looking for a
workaround that isn't needed:

- **Barcode scanning** — any USB or Bluetooth scanner works immediately at the POS
  screen; no drivers or setup required, it types like a keyboard.
- **Thermal receipt printing** — every sale opens a print-ready 80mm receipt
  automatically through your printer's normal Windows driver.
- **Mobile and tablet support** — the whole app, including the till screen, adapts to
  narrow screens with a slide-out menu and a stacked checkout layout.
- **Show/hide password** — click the eye icon in any password field to check what
  you've typed before submitting.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `'unzip' is not recognized...` | Windows has no built-in `unzip`. Use `Expand-Archive` (Step 2) or File Explorer's "Extract All" instead. |
| `no configuration file provided: not found` | You're not in the right folder. Run `dir docker-compose.yml` to confirm before running any compose command. |
| `ports are not available: ... 0.0.0.0:3307 ...` | Something else on your machine is already using that port (another MySQL install, XAMPP, etc.). Edit the `mysql` service's port mapping in `docker-compose.yml` to a different free port, e.g. `"3308:3306"`, then run `docker compose up -d` again — no rebuild needed. |
| Querying a table gives `Table 'retailpro.Users' doesn't exist` | Table names in the database are lowercase (`users`, `products`, `accounts`) even though the code's model names are capitalized. Always query lowercase — run `SHOW TABLES;` if unsure. |
| Login says "Invalid email or password" | Almost always a mismatch between what you *think* you typed at install and what was actually saved. Confirm the real saved email first: `docker compose exec mysql mysql -uretailpro -pretailpro retailpro -e "SELECT name, email, role FROM users;"` |
| Forgot the admin password | There's no self-service reset. Generate a new hash and update it directly: <br>`docker compose exec backend node -e "console.log(require('bcryptjs').hashSync('NewPass123!', 10))"` <br>then: <br>`docker compose exec mysql mysql -uretailpro -pretailpro retailpro -e "UPDATE users SET password_hash='<PASTE_HASH>' WHERE email='you@example.com';"` |
| Want to start completely over | `docker compose down -v` wipes the database and install state, then `docker compose up -d --build` to reinstall from scratch. |

**General rule of thumb:** whenever something looks wrong, run `docker compose ps`
first. Nine times out of ten the real cause is one container not actually running yet,
or not showing `healthy` — everything downstream fails until MySQL finishes starting up.

---

## Next Steps

Once you're installed and logged in, see the companion guides for how to actually use
the system day to day:

- **Everyday Guide** — a plain-language walkthrough for cashiers and till staff with no
  computer background, covering how to ring up a sale, take payment, and print receipts.
- **Admin Team Setup Guide** — how to create logins for your other staff and choose the
  right role for each of them.

*RetailPro 5.0 — Windows Installation Guide*
