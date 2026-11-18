-- Append-only, audited cash and GCash adjustments.
CREATE TABLE balance_adjustments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account VARCHAR(10) NOT NULL CHECK (account IN ('CASH', 'GCASH')),
  adjustment_type VARCHAR(10) NOT NULL CHECK (adjustment_type IN ('ADD', 'DEDUCT')),
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  created_by BIGINT NOT NULL REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  previous_cash_centavos BIGINT NOT NULL CHECK (previous_cash_centavos >= 0),
  previous_gcash_centavos BIGINT NOT NULL CHECK (previous_gcash_centavos >= 0),
  resulting_cash_centavos BIGINT NOT NULL CHECK (resulting_cash_centavos >= 0),
  resulting_gcash_centavos BIGINT NOT NULL CHECK (resulting_gcash_centavos >= 0),
  CONSTRAINT chk_balance_adjustment_delta CHECK (
    (account = 'CASH' AND resulting_gcash_centavos = previous_gcash_centavos AND
      ((adjustment_type = 'ADD' AND resulting_cash_centavos = previous_cash_centavos + amount_centavos) OR
       (adjustment_type = 'DEDUCT' AND resulting_cash_centavos = previous_cash_centavos - amount_centavos))) OR
    (account = 'GCASH' AND resulting_cash_centavos = previous_cash_centavos AND
      ((adjustment_type = 'ADD' AND resulting_gcash_centavos = previous_gcash_centavos + amount_centavos) OR
       (adjustment_type = 'DEDUCT' AND resulting_gcash_centavos = previous_gcash_centavos - amount_centavos)))
  )
);
CREATE INDEX idx_balance_adjustments_created_at ON balance_adjustments(created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION prevent_balance_adjustment_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Balance adjustment records are immutable.';
END;
$$;
CREATE TRIGGER trg_balance_adjustments_immutable
  BEFORE UPDATE OR DELETE ON balance_adjustments
  FOR EACH ROW EXECUTE FUNCTION prevent_balance_adjustment_mutation();
