# DBDashboard backend API

FastAPI + SQLAlchemy starter. Uses SQLite locally and supports PostgreSQL for Supabase.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -c 'from app.db import Base, engine; import app.models; Base.metadata.create_all(engine)'
uvicorn app.main:app --reload
```

Visit http://127.0.0.1:8000/docs. Configure `DEV_BEARER_TOKEN` and `DEV_USER_ID` only for LOCAL testing; never deploy with these variables. For Supabase token authentication set `SUPABASE_URL` and `SUPABASE_ANON_KEY`, provision a matching user ID in the profiles table, and use a secured PostgreSQL DATABASE_URL.

Implemented: create/list daily sales, create/list expenses, create/list catering with item-level preparation details, catering payment recording, and summary. Missing: migrations, audit log, upload, Clover and WhatsApp live integrations, production tests and deployment hardening.
