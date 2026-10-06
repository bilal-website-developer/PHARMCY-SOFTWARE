# PharmaCare Management System

> **Pharmacy Management System** built with React 18 + Vite + TypeScript (frontend) and Fastify + PostgreSQL + Prisma (backend). Monorepo managed via npm workspaces.

---

## 🏗️ Phase Status
| Phase | Module | Status |
|-------|--------|--------|
| **Phase 0** | Foundation, Design System, Auth | ✅ **COMPLETE** |
| Phase 1A | Products & Suppliers | Planned |
| Phase 1B | Purchases & Batch Stock | Planned |
| Phase 1C | POS Sales Screen | Planned |
| Phase 1D | Returns, Reports, Audit, Backup | Planned |
| Phase 2A | Credit Customers & Ledgers | Planned |
| Phase 2B | Accounts & Compliance | Planned |
| Phase 2C | Alerts, Stocktake, Dashboard | Planned |
| Phase 3 | Growth Features | Planned |
| Phase 4 | Hardening & Launch | Planned |

---

## 🚀 Quick Start (Phase 0)

### Prerequisites
- Node.js v18+ and npm v9+
- Docker Desktop (for PostgreSQL)

### 1. Start the Database (PostgreSQL via Docker)

> **First time only:** Open Docker Desktop and start it. Then:

```powershell
# From the project root
docker compose up -d
```

This starts PostgreSQL on port 5432 with:
- Database: `pharmacy_db`
- User: `postgres`
- Password: `postgrespassword`

### 2. Install Dependencies

```powershell
npm install
```

### 3. Setup Database (first time only)

```powershell
# Run Prisma migrations
npm run prisma:migrate

# Seed demo users and settings
npm run prisma:seed
```

### 4. Start Development Servers

**Option A: Start everything at once**
```powershell
npm run dev
```

**Option B: Start frontend and backend separately**
```powershell
# Terminal 1 — API backend (port 4000)
npm run dev:api

# Terminal 2 — Web frontend (port 5173)
npm run dev:web
```

### 5. Open the App

- **Frontend:** http://localhost:5173
- **API Health Check:** http://localhost:4000/api/health
- **Prisma Studio (DB Browser):** Run `npm run prisma:studio`

---

## 🔐 Demo Login Credentials

| Role | Username | Password | Can See Costs? |
|------|----------|----------|----------------|
| Admin | `admin` | `Admin@123` | ✅ Yes |
| Pharmacist / Manager | `pharmacist` | `Pharma@123` | ✅ Yes |
| Cashier | `cashier` | `Cashier@123` | ❌ No (server enforced) |
| Inventory / Purchase | `inventory` | `Inventory@123` | ✅ Yes |
| Accountant | `accountant` | `Account@123` | ✅ Yes |

> The Login page also has a **1-Click Demo Login** tab for testing role-based navigation without typing credentials.

---

## 🎨 Phase 0: What Was Built

### Design System ("Pharma Green")
All colour tokens defined once in `apps/web/src/index.css` as CSS variables and mapped to Tailwind. **Zero hard-coded hex values in any component.**

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#15803D` | Header bar, Save button, active menu |
| `accent` | `#22C55E` | Icons, badges, focus rings |
| `surface` | `#F0FDF4` | Page background, sidebar |
| `white` | `#FFFFFF` | Inputs, table rows, cards |
| `danger` | `#DC2626` | Cancel button, expired alerts |
| `text` | `#14532D` | Primary content text |
| `muted` | `#6B8F7B` | Secondary text, hints |
| `warning` | `#F59E0B` | Near-expiry alerts |

### Component Kit
- `Button` — primary, danger, ghost, outline, save, cancel variants
- `Input` — label, prefix/suffix, error state
- `Select` — Pharma themed
- `DatePicker` — Calendar icon, DD/MM/YYYY
- `Badge` — active, near-expiry, expired, quarantine, role
- `Table` + `TableRow` — white rounded rows inside pale-green panel
- `Modal` — with standard green header, keyboard dismiss
- `Toast` — success, error, warning, info with auto-dismiss
- `Tabs` — primary/inactive states
- `EmptyState` — icon, title, description, action
- `FormActionPair` — full-width green Save + red Cancel pair at bottom of forms

### App Shell
- Sticky **green header strip** (`#15803D`): page title left, role badge right
- **Surface sidebar** (`#F0FDF4`): role-aware navigation (only permitted pages shown)
- **Role Switcher** in header: click to test any role's menu without re-logging in
- Responsive layout with mobile hamburger menu

### Auth & Security
- JWT authentication via Fastify JWT
- Passwords hashed with bcryptjs
- Server-side role guards (not just client UI hiding)
- Audit log entry on every login
- Cashier role: server strips cost/purchase data from API responses

### Style Guide Page
Visit `/style-guide` to see all tokens, all components, and the invariant data rules verified live in the browser.

---

## 📁 Monorepo Structure

```
/
├── apps/
│   ├── api/              # Fastify + Prisma backend (port 4000)
│   │   ├── src/
│   │   │   ├── index.ts           # Server entry point
│   │   │   ├── prisma.ts          # PrismaClient singleton
│   │   │   ├── plugins/
│   │   │   │   └── auth.ts        # JWT + role guards
│   │   │   └── routes/
│   │   │       ├── auth.ts        # /api/auth/*
│   │   │       ├── users.ts       # /api/users/*
│   │   │       └── settings.ts    # /api/settings/*
│   │   └── prisma/
│   │       ├── schema.prisma      # User, AuditLog, SystemSetting
│   │       └── seed.ts            # Seeds 5 users + 9 settings
│   └── web/              # React 18 + Vite + Tailwind frontend (port 5173)
│       └── src/
│           ├── components/
│           │   ├── ui/            # Button, Input, Select, Badge, Table, Modal, Toast, Tabs, EmptyState, FormActionPair, DatePicker
│           │   └── layout/        # AppShell (header + sidebar)
│           ├── pages/             # LoginPage, DashboardPage, StyleGuidePage, ModulePlaceholderPage
│           ├── stores/            # authStore (Zustand)
│           ├── lib/               # api.ts (fetch wrapper)
│           ├── router.tsx         # React Router with role guards
│           └── index.css          # CSS variables (tokens defined once)
└── packages/
    └── shared/           # Zod schemas, types, tokens, utilities shared by API + Web
        └── src/index.ts  # UserRole, NavItems, formatPaisaToPKR, formatDateDDMMYYYY, ...
```

---

## 🔑 Non-Negotiable Data Rules

1. **Money = Integer Paisa** (no floats). `Rs 120.50` is stored as `12050`.
2. **Stock = Integer smallest unit** (tablet/capsule/ml). Never fractional.
3. `stock_batches.quantity` must always equal `Σ(stock_movements)`.
4. Every financial op runs in **one DB transaction** — all or nothing.
5. **No negative stock.** Expired batches block sale (admin override logged).
6. **No hard deletes** of financial/stock data — void/cancel with reason.
7. Invoice numbers are **gap-free sequential** via counter row + lock.
8. Full **audit log**: who, what, when, old → new value.
9. **Cashier API**: server never returns cost or purchase price data.
10. Config values (expiry months, max discount, loose selling) are in `system_settings` table, **not** hard-coded.

---

## 🚢 Vercel Deployment (Phase 0)

The `vercel.json` at the root is configured to build `apps/web`. To deploy:

```bash
# Install Vercel CLI (if not already)
npm i -g vercel

# Deploy
vercel
```

Set the environment variable `VITE_API_URL` in your Vercel project settings pointing to your hosted API (Railway/Render/Supabase).
