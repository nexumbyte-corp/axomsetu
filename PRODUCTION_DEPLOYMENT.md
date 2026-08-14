# Non-Docker Production Deployment & Administration Guide

This guide provides step-by-step instructions for deploying and running the **School SaaS** platform directly on host servers (Linux / Windows VPS, Cloud instances like AWS EC2, DigitalOcean, Hetzner, or bare metal) without Docker.

---

## 📋 Pre-Deployment Checklist

- [x] **Node.js**: Installed Node.js (v20 LTS recommended) and `npm` on the target host.
- [x] **PostgreSQL**: Installed PostgreSQL 15+ locally or using a managed DB service (e.g. Supabase, AWS RDS, DigitalOcean Managed DB).
- [x] **Process Manager**: Installed PM2 globally (`npm install -g pm2`) for process monitoring, cluster scaling, and auto-reboot.
- [x] **Environment Variables**: Cryptographically secure keys generated for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

---

## 🚀 Deployment Methods (No Docker)

### Method 1: Nginx + PM2 Direct Host Setup (Recommended Production Setup)

In this architecture:
- **Nginx** handles SSL certificates, serves compiled static React assets from `client/dist`, and reverse-proxies API calls to `http://localhost:5000`.
- **PM2** manages the Express backend process across available CPU cores in cluster mode.

#### Step 1: Clone Repository & Install Dependencies
```bash
# Clone to target server
git clone <REPOSITORY_URL> /var/www/school-saas
cd /var/www/school-saas

# Install Backend Dependencies
cd server
npm ci

# Install Frontend Dependencies
cd ../client
npm ci
```

#### Step 2: Configure Environment Variables
Create `/var/www/school-saas/server/.env`:
```ini
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://postgres:your_db_password@localhost:5432/school_saas?schema=public&connection_limit=20"

JWT_ACCESS_SECRET="generate_random_32_char_access_secret"
JWT_REFRESH_SECRET="generate_random_32_char_refresh_secret"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

CLIENT_URL="https://yourdomain.com"
TRUST_PROXY=true
SERVE_CLIENT=false

SEED_ADMIN_NAME="Super Admin"
SEED_ADMIN_EMAIL="admin@yourdomain.com"
SEED_ADMIN_PASSWORD="StrongSuperAdminPassword123!"
```

#### Step 3: Database Migrations & Initial Seed
```bash
cd /var/www/school-saas/server

# Run Prisma schema migration
npm run db:migrate:prod

# Optional: Seed initial super admin user
npm run prisma:seed
```

#### Step 4: Build Frontend Assets
```bash
cd /var/www/school-saas/client

# Compile Vite React application
npm run build
```
This generates the optimized static bundle inside `/var/www/school-saas/client/dist`.

#### Step 5: Start Backend with PM2
```bash
cd /var/www/school-saas/server

# Install PM2 globally if not already installed
npm install -g pm2

# Start server in cluster mode using ecosystem config
pm2 start ecosystem.config.cjs --env production

# Save PM2 state & enable startup on server reboot
pm2 save
pm2 startup
```

#### Step 6: Configure Native Nginx Web Server
Create Nginx configuration (`/etc/nginx/sites-available/school-saas`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Static Build Directory
    root /var/www/school-saas/client/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Reverse proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Single Page Application fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site & reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/school-saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 7: Enable HTTPS with Free Let's Encrypt SSL
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

### Method 2: Unified Single-Process Deployment (Easiest / Smallest Footprint)

In unified mode, the Express server serves both the REST API and the React single-page app on a single port (e.g. `5000`).

1. **Build Client**:
   ```bash
   cd client
   npm run build
   ```

2. **Configure Server Environment**:
   In `server/.env`:
   ```ini
   SERVE_CLIENT=true
   PORT=5000
   ```

3. **Start Application**:
   ```bash
   cd server
   pm2 start ecosystem.config.cjs --env production
   ```
   Now navigating to `http://your-server-ip:5000` loads the full SaaS application!

---

## 🛠️ PM2 Useful Commands

| Task | Command |
| :--- | :--- |
| Check server status | `pm2 status` |
| View live logs | `pm2 logs axomsetu-backend` |
| Restart server | `pm2 restart axomsetu-backend` |
| Reload with zero-downtime | `pm2 reload axomsetu-backend` |
| Stop server | `pm2 stop axomsetu-backend` |
| Monitor memory & CPU usage | `pm2 monit` |

---

## 🩺 System Health Monitoring

The server includes an automated health probe at `http://localhost:5000/api/v1/health`.

Verify backend status:
```bash
curl http://localhost:5000/api/v1/health
```

Expected JSON output:
```json
{
  "success": true,
  "status": "UP",
  "message": "School SaaS API Health Check",
  "timestamp": "2026-08-11T22:00:00.000Z",
  "uptimeSeconds": 3600,
  "database": {
    "status": "healthy"
  },
  "memory": {
    "rss": "54 MB",
    "heapUsed": "28 MB",
    "heapTotal": "40 MB"
  }
}
```
