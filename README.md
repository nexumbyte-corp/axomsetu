# AxomSetu Platform 🎓

> **Multi-Tenant School SaaS Management System**  
> A modern, robust, and scalable cloud-based school management platform designed for K-12 educational institutions. Built with modern web technologies: React 19, Vite, Tailwind CSS v4, Express.js, Prisma ORM, and PostgreSQL.

---

## 🚀 Quick Start Guide

Follow these steps to get your local development environment up and running from a fresh clone.

### 📋 Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14.0` or higher (running locally or cloud instance e.g., Supabase / Neon)

---

### 1️⃣ Database Setup & Backend Initialization

Navigate to the `server` directory and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file in the `server` folder based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_saas?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Optional Cloudinary Config for Photo/Logo Uploads
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Default Database Seeding Credentials
SEED_ADMIN_NAME="Super Admin"
SEED_ADMIN_EMAIL="admin@schoolsaas.com"
SEED_ADMIN_PASSWORD="SuperAdminPass123!"
```

Run Prisma Database Migrations and Seed initial data (Super Admin & Subscription Plans):

```bash
# Generate Prisma Client
npm run prisma:generate

# Run DB Migrations
npm run prisma:migrate

# Seed Super Admin and Subscription Plans
npm run prisma:seed
```

Start the Backend Server in development mode:

```bash
npm run dev
```
> Server will start at `http://localhost:5000`

---

### 2️⃣ Frontend Setup

Open a new terminal window, navigate to the `client` directory and install dependencies:

```bash
cd client
npm install
```

Start the Frontend Development Server:

```bash
npm run dev
```
> Client will start at `http://localhost:5173`

---

### 🔑 Default Login Credentials

After running `npm run prisma:seed`, you can log in to the platform with the following default Super Admin account:

- **URL**: `http://localhost:5173/login`
- **Email**: `admin@schoolsaas.com`
- **Password**: `SuperAdminPass123!`

When creating new schools through the Super Admin panel or self-registration, default classes (**PP through XII**) and system fee types are automatically initialized for each school alongside an automatic **1-Month Free Trial**.

---

## 🌟 Key Features & Core Modules

| Module | Features & Capabilities |
| :--- | :--- |
| **Super Admin & Multi-Tenancy** | School onboarding, multi-school management, tenant status control, system subscription configuration |
| **Academics** | Automatic class creation (**PP-XII**), streams (Science, Arts, Commerce), mediums, sections, academic years |
| **Student Management** | Onboarding, enrollment, roll numbers, guardian info, student status, class assignment |
| **Staff & Payroll** | Employee records, salary setups, staff advances, monthly payroll generation, salary disbursement |
| **Attendance** | Student & staff daily attendance tracking, attendance deduction integration in payroll |
| **Fee Management** | Custom & system fee heads (Tuition, Admission, Hostel, Misc), fee structures, automated monthly fee generation, payment collection, receipts |
| **Hostel Management** | Student hostel enrollment, monthly hostel fee calculations, auto fee generation integration |
| **Finance & Ledger** | Expense categories, fund sources, income/expense logging, unified financial transaction ledger |
| **PDF Generator** | Automated client-side PDF document creation for fee receipts, pay slips, and financial statements |
| **Subscriptions** | 4-tier flexible subscription plans with trial automation and manual/online payment verification |

---

## 💳 Subscription Plans & Pricing

| Plan | Duration | Base Price | Discount | Final Price | Details |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free Trial** | 1 Month (30 Days) | ₹0 | 100% | **₹0** | Auto-activated on school creation |
| **Monthly** | 1 Month (30 Days) | ₹1,200 | 0% | **₹1,200** | Flexible monthly billing |
| **Quarterly** | 3 Months (90 Days) | ₹3,600 | 10% (₹360) | **₹3,240** | Popular 90-day package |
| **Yearly** | 1 Year (365 Days) | ₹14,400 | 15% (₹2,160) | **₹12,240** | Best value 1-year package |

---

## 🛠️ Project Structure

```
School Saas/
├── client/                     # React 19 Frontend App
│   ├── public/                 # Static assets & brand logos
│   └── src/
│       ├── components/         # Reusable UI components & modal dialogs
│       ├── config/             # Brand & API configuration
│       ├── context/            # Authentication & Theme state
│       ├── pages/              # Application pages (SuperAdmin, Admin, Finance, Payroll, etc.)
│       ├── services/           # Axios API services
│       └── utils/              # PDF generator and helper functions
│
├── server/                     # Express + Prisma Backend App
│   ├── prisma/
│   │   ├── migrations/         # PostgreSQL Schema Migrations
│   │   ├── schema.prisma       # Database Schema Definition
│   │   └── seed.js             # Canonical Database Seeder Script
│   └── src/
│       ├── config/             # Database & Express configuration
│       ├── middleware/         # Auth, Error, Rate Limiter, Subscriptions middleware
│       ├── modules/            # Business modules (academics, schools, students, staff, finance, etc.)
│       ├── routes/             # Central API Router
│       └── services/           # Cloudinary & Payment Services
│
├── .github/workflows/           # GitHub Actions CI/CD Workflows
│   ├── ci.yml                  # Automated Client Lint/Build & Server Migration Check
│   └── cd.yml                  # Zero-downtime Production SSH PM2 Deployment
├── CI_CD_GUIDE.md              # Complete GitHub Actions setup & secrets guide
├── PRODUCTION_DEPLOYMENT.md    # Production deployment checklist & guide
├── README.md                   # Project documentation & Quick Start (This file)
└── .gitignore                  # Root gitignore rules
```

---

## 🔄 CI/CD Automation (GitHub Actions)

This project features automated Continuous Integration and Continuous Deployment pipelines powered by GitHub Actions:

- **Continuous Integration (`.github/workflows/ci.yml`)**: Triggered on push/pull request. Runs Oxlint code analysis, Vite frontend compilation, and Prisma schema/migration validation against a PostgreSQL test container.
- **Continuous Deployment (`.github/workflows/cd.yml`)**: Triggered on push to `main` (or via manual workflow dispatch). Connects via SSH to your host server, pulls changes, executes Prisma migrations, builds the production client bundle, and performs zero-downtime PM2 application reloads (`pm2 reload ecosystem.config.cjs`).

For detailed GitHub Secrets configuration, SSH key setup, and deployment instructions, refer to [CI_CD_GUIDE.md](file:///d:/School%20Saas/CI_CD_GUIDE.md).

---

## 📜 NPM Scripts Reference

### Server Scripts (`server/package.json`)

- `npm run dev`: Start Express server with nodemon live reload.
- `npm run start`: Start production Express server.
- `npm run prisma:generate`: Re-generate Prisma Client types.
- `npm run prisma:migrate`: Run database schema migrations.
- `npm run prisma:seed`: Seed database with Super Admin & Subscription Plans.
- `npm run prisma:studio`: Open interactive Prisma Studio DB browser UI.

### Client Scripts (`client/package.json`)

- `npm run dev`: Start Vite development server.
- `npm run build`: Build production optimized frontend bundle.
- `npm run preview`: Preview production build locally.
- `npm run lint`: Run Oxlint code analysis.

---

## 📄 License

This project is proprietary software for educational institutional management. All rights reserved.

