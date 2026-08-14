# AxomSetu Platform - Backend Server ⚙️

The RESTful backend server for **AxomSetu Platform** built using Express.js, Prisma ORM, PostgreSQL, and Node.js (ESM).

---

## ⚡ Tech Stack

- **Runtime & Server**: [Node.js](https://nodejs.org/) (ES Modules) & [Express.js](https://expressjs.com/)
- **ORM & Database**: [Prisma ORM](https://www.prisma.io/) & [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: JWT (`jsonwebtoken`) & [BcryptJS](https://github.com/dcodeIO/bcrypt.js)
- **Validation**: [Zod](https://zod.dev/)
- **Security & Utilities**: Helmet, CORS, Express Rate Limit, Morgan logging
- **Image Storage**: Cloudinary (for school logos & student photos)

---

## 🚀 Quick Start

### 1️⃣ Install Dependencies

```bash
cd server
npm install
```

### 2️⃣ Configure Environment Variables

Create `.env` inside `server/` folder:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_saas?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Default Seeding Credentials
SEED_ADMIN_NAME="Super Admin"
SEED_ADMIN_EMAIL="admin@schoolsaas.com"
SEED_ADMIN_PASSWORD="SuperAdminPass123!"
```

### 3️⃣ Database Migration & Seeding

```bash
# Generate Prisma Client
npm run prisma:generate

# Run DB Migrations
npm run prisma:migrate

# Seed Super Admin & Subscription Plans
npm run prisma:seed
```

### 4️⃣ Development Server

```bash
npm run dev
```

Server will run at `http://localhost:5000`.

---

## 🛠️ Available NPM Scripts

- `npm run dev`: Start Express server with nodemon live reload.
- `npm run start`: Start production Express server.
- `npm run build`: Generate Prisma Client.
- `npm run db:migrate:prod`: Deploy database migrations to production.
- `npm run prisma:generate`: Re-generate Prisma Client types.
- `npm run prisma:migrate`: Run development database migrations.
- `npm run prisma:seed`: Execute canonical database seed script (`prisma/seed.js`).
- `npm run prisma:studio`: Launch interactive Prisma Studio GUI database browser.

---

## 📁 Directory Architecture

```
server/
├── prisma/
│   ├── migrations/         # PostgreSQL Schema Migrations
│   ├── schema.prisma       # Database Schema Definition
│   └── seed.js             # Database Seeder (Super Admin & Subscription Plans)
│
├── src/
│   ├── config/             # Database connection & Express settings
│   ├── middleware/         # Auth, Error Handling, Subscription Guard, Rate Limiters
│   ├── modules/            # Domain Business Modules
│   │   ├── academic-years/ # Academic Year management
│   │   ├── academics/      # Class, Medium, Section, Stream services & auto class creation
│   │   ├── attendance/     # Student & Staff attendance
│   │   ├── audit-logs/     # Audit logging services
│   │   ├── fee-reports/    # Fee collection reports & summaries
│   │   ├── fees/           # Fee types, fee structures, monthly fee generator
│   │   ├── finance/        # Expense tracking, fund management, financial ledger
│   │   ├── hostel/         # Student hostel enrollment & hostel fee generation
│   │   ├── payroll/        # Staff salary setup, advances, monthly payroll
│   │   ├── school-users/   # School admin user management
│   │   ├── schools/        # School registration (atomic onboarding & trial setup)
│   │   ├── staff/          # Employee profiles & management
│   │   ├── students/       # Student profiles & enrollment
│   │   ├── subscription-plans/ # Subscription plan management
│   │   └── subscriptions/  # School subscription records & renewals
│   │
│   ├── routes/             # Centralized Express REST API Router
│   ├── services/           # Cloudinary image upload & Payment providers
│   ├── utils/              # API Error, API Response, Subscription date calculators
│   ├── app.js              # Express Application Config
│   └── server.js           # Server Entry Point
│
├── ecosystem.config.cjs    # PM2 Process Manager Config for Production
├── package.json
└── README.md
```
