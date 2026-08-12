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
  amount_cents integer not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  stripe_checkout_session_id text,
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

-- 2b. Profiles table — one row per user, tracks who is staff
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);

-- Automatically create a profile row whenever someone signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill profiles for anyone who signed up before this script existed
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- Helper function: checks if the currently logged-in user is staff.
-- security definer so it can read profiles even though profiles has RLS.
create or replace function is_staff()
returns boolean as $$
  select coalesce(
    (select p.is_staff from public.profiles p where p.id = auth.uid()),
    false
  );
$$ language sql security definer stable;

alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id or is_staff());

-- 3. Row Level Security — clients can only ever see their own orders,
-- staff (you) can see and update every order.
alter table orders enable row level security;

drop policy if exists "Users can view their own orders" on orders;
create policy "Users can view their own orders"
  on orders for select
  using (auth.uid() = user_id or is_staff());

drop policy if exists "Users can insert their own orders" on orders;
create policy "Users can insert their own orders"
  on orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Staff can update any order" on orders;
create policy "Staff can update any order"
  on orders for update
  using (is_staff());

-- Note: clients cannot update status or payment fields themselves —
-- only staff (is_staff = true) can, via the /staff dashboard in the app.

-- 4. Contact messages — anyone can submit, nobody can read from the client
alter table contact_messages enable row level security;

drop policy if exists "Anyone can submit a contact message" on contact_messages;
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
drop policy if exists "Users can upload their own documents" on storage.objects;
create policy "Users can upload their own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients can only read files inside their own folder
drop policy if exists "Users can read their own documents" on storage.objects;
create policy "Users can read their own documents"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Staff can read every client's documents
drop policy if exists "Staff can read all documents" on storage.objects;
create policy "Staff can read all documents"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and is_staff()
  );

-- ============================================================
-- Done. One more manual step: make yourself a staff member so
-- you can access the /staff dashboard in the app.
--
-- 1. Sign up for a normal account on the live website first
--    (if you haven't already), using the email you want to log
--    in with as staff.
-- 2. Then run this, replacing the email with yours:
--
--    update profiles set is_staff = true
--    where email = 'you@truedocspro.com';
--
-- After that, log in on the website and visit /staff.
-- ============================================================
