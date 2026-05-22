# 2026 MDW Open — Setup Guide

Your golf tournament app, ready to deploy. No login required for your friends — just open the link.

---

## Step 1 — Set up Supabase (free database, ~5 min)

1. Go to **supabase.com** → Sign up free → Create a new project
2. Give it a name (e.g. "mdw-open") and set a password (save it)
3. Wait ~2 minutes for it to provision
4. Click **SQL Editor** in the left sidebar
5. Paste the following SQL and click **Run**:

```sql
create table if not exists tournament_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table tournament_state enable row level security;
create policy "public read" on tournament_state for select using (true);
create policy "public write" on tournament_state for all using (true);

create table if not exists chat_messages (
  id bigserial primary key,
  tournament_id text not null,
  name text not null,
  text text not null,
  time text not null,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "public read" on chat_messages for select using (true);
create policy "public write" on chat_messages for all using (true);
```

6. Go to **Project Settings → API**
7. Copy your **Project URL** and **anon public** key
8. Open `src/supabase.js` and replace:
   - `YOUR_SUPABASE_URL` → your Project URL
   - `YOUR_SUPABASE_ANON_KEY` → your anon public key

---

## Step 2 — Push to GitHub (~3 min)

1. Go to **github.com** → Sign up / log in → Click **New repository**
2. Name it `mdw-open`, keep it public, click **Create repository**
3. On the next page click **uploading an existing file**
4. Upload ALL files from this folder (keep the folder structure)
5. Click **Commit changes**

---

## Step 3 — Deploy on Vercel (free, ~2 min)

1. Go to **vercel.com** → Sign up with your GitHub account
2. Click **Add New Project** → select your `mdw-open` repo
3. Leave all settings as default → click **Deploy**
4. Done! Vercel gives you a URL like `mdw-open.vercel.app`

---

## Step 4 — Tournament Day

1. Open your Vercel URL
2. Add all 12 players and their handicap indexes
3. Hit **TEE IT UP**
4. Share the Vercel URL in your group chat
5. Everyone opens it, picks their name, and enters their own scores

No accounts. No downloads. Just the link. 🍺⛳

---

## How the app works

- **Leaderboard** — Live net (handicap-adjusted) and gross scores, auto-updates in real time
- **My Card** — Each player can only edit their own scorecard
- **Chat** — Live group trash talk built in
- **Course** — Stonebridge pars (Par 70) pre-loaded, handicaps calculated using Rating 71.0 / Slope 127

---

## Questions?

Just come back to the Claude chat and ask!
