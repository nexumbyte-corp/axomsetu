# GitHub Actions CI/CD Setup & Administration Guide

This guide explains how Continuous Integration (CI) and Continuous Deployment (CD) are configured for the **AxomSetu / School SaaS** platform using GitHub Actions and PM2 process manager (Non-Docker Host Setup).

---

## 🏗️ Architecture Overview

```
+-----------------------------------------------------------------------+
|                            GitHub Repository                          |
|                                                                       |
|  Push / PR (`main`, `master`)                       Push to `main`/`master` |
|          │                                                │           |
|          ▼                                                ▼           |
|  ┌────────────────┐                              ┌────────────────┐  |
|  │    ci.yml      │                              │    cd.yml      │  |
|  │ (Continuous    │                              │ (Continuous    │  |
|  │  Integration)  │                              │  Deployment)   │  |
|  └───────┬────────┘                              └───────┬────────┘  |
+──────────┼───────────────────────────────────────────────┼────────────+
           │                                               │ (SSH via Secret)
           ├── Client: Oxlint & Vite Build                 ▼
           └── Server: Syntax Check, Prisma & DB Migration ┌───────────────────┐
                                                       │ Host Server (VPS) │
                                                       │ ├── git pull      │
                                                       │ ├── server npm ci │
                                                       │ ├── prisma migrate│
                                                       │ ├── client build  │
                                                       │ ├── pm2 reload    │
                                                       │ └── health check  │
                                                       └───────────────────┘
```

---

## 🧪 1. Continuous Integration (`ci.yml`)

The CI workflow automatically validates code quality, syntax integrity, and database schema validity on every push or pull request to `main` and `master` branches (with `concurrency` auto-cancellation enabled for superseded commits).

### Workflow Jobs:
1. **Client Job (`client-ci`)**:
   - Sets up Node.js v20 with npm caching.
   - Installs client dependencies via `npm ci`.
   - Runs code linting using Oxlint (`npm run lint`).
   - Verifies frontend production compilation (`npm run build`).

2. **Server Job (`server-ci`)**:
   - Launches an isolated PostgreSQL 16 service container.
   - Sets up Node.js v20 with npm caching.
   - Installs server dependencies via `npm ci`.
   - Runs backend syntax check (`npm run lint`).
   - Validates Prisma schema (`npx prisma validate`).
   - Generates Prisma client bindings (`npm run prisma:generate`).
   - Runs database migrations against the test database container (`npx prisma migrate deploy`).

---

## 🚀 2. Continuous Deployment (`cd.yml`)

The CD workflow triggers automatically when changes are pushed to `main` or `master` branches (or manually via GitHub `workflow_dispatch`). It connects to your remote VPS server over SSH and executes zero-downtime application updates using PM2 (`axomsetu-backend`).

---

## 🔑 3. GitHub Secrets Configuration Setup

To enable automated CD deployment to your production server, add the following Repository Secrets in GitHub (`Settings > Secrets and variables > Actions > New repository secret`):

| Secret Name | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `SSH_HOST` | **Yes** | Server IP address or domain name | `192.0.2.1` or `app.axomsetu.com` |
| `SSH_USER` | **Yes** | User on the target server with PM2 permissions | `root` or `ubuntu` or `deploy` |
| `SSH_KEY` | **Yes** | Private SSH key (PEM formatted) for passwordless login | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_PORT` | *Optional* | SSH Port (Defaults to `22`) | `22` |
| `DEPLOY_PATH` | *Optional* | Path where repo is cloned (Defaults to `/var/www/axomsetu`) | `/var/www/axomsetu` |

---

## 🛠️ 4. Server Pre-requisites for SSH Deployment

On your target host server (VPS):

1. **SSH Key Pair Setup**:
   Generate an SSH key pair on your local machine or server:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy"
   ```
   Add the public key (`id_ed25519.pub`) to `~/.ssh/authorized_keys` on your server.
   Add the private key contents (`id_ed25519`) as the `SSH_KEY` secret in GitHub.

2. **Git Repository Clone**:
   Ensure the project repository is initially cloned to your server's deployment path:
   ```bash
   sudo mkdir -p /var/www/axomsetu
   sudo chown -R $USER:$USER /var/www/axomsetu
   git clone <YOUR_GITHUB_REPO_URL> /var/www/axomsetu
   ```

3. **PM2 Setup**:
   Ensure PM2 is installed globally and initialized:
   ```bash
   npm install -g pm2
   cd /var/www/axomsetu/server
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   pm2 startup
   ```

---

## ⚡ 5. Manual Workflow Execution

You can trigger a deployment manually without making code commits:

1. Go to your GitHub repository on GitHub.com.
2. Click on the **Actions** tab.
3. Select **CD (Continuous Deployment)** from the left sidebar workflows.
4. Click **Run workflow** dropdown, select your branch (e.g. `main` or `master`), and click **Run workflow**.

---

## 🩺 6. Troubleshooting & Diagnostics

- **CI Job Fails on Client Lint**: Run `cd client && npm run lint` locally to inspect Oxlint warnings or errors.
- **CI Job Fails on Server Lint**: Run `cd server && npm run lint` locally to check backend syntax errors.
- **CI Job Fails on Prisma Schema**: Run `cd server && npx prisma validate` locally to verify `schema.prisma`.
- **CD Job Fails on Health Check**: Log into your server and run `pm2 logs axomsetu-backend` to view application logs, or check `curl http://localhost:5000/api/v1/health`.
