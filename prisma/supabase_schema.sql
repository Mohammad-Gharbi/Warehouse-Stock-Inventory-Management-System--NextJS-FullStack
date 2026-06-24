-- ============================================================================
-- Techmaster Store — Supabase (PostgreSQL) schema
-- Converted from prisma/schema.prisma (MongoDB models).
-- Type mapping: ObjectId -> uuid, Float -> double precision, BigInt -> bigint,
--               Json -> jsonb, DateTime -> timestamptz, Int -> integer.
-- IDs default to gen_random_uuid() (pgcrypto / built into Supabase).
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Role enum for "User".role (replaces free-form text from the Mongo schema).
-- To add a value later: alter type user_role add value 'newrole';
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('user', 'admin', 'supplier', 'client', 'retailer');
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- Users (PROFILE table — credentials live in Supabase Auth: auth.users)
--   * No password column: hashing, sessions, OAuth (googleId) and password
--     resets are all owned by auth.users / auth.identities.
--   * id is a FK to auth.users(id); a row here is created automatically on
--     signup by the handle_new_user() trigger below.
-- ----------------------------------------------------------------------------
create table if not exists "User" (
  id                uuid primary key references auth.users (id) on delete cascade,
  "createdAt"       timestamptz not null default now(),
  email             text not null unique,   -- mirror of auth.users.email for easy joins
  name              text not null default '',
  "updatedAt"       timestamptz,
  username          text unique,
  image             text,
  role              user_role not null default 'user',
  "emailPreferences" jsonb
);

