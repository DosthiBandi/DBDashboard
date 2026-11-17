# DBDashboard — instructions for Codex

## Project identity and reference
- Product/brand name: **Dosthi Bandi** (use this exact capitalization throughout UI).
- This repository is the Dosthi Bandi restaurant operations dashboard.
- **Source of product requirements:** [docs/requirements-v4.1.md](docs/requirements-v4.1.md). Read this before planning significant changes.
- **Visual reference:** [Figma dashboard mockups](https://www.figma.com/design/0onHI9J1ncXapcoGFHPsb8).
- The v4.1 specification (dated November 12, 2026) is a historical architecture and requirements draft, **not evidence that everything is implemented**.
- When there is a conflict between that original document and newer decisions listed below, use these newer decisions unless the owner instructs otherwise.

## More recent product decisions
1. Use a light, minimal dashboard: white sidebar, soft-gray surfaces, restrained violet accent, subtle dividers and readable dense tables. Avoid the original navy/orange design direction in v4.1.
2. Desktop primary sidebar has exactly **five main sections**:
   - Overview: Dashboard, Daily Sales, Cash, Daily Close
   - Operations: Orders, Expenses, Inventory
   - Catering: Orders, Payments and catering details
   - Insights: Reports, P&L, Exports
   - Settings: Integrations, WhatsApp, Clover, Users
   Do not expand primary navigation into separate menu entries for every feature.
3. Keep mobile navigation compact. Use responsive cards and record views rather than trying to force a six-column desktop table on a phone.
4. Dashboard/Overview date selection: **Today, Yesterday, This Week, Last Week, This Month, Last Month, Last 60 Days, Last 90 Days, Custom Range**. Custom allows start/end dates and validation. Use the restaurant's **America/New_York** calendar dates; Monday-start weeks and inclusive rolling windows.
5. Desktop add/edit sales, expense and catering forms use right-side drawers; mobile uses a full-screen equivalent.
6. The real financial and customer data is confidential. Example data must be explicitly marked as illustrative.

## Current code layout
- `src/`: React + TypeScript/Vite frontend.
- `src/DateRangeFilter.tsx`, `src/dateRanges.ts`: dashboard date-filter UI and Eastern Time date utilities.
- `backend/app/`: early FastAPI + SQLAlchemy API, role checks and models.
- `backend/tests/`: initial API tests.
- `backend/README.md`: backend setup guidance and limitations.

## Implementation status: verify, don't assume
- Frontend is a **starter/demo**; backend APIs are not yet wired to the UI.
- Current backend has initial create/list endpoints for Daily Sales, Expenses, Catering, catering payments and summary. It is **not complete CRUD**.
- Authentication/permissions scaffolding is not yet a production-secure deployment. Supabase setup, production migrations, audit logging, backup and granular access checks require further work.
- Clover sync, WhatsApp Business webhooks, n8n/Ollama parsing, receipt uploads, accurate P&L, and CSV/XLSX export are **not implemented**.
- Confirm changes by reading files and running tests; do not claim integrations or deployment occurred without evidence.

## Required accounting and authorization invariants
- `total_sales = cash_sales + card_sales + digital_cash_sales` on the same business-date/accounting basis.
- Digital cash (for example, Zelle) must not be counted a second time as cash or card.
- Cash-in and cash-out are cash movements, not additional revenue.
- Catering order amounts, deposits and payments must not duplicate daily sales; track event/collection/recognition dates independently.
- Owner: full access, including financial reports and exports. Manager: limited operational editing, no unrestricted P&L/exports/admin. Staff: approved views only, no editing.
- Enforce permissions server-side, not only by hiding frontend tabs.
- Never invent missing income, expense or reconciliation data; display incompleteness explicitly.

## Architecture direction (not yet deployed)
- Cloud-hosted React/Vite dashboard + managed PostgreSQL, authentication and private object storage (Supabase is proposed).
- Cloud backend/API handles privileged operations with least privilege and secure authentication.
- One local Mac (16 GB RAM) may run a **separate Python Clover sync** and **n8n + Ollama** for WhatsApp parsing. Cloud queue/relay allows work to catch up after Mac downtime.
- No secrets, actual customer financial records, PAN/CVV, receipt files, or production credentials in the repository. Never expose privileged keys in `VITE_*` variables.

## Engineering workflow
1. Inspect the current implementation and this specification before making structural changes.
2. Run `npm install` and `npm run build` for frontend changes; run backend tests with `cd backend && pytest` after installing backend requirements.
3. Add/adjust tests for new date logic, financial calculations and permissions.
4. Make focused, reviewable changes and state what is demo vs functional.
5. Avoid modifying or deleting unrelated features. Do not commit generated build output, local databases, `.env` files or sensitive material.
6. Ask for confirmation before deploying, accessing real financial data, connecting live third-party accounts, or creating financial records.
