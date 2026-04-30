CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS manual_payment_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  customer_phone VARCHAR(50),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'revolut' CHECK (payment_method IN ('revolut')),
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_bucket VARCHAR(100) NOT NULL,
  proof_path TEXT NOT NULL,
  proof_file_name TEXT,
  proof_content_type VARCHAR(100),
  proof_size_bytes INT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE manual_payment_confirmations ENABLE ROW LEVEL SECURITY;

ALTER TABLE manual_payment_confirmations
  ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);

ALTER TABLE manual_payment_confirmations
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE manual_payment_confirmations
  ALTER COLUMN payment_method SET DEFAULT 'revolut';

ALTER TABLE manual_payment_confirmations
  DROP CONSTRAINT IF EXISTS manual_payment_confirmations_payment_method_check;

ALTER TABLE manual_payment_confirmations
  ADD CONSTRAINT manual_payment_confirmations_payment_method_check
  CHECK (payment_method IN ('revolut'));

CREATE INDEX IF NOT EXISTS idx_manual_payment_confirmations_status
  ON manual_payment_confirmations(status);

CREATE INDEX IF NOT EXISTS idx_manual_payment_confirmations_created_at
  ON manual_payment_confirmations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_payment_confirmations_email
  ON manual_payment_confirmations(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_payment_confirmations_order_number
  ON manual_payment_confirmations(order_number);
