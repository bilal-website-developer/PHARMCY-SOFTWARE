# Pharmacy Management System: Agent Build Plan (for Antigravity)

**How to use this file**
1. Put this file and your spec PDF in the project root (`/docs`), so the agent can reread them every session.
2. Paste the **Global Rules** block into the agent's rules/instructions once. It applies to every phase.
3. Give the agent ONE phase prompt at a time. Do not move on until you have checked the "Done when" list yourself in the browser.
4. After each phase, commit to Git and tell the agent: "Phase X is approved. Start Phase Y."

---

## GLOBAL RULES (paste once, applies to all phases)

```
You are building a Pharmacy Management System from the spec in /docs. Follow these rules in every phase:

STACK
- Frontend: React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui (Radix) restyled to the theme, React Router, TanStack Query, Zustand (POS cart only), React Hook Form + Zod. Deployed on Vercel.
- Backend: Node.js + Fastify + TypeScript, PostgreSQL, Prisma. Hosted separately from Vercel (Railway, Render or Supabase). Frontend reads the API address from VITE_API_URL.
- Monorepo: /apps/web, /apps/api, /packages/shared (shared Zod schemas and types).

THEME: "Pharma green". Use these exact values, defined once as CSS variables and Tailwind tokens. Never hard-code colours in components.
- primary #15803D (header bars, Save/primary buttons, headings, active menu)
- accent  #22C55E (highlights, icons, success badges, focus rings, charts). NEVER put white text on it (fails contrast).
- surface #F0FDF4 (page and panel backgrounds)
- white   #FFFFFF (inputs, rows, cards inside panels)
- danger  #DC2626 (Cancel, void, delete, expired stock)
- text #14532D, muted #6B8F7B, warning #F59E0B (near-expiry)
- Radius 12px. Font: Inter; Noto Nastaliq Urdu for Urdu text.
- Look: green header strip (title left, logged-in role right), white rounded rows inside a pale-green panel, Save (green) and Cancel (red) as a full-width pair at the bottom of forms.

DATA RULES (non-negotiable)
- Money is stored as integer paisa. Stock is stored as integer in the smallest unit (tablet). Never use floating point for money or quantity.
- Every stock change creates a row in stock_movements. stock_batches.quantity must always equal the sum of its movements.
- Every stock/money operation runs inside one database transaction (all steps succeed or none).
- No negative stock. Expired batches cannot be sold (Admin override only, with a logged reason).
- No hard deletes of financial or stock records. Use cancel/void/reverse with a reason.
- Posted invoices are never edited. Invoice numbers are sequential with no gaps (use a counter row with a lock).
- Audit log: who, what, when, old value, new value for prices, stock, bills, returns, users.
- Rules like expiry-warning months, max discount per role, and loose selling are settings in the database, not hard-coded.
- Roles: Admin, Pharmacist/Manager, Cashier, Inventory/Purchase, Accountant. Cashiers must never receive cost or profit data from the API (enforce on the server, not just by hiding it in the UI).
- Locale: PKR shown as "Rs 120", dates DD/MM/YYYY, English UI with Urdu names supported.

WORKING STYLE
- Build only the phase you were given. Do not start the next phase.
- Write tests for stock, FEFO, pricing and money logic.
- Seed realistic demo data (about 50 medicines with batches and expiry dates).
- At the end of a phase, give me: what was built, how to run it, how to test it, and anything you were unsure about. Then stop and wait.
```

---

## PHASE 0: Foundation and design system

**Prompt to paste**
```
Build Phase 0 only.
1. Create the monorepo (/apps/web, /apps/api, /packages/shared) with TypeScript, ESLint, Prettier, and scripts to run everything locally.
2. Set up Tailwind with the Pharma green tokens from the Global Rules, and a themed component kit: Button (primary/danger/ghost), Input, Select, DatePicker, Table, Badge (active/near-expiry/expired/quarantine), Modal, Toast, Tabs, EmptyState.
3. Build the app shell: green header bar (page title left, user role right), sidebar on the surface colour, responsive layout.
4. Build a /style-guide page showing every component and every colour token.
5. Backend: Postgres + Prisma setup, users and roles tables, login with hashed passwords (argon2 or bcrypt), JWT or session auth, role-based route guards on the API and the frontend.
6. Login screen and a role-aware menu (each role sees only its allowed pages).
7. Seed one user per role.
8. Prepare Vercel deployment config for apps/web.
Stop when done and report.
```
**Done when**
- [ ] /style-guide matches the Pharma green card (header bar, white rounded rows in pale-green panel, green Save + red Cancel).
- [ ] Each role logs in and sees only its own menu.
- [ ] No hard-coded hex colours outside the token file.
- [ ] The web app builds and deploys to a Vercel preview URL.

---

## PHASE 1A: Product master and suppliers

