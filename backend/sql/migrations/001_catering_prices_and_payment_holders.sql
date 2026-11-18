-- Dosthi Bandi: upgrade the existing initial schema.
-- Apply in Supabase SQL Editor as administrator BEFORE using the updated API.
-- No records are inserted, no holder/preparer is guessed, no price is rounded.
-- For a fresh database, use ../schema.sql instead (it already has these changes).
BEGIN;

-- Prevent writes between validation and the price type change.
LOCK TABLE public.catering_items IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.catering_items
        WHERE unit_price::numeric <> trunc(unit_price::numeric)
           OR unit_price < 0 OR unit_price > 2147483647
    ) THEN
        RAISE EXCEPTION 'Cannot convert catering item prices: fractional, negative or out-of-range prices exist. Review them explicitly before retrying; no prices have been changed.';
    END IF;
END;
$$;

ALTER TABLE public.catering_items
    ALTER COLUMN unit_price TYPE INTEGER USING unit_price::integer;

-- Existing records intentionally remain NULL, shown as "Not recorded".
ALTER TABLE public.daily_sales
    ADD COLUMN IF NOT EXISTS payment_holder VARCHAR(20);
ALTER TABLE public.catering_payments
    ADD COLUMN IF NOT EXISTS payment_holder VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.daily_sales'::regclass
          AND conname = 'ck_daily_sales_payment_holder'
    ) THEN
        ALTER TABLE public.daily_sales ADD CONSTRAINT ck_daily_sales_payment_holder
            CHECK (payment_holder IS NULL OR payment_holder IN ('Owner 1', 'Owner 2', 'Zelle', 'Bank'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.catering_payments'::regclass
          AND conname = 'ck_catering_payments_payment_holder'
    ) THEN
        ALTER TABLE public.catering_payments ADD CONSTRAINT ck_catering_payments_payment_holder
            CHECK (payment_holder IS NULL OR payment_holder IN ('Owner 1', 'Owner 2', 'Zelle', 'Bank'));
    END IF;
END;
$$;

COMMENT ON COLUMN public.catering_items.unit_price IS 'Whole-dollar unit price; item total = quantity * unit_price.';
COMMENT ON COLUMN public.catering_items.prepared_by IS 'Preparer selected in the order form; existing names are preserved.';
COMMENT ON COLUMN public.daily_sales.payment_holder IS 'Holder/account for this daily record; not a split allocation ledger.';
COMMENT ON COLUMN public.catering_payments.payment_holder IS 'Who holds this payment: Owner 1, Owner 2, Zelle or Bank.';

COMMIT;
