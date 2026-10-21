-- Whether a memory's date is known to the day or only to the month.
-- Month-only dates are stored as the last day of that month, so they sort after the dated ones.
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS date_precision text NOT NULL DEFAULT 'day'
  CHECK (date_precision IN ('day', 'month'));
