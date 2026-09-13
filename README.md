# 🌊 Life RPG

**Small Steps · Big Changes** — turn your daily habits into an RPG progression system. Complete real-world tasks, earn currency and XP, level up your character stats, unlock badges, and customize your profile — all synced to a real backend so your progress persists across devices.


---

## ✨ Features

- **Home Dashboard** — at-a-glance view of your stats, streak, and today's habit progress
- **My Habits** — create, edit, complete, and delete daily quests, each tagged by category/attribute
- **Calendar** — visual day-by-day history of completions and full-completion streaks
- **Rewards** — badge gallery that unlocks based on stars earned and streak milestones
- **Shop** — spend earned currency on cosmetic items (themes, accents, badges) and equip them
- **Insights** — charts for weekly completion trends, daily activity, habit breakdown, and a top-habits leaderboard
- **Settings** — manage profile and preferences
- **Auth & sync** — secure sign-up/login with per-user data isolation; progress persists across sessions and devices

---

## 🏗️ Architecture

This app uses **Supabase as a Backend-as-a-Service (BaaS)** — a valid backend architecture per the allowed technology pool, not a purely client-side app.

```
Frontend (HTML/CSS/JS, hosted on Vercel)
        │
        ▼
Supabase Client SDK  ──────────────►  Supabase (Postgres + Auth + RLS)
   (js/db.js, js/auth.js)                     │
                                               ▼
                                   Server-side PL/pgSQL RPC functions:
                                   • purchase_item()  — atomic buy + balance check
                                   • sync_gold()      — recomputes currency server-side
                                   • award_xp()       — applies XP/leveling logic
                                   Row Level Security (RLS) enforces that a user
                                   can only read/write their own rows.
```

**Why this counts as a real backend:** the frontend never computes gold, XP, or item ownership directly. It only calls the RPC functions above; Supabase's Postgres server validates the request (balance checks, duplicate-purchase checks, RLS ownership checks) and returns the authoritative result. This is what prevents a user from editing client-side JS to "cheat" their stats.

A `demo mode` fallback (`localStorage`-backed) is also included so the app remains fully explorable without a configured Supabase project — see [Demo Mode](#-demo-mode) below.

---

## 📁 Project Structure

```
life-rpg-final/
├── index.html            # Entry point / auth redirect
├── landing.html          # Marketing/landing page
├── app.html              # Main SPA shell (all pages render into this)
├── css/                  # Stylesheets (theme, components)
├── js/
│   ├── config.js         # Public Supabase URL + anon key, API base config
│   ├── auth.js           # Sign up / login / session handling
│   ├── db.js             # Data access layer — wraps Supabase calls + demo mode
│   ├── app.js             # SPA router, page registry, app bootstrap
│   ├── home.js            # Home dashboard page
│   ├── habits.js          # Habits/quests CRUD page
│   ├── calendar.js        # Calendar/history page
│   ├── rewards.js         # Badge gallery page
│   ├── shop.js            # Shop — purchase & equip cosmetics
│   ├── insights.js        # Analytics & charts page
│   └── settings.js        # Profile/preferences page
├── supabase_schema.sql    # Full DB schema, RLS policies, RPC functions
├── vercel.json            # Deployment config
└── server.ps1             # Local static file server (dev only)
```

---

## 🚀 Setup Instructions

### Prerequisites
- A modern browser
- [Node.js](https://nodejs.org/) or Python (for local static serving), **or** PowerShell (Windows, via `server.ps1`)
- A free [Supabase](https://supabase.com) project (for full persistence — optional if using demo mode)

### 1. Clone the repo
```bash
git clone https://github.com/bindusmita49/life-rpg-final.git
cd life-rpg-final
```

### 2. Configure environment variables
Copy the example config and fill in your own Supabase project credentials:
```bash
cp js/config.example.js js/config.js
```
Edit `js/config.js`:
```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-PUBLIC-ANON-KEY";
const DEMO_MODE = false; // set to true to run without Supabase
```
> ⚠️ Only the **anon/public** key belongs here — never commit a service-role key to the frontend.

### 3. Set up the database
In your Supabase project's SQL editor, run the full schema:
```bash
# Paste the contents of supabase_schema.sql into the Supabase SQL Editor and run it
```
This creates all tables (`profiles`, `habits`, `logs`, `shop_items`, `owned_items`, etc.), Row Level Security policies, and the RPC functions (`purchase_item`, `sync_gold`, `award_xp`).

### 4. Run locally
Any static file server works:
```bash
# Option A — Python
python -m http.server 5500

# Option B — Node
npx serve .

# Option C — Windows PowerShell (included)
./server.ps1
```
Then open `http://localhost:5500` (or the port shown) in your browser.

### 5. Deploy
The project is pre-configured for **Vercel**:
```bash
vercel deploy
```
Add your Supabase URL/anon key as environment variables in the Vercel dashboard if you template them at build time, or keep them in `js/config.js` (public anon key is safe to expose client-side by design — protection comes from RLS, not secrecy).

---

## 🔑 Environment Variables (`.env.example`)

```env
# Supabase project credentials (safe to expose client-side; RLS enforces access control)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY

# Set to "true" to run fully offline using localStorage instead of Supabase
DEMO_MODE=false
```

---

## 🧪 Demo Mode

Set `DEMO_MODE = true` in `js/config.js` to explore the entire app — habits, shop, rewards, insights — using seeded `localStorage` data, with no Supabase project required. Useful for quick review or offline testing. **Demo mode data does not sync across devices** and is not the primary persistence path — production use relies on Supabase.

---

## 🛡️ Security Notes

- Passwords are never stored or handled directly by this app — auth is delegated to Supabase Auth.
- Row Level Security (RLS) policies ensure a user can only ever read or write their own `habits`, `logs`, `owned_items`, and `profiles` rows.
- Currency, XP, and item ownership are computed and validated server-side via Postgres RPC functions, not trusted from client input.

---