**Prompt to paste**
```
Build Phase 1A only (spec sections 2, 3.1).
1. Database: products, product_units (pack conversions), barcodes, companies, categories, suppliers.
2. Product form with all fields from spec section 2, including drug class (OTC/Rx/Controlled/Narcotic), storage condition, min/max stock, rack, tax rate, status.
3. Pack structure editor (carton, box, strip, tablet) with loose selling on/off per product and an auto-calculated loose price with permitted manual override.
4. Auto-link substitutes (same generic name + strength).
5. Fast product search by brand, generic/salt and barcode. It must stay instant with 20,000 products (database indexes, debounced input, virtualised list).
6. Supplier master with payment terms and opening balance.
7. CSV import for products and suppliers with a preview and error report.
8. Price history on MRP changes.
Stop when done and report.
```
**Done when**
- [ ] A product with carton/box/strip/tablet saves and converts correctly.
- [ ] Searching a generic name shows all substitutes.
- [ ] 20,000 seeded products still search in well under a second.
- [ ] Cashier role cannot see purchase price.

---

## PHASE 1B: Purchases and batch/expiry stock

**Prompt to paste**
```
Build Phase 1B only (spec sections 3.2, 4).
1. Database: purchases (GRN), purchase_items, stock_batches, stock_movements, stock_adjustments.
2. Purchase entry screen: supplier, bill number, then lines with product, batch number, expiry, quantity, bonus quantity, trade price, discount, tax, MRP. Auto-convert units to the smallest unit.
3. Warnings: expiry closer than the configured months, MRP different from last purchase, duplicate supplier bill number.
4. On confirm (in one transaction): create stock batches, create purchase movements, credit the supplier ledger, optionally record a payment. Bonus quantity lowers average unit cost.
5. Batch-wise stock screen with status (Active, Near-Expiry, Expired, Quarantine, Returned) and a stock-by-batch/expiry report.
6. Stock adjustment, damage write-off and expired write-off, each with a required reason and permission, each creating a movement.
7. Attach a scan/photo of the supplier bill.
8. A test that proves stock_batches.quantity equals the sum of stock_movements after many random operations.
Stop when done and report.
```
**Done when**
- [ ] A purchase creates the right batches and the supplier balance rises.
- [ ] Duplicate bill number is warned.
- [ ] Every stock change appears in the movement ledger and the invariant test passes.

---

## PHASE 1C: POS sales screen

**Prompt to paste**
```
Build Phase 1C only (spec section 5). This is the most important screen: it must be fast and keyboard-friendly.
1. Database: sales, sale_items (with batch reference), payments, held_bills, invoice counter.
2. POS screen: barcode scan or search by brand/generic, choose unit (pack/strip/loose), automatic FEFO batch pick (earliest valid expiry first), cashier may choose another batch only if permitted.
3. Block expired batches and negative stock. Highlight near-expiry batches.
4. Discount per item and per bill, limited by the role's max discount %. Sales tax per product.
5. Payment: cash, card, JazzCash/Easypaisa/bank transfer, split payments, change calculation.
6. Hold and resume bills. Keyboard shortcuts (F-keys for new bill, payment, hold).
7. Show in-stock substitutes with price when an item is out of stock.
8. Rx/controlled items require doctor and patient details before the sale can complete.
9. Thermal receipt (58mm and 80mm) with shop header, tax details, optional batch/expiry. Print via browser print with a receipt stylesheet.
10. Posting: gap-free invoice number, stock deducted from the exact batch, stock movement created, all in one transaction. Posted invoices are read-only.
11. Tests for FEFO selection, loose-unit conversion, discount limits and rounding.
Stop when done and report.
```
**Done when**
- [ ] A cashier can complete a bill with only the keyboard and a barcode scanner.
- [ ] Selling 1 strip then 3 tablets deducts the right amounts from the earliest-expiry batch.
- [ ] Expired and out-of-stock items cannot be sold.
- [ ] Receipt prints correctly on 58mm and 80mm layouts.

---

## PHASE 1D: Returns, basic reports, audit, backup

**Prompt to paste**
```
Build Phase 1D only (spec sections 5.4, 11, 14, 20).
1. Sales returns against the original invoice (full or partial). Returned stock goes back to its original batch or to a Damaged/Quarantine bucket. Refund as cash or credit. Block returns for items marked non-returnable. Manager approval for returns without an invoice.
2. Cancel/void for invoices and purchases with a required reason (no deletes).
3. Basic reports with date filters and Excel/PDF export: daily sales, sales by product/cashier, discount report, returns report, stock position, near-expiry and expired list.
4. Audit log screen (Admin only) and audit entries for prices, stock, bills, returns, users.
5. Settings screen: expiry-warning months, max discount per role, loose selling defaults, shop header for receipts.
6. Automatic daily database backup script plus a documented restore procedure, and a restore test.
Stop when done and report.
```
**Done when**
- [ ] A returned item goes back to the correct batch and the movement ledger shows it.
- [ ] No financial record can be deleted, only voided with a reason.
- [ ] A backup can be restored into a fresh database.
- [ ] **Phase 1 complete: test with real shop data before continuing.**