-- Reconcile an EXISTING "User" table to the shape above.
--   `create table if not exists` is a no-op when the table already exists, so a
--   table left over from an older version of this script keeps its old columns
--   (e.g. a NOT NULL `password`, which breaks the signup trigger). This block is
--   idempotent and safe to re-run; it migrates a stale table into line.
do $$
begin
  -- Drop columns that moved to Supabase Auth.
  alter table public."User" drop column if exists password;
  alter table public."User" drop column if exists "googleId";

  -- Ensure name has the empty-string default the trigger relies on.
  alter table public."User" alter column name set default '';

  -- Convert role text -> user_role enum, not null default 'user'.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'User'
      and column_name = 'role' and data_type <> 'USER-DEFINED'
  ) then
    alter table public."User" alter column role drop default;
    alter table public."User"
      alter column role type user_role using coalesce(role, 'user')::user_role;
    alter table public."User" alter column role set default 'user';
    alter table public."User" alter column role set not null;
  end if;

  -- Ensure id is a FK to auth.users (older versions defaulted to gen_random_uuid).
  if not exists (
    select 1 from pg_constraint where conname = 'User_id_fkey'
  ) then
    alter table public."User"
      add constraint "User_id_fkey"
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end
$$;

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public."User" (id, email, name, image, "createdAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url',
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: each user can read/update only their own profile.
alter table "User" enable row level security;

drop policy if exists "Users can view own profile" on "User";
create policy "Users can view own profile"
  on "User" for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on "User";
create policy "Users can update own profile"
  on "User" for update using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Category
-- ----------------------------------------------------------------------------
create table if not exists "Category" (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  "userId"      uuid not null,
  status        boolean not null default true,
  description   text,
  notes         text,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz,
  "createdBy"   uuid not null,
  "updatedBy"   uuid
);

-- ----------------------------------------------------------------------------
-- Supplier
-- ----------------------------------------------------------------------------
create table if not exists "Supplier" (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  "userId"      uuid not null,
  status        boolean not null default true,
  description   text,
  notes         text,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz,
  "createdBy"   uuid not null,
  "updatedBy"   uuid
);

-- ----------------------------------------------------------------------------
-- Warehouse
-- ----------------------------------------------------------------------------
create table if not exists "Warehouse" (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  type          text,
  status        boolean not null default true,
  "userId"      uuid not null,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz,
  "createdBy"   uuid not null,
  "updatedBy"   uuid
);
create index if not exists "Warehouse_userId_idx" on "Warehouse" ("userId");

-- ----------------------------------------------------------------------------
-- Product
-- ----------------------------------------------------------------------------
create table if not exists "Product" (
  id                 uuid primary key default gen_random_uuid(),
  "categoryId"       uuid not null,
  "createdAt"        timestamptz not null default now(),
  "updatedAt"        timestamptz,
  name               text not null,
  price              double precision not null,
  quantity           bigint not null,
  "reservedQuantity" bigint not null default 0,
  sku                text not null unique,
  status             text not null,
  "supplierId"       uuid not null,
  "userId"           uuid not null,
  "createdBy"        uuid not null,
  "updatedBy"        uuid,
  "qrCodeUrl"        text,
  "qrCodeFileId"     text,
  "imageUrl"         text,
  "imageFileId"      text,
  "expirationDate"   timestamptz,
  "deletedAt"        timestamptz,
  "deletedBy"        uuid
);
create index if not exists "Product_deletedAt_idx" on "Product" ("deletedAt");

-- ----------------------------------------------------------------------------
-- Order
-- ----------------------------------------------------------------------------
create table if not exists "Order" (
  id                  uuid primary key default gen_random_uuid(),
  "orderNumber"       text not null unique,
  "userId"            uuid not null,
  "clientId"          uuid,
  status              text not null default 'pending',
  "paymentStatus"     text not null default 'unpaid',
  subtotal            double precision not null default 0,
  tax                 double precision,
  shipping            double precision,
  discount            double precision,
  total               double precision not null default 0,
  "shippingAddress"   jsonb,
  "billingAddress"    jsonb,
  notes               text,
  "trackingNumber"    text,
  "trackingCarrier"   text,
  "trackingUrl"       text,
  "labelUrl"          text,
  "estimatedDelivery" timestamptz,
  "shippedAt"         timestamptz,
  "deliveredAt"       timestamptz,
  "cancelledAt"       timestamptz,
  "stripePaymentIntentId" text,
  "createdAt"         timestamptz not null default now(),
  "updatedAt"         timestamptz,
  "createdBy"         uuid not null,
  "updatedBy"         uuid
);

-- ----------------------------------------------------------------------------
-- OrderItem
-- ----------------------------------------------------------------------------
create table if not exists "OrderItem" (
  id            uuid primary key default gen_random_uuid(),
  "orderId"     uuid not null,
  "productId"   uuid not null,
  "productName" text not null,
  sku           text,
  quantity      integer not null,
  price         double precision not null,
  subtotal      double precision not null,
  "createdAt"   timestamptz not null default now(),
  constraint "OrderItem_orderId_fkey"
    foreign key ("orderId") references "Order" (id) on delete cascade,
  constraint "OrderItem_productId_fkey"
    foreign key ("productId") references "Product" (id)
);
create index if not exists "OrderItem_orderId_idx" on "OrderItem" ("orderId");
create index if not exists "OrderItem_productId_idx" on "OrderItem" ("productId");

-- ----------------------------------------------------------------------------
-- Invoice (one-to-one with Order)
-- ----------------------------------------------------------------------------
create table if not exists "Invoice" (
  id            uuid primary key default gen_random_uuid(),
  "invoiceNumber" text not null unique,
  "orderId"     uuid not null unique,
  "userId"      uuid not null,
  "clientId"    uuid,
  status        text not null default 'draft',
  subtotal      double precision not null default 0,
  tax           double precision,
  shipping      double precision,
  discount      double precision,
  total         double precision not null default 0,
  "amountPaid"  double precision not null default 0,
  "amountDue"   double precision not null default 0,
  "dueDate"     timestamptz not null,
  "issuedAt"    timestamptz not null default now(),
  "sentAt"      timestamptz,
  "paidAt"      timestamptz,
  "cancelledAt" timestamptz,
  "paymentLink" text,
  "stripePaymentIntentId" text,
  notes         text,
  "billingAddress" jsonb,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz,
  "createdBy"   uuid not null,
  "updatedBy"   uuid,
  constraint "Invoice_orderId_fkey"
    foreign key ("orderId") references "Order" (id) on delete cascade
);
create index if not exists "Invoice_userId_status_dueDate_idx"
  on "Invoice" ("userId", status, "dueDate");

-- ----------------------------------------------------------------------------
-- StockAllocation
-- ----------------------------------------------------------------------------
create table if not exists "StockAllocation" (
  id                 uuid primary key default gen_random_uuid(),
  "productId"        uuid not null,
  "warehouseId"      uuid not null,
  quantity           bigint not null default 0,
  "reservedQuantity" bigint not null default 0,
  "userId"           uuid not null,
  "createdAt"        timestamptz not null default now(),
  "updatedAt"        timestamptz,
  constraint "StockAllocation_productId_warehouseId_key"
    unique ("productId", "warehouseId")
);
create index if not exists "StockAllocation_productId_idx" on "StockAllocation" ("productId");
create index if not exists "StockAllocation_warehouseId_idx" on "StockAllocation" ("warehouseId");

-- ----------------------------------------------------------------------------
-- StockTransfer
-- ----------------------------------------------------------------------------
create table if not exists "StockTransfer" (
  id                uuid primary key default gen_random_uuid(),
  "productId"       uuid not null,
  "fromWarehouseId" uuid not null,
  "toWarehouseId"   uuid not null,
  quantity          bigint not null,
  status            text not null default 'pending',
  notes             text,
  "userId"          uuid not null,
  "createdAt"       timestamptz not null default now(),
  "completedAt"     timestamptz
);
create index if not exists "StockTransfer_productId_idx" on "StockTransfer" ("productId");
create index if not exists "StockTransfer_fromWarehouseId_idx" on "StockTransfer" ("fromWarehouseId");
create index if not exists "StockTransfer_toWarehouseId_idx" on "StockTransfer" ("toWarehouseId");
create index if not exists "StockTransfer_status_idx" on "StockTransfer" (status);

-- ----------------------------------------------------------------------------
-- Notification
-- ----------------------------------------------------------------------------
create table if not exists "Notification" (
  id            uuid primary key default gen_random_uuid(),
  "userId"      uuid not null,
  type          text not null,
  title         text not null,
  message       text not null,
  link          text,
  read          boolean not null default false,
  "createdAt"   timestamptz not null default now(),
  "readAt"      timestamptz,
  metadata      jsonb,
  constraint "Notification_userId_fkey"
    foreign key ("userId") references "User" (id) on delete cascade
);
create index if not exists "Notification_userId_read_createdAt_idx"
  on "Notification" ("userId", read, "createdAt");

-- ----------------------------------------------------------------------------
-- SupportTicket
-- ----------------------------------------------------------------------------
create table if not exists "SupportTicket" (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  description   text not null,
  status        text not null default 'open',
  priority      text not null default 'medium',
  "userId"      uuid not null,
  "assignedToId" uuid,
  "productId"   uuid,
  "orderId"     uuid,
  "supplierId"  uuid,
  notes         text,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz
);
create index if not exists "SupportTicket_userId_idx" on "SupportTicket" ("userId");
create index if not exists "SupportTicket_status_idx" on "SupportTicket" (status);
create index if not exists "SupportTicket_assignedToId_idx" on "SupportTicket" ("assignedToId");
create index if not exists "SupportTicket_createdAt_idx" on "SupportTicket" ("createdAt");

-- ----------------------------------------------------------------------------
-- SupportTicketReply
-- ----------------------------------------------------------------------------
create table if not exists "SupportTicketReply" (
  id            uuid primary key default gen_random_uuid(),
  "ticketId"    uuid not null,
  "userId"      uuid not null,
  body          text not null,
  "createdAt"   timestamptz not null default now(),
  constraint "SupportTicketReply_ticketId_fkey"
    foreign key ("ticketId") references "SupportTicket" (id) on delete cascade
);
create index if not exists "SupportTicketReply_ticketId_idx" on "SupportTicketReply" ("ticketId");
create index if not exists "SupportTicketReply_userId_idx" on "SupportTicketReply" ("userId");
create index if not exists "SupportTicketReply_createdAt_idx" on "SupportTicketReply" ("createdAt");

-- ----------------------------------------------------------------------------
-- ProductReview
-- ----------------------------------------------------------------------------
create table if not exists "ProductReview" (
  id            uuid primary key default gen_random_uuid(),
  "productId"   uuid not null,
  "userId"      uuid not null,
  "orderId"     uuid,
  "orderItemId" uuid,
  "productName" text not null,
  "productSku"  text,
  rating        integer not null,
  comment       text not null,
  status        text not null default 'pending',
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz
);
create index if not exists "ProductReview_productId_idx" on "ProductReview" ("productId");
create index if not exists "ProductReview_orderId_productId_userId_idx"
  on "ProductReview" ("orderId", "productId", "userId");
create index if not exists "ProductReview_userId_idx" on "ProductReview" ("userId");
create index if not exists "ProductReview_orderId_idx" on "ProductReview" ("orderId");
create index if not exists "ProductReview_status_idx" on "ProductReview" (status);
create index if not exists "ProductReview_rating_idx" on "ProductReview" (rating);
create index if not exists "ProductReview_createdAt_idx" on "ProductReview" ("createdAt");

-- ----------------------------------------------------------------------------
-- ImportHistory
-- ----------------------------------------------------------------------------
create table if not exists "ImportHistory" (
  id            uuid primary key default gen_random_uuid(),
  "userId"      uuid not null,
  "importType"  text not null,
  "fileName"    text not null,
  "fileSize"    integer not null,
  "totalRows"   integer not null,
  "successRows" integer not null,
  "failedRows"  integer not null,
  errors        jsonb,
  status        text not null default 'completed',
  "createdAt"   timestamptz not null default now(),
  "completedAt" timestamptz
);

-- ----------------------------------------------------------------------------
-- SystemConfig
-- ----------------------------------------------------------------------------
create table if not exists "SystemConfig" (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  value         text not null,
  type          text not null default 'string',
  label         text not null,
  description   text,
  category      text not null default 'general',
  "isPublic"    boolean not null default false,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz,
  "updatedBy"   uuid
);
create index if not exists "SystemConfig_category_idx" on "SystemConfig" (category);
create index if not exists "SystemConfig_isPublic_idx" on "SystemConfig" ("isPublic");

-- ----------------------------------------------------------------------------
-- AuditLog
-- ----------------------------------------------------------------------------
create table if not exists "AuditLog" (
  id            uuid primary key default gen_random_uuid(),
  "userId"      uuid not null,
  action        text not null,
  "entityType"  text not null,
  "entityId"    uuid,
  details       jsonb,
  "ipAddress"   text,
  "userAgent"   text,
  "createdAt"   timestamptz not null default now()
);
create index if not exists "AuditLog_userId_idx" on "AuditLog" ("userId");
create index if not exists "AuditLog_action_idx" on "AuditLog" (action);
create index if not exists "AuditLog_entityType_idx" on "AuditLog" ("entityType");
create index if not exists "AuditLog_createdAt_idx" on "AuditLog" ("createdAt");

-- ----------------------------------------------------------------------------
-- Auth / misc tables
--   NOTE: "Session" and "VerificationToken" are intentionally omitted — Supabase
--   Auth owns sessions (auth.sessions / refresh tokens) and email verification.
-- ----------------------------------------------------------------------------
create table if not exists "Permission" (
  id       uuid primary key default gen_random_uuid(),
  resource text,
  "userId" uuid,
  constraint "Permission_userId_resource_key" unique ("userId", resource)
);

-- Empty / placeholder models in the Mongo schema (no fields beyond id)
create table if not exists "Department"  ( id uuid primary key default gen_random_uuid() );
create table if not exists "StockAlert"  ( id uuid primary key default gen_random_uuid() );
create table if not exists "UserAction"  ( id uuid primary key default gen_random_uuid() );

-- ============================================================================
-- ROLE-BASED ACCESS CONTROL (RLS)
-- ============================================================================

-- --------------------------------------------------------------------------
-- Helper: read the current user's role.
--   Prefer the JWT claim (set by the access-token hook below) to avoid a
--   recursive lookup into "User" inside RLS policies; fall back to the table
--   for sessions issued before the hook was enabled.
--   SECURITY DEFINER + stable so it can read "User" without tripping its RLS.
-- --------------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language plpgsql
stable
security definer set search_path = public
as $$
declare
  claim text;
  result user_role;
begin
  claim := current_setting('request.jwt.claims', true)::jsonb ->> 'user_role';
  if claim is not null then
    return claim::user_role;
  end if;

  select role into result from public."User" where id = auth.uid();
  return coalesce(result, 'user');
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'admin';
$$;

-- --------------------------------------------------------------------------
-- Custom access token hook: stamps the user's role into the JWT as
-- `user_role` so current_user_role() resolves without a table read.
-- After running this script, enable it in:
--   Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims
--   → select public.custom_access_token_hook
-- --------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  r user_role;
begin
  select role into r from public."User" where id = (event ->> 'user_id')::uuid;
  claims := event -> 'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(r, 'user')::text));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Supabase Auth (supabase_auth_admin) must be able to run the hook.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant all on table public."User" to supabase_auth_admin;

-- --------------------------------------------------------------------------
-- Enable RLS on every business table.
-- --------------------------------------------------------------------------
alter table "Category"           enable row level security;
alter table "Supplier"           enable row level security;
alter table "Warehouse"          enable row level security;
alter table "Product"            enable row level security;
alter table "Order"              enable row level security;
alter table "OrderItem"          enable row level security;
alter table "Invoice"            enable row level security;
alter table "StockAllocation"    enable row level security;
alter table "StockTransfer"      enable row level security;
alter table "Notification"       enable row level security;
alter table "SupportTicket"      enable row level security;
alter table "SupportTicketReply" enable row level security;
alter table "ProductReview"      enable row level security;
alter table "ImportHistory"      enable row level security;
alter table "SystemConfig"       enable row level security;
alter table "AuditLog"           enable row level security;
alter table "Permission"         enable row level security;

-- --------------------------------------------------------------------------
-- Generic policies.
--   Pattern A ("owner or admin"): a user sees/writes rows they created
--     ("userId" = auth.uid()); admins see/write everything.
--   Applied via a helper that builds the four policies for a table.
-- --------------------------------------------------------------------------
do $$
declare
  t text;
  owner_tables text[] := array[
    'Category','Supplier','Warehouse','Product','Order',
    'Invoice','StockAllocation','StockTransfer','SupportTicket',
    'ProductReview','ImportHistory','AuditLog'
  ];
begin
  foreach t in array owner_tables loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format(
      'create policy %I on %I for select using (public.is_admin() or "userId" = auth.uid())',
      t || '_select', t);

    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert with check (public.is_admin() or "userId" = auth.uid())',
      t || '_insert', t);

    execute format('drop policy if exists %I on %I', t || '_update', t);
    execute format(
      'create policy %I on %I for update using (public.is_admin() or "userId" = auth.uid())',
      t || '_update', t);

    execute format('drop policy if exists %I on %I', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete using (public.is_admin() or "userId" = auth.uid())',
      t || '_delete', t);
  end loop;
