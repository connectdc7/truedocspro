-- ============================================================
-- True Docs Pro — Supabase setup
-- Run this once in your Supabase project's SQL editor:
-- Dashboard → SQL Editor → New query → paste all of this → Run
-- ============================================================

-- 1. Orders table (one row per submitted document)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null check (service in ('notary', 'apostille', 'embassy')),
  document_name text not null,
  notes text,
  file_path text not null,
  status text not null default 'received' check (status in ('received', 'in_process', 'ready', 'shipped')),
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automatically stamp ready_at the first time a document reaches "ready"
-- (this is what starts the 30-day access countdown)
create or replace function set_ready_at()
returns trigger as $$
begin
  if new.status in ('ready', 'shipped') and old.ready_at is null then
    new.ready_at = now();
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_ready_at on orders;
create trigger trg_set_ready_at
  before update on orders
  for each row execute function set_ready_at();

-- 2. Contact messages table (from the public contact form)
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- 3. Row Level Security — clients can only ever see their own orders
alter table orders enable row level security;

create policy "Users can view their own orders"
  on orders for select
  using (auth.uid() = user_id);

create policy "Users can insert their own orders"
  on orders for insert
  with check (auth.uid() = user_id);

-- Note: clients should NOT be able to change status themselves —
-- that's done by you (staff) from the Supabase Table Editor, or a
-- future admin dashboard, using the service role key.

-- 4. Contact messages — anyone can submit, nobody can read from the client
alter table contact_messages enable row level security;

create policy "Anyone can submit a contact message"
  on contact_messages for insert
  with check (true);

-- ============================================================
-- 5. Storage bucket for uploaded documents
-- Go to Storage in the sidebar and create a bucket named:
--   client-documents
-- Set it to PRIVATE (do not make it public).
-- Then run the policies below.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

-- Clients can upload only into a folder named after their own user id
create policy "Users can upload their own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients can only read files inside their own folder
create policy "Users can read their own documents"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Done. Staff workflow for updating a document's status:
-- Table Editor → orders → click a row → change "status" →
-- 'received' / 'in_process' / 'ready' / 'shipped' → Save.
-- The 30-day countdown starts automatically the moment a row
-- first becomes 'ready'.
-- ============================================================
