-- Add explicit cash-out attribution. No existing amount is assigned to an owner.
-- Run in Supabase SQL Editor before using the updated API.
BEGIN;
ALTER TABLE public.daily_sales ADD COLUMN IF NOT EXISTS cash_out_holder VARCHAR(20);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.daily_sales'::regclass
          AND conname = 'ck_daily_sales_cash_out_holder'
    ) THEN
        ALTER TABLE public.daily_sales ADD CONSTRAINT ck_daily_sales_cash_out_holder
            CHECK (cash_out_holder IS NULL OR cash_out_holder IN ('Owner 1', 'Owner 2'));
    END IF;
END;
$$;
COMMENT ON COLUMN public.daily_sales.cash_out_holder IS
    'Owner who paid the cash-out amount, separate from payment_holder for cash received. NULL means not recorded.';
COMMIT;
