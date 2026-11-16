-- Add audited funding events and a singleton lock so balance writes serialize
-- even when no historical opening_balances row exists. Safe after 001 too.
CREATE TABLE IF NOT EXISTS balance_ledger_lock (
  id SMALLINT PRIMARY KEY CHECK (id = 1)
);
INSERT INTO balance_ledger_lock (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS balance_fundings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account VARCHAR(10) NOT NULL CHECK (account IN ('CASH', 'GCASH')),
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  added_by BIGINT NOT NULL REFERENCES admins(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_balance_fundings_created_at ON balance_fundings(created_at DESC, id DESC);
