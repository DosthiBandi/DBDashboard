-- Dosthi Bandi -- PostgreSQL / Supabase initial schema
-- Covers all eight tables in backend/app/models.py as of 2026-11-18.
-- Run in the Supabase SQL Editor as a schema administrator, or with psql.
-- This file creates schema objects only: no accounts, profiles or financial data.
--
-- Architecture: browser -> authenticated FastAPI -> PostgreSQL.
-- Direct browser Data API access to these tables is intentionally denied.
-- The backend connection must own these tables (or have a carefully reviewed
-- runtime role and RLS policy). A plain non-owner role with table grants alone
-- will be denied by RLS because this bootstrap installs no access policies.
--
-- Safe to repeat against a matching schema. IF NOT EXISTS does not migrate
-- incompatible existing tables or repair their column/constraint definitions.
-- Back up and review an existing schema before applying.
--
-- IDs, timestamps and model defaults are supplied by SQLAlchemy in the app.
-- They deliberately match the ORM's VARCHAR IDs and client-side defaults;
-- this file does not change IDs to PostgreSQL UUID or add auth.users FKs.
-- Supabase Auth accounts are managed by Supabase; do not create auth tables.

BEGIN;

CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public.catering_orders (
	id VARCHAR(36) NOT NULL,
	customer_name VARCHAR(200) NOT NULL,
	phone VARCHAR(40) NOT NULL,
	email VARCHAR(200),
	event_date DATE NOT NULL,
	headcount INTEGER NOT NULL,
	status VARCHAR(40) NOT NULL,
	created_by VARCHAR(64) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.daily_sales (
	id VARCHAR(36) NOT NULL,
	business_date DATE NOT NULL,
	cash_sales NUMERIC(12, 2) NOT NULL,
	card_sales NUMERIC(12, 2) NOT NULL,
	digital_cash_sales NUMERIC(12, 2) NOT NULL,
	cash_in NUMERIC(12, 2) NOT NULL,
	cash_out NUMERIC(12, 2) NOT NULL,
	cash_out_holder VARCHAR(20),
	cash_at_box NUMERIC(12, 2),
	open_orders INTEGER,
	closed_orders INTEGER,
	amount_due NUMERIC(12, 2) NOT NULL,
	payment_holder VARCHAR(20),
	notes TEXT NOT NULL,
	created_by VARCHAR(64) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (business_date),
	CONSTRAINT ck_daily_sales_payment_holder CHECK (payment_holder IS NULL OR payment_holder IN ('Owner 1', 'Owner 2', 'Zelle', 'Bank')),
	CONSTRAINT ck_daily_sales_cash_out_holder CHECK (cash_out_holder IS NULL OR cash_out_holder IN ('Owner 1', 'Owner 2'))
);

CREATE TABLE IF NOT EXISTS public.expenses (
	id VARCHAR(36) NOT NULL,
	expense_date DATE NOT NULL,
	vendor VARCHAR(200) NOT NULL,
	category VARCHAR(80) NOT NULL,
	amount NUMERIC(12, 2) NOT NULL,
	payment_method VARCHAR(40) NOT NULL,
	notes TEXT NOT NULL,
	receipt_path VARCHAR(500),
	created_by VARCHAR(64) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.external_events (
	id VARCHAR(36) NOT NULL,
	source VARCHAR(40) NOT NULL,
	external_id VARCHAR(200) NOT NULL,
	payload TEXT NOT NULL,
	received_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_external_event UNIQUE (source, external_id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
	user_id VARCHAR(64) NOT NULL,
	role VARCHAR(20) NOT NULL,
	PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.sync_checkpoints (
	source VARCHAR(50) NOT NULL,
	cursor VARCHAR(300) NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (source)
);

CREATE TABLE IF NOT EXISTS public.catering_items (
	id VARCHAR(36) NOT NULL,
	order_id VARCHAR(36) NOT NULL,
	meal_type VARCHAR(60) NOT NULL,
	item_name VARCHAR(160) NOT NULL,
	size VARCHAR(50) NOT NULL,
	quantity NUMERIC(10, 2) NOT NULL,
	unit_price INTEGER NOT NULL,
	prepared_by VARCHAR(120) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(order_id) REFERENCES public.catering_orders (id)
);

CREATE TABLE IF NOT EXISTS public.catering_payments (
	id VARCHAR(36) NOT NULL,
	order_id VARCHAR(36) NOT NULL,
	payment_date DATE NOT NULL,
	amount NUMERIC(12, 2) NOT NULL,
	method VARCHAR(40) NOT NULL,
	payment_holder VARCHAR(20),
	external_reference VARCHAR(120),
	PRIMARY KEY (id),
	FOREIGN KEY(order_id) REFERENCES public.catering_orders (id),
	CONSTRAINT ck_catering_payments_payment_holder CHECK (payment_holder IS NULL OR payment_holder IN ('Owner 1', 'Owner 2', 'Zelle', 'Bank'))
);

-- Indexes for the implemented date-filtered lists and catering relationships.
-- daily_sales.business_date already has a unique index through its constraint.
CREATE INDEX IF NOT EXISTS ix_expenses_date_id
    ON public.expenses (expense_date DESC, id);
CREATE INDEX IF NOT EXISTS ix_catering_orders_event_date_id
    ON public.catering_orders (event_date DESC, id);
CREATE INDEX IF NOT EXISTS ix_catering_items_order_id
    ON public.catering_items (order_id);
CREATE INDEX IF NOT EXISTS ix_catering_payments_order_date
    ON public.catering_payments (order_id, payment_date);

-- Enable RLS in the same transaction as table creation. No permissive policies
-- are added: owner / manager / staff authorization is enforced by FastAPI.
-- Supabase roles anon and authenticated must already exist (managed by Supabase).

ALTER TABLE public.catering_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.external_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sync_checkpoints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.catering_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.catering_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
    public.catering_orders,
    public.daily_sales,
    public.expenses,
    public.external_events,
    public.profiles,
    public.sync_checkpoints,
    public.catering_items,
    public.catering_payments
FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.profiles IS
    'Supabase Auth user ID to application role mapping; administrative provisioning only.';
COMMENT ON TABLE public.daily_sales IS
    'One record per business date. Revenue = cash_sales + card_sales + digital_cash_sales. Cash movements and dues are separate.';
COMMENT ON TABLE public.catering_payments IS
    'Catering collections, not automatically additional daily sales revenue.';
COMMENT ON TABLE public.sync_checkpoints IS
    'Reserved synchronization state; creation does not activate any integration.';
COMMENT ON TABLE public.external_events IS
    'Reserved inbound-event deduplication; creation does not activate WhatsApp or Clover.';

COMMIT;

-- After applying this file:
-- 1. Create/invite your account in Supabase Authentication -> Users.
-- 2. Provision its Auth UUID with the backend administrative command:
--    cd backend
--    .venv/bin/python -m app.manage provision-user --user-id <auth-uuid> --role owner
-- 3. Start the API and sign in with that account's email and password.
--
-- Not included: Daily Close, running cash ledger, digital payouts, inventory,
-- receipt storage and audit-log schemas. These are not implemented in the
-- current backend; introducing them requires models, migrations and API work.
-- This initial schema is not a complete production-hardening migration.
