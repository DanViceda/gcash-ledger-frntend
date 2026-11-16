-- Initial PostgreSQL schema for the Express API and Supabase project.
-- Apply only to a dedicated empty development/test database after reviewing its state.
CREATE TABLE admins (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  auth_version BIGINT NOT NULL DEFAULT 0 CHECK (auth_version >= 0),
  CONSTRAINT chk_admin_username_not_blank CHECK (length(trim(username)) > 0)
);
CREATE OR REPLACE FUNCTION update_admin_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = clock_timestamp(); RETURN NEW; END; $$;
CREATE TRIGGER trg_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_admin_updated_at();

CREATE TABLE customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100),
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_customer_phone_not_blank CHECK (length(btrim(phone_number)) > 0)
);
CREATE UNIQUE INDEX uq_customers_normalized_phone_number
  ON customers (regexp_replace(btrim(phone_number), '[[:space:]().-]', '', 'g'));
CREATE INDEX idx_customers_name ON customers (name);

CREATE TABLE transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id),
  created_by BIGINT NOT NULL REFERENCES admins(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('CASH_IN','CASH_OUT','LOAD')),
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  fee_centavos BIGINT NOT NULL CHECK (fee_centavos >= 0),
  fee_mode VARCHAR(20) NOT NULL CHECK (fee_mode IN ('ON_TOP','DEDUCTED')),
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED','VOIDED')),
  gcash_ref_no VARCHAR(100), notes TEXT, proof_image_path VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  voided_at TIMESTAMPTZ, void_reason TEXT,
  CONSTRAINT chk_transaction_deducted_fee CHECK (fee_mode <> 'DEDUCTED' OR amount_centavos > fee_centavos),
  CONSTRAINT chk_transaction_void_fields CHECK (
    (status='COMPLETED' AND voided_at IS NULL AND void_reason IS NULL) OR
    (status='VOIDED' AND voided_at IS NOT NULL AND length(trim(void_reason)) > 0))
);
CREATE UNIQUE INDEX uq_transaction_gcash_ref_no ON transactions(gcash_ref_no) WHERE gcash_ref_no IS NOT NULL;
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);

CREATE TABLE opening_balances (
  id BIGINT PRIMARY KEY DEFAULT 1 CHECK(id=1),
  cash_centavos BIGINT NOT NULL CHECK(cash_centavos>=0),
  gcash_centavos BIGINT NOT NULL CHECK(gcash_centavos>=0),
  initialized_by BIGINT NOT NULL REFERENCES admins(id), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE balance_ledger_lock (id SMALLINT PRIMARY KEY CHECK (id = 1));
INSERT INTO balance_ledger_lock (id) VALUES (1);
CREATE TABLE balance_fundings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account VARCHAR(10) NOT NULL CHECK (account IN ('CASH', 'GCASH')),
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  added_by BIGINT NOT NULL REFERENCES admins(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_balance_fundings_created_at ON balance_fundings(created_at DESC, id DESC);
CREATE TABLE balance_transfers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source VARCHAR(20) NOT NULL CHECK(source IN ('CASH','GCASH')),
  destination VARCHAR(20) NOT NULL CHECK(destination IN ('CASH','GCASH')),
  amount_centavos BIGINT NOT NULL CHECK(amount_centavos>0), notes TEXT,
  created_by BIGINT NOT NULL REFERENCES admins(id), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  previous_cash_centavos BIGINT NOT NULL, previous_gcash_centavos BIGINT NOT NULL,
  resulting_cash_centavos BIGINT NOT NULL, resulting_gcash_centavos BIGINT NOT NULL,
  reversal_of_id BIGINT UNIQUE REFERENCES balance_transfers(id),
  CONSTRAINT chk_transfer_different_accounts CHECK(source<>destination),
  CONSTRAINT chk_transfer_balances_nonnegative CHECK(previous_cash_centavos>=0 AND previous_gcash_centavos>=0 AND resulting_cash_centavos>=0 AND resulting_gcash_centavos>=0),
  CONSTRAINT chk_transfer_total_unchanged CHECK(previous_cash_centavos+previous_gcash_centavos=resulting_cash_centavos+resulting_gcash_centavos)
);
CREATE INDEX idx_balance_transfers_created_at ON balance_transfers(created_at DESC);
CREATE TABLE balance_reconciliations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expected_cash_centavos BIGINT NOT NULL, actual_cash_centavos BIGINT NOT NULL,
  cash_difference_centavos BIGINT NOT NULL,
  expected_gcash_centavos BIGINT NOT NULL, actual_gcash_centavos BIGINT NOT NULL,
  gcash_difference_centavos BIGINT NOT NULL,
  performed_by BIGINT NOT NULL REFERENCES admins(id), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, notes TEXT,
  CONSTRAINT chk_recon_cash_nonnegative CHECK(expected_cash_centavos>=0 AND actual_cash_centavos>=0),
  CONSTRAINT chk_recon_gcash_nonnegative CHECK(expected_gcash_centavos>=0 AND actual_gcash_centavos>=0),
  CONSTRAINT chk_recon_cash_difference CHECK(cash_difference_centavos=actual_cash_centavos-expected_cash_centavos),
  CONSTRAINT chk_recon_gcash_difference CHECK(gcash_difference_centavos=actual_gcash_centavos-expected_gcash_centavos)
);
CREATE INDEX idx_balance_reconciliations_created_at ON balance_reconciliations(created_at DESC);
CREATE TABLE idempotency_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES admins(id), operation VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL, request_hash VARCHAR(64) NOT NULL,
  response_json TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_idempotency_admin_operation_key UNIQUE(admin_id,operation,idempotency_key),
  CONSTRAINT chk_idempotency_operation_not_blank CHECK(length(trim(operation))>0),
  CONSTRAINT chk_idempotency_key_not_blank CHECK(length(trim(idempotency_key))>0)
);
CREATE TABLE login_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username_key VARCHAR(50) NOT NULL,
  ip_key VARCHAR(128) NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_login_attempts_username_time ON login_attempts(username_key, attempted_at DESC) WHERE succeeded = FALSE;
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_key, attempted_at DESC) WHERE succeeded = FALSE;
