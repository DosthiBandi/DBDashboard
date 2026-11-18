# DBDashboard backend API

FastAPI + SQLAlchemy, with Supabase PostgreSQL and Supabase Auth. Browser database access is intentionally disabled: the browser sends a user access token to FastAPI, which verifies the token with Supabase and loads the role from `profiles`.

## Local setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # only when .env does not already exist
```

Fill `backend/.env` locally (never commit credentials):

```dotenv
DATABASE_URL=postgresql+psycopg://<user>:<url-encoded-password>@<host>:5432/postgres?sslmode=require
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Use the connection string from the Supabase Connect panel. The session pooler supports IPv4; use its exact host/user/port. `postgres://` and `postgresql://` are normalized to the psycopg SQLAlchemy driver. Percent-encode special characters in passwords. Never use a Postgres URL as `SUPABASE_URL`.

The API reads `backend/.env` independently of the current working directory. Keep `DEV_BEARER_TOKEN` and `DEV_USER_ID` empty when using Supabase; these are local-test-only auth bypasses. `SUPABASE_ANON_KEY` remains accepted by the backend for existing installations, but the new browser sign-in requires the publishable key.

## SQL schema file

For a standalone SQL setup, open [`sql/schema.sql`](sql/schema.sql), paste it into **Supabase Dashboard → SQL Editor → New query**, and run it as the schema administrator. It includes every current ORM table, primary/foreign keys, uniqueness constraints, supporting indexes, RLS, and browser-role privilege restrictions in one transaction. It does not create a login or insert financial data; provision an Auth user afterward as described below.

The SQL preserves the ORM's application-generated IDs, timestamps and defaults. It does not migrate incompatible existing tables or implement future features. Review existing tables before applying. You can use the SQL file instead of the Python bootstrap command below; you do not need both.

Initialize a new development database explicitly:

```bash
python -m app.manage init-db
```

This creates missing application tables, enables RLS and revokes `anon`/`authenticated` access to these tables in PostgreSQL. No public Data API policies are installed, no sample financial records are inserted, and the command never runs automatically at startup. Run it with a schema administrator connection. It is bootstrap tooling, **not a versioned migration system**: it does not alter existing column definitions. Existing schemas must be reviewed before use.

Create or invite a user through Supabase Auth, then provision its **Auth user UUID**:

```bash
python -m app.manage provision-user --user-id <auth-user-uuid> --role owner
```

Use `manager` or `staff` for other users. Users cannot self-assign roles. Existing roles are not overwritten by this command.

Start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1
```

API docs: http://127.0.0.1:8000/docs. `/health` reports process health only. `/health/ready` checks connectivity and required table columns without reading financial records; sign-in waits for this check to pass. `/api/v1/auth/config` returns only the public project URL and publishable key. `/api/v1/me` verifies the session and account provisioning. Database errors return a sanitized setup message rather than SQL or connection credentials.

## Catering items and payment holders

Catering orders contain multiple item rows. Each item stores `unit_price` as a nonnegative PostgreSQL INTEGER (whole dollars); its total is quantity × unit price. The form provides a Prepared by dropdown, Chef / Sh / A / Md, including existing preparer names found in the loaded orders.

Daily sales and individual catering payments include `payment_holder`: Owner 1, Owner 2, Zelle, or Bank. This is independent of payment method and does not affect revenue calculations. Existing records remain NULL ("Not recorded"). A daily record has one holder; split allocations across holders are not implemented.

For an **existing database**, apply [`sql/migrations/001_catering_prices_and_payment_holders.sql`](sql/migrations/001_catering_prices_and_payment_holders.sql) in the Supabase SQL Editor before using the updated API. It refuses fractional, negative or out-of-range existing prices rather than rounding them. `init-db` cannot upgrade existing columns. Fresh databases can use the updated `sql/schema.sql` or Python bootstrap.

Check the configured database without changing schema or reading business records:

```bash
cd backend
.venv/bin/python -m app.manage check-db
```

A missing table points to `sql/schema.sql`; missing columns require the applicable scripts in `sql/migrations/` in numeric order. Legacy decimal catering prices require migration 001. No migrations or role grants are applied automatically.

## Testing

```bash
python -m pytest
```

Tests override configuration and use isolated, in-memory SQLite databases. They never connect to the configured Supabase project.

## Access and current limitations

Owner/manager: operational create/list sales, expenses, catering and catering payments. Staff: read sales and catering only. API authorization remains authoritative even when UI actions are hidden. Sales and expense date filtering is inclusive; lists support pagination. Catering order totals/payments remain separate from daily sales. `GET /api/v1/catering` accepts optional inclusive `start` / `end` filters on event date. The dashboard uses these filters and shows order totals, paid/due balances, and Cash/Zelle/Bank/Card-or-other collection cards. The selected orders retain their full payment history, including earlier deposits; method grouping is independent of payment holder.

Use a dedicated least-privilege runtime database role before production. Bootstrap connections often own tables and bypass RLS; backend authorization is essential and browser access stays revoked. Production still requires versioned migrations, audit logs, complete permission review, backups, decimal validation, concurrency-safe payment recording, idempotency, receipt storage, and deployment hardening. Daily Close, digital payouts, receivables reconciliation, Clover and WhatsApp are not implemented. Cash expenses do not automatically create cash-out movements.

## Daily cash and cash-out attribution

Daily sales cash is attributed using `payment_holder`. Cash out is attributed independently using `cash_out_holder` (Owner 1 / Owner 2), with no default payer; the form requires a selection when cash out is greater than zero. Existing NULL values remain Not recorded; no historical amount is reassigned. Apply `sql/migrations/002_daily_sales_cash_out_holder.sql` to existing databases.

Dashboard Collections by holder shows Catering cash, Daily sales cash and Cash out as separate columns. Daily amounts follow business dates in the selected range; catering amounts continue to follow event dates, including earlier deposits. The total column remains catering-only to avoid double-counting potentially overlapping daily receipts. These are recorded amounts, not current cash balances.
