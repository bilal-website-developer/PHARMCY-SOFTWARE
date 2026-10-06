# Pharmacy Management System: Global Rules & Constraints

You are building a Pharmacy Management System from the spec in `/docs`. Follow these rules in every phase:

## STACK
- Frontend: React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui (Radix) restyled to the theme, React Router, TanStack Query, Zustand (POS cart only), React Hook Form + Zod. Deployed on Vercel.
- Backend: Node.js + Fastify + TypeScript, PostgreSQL, Prisma. Hosted separately from Vercel (Railway, Render or Supabase). Frontend reads the API address from VITE_API_URL.
- Monorepo: `/apps/web`, `/apps/api`, `/packages/shared` (shared Zod schemas and types).

## THEME: "Pharma green"
Use these exact values, defined once as CSS variables and Tailwind tokens. Never hard-code colours in components.
- `primary`: `#15803D` (header bars, Save/primary buttons, headings, active menu)
- `accent`: `#22C55E` (highlights, icons, success badges, focus rings, charts). NEVER put white text on it (fails contrast).
- `surface`: `#F0FDF4` (page and panel backgrounds)
- `white`: `#FFFFFF` (inputs, rows, cards inside panels)
- `danger`: `#DC2626` (Cancel, void, delete, expired stock)
- `text`: `#14532D`
- `muted`: `#6B8F7B`
- `warning`: `#F59E0B` (near-expiry)
- Radius: `12px`.
- Font: `Inter`; `Noto Nastaliq Urdu` for Urdu text.
- Look: green header strip (title left, logged-in role right), white rounded rows inside a pale-green panel, Save (green) and Cancel (red) as a full-width pair at the bottom of forms.

## DATA RULES (Non-Negotiable)
- Money is stored as integer paisa (e.g., Rs 100.50 = 10050).
- Stock is stored as integer in the smallest unit (tablet/capsule/ml). Never use floating point for money or quantity.
- Every stock change creates a row in `stock_movements`. `stock_batches.quantity` must always equal the sum of its movements.
- Every stock/money operation runs inside one database transaction (all steps succeed or none).
- No negative stock. Expired batches cannot be sold (Admin override only, with a logged reason).
- No hard deletes of financial or stock records. Use cancel/void/reverse with a reason.
- Posted invoices are never edited. Invoice numbers are sequential with no gaps (use a counter row with a lock).
- Audit log: who, what, when, old value, new value for prices, stock, bills, returns, users.
- Rules like expiry-warning months, max discount per role, and loose selling are settings in the database, not hard-coded.
- Roles: `Admin`, `Pharmacist/Manager`, `Cashier`, `Inventory/Purchase`, `Accountant`. Cashiers must never receive cost or profit data from the API (enforce on the server, not just by hiding it in the UI).
- Locale: PKR shown as "Rs 120", dates `DD/MM/YYYY`, English UI with Urdu names supported.

## WORKING STYLE
- Build only the phase you were given. Do not start the next phase.
- Write tests for stock, FEFO, pricing and money logic.
- Seed realistic demo data (about 50 medicines with batches and expiry dates).
- At the end of a phase, report: what was built, how to run it, how to test it, and anything unsure about. Then stop and wait.
