# AxomSetu Platform - Frontend Client 💻

The web application frontend for **AxomSetu Platform** built using React 19, Vite, Tailwind CSS v4, and TanStack Query.

---

## ⚡ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest) & [Axios](https://axios-http.com/)
- **Document Generation**: [pdfmake](http://pdfmake.org/) for automated client-side PDF receipts & reports
- **Linter**: [Oxlint](https://oxc.rs/)

---

## 🚀 Quick Start

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Environment Setup

Create a `.env` file in the `client` directory (optional for custom API backend URL):

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 3️⃣ Development Server

```bash
npm run dev
```

App will run locally at `http://localhost:5173`.

---

## 🛠️ Available Scripts

- `npm run dev`: Start local development server with Vite HMR.
- `npm run build`: Build production optimized frontend bundle in `dist/`.
- `npm run preview`: Preview local production build.
- `npm run lint`: Run Oxlint code analysis.

---

## 📁 Directory Architecture

```
client/
├── public/                 # Favicon & branding assets
├── src/
│   ├── components/         # Reusable UI components, cards, tables, and modals
│   │   ├── common/         # Buttons, Inputs, Loaders, Brand Logo
│   │   ├── documents/      # PDF document generator & preview modals
│   │   ├── layout/         # Header, Sidebar, SuperAdmin Navigation Layout
│   │   └── support/        # Technical support & help dialogs
│   ├── config/             # Brand identity configuration
│   ├── context/            # Authentication & Theme context providers
│   ├── pages/              # Route views (SuperAdmin, Admin, Finance, Payroll, Students, etc.)
│   ├── services/           # Axios API Client service modules
│   └── utils/              # Helper functions (currency formatters, date parsers, PDF templates)
├── package.json
└── vite.config.js
```