---

## PHASE 2A: Credit customers and ledgers

**Prompt to paste**
```
Build Phase 2A only (spec sections 3.3, 7, 8).
1. Customers with type, credit limit, opening balance. Credit sales in the POS (customer required, blocked or needs approval above the limit).
2. Customer ledger (sales, returns, payments, running balance), receive payment with printed receipt, ageing report (30/60/90 days).
3. Supplier ledger and payments, purchase returns with debit notes, and expiry claim tracking: Claim Pending, Credit Note Received, Adjusted. Credit notes adjustable against later payments. Expired stock moves to "Expired - Claim Pending", not deleted.
Stop when done and report.
```
**Done when**
- [ ] A credit sale raises the customer balance and a payment lowers it.
- [ ] Credit limit blocks or asks approval as configured.
- [ ] A claim moves through all three statuses and the supplier balance adjusts.

---

## PHASE 2B: Accounts and compliance

**Prompt to paste**
```
Build Phase 2B only (spec sections 6, 8, 9).
1. Cash book (opening, receipts, payments, closing), expenses by category, shift/daily closing with expected vs counted cash and shortage/excess per cashier.
2. Profit and loss (sales minus batch cost minus expenses), margin reports by product/company/category/cashier, stock valuation at cost and at MRP, sales tax summary. Cost data hidden from cashiers.
3. Prescription capture (photo or reference number) and the controlled-drug register with configurable fields (date, patient, doctor and registration number, product, batch, quantity, balance). Printable/exportable, restricted to authorised roles, every view logged.
Stop when done and report.
```
**Done when**
- [ ] A day can be closed with the cash difference recorded.
- [ ] Profit for a sale equals selling price minus that batch's cost.
- [ ] Controlled-drug register balances match stock.

---

## PHASE 2C: Alerts, stocktake, recall, dashboard

**Prompt to paste**
```
Build Phase 2C only (spec sections 4.3, 4.4, 10, 11, 12).
1. Alerts: low stock, near-expiry at 1/3/6 months, price change on purchase, fridge items flagged. Dashboard: today's sales, profit, cash, expiring value, low stock, top sellers.
2. Physical stocktake: count sheet by rack, variance review, approve adjustment (creates movements).
3. Recall report: enter product + batch to see stock remaining, units sold, invoices, customers and the supplier to claim from.
4. Remaining reports from spec section 11 (purchase, dead stock, fast/slow movers, compliance), all exportable.
Stop when done and report.
```
**Done when**
- [ ] Recall report for a test batch lists every invoice and customer who got it.
- [ ] Stocktake variances create adjustments only after approval.
- [ ] **Phase 2 complete: run in parallel with the old software for a short period.**

---

## PHASE 3: Growth (do items one at a time)

**Prompt to paste (use per item)**
```
Build ONLY this Phase 3 item: [pick one]
- Reorder suggestions from 30/60/90-day sales speed, grouped by supplier into a draft purchase order
- Advanced analytics (margin by company/category/cashier, fast/slow/dead stock)
- WhatsApp/SMS credit and refill reminders
- Barcode label printing for items without barcodes
- Owner's mobile dashboard (responsive or PWA)
- Multi-branch: central stock, transfers, separate cash book per branch
Stop when done and report.
```

---

## PHASE 4: Hardening and launch (run alongside earlier phases)

**Prompt to paste**
```
Build Phase 4 only.
1. Performance pass: search and POS stay instant with 20,000+ products; add missing indexes; profile slow queries.
2. Offline support: make the web app a PWA that caches the product list and queues sales while offline, then syncs safely without duplicate invoices or negative stock. (If I decide to run the API on a PC in the shop instead, skip this and tell me.)
3. Accessibility and contrast check on every screen, test on a small laptop screen.
4. Data migration tool: import products, suppliers, customers, balances and opening stock with batch and expiry from CSV/Excel exported from my current software, with a dry-run and error report.
5. Security review: password policy, auto-logout, rate-limited login, role checks on every API route.
6. Written user guide and an acceptance checklist per module.
Stop when done and report.
```
**Done when**
- [ ] Sales continue during an internet cut and sync afterwards.
- [ ] Old data imports cleanly with a clear error report.
- [ ] Drug-law and tax requirements (DRAP, provincial rules, FBR) confirmed with your drug inspector and tax advisor before go-live.

---

## Quick reminders for you
- Check every phase yourself in the browser before approving the next.
- Commit to Git after each approved phase.
- If the agent does something outside the Global Rules (floating-point money, hard deletes, hard-coded colours), tell it to fix that before continuing.
