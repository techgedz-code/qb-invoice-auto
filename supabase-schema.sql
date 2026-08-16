-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (synced with Clerk via webhook)
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  clerk_user_id text unique not null,
  email text not null,
  name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'bookkeeper')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  invoices_used_this_month int default 0,
  invoices_limit int default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoices table (parsed from emails)
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  -- Raw data
  raw_email_text text,
  raw_pdf_base64 text,
  -- Parsed data
  vendor_name text,
  vendor_email text,
  invoice_number text,
  invoice_date date,
  due_date date,
  subtotal numeric(12,2),
  tax_amount numeric(12,2),
  total_amount numeric(12,2),
  currency text default 'USD',
  line_items jsonb default '[]'::jsonb,
  -- QB sync
  qb_invoice_id text,
  qb_sync_status text check (qb_sync_status in ('pending', 'synced', 'failed', 'skipped')) default 'pending',
  qb_sync_error text,
  qb_synced_at timestamptz,
  -- Review
  review_status text check (review_status in ('pending', 'approved', 'rejected', 'edited')) default 'pending',
  reviewed_at timestamptz,
  -- Metadata
  source_email text,
  parsed_by_ai boolean default true,
  confidence_score numeric(3,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- QuickBooks tokens (encrypted)
create table public.qb_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  realm_id text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, realm_id)
);

-- Audit log
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.invoices enable row level security;
alter table public.qb_tokens enable row level security;
alter table public.audit_logs enable row level security;

-- Policies
create policy "Users can view own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own data" on public.users
  for update using (auth.uid() = id);

create policy "Users can view own invoices" on public.invoices
  for select using (auth.uid() = user_id);

create policy "Users can insert own invoices" on public.invoices
  for insert with check (auth.uid() = user_id);

create policy "Users can update own invoices" on public.invoices
  for update using (auth.uid() = user_id);

create policy "Users can view own QB tokens" on public.qb_tokens
  for select using (auth.uid() = user_id);

create policy "Users can manage own QB tokens" on public.qb_tokens
  for all using (auth.uid() = user_id);

create policy "Users can view own audit logs" on public.audit_logs
  for select using (auth.uid() = user_id);

-- Indexes
create index idx_invoices_user_id on public.invoices(user_id);
create index idx_invoices_status on public.invoices(qb_sync_status);
create index idx_invoices_created_at on public.invoices(created_at desc);
create index idx_qb_tokens_user_id on public.qb_tokens(user_id);
create index idx_audit_logs_user_id on public.audit_logs(user_id);

-- Function to update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger users_updated_at before update on public.users
  for each row execute function public.handle_updated_at();

create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.handle_updated_at();

create trigger qb_tokens_updated_at before update on public.qb_tokens
  for each row execute function public.handle_updated_at();