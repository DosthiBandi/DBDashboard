# DBDashboard — Dosthi Bandi Restaurant Operations

React + TypeScript + Vite frontend and Python FastAPI backend, with Supabase sign-in and database-backed operational records.

## Development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.manage init-db
uvicorn app.main:app --reload
```

API documentation at http://localhost:8000/docs.

## Database connection and sign-in

See [backend setup](backend/README.md) for Supabase environment settings, schema initialization, and user provisioning. Configure `backend/.env`; the API exposes only public sign-in settings to the browser. Set `VITE_API_BASE_URL` in the frontend `.env` if your API is not at `http://localhost:8000`.

Use Node 22 or newer for the Supabase SDK/tooling. Sign in with a provisioned Supabase Auth account. The browser attaches the refreshed user token to API requests; database credentials stay on the backend.

## Included

- Five main sections: Overview, Operations, Catering, Insights and Settings.
- Supabase email/password sign-in, session refresh and sign-out.
- Database-backed sales dashboard, Daily Sales, Cash, Expenses, Catering Orders and Payments.
- Right-side entry drawers (full-screen on mobile), API validation errors, loading, retry and empty states.
- Server-side owner/manager/staff checks and account provisioning.
- PostgreSQL schema bootstrap with browser Data API access restricted; SQLite for isolated tests/local development.

## Not implemented

Daily Close, opening/running cash ledger, digital payouts, customer receivables workflow, full edit/delete CRUD, versioned production migrations, audit logs, receipt uploads, Clover sync, WhatsApp processing, inventory, reports, P&L, exports and deployment remain future work. Unsupported screens display feature status and do not show fabricated financial data.

Financial control: total sales = cash sales + card sales + digital cash sales. Cash movements, customer dues and catering payments are not automatically added to revenue. Cash expenses do not automatically create cash-out records.

Architecture target: Cloudflare Pages / Supabase Postgres, a local Mac (16 GB) running n8n + Ollama (Qwen3 4B) and an independent Python Clover sync. Secrets must never be committed.

Figma: https://www.figma.com/design/0onHI9J1ncXapcoGFHPsb8
