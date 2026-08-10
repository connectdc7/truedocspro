# True Docs Pro — Setup & Launch Guide

This gets your site live at **truedocspro.com** for free (aside from the domain you already own). No coding required — just account creation and copy/paste.

Total time: ~20 minutes.

---

## Part 1 — Create your backend (Supabase, free)

1. Go to **supabase.com** → sign up (free) → **New project**.
   - Name: `true-docs-pro`
   - Set a database password (save it somewhere safe)
   - Pick the region closest to you → Create project (takes ~2 min to spin up)

2. Once it's ready, go to **SQL Editor** (left sidebar) → **New query**.
   - Open the file `supabase-setup.sql` from this project
   - Paste its entire contents into the SQL editor → click **Run**
   - This creates your database tables, security rules, and the secure document storage bucket.

3. Go to **Storage** (left sidebar) → confirm you see a bucket called `client-documents` marked **Private**. (The SQL script creates this automatically — just double check it's there.)

4. Go to **Project Settings → API** (left sidebar).
   - Copy the **Project URL**
   - Copy the **anon public** key
   - You'll paste both of these into your website's settings in Part 3.

5. (Recommended) Go to **Authentication → Providers → Email** and turn **off** "Confirm email" if you want clients to get portal access immediately after signing up, or leave it **on** for extra security (they'll get a confirmation email first).

---

## Part 2 — Push the code to GitHub

1. Go to **github.com** → sign up if you don't have an account → **New repository** → name it `truedocspro` → Create.
2. On the new repo page, click **uploading an existing file** → drag in every file from this project **except** the `node_modules` folder (you likely don't have that folder anyway if you're uploading what I gave you).
3. Commit the files.

---

## Part 3 — Deploy the website (Vercel, free)

1. Go to **vercel.com** → sign up using your GitHub account.
2. Click **Add New → Project** → select your `truedocspro` GitHub repo → **Import**.
3. Before deploying, open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | (the Project URL you copied in Part 1) |
   | `VITE_SUPABASE_ANON_KEY` | (the anon public key you copied in Part 1) |
4. Click **Deploy**. In about a minute you'll get a live link like `truedocspro.vercel.app`.

---

## Part 4 — Connect your domain (truedocspro.com)

1. In your Vercel project → **Settings → Domains** → add `truedocspro.com` and `www.truedocspro.com`.
2. Vercel will show you 1–2 DNS records to add.
3. Go to wherever you bought your domain (Namecheap, GoDaddy, etc.) → DNS settings → add the records Vercel showed you.
4. DNS changes can take anywhere from a few minutes to a few hours to go live.

---

## Running your business day-to-day

- **When a client submits a document:** it appears as a new row in **Supabase → Table Editor → orders**, with status `received`.
- **To update a document's status:** open that row and change `status` to `in_process`, `ready`, or `shipped`. The client sees this update instantly in their portal.
- **The 30-day access clock** starts automatically the moment you set a document to `ready` — no action needed from you.
- **To see contact form messages:** Supabase → Table Editor → `contact_messages`.

---

## What this setup includes for free

- Unlimited pages, hosted on Vercel's free tier
- Supabase free tier: 500MB database, 1GB file storage, 50,000 monthly active users — comfortably enough to launch and grow
- Secure client login, private document storage per client, automatic 30-day access tracking

## What to budget for later, once you have paying clients

- Supabase Pro (~$25/mo) if you exceed the free tier's storage/traffic
- A staff dashboard for updating order status without touching the raw database directly (I can build this next)
- Email notifications to clients when status changes (Supabase supports this via triggers + an email service like Resend)
