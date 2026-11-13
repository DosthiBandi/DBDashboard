# DBDashboard — Dosthi Bandi Restaurant Operations

Initial React + TypeScript + Vite frontend and Python FastAPI backend.

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
python -c 'from app.db import Base, engine; import app.models; Base.metadata.create_all(engine)'
uvicorn app.main:app --reload
```

API documentation at http://localhost:8000/docs.

## Included

- Responsive UI with five sections: Overview, Operations, Catering, Insights and Settings.
- Sample-data grids and summary cards.
- Record-entry form previews (saving intentionally disabled).
- Backend endpoints for daily sales, expenses, catering orders and payments, and sales summary.
- Supabase Auth token verification and a database-backed role check for owner / manager / staff.
- SQLite local development and PostgreSQL compatibility.

## Not implemented

Frontend and backend are not connected yet. Supabase production migrations / RLS / provisioning, authentication screens, real CRUD UI, Clover sync, WhatsApp webhook relay, local n8n/Ollama workflows, receipt storage, reconciliation, audit logs, exports, deployment, and comprehensive tests remain future work.

**All figures in the frontend are illustrative. Do not use them for business reporting.**

Financial control: total sales = cash sales + card sales + digital cash sales. Cash in/out and catering payments are not automatically added to revenue.

Architecture target: Cloudflare Pages / Supabase Postgres, a local Mac (16 GB) running n8n + Ollama (Qwen3 4B) and an independent Python Clover sync. Secrets must never be committed.

Figma: https://www.figma.com/design/0onHI9J1ncXapcoGFHPsb8