end
$$;

-- --------------------------------------------------------------------------
-- Notification: a user reads/updates their own; admins manage all.
-- --------------------------------------------------------------------------
drop policy if exists "Notification_select" on "Notification";
create policy "Notification_select" on "Notification"
  for select using (public.is_admin() or "userId" = auth.uid());

drop policy if exists "Notification_update" on "Notification";
create policy "Notification_update" on "Notification"
  for update using (public.is_admin() or "userId" = auth.uid());

drop policy if exists "Notification_admin_write" on "Notification";
create policy "Notification_admin_write" on "Notification"
  for all using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------------------
-- SupportTicketReply: visible to the ticket owner, the reply author,
-- the ticket assignee, and admins.
-- --------------------------------------------------------------------------
drop policy if exists "SupportTicketReply_select" on "SupportTicketReply";
create policy "SupportTicketReply_select" on "SupportTicketReply"
  for select using (
    public.is_admin()
    or "userId" = auth.uid()
    or exists (
      select 1 from "SupportTicket" st
      where st.id = "SupportTicketReply"."ticketId"
        and (st."userId" = auth.uid() or st."assignedToId" = auth.uid())
    )
  );

drop policy if exists "SupportTicketReply_insert" on "SupportTicketReply";
create policy "SupportTicketReply_insert" on "SupportTicketReply"
  for insert with check (public.is_admin() or "userId" = auth.uid());

-- --------------------------------------------------------------------------
-- OrderItem: follows its parent Order's visibility.
-- --------------------------------------------------------------------------
drop policy if exists "OrderItem_all" on "OrderItem";
create policy "OrderItem_all" on "OrderItem"
  for all using (
    public.is_admin()
    or exists (
      select 1 from "Order" o
      where o.id = "OrderItem"."orderId" and o."userId" = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from "Order" o
      where o.id = "OrderItem"."orderId" and o."userId" = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- SystemConfig: public rows readable by anyone authenticated; admins only
-- otherwise; only admins write.
-- --------------------------------------------------------------------------
drop policy if exists "SystemConfig_select" on "SystemConfig";
create policy "SystemConfig_select" on "SystemConfig"
  for select using ("isPublic" = true or public.is_admin());

drop policy if exists "SystemConfig_write" on "SystemConfig";
create policy "SystemConfig_write" on "SystemConfig"
  for all using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------------------
-- Permission: admin-only.
-- --------------------------------------------------------------------------
drop policy if exists "Permission_admin" on "Permission";
create policy "Permission_admin" on "Permission"
  for all using (public.is_admin()) with check (public.is_admin());
