-- ============================================================================
-- One-off migration: remove Supplier, Warehouse & per-warehouse stock features.
-- Run this against the Supabase database BEFORE `prisma db push`/`prisma generate`
-- (Postgres cannot drop an in-use enum value, so reassign 'supplier' users first).
--
--   psql "$DIRECT_URL" -f prisma/migrations/drop-supplier-warehouse.sql
--
-- Safe to re-run (idempotent).
-- ============================================================================

begin;

-- 1. Reassign any users still on the 'supplier' role (role is being removed).
update "User" set role = 'user' where role = 'supplier';

-- 2. Drop columns that referenced suppliers.
alter table "Product"       drop column if exists "supplierId";
alter table "SupportTicket" drop column if exists "supplierId";

-- 3. Drop the supplier / warehouse / per-warehouse-stock tables.
drop table if exists "StockTransfer";
drop table if exists "StockAllocation";
drop table if exists "Warehouse";
drop table if exists "Supplier";

-- 4. Recreate user_role without 'supplier'.
alter type user_role rename to user_role_old;
create type user_role as enum ('user', 'admin', 'client', 'retailer');

alter table "User" alter column role drop default;
alter table "User"
  alter column role type user_role using role::text::user_role;
alter table "User" alter column role set default 'user';

-- Keep current_user_role()/custom_access_token_hook return types in sync.
drop function if exists public.current_user_role() cascade;
drop function if exists public.custom_access_token_hook(jsonb) cascade;

drop type user_role_old;

commit;

-- NOTE: After running this, re-apply the function/policy definitions from
-- supabase_schema.sql (current_user_role, is_admin, custom_access_token_hook,
-- and the RLS policy block) so the access-token hook is restored.
