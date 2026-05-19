-- Migration: change credit_transactions.reference_id from uuid to text
-- Reason: Stripe session IDs (cs_live_*, cs_test_*) are not UUIDs.
--         The uuid column caused every ledger INSERT to fail with
--         invalid_text_representation, breaking idempotency.
-- Also adds a unique index to enforce database-level idempotency.

ALTER TABLE credit_transactions
  ALTER COLUMN reference_id TYPE text USING reference_id::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_reference_id
  ON credit_transactions (reference_id)
  WHERE reference_id IS NOT NULL;
