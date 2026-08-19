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
  is_expedited boolean not null default false,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add any columns that were introduced after the table was first created.
-- (CREATE TABLE IF NOT EXISTS above only fires the very first time this
-- script runs — these ALTER statements are what actually apply new
-- columns to an orders table that already existed.)
alter table orders add column if not exists amount_cents integer not null default 0;
alter table orders add column if not exists is_expedited boolean not null default false;
alter table orders add column if not exists payment_status text not null default 'unpaid';
alter table orders add column if not exists stripe_checkout_session_id text;
alter table orders add column if not exists requested_documents text;
alter table orders add column if not exists request_status text not null default 'none';
alter table orders add column if not exists contact_name text;
alter table orders add column if not exists company_name text;
alter table orders add column if not exists contact_phone text;
alter table orders add column if not exists destination_country text;
alter table orders add column if not exists needed_by_date date;

-- Internal processing pipeline (staff-only, not shown to clients).
-- A document is only ever actively "in" one stage at a time (current_stage,
-- 1-4), but staff can pre-fill dates/selections for stages it hasn't
-- reached yet.
alter table orders add column if not exists current_stage integer not null default 1;
alter table orders add column if not exists notary_start_date date;
alter table orders add column if not exists notary_complete_date date;
alter table orders add column if not exists sos_stage_state text;
alter table orders add column if not exists sos_start_date date;
alter table orders add column if not exists sos_complete_date date;
alter table orders add column if not exists state_dept_start_date date;
alter table orders add column if not exists state_dept_complete_date date;
alter table orders add column if not exists embassy_stage_country text;
alter table orders add column if not exists embassy_start_date date;
alter table orders add column if not exists embassy_complete_date date;
alter table orders add column if not exists mail_in boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_current_stage_check') then
    alter table orders add constraint orders_current_stage_check
      check (current_stage between 1 and 4);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_request_status_check'
  ) then
    alter table orders add constraint orders_request_status_check
      check (request_status in ('none', 'requested', 'fulfilled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_payment_status_check'
  ) then
    alter table orders add constraint orders_payment_status_check
      check (payment_status in ('unpaid', 'paid', 'refunded'));
  end if;
end $$;

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

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists title text;

-- Now that profiles exists, add the order assignment column (references it)
alter table orders add column if not exists assigned_to uuid references profiles(id) on delete set null;
alter table orders add column if not exists document_type text not null default 'personal';
alter table orders add column if not exists embassy_fee_cents integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_document_type_check') then
    alter table orders add constraint orders_document_type_check
      check (document_type in ('personal', 'business'));
  end if;
end $$;

-- Embassy fee schedule — staff-maintained, since these vary by country,
-- by personal vs. business document, and change over time. Clients see
-- and get charged whatever staff has entered here. (RLS policies for
-- this are set further below, once the is_staff() helper exists.)
create table if not exists embassy_fees (
  country text not null,
  document_type text not null check (document_type in ('personal', 'business')),
  fee_cents integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (country, document_type)
);

-- 2c. Blog posts
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content text not null,
  author text not null default 'True Docs Pro Team',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2d. Newsletter subscribers (for the free blog subscription / lead capture)
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- 2e. Extra supporting documents — used when staff requests something
-- additional from a client, and the client uploads it in response.
create table if not exists order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  file_path text not null,
  file_name text,
  uploaded_by text not null check (uploaded_by in ('client', 'staff')),
  created_at timestamptz not null default now()
);

