-- ============================================================================
-- Migration: per-product order forms + payment modalities + offline payment.
--   * Product."paymentTerms"    : free-text "Modalités de paiement" shown to buyers.
--   * Product."orderFormFields" : JSON array of custom order-form field definitions.
--   * Order."paymentMethod"     : offline method chosen at order time (virement/cheque/especes).
--   * OrderItem."customFields"  : buyer's answers to that product's custom fields.
--
-- Run this against the Supabase database, then `prisma db push` / `prisma generate`
-- to sync the Prisma client.
--
--   psql "$DIRECT_URL" -f prisma/migrations/add-product-order-form.sql
--
-- Safe to re-run (idempotent).
-- ============================================================================

begin;

alter table "Product"   add column if not exists "paymentTerms"    text;
alter table "Product"   add column if not exists "orderFormFields" jsonb;
alter table "Order"     add column if not exists "paymentMethod"   text;
alter table "OrderItem" add column if not exists "customFields"    jsonb;

commit;
