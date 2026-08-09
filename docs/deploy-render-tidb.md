# Deploying RetailPro 5.0 to Render + TiDB Cloud

This guide gets a live demo of RetailPro running on the internet using two free-tier services:

- **[TiDB Cloud](https://tidbcloud.com)** — a MySQL-compatible database (RetailPro talks to it exactly like regular MySQL)
- **[Render](https://render.com)** — hosts the backend API and the frontend as two separate web services, built directly from the Dockerfiles already in this project

No code changes are needed beyond what's already in this repo — the project has been updated to support TLS database connections and cloud hosts with non-persistent disks.

---

## Overview

| Piece | Where it runs |
|---|---|
| MySQL-compatible database | TiDB Cloud (Serverless, free tier) |
| Backend API (Node/Express) | Render Web Service, built from `backend/Dockerfile` |
| Frontend (React, served by Nginx) | Render Web Service, built from `frontend/Dockerfile` |

Render doesn't run `docker-compose.yml` directly — each service in the compose file becomes its own Render Web Service instead. That's expected; this guide walks through creating both.

---

## Part 1 — Set Up TiDB Cloud

1. **Create a free account** at [tidbcloud.com](https://tidbcloud.com) and sign in.
2. **Create a cluster.** Choose the **Serverless** tier (free) and pick a region close to where you'll deploy on Render.
3. **Create a database.** Once the cluster is ready, open the SQL console (or connect with a client) and run:
   ```sql
   CREATE DATABASE retailpro;
   ```
4. **Get your connection details.** On the cluster's overview page, click **Connect**. TiDB Cloud will show you:
   - **Host** — something like `gateway01.us-east-1.prod.aws.tidbcloud.com`
   - **Port** — usually `4000` (not 3306 — TiDB Cloud's default is different)
   - **User** — a generated username, often including your cluster's prefix
   - **Password** — click "Generate Password" if you haven't already, and save it somewhere safe; it's shown only once
5. **Note that TLS is required.** TiDB Cloud Serverless enforces SSL connections — this is why the project's database config supports a `DB_SSL` setting (see Part 2).

Keep this page open — you'll copy these five values into Render in a moment.

---

## Part 2 — Deploy the Backend on Render

1. **Push this project to a GitHub repository** (Render deploys from a Git repo, not a local zip). If you haven't already:
   ```bash
   cd retailpro
   git init
   git add .
   git commit -m "Initial commit"
   ```
   Then create a repo on GitHub and push it there.

2. **In Render, click "New +" → "Web Service."**

3. **Connect your repository** and select it.

4. **Configure the service:**
   | Setting | Value |
   |---|---|
   | Name | `retailpro-backend` (or anything you like) |
   | Root Directory | `backend` |
   | Runtime | **Docker** |
   | Dockerfile Path | `backend/Dockerfile` |
   | Instance Type | Free |

5. **Add environment variables.** In the Render service's **Environment** tab, add:

   | Key | Value |
   |---|---|
   | `DB_HOST` | Your TiDB host from Part 1 |
   | `DB_PORT` | Your TiDB port (usually `4000`) |
   | `DB_NAME` | `retailpro` |
   | `DB_USER` | Your TiDB username |
   | `DB_PASSWORD` | Your TiDB password |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | Any long random string (e.g. generate one with `openssl rand -hex 32`) |

   You do **not** need to set `PORT` — Render sets this automatically and the app already reads it.

6. **Deploy.** Render will build the Docker image and start the service. Watch the logs — you should see:
   ```
   RetailPro 5.0 API listening on port 10000
   ```
   (Render assigns its own internal port automatically; that's expected.)

7. **Copy the backend's public URL.** Render shows this at the top of the service page, something like:
   ```
   https://retailpro-backend.onrender.com
   ```
   You'll need this in the next part.

---

## Part 3 — Deploy the Frontend on Render

1. **Click "New +" → "Web Service"** again, same repository.

2. **Configure the service:**
   | Setting | Value |
   |---|---|
   | Name | `retailpro-frontend` |
   | Root Directory | `frontend` |
   | Runtime | **Docker** |
   | Dockerfile Path | `frontend/Dockerfile` |
   | Instance Type | Free |

3. **Add one environment variable** — this tells the frontend where to send API requests, since it's no longer sharing an internal Docker network with the backend:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://retailpro-backend.onrender.com/api` (use **your** backend's actual URL from Part 2, and don't forget the trailing `/api`) |

4. **Deploy.** Once it finishes, Render gives you a public URL for the frontend, e.g.:
   ```
   https://retailpro-frontend.onrender.com
   ```

---

## Part 4 — Run the Installation Wizard

1. Open your frontend's Render URL in a browser.
2. You'll land on the Installation Wizard automatically.
3. On the **Database** step, the Host/Port/Database/Username fields are pre-filled from what you set in Render — just type in your TiDB **password** (the one field never shown back to you for security) and click **Test Connection**.
4. Continue through **Company & Currency**, **Admin Account**, and **Review & Install** exactly as normal.
5. Once installed, sign in — your live demo is ready to share.

---

## Notes on Free-Tier Behavior

- **Render's free services spin down after 15 minutes of inactivity** and take 30–60 seconds to wake back up on the next request. This is normal — if a demo link feels slow to load the very first time, that's the service waking up.
- **Your data is safe across spin-downs.** Unlike a local Docker install, RetailPro's install-state check now also verifies directly against the database (not just a local file), so waking up from an idle spin-down will never ask you to reinstall — your products, sales, and accounting data all live safely in TiDB regardless of what happens to Render's disk.
- **TiDB Cloud Serverless free tier** has generous limits for a demo (typically several GB of storage and substantial monthly request capacity) — more than enough for demo/evaluation traffic.

---

## Loading Demo Data

Render's free tier doesn't offer an interactive shell the way `docker compose exec` does locally, but you can still run the seed script via Render's **Shell** tab (if available on your plan) or by temporarily running it from your own machine pointed at TiDB:

```bash
cd backend
DB_HOST=<your-tidb-host> DB_PORT=4000 DB_NAME=retailpro DB_USER=<your-user> DB_PASSWORD=<your-password> DB_SSL=true npm run seed
```

This populates the same realistic demo dataset described in the main Installation Guide — 50 products, suppliers, customers, and weeks of sales history — so anyone viewing the demo sees an active-looking store rather than an empty one.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Wizard's "Test Connection" fails | Double-check the TiDB port — it's `4000`, not the usual MySQL `3306`. Also confirm `DB_SSL=true` is set in Render's environment variables. |
| Frontend loads but every action fails / network errors | `VITE_API_URL` is likely missing, wrong, or missing the trailing `/api`. Since Vite bakes this in at build time, you must **redeploy** the frontend after changing it — a restart alone won't pick up the new value. |
| Backend logs show a TLS/SSL connection error | Confirm `DB_SSL=true` is set exactly (not `True` or `1`) and that your TiDB password doesn't contain characters that need escaping in the dashboard's env var field. |
| Everything works, then suddenly asks to reinstall | This shouldn't happen with the DB-backed install check described above — if it does, check that `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` haven't changed between deploys, since a different database would naturally look "not installed." |

---

*This deployment path is intended for demos and evaluation. For a production store handling real transactions, consider a paid Render instance (to avoid spin-down delays) and TiDB Cloud's Dedicated tier or another production-grade managed MySQL host.*