-- 2f. Additional pass-through fees (Secretary of State, embassy, etc.)
-- added by staff after the order is submitted, since these vary and
-- aren't known at checkout time. Billed to the client separately.
create table if not exists order_fees (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  description text not null,
  amount_cents integer not null,
  paid boolean not null default false,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

alter table order_attachments add column if not exists category text not null default 'supporting';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_attachments_category_check') then
    alter table order_attachments add constraint order_attachments_category_check
      check (category in ('supporting', 'return_label'));
  end if;
end $$;

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

-- Link orders to profiles explicitly so the staff dashboard can pull in
-- each order's client email in a single query.
alter table orders drop constraint if exists orders_user_id_profiles_fkey;
alter table orders add constraint orders_user_id_profiles_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

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

drop policy if exists "Staff can update any profile" on profiles;
create policy "Staff can update any profile"
  on profiles for update
  using (is_staff());

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

drop policy if exists "Users can delete their own orders" on orders;
create policy "Users can delete their own orders"
  on orders for delete
  using (auth.uid() = user_id and status = 'received');

drop policy if exists "Staff can update any order" on orders;
create policy "Staff can update any order"
  on orders for update
  using (is_staff());

drop policy if exists "Staff can delete any order" on orders;
create policy "Staff can delete any order"
  on orders for delete
  using (is_staff());

-- 3b. Blog posts — anyone can read published posts, only staff can write
alter table posts enable row level security;

drop policy if exists "Anyone can view published posts" on posts;
create policy "Anyone can view published posts"
  on posts for select
  using (published = true or is_staff());

drop policy if exists "Staff can insert posts" on posts;
create policy "Staff can insert posts"
  on posts for insert
  with check (is_staff());

drop policy if exists "Staff can update posts" on posts;
create policy "Staff can update posts"
  on posts for update
  using (is_staff());

drop policy if exists "Staff can delete posts" on posts;
create policy "Staff can delete posts"
  on posts for delete
  using (is_staff());

-- 3c. Newsletter subscribers — anyone can subscribe, only staff can view the list
alter table subscribers enable row level security;

drop policy if exists "Anyone can subscribe" on subscribers;
create policy "Anyone can subscribe"
  on subscribers for insert
  with check (true);

drop policy if exists "Staff can view subscribers" on subscribers;
create policy "Staff can view subscribers"
  on subscribers for select
  using (is_staff());

-- 3c-b. Embassy fee schedule — anyone can read it (needed at checkout
-- time before an order even exists), only staff can edit it.
alter table embassy_fees enable row level security;

drop policy if exists "Anyone can view embassy fees" on embassy_fees;
create policy "Anyone can view embassy fees"
  on embassy_fees for select
  using (true);

drop policy if exists "Staff can manage embassy fees" on embassy_fees;
create policy "Staff can manage embassy fees"
  on embassy_fees for all
  using (is_staff())
  with check (is_staff());

-- 3d. Order attachments — client sees/uploads only for their own orders,
-- staff sees and uploads for every order.
alter table order_attachments enable row level security;

drop policy if exists "Users can view attachments on their own orders" on order_attachments;
create policy "Users can view attachments on their own orders"
  on order_attachments for select
  using (
    is_staff()
    or exists (
      select 1 from orders o where o.id = order_attachments.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Users can upload attachments to their own orders" on order_attachments;
create policy "Users can upload attachments to their own orders"
  on order_attachments for insert
  with check (
    uploaded_by = 'client'
    and exists (
      select 1 from orders o where o.id = order_attachments.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Staff can upload attachments to any order" on order_attachments;
create policy "Staff can upload attachments to any order"
  on order_attachments for insert
  with check (is_staff());

drop policy if exists "Staff can delete attachments" on order_attachments;
create policy "Staff can delete attachments"
  on order_attachments for delete
  using (is_staff());

-- 3e. Additional fees — staff manage them fully, clients can view (and
-- later pay) fees on their own orders only.
alter table order_fees enable row level security;

drop policy if exists "Staff can manage fees" on order_fees;
create policy "Staff can manage fees"
  on order_fees for all
  using (is_staff())
  with check (is_staff());

drop policy if exists "Users can view fees on their own orders" on order_fees;
create policy "Users can view fees on their own orders"
  on order_fees for select
  using (
    exists (select 1 from orders o where o.id = order_fees.order_id and o.user_id = auth.uid())
  );

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

-- Clients can delete files inside their own folder (used when deleting
-- their own order/document from the portal)
drop policy if exists "Users can delete their own documents" on storage.objects;
create policy "Users can delete their own documents"
  on storage.objects for delete
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

-- Staff can delete documents (used when deleting an order)
drop policy if exists "Staff can delete documents" on storage.objects;
create policy "Staff can delete documents"
  on storage.objects for delete
  using (
    bucket_id = 'client-documents'
    and is_staff()
  );

-- Staff can upload documents into any client's folder (e.g. attaching
-- something on a client's behalf)
drop policy if exists "Staff can upload documents" on storage.objects;
create policy "Staff can upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'client-documents'
    and is_staff()
  );

-- ============================================================
-- Enable live updates: when staff changes an order, clients
-- viewing that order see it update instantly without refreshing.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'order_fees'
  ) then
    alter publication supabase_realtime add table order_fees;
  end if;
end $$;

-- ============================================================
-- Seed a few starter blog posts so the blog isn't empty on launch.
-- Safe to re-run — skips any slug that already exists.
-- ============================================================

insert into posts (slug, title, excerpt, content, author, published) values
(
  'apostille-convention-2026-new-members',
  'Algeria and Vietnam Just Joined the Apostille Convention — Here''s What Changes',
  'Two more countries have signed on to the Hague Apostille Convention this year, which means faster, cheaper document authentication for anyone sending paperwork to Algeria or Vietnam.',
  'The Hague Apostille Convention keeps growing, and two of the newest members affect a lot of families and businesses directly.

Algeria formally joined the Convention, with the change taking effect July 9, 2026. Before this, anyone sending a U.S. document to Algeria — a birth certificate, a power of attorney, a business record — needed full embassy legalization: a multi-step chain running through the state government, the U.S. Department of State, and finally the Algerian embassy. Now, a single apostille certificate does the job.

Vietnam is next. The country deposited its accession paperwork at the end of 2025, and the Convention officially takes effect there on September 11, 2026. Once that date passes, documents headed to Vietnam switch from embassy legalization to the much simpler apostille process too.

As of mid-2026, the Apostille Convention now covers 129 to 130 member countries (sources differ slightly depending on when they were last updated), including most of Europe, Canada, China, Japan, South Korea, and a growing list of countries across Africa and the Middle East.

**Why this matters if you have documents pending:** if your destination country recently joined, you may now qualify for the faster, cheaper apostille route instead of full embassy legalization — worth double-checking before you submit anything. If you''re not sure which category your destination country falls into, that''s exactly what we sort out for you when you submit a document with us.

*Sources: Envoy Global, Mayo Law, Erickson Immigration Group, ApostilleHub.help*',
  'True Docs Pro Team',
  true
),
(
  'uscis-evidence-standards-2026',
  'USCIS Can Now Deny Applications Without a Warning First — What That Means for You',
  'A policy change in August 2026 lets USCIS officers deny incomplete applications outright, instead of first giving applicants a chance to fix missing paperwork. Here''s why getting documents right the first time matters more than ever.',
  'On August 5, 2026, USCIS issued new guidance that changes something a lot of applicants have relied on for years.

Previously, if an application was missing required evidence, an officer would typically issue a Request for Evidence (RFE) or a Notice of Intent to Deny (NOID) — essentially a heads-up giving the applicant a chance to submit what was missing before a final decision. Under the new guidance, officers now have the discretion to deny an application outright if it''s missing required initial evidence, with no RFE or NOID first.

This follows a broader pattern of policy changes through 2026. In May, USCIS clarified that adjustment of status (the process of getting a green card from inside the U.S.) is treated as a discretionary, case-by-case decision rather than a routine formality, with consular processing abroad positioned as the more standard path for many applicants.

**What this means practically:** there''s much less room for error than there used to be. A missing notarization, an apostille that wasn''t obtained correctly, or a document authentication step done out of order can now result in an outright denial rather than a second chance to fix it.

If you''re preparing documents for any immigration filing, it''s worth having your notarizations, apostilles, or embassy legalizations double-checked before submission rather than after a denial.

*Sources: USCIS Policy Manual, Office of Visa and Immigration Services (Dartmouth), Klasko Immigration Law Partners*',
  'True Docs Pro Team',
  true
),
(
  'apostille-vs-embassy-legalization',
  'Apostille or Embassy Legalization? How to Tell Which One You Actually Need',
  'The two most common questions we get: what''s the difference, and which one does my document need? Here''s the short answer.',
  'This is the single most common question clients ask us, so here''s the plain version.

**The one question that decides everything:** is your destination country a member of the Hague Apostille Convention?

**If yes** — as of 2026, that''s roughly 129–130 countries, including most of Europe, Canada, Japan, South Korea, Australia, and recent additions like Algeria and (starting September 2026) Vietnam — you only need an **apostille**. It''s a single certificate issued by the relevant state authority, and every other member country accepts it without any further steps.

**If no** — countries like Canada (a common misconception — Canada is not actually a Hague member for this purpose in the same way some assume), the UAE, and several others — your document needs **full embassy legalization**. That''s a multi-step chain: notarization, then county or state-level authentication, then U.S. Department of State authentication, and finally, legalization by the destination country''s embassy or consulate.

**A quick way to think about it:**
- Apostille = one stamp, one step, done.
- Embassy legalization = several stamps, several stops, several weeks.

If you''re not sure which category your destination country falls into, that''s exactly the kind of thing we check for you the moment you submit a document — no guesswork required on your end.',
  'True Docs Pro Team',
  true
)
on conflict (slug) do nothing;

insert into posts (slug, title, excerpt, content, author, published) values
(
  'electronic-apostilles-2026',
  'The State Department Now Issues Electronic Apostilles — Here''s What That Means',
  'As of mid-2026, U.S. federal apostilles can be issued digitally, with a verifiable electronic seal. It runs alongside the paper process, not instead of it — here''s when each one applies.',
  'A quietly significant change landed this year: as of mid-2026, the U.S. Department of State began issuing **electronic apostilles (e-Apostilles)** — a digital version of the traditional paper certificate, carrying a secure digital signature and an electronic seal that the receiving country can verify online.

**What hasn''t changed:** this runs alongside the existing paper apostille process, not in place of it. Most state-level apostilles (the ones issued by a Secretary of State''s office for documents like birth certificates or diplomas) are still paper-only for now — e-Apostilles apply specifically to federal-level documents processed through the State Department.

**What to check before relying on one:** not every destination country or receiving authority accepts the electronic version yet. If you''re submitting a document for a visa application, a university, or a government office abroad, it''s worth confirming with them directly whether they''ll accept an e-Apostille before treating it as a substitute for the paper original.

**Why this matters for planning:** the U.S. Department of State''s Office of Authentications has historically had faster turnaround for straightforward cases once a document is correctly prepared. As e-Apostilles roll out more broadly, that speed advantage may extend further — but only for the federal documents this currently covers.

If you''re not sure whether your document qualifies for the electronic process or needs the traditional paper apostille, that''s exactly the kind of thing we sort out when you submit it with us.

*Source: VisaMet, 2026 Apostille & Document Legalization Guide*',
  'True Docs Pro Team',
  true
),
(
  'remote-online-notarization-2026',
  'Remote Online Notarization Is Now Legal Almost Everywhere — Is It Right for Your Document?',
  'Nearly every state now permits notarizing a document over video call instead of in person. Convenient, but not universally accepted — here''s what to know before you rely on it.',
  'Remote online notarization (RON) — getting a document notarized over a live video call instead of in person — has gone from a pandemic-era workaround to standard practice almost everywhere.

**Where things stand in 2026:** depending on the source, somewhere between 47 and 49 states plus Washington, D.C. now permit some form of RON, with California phasing in its own program through 2030 as the last major holdout. In practice, that means the overwhelming majority of the country now allows it in at least some circumstances.

**How it actually works:** you appear before a commissioned online notary via real-time audio-video, verify your identity (often through knowledge-based questions, ID document analysis, or biometric verification), and the notary completes the notarization digitally — with the entire session recorded and retained as required by law.

**The catch:** "legal in your state" doesn''t automatically mean "accepted for your specific document or by the receiving party." Real estate closings, certain court filings, and documents headed to a receiving party unfamiliar with RON can still run into friction — some banks, courts, or foreign authorities simply aren''t set up to accept it yet, regardless of what your state allows.

**Worth watching:** a federal bill, the SECURE Notarization Act, is currently working its way through Congress. If passed, it would set national minimum standards and require every state to recognize RON notarizations performed anywhere else — effectively closing the remaining gaps in one move.

**Our take:** RON is genuinely convenient for straightforward documents, but if yours is headed to an embassy, a foreign government office, or anywhere with strict authentication chains, an in-person notarization is still the safer starting point. If you''re not sure which applies to you, ask us before you book anything.

*Sources: NotaryLive, Finest Closing Services*',
  'True Docs Pro Team',
  true
)
on conflict (slug) do nothing;

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
