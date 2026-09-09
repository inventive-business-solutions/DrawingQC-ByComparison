# Support Automation — Deployment Guide (team, self-hosted)

How to stand up the whole app on one shared server so the team reaches it over the network.
Three pieces run together:

```
Team browsers ──http──▶  [ Server ]
                          Next.js UI     :3000   (the site people open)
                            │  proxies /api/*  (DRAWINGQC_API)
                          C# backend     :5080   (DrawingQC.Web — does the real work)
                            │
                          PostgreSQL     :5432   (accounts, ConsList, run history)
                          + file storage (Excel/PDF blobs on disk)
```

> **Use a Windows server.** The Booklet tool needs Microsoft Word (COM), which is Windows-only.
> QC Check, Tagwise and ConsList work on Linux too, but Booklet will not.

---

## 0. Prerequisites (install once on the server)

- **.NET 10 SDK/Runtime** — to run the C# backend.
- **Node.js 22 LTS** — to build/run the Next.js UI.
- **PostgreSQL 16/17** — the database.
- **Microsoft Word** (optional) — only if you need the Booklet tool.
- Git (to pull the repo).

Clone the repo (the merged one with `backend/`):
```powershell
git clone https://github.com/inventive-business-solutions/DrawingQC-ByComparison.git
cd DrawingQC-ByComparison
```
Layout: Next.js UI at the root, C# backend under `backend/`.

---

## 1. PostgreSQL

Create the database and an application role (run in `psql` as the `postgres` superuser):

```sql
CREATE ROLE sa_app LOGIN PASSWORD 'CHANGE_ME_strong_password';
CREATE DATABASE supportautomation OWNER sa_app;
```

Connection string the backend will use (keep it secret):
```
Host=localhost;Port=5432;Database=supportautomation;Username=sa_app;Password=CHANGE_ME_strong_password
```

Nothing else to do — the backend **creates its own schema on first run**, and if any legacy
`%APPDATA%\SupportAutomation` JSON exists it imports it once.

---

## 2. C# backend (DrawingQC.Web)

### Publish it
```powershell
cd backend\DrawingQC.Web
dotnet publish -c Release -o C:\Apps\SupportAutomation\backend
```

### Configure it (environment variables)
- `SUPPORTAUTOMATION_DB` → the connection string from step 1 (this is what switches it from
  file storage to PostgreSQL).
- `PORT` → the port to listen on (defaults to 5080). When `PORT` is set the app binds to
  `0.0.0.0` so other machines can reach it.

### Run it as a Windows Service (stays up across reboots/logout)
Using the built-in service manager (or NSSM if you prefer):
```powershell
# create the service
sc.exe create SupportAutomationApi binPath= "C:\Apps\SupportAutomation\backend\DrawingQC.Web.exe" start= auto
# set env for the service (machine-wide) then restart it
setx SUPPORTAUTOMATION_DB "Host=localhost;Port=5432;Database=supportautomation;Username=sa_app;Password=CHANGE_ME_strong_password" /M
setx PORT "5080" /M
sc.exe start SupportAutomationApi
```
> If the service can't read the machine env vars, set them under the service key or run the
> backend via a small `.bat` that `set`s them and launches the exe, wrapped by NSSM.

Verify locally on the server:
```powershell
curl http://localhost:5080/            # should return the app (200)
```

### First run — bootstrap the admin
The **first account registered becomes Admin**. Open the site once it's up (step 3) and register
your admin account before anyone else, then close sign-ups from the admin panel if you want.

---

## 3. Next.js UI

### Point it at the backend and build
```powershell
cd C:\...\DrawingQC-ByComparison         # repo root
npm install
$env:DRAWINGQC_API = "http://localhost:5080"   # same machine as the backend
npm run build
```
> `DRAWINGQC_API` must be present **at build time and at runtime**. The UI proxies `/api/*` to it,
> which keeps requests same-origin so the backend's HttpOnly session cookie works. Do **not** point
> the browser straight at the backend — login will silently fail.

### Run it as a service too
```powershell
# next start serves the production build on port 3000
sc.exe create SupportAutomationUI binPath= "cmd /c cd /d C:\...\DrawingQC-ByComparison && npm run start" start= auto
setx DRAWINGQC_API "http://localhost:5080" /M
sc.exe start SupportAutomationUI
```
(Or run `npm run start` under NSSM / PM2 — anything that keeps it alive.)

---

## 4. Networking (let the team in)

- Open the **UI port** (3000) in Windows Firewall so team PCs can reach it:
```powershell
New-NetFirewallRule -DisplayName "Support Automation UI" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```
- The backend (5080) and PostgreSQL (5432) can stay **localhost-only** — only the UI talks to the
  backend, and only the backend talks to the DB. Don't expose them to the LAN unless you need to.
- Team members open: **`http://<server-ip-or-hostname>:3000`**
- (Optional) Put IIS or nginx in front to serve on port 80/443 with a friendly name + HTTPS.

---

## 5. Verification checklist

1. `curl http://localhost:5080/` on the server → 200 (backend up).
2. Backend log shows `PostgreSQL connected; schema ready.` (DB mode on).
3. From another PC, open `http://<server-ip>:3000` → the site loads.
4. Register the first account → it becomes **Admin**; log in.
5. Run a QC Check / open ConsList → real data (not fixtures). Confirm a row appears in the DB:
   `SELECT * FROM qc_runs;`
6. Downloads work and revisions increment.

---

## Notes & gotchas

- **File blobs stay on disk** on the backend server (`%APPDATA%\SupportAutomation\ConsList\...`).
  Back that folder up along with regular PostgreSQL backups (`pg_dump supportautomation`).
- **Switching to the DB is one-way in practice:** once `SUPPORTAUTOMATION_DB` is set the app uses
  Postgres. The old JSON is imported once and then left as a backup; new changes go to the DB.
- **Booklet** needs Word installed on the backend machine and only runs on Windows.
- **Updating:** `git pull`, then `dotnet publish` (backend) and `npm run build` (UI), then restart
  both services.
- **WSL dev quirk** (not production): if you run the UI in WSL and the backend on Windows,
  set `networkingMode=mirrored` in `.wslconfig` or `localhost` won't cross the boundary.
