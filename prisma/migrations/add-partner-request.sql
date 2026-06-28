-- ============================================================================
-- Migration: add PartnerRequest table (partner account signup with manual approval).
-- Run this against the Supabase database, then `prisma db push` / `prisma generate`
-- to sync the Prisma client.
--
--   psql "$DIRECT_URL" -f prisma/migrations/add-partner-request.sql
--
-- Safe to re-run (idempotent).
-- ============================================================================

begin;

create table if not exists "PartnerRequest" (
  "id"          uuid primary key default gen_random_uuid(),
  "userId"      uuid not null,
  "companyName" text not null,
  "rc"          text not null,
  "nif"         text not null,
  "nis"         text not null,
  "contact"     text not null,
  "status"      text not null default 'pending',
  "reviewNotes" text,
  "reviewedBy"  uuid,
  "reviewedAt"  timestamptz,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz
);

create index if not exists "PartnerRequest_status_idx"    on "PartnerRequest" ("status");
create index if not exists "PartnerRequest_userId_idx"    on "PartnerRequest" ("userId");
create index if not exists "PartnerRequest_createdAt_idx" on "PartnerRequest" ("createdAt");

-- Enable RLS to match the other tables. The application accesses this table via
-- the Prisma connection (table owner / service role), which bypasses RLS; admin
-- review happens server-side through that connection.
alter table "PartnerRequest" enable row level security;

commit;
