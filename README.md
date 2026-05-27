# The Job Ledger — Vintage Job Application Tracker (PWA)

A simple, paper-vintage PWA to track Indian government / private job notifications.

- **Public view**: anyone can see jobs, deadlines, status, countdowns, and apply links.
- **Admin view** (`/admin/login`): one user (`bidyadhar`) can add, edit, mark applied / delete.
- **Smart Paste (AI)**: paste any notification text → Gemini extracts job name, dates, link.
- **Installable PWA**: add to home screen on Android / iOS.

---

##  Tech stack

| Layer       | Tech                                         |
| ----------- | -------------------------------------------- |
| Frontend    | React (CRA) + Tailwind + Radix UI            |
| Database    | Supabase Postgres                            |
| Auth        | Supabase Auth (email/password)               |
| AI parser   | Google Gemini via Vercel Serverless Function |
| Hosting     | Vercel (static build + `/api`)               |

---

##  1 · Setup Supabase (one-time, 3 minutes)

1. Open your project: <https://wxuroihkqxjxhxkobtzx.supabase.co>
2. Go to **SQL Editor** → **New query** → paste the entire contents of [`supabase-schema.sql`](./supabase-schema.sql) → **Run**. This creates the `jobs` table, RLS policies, and triggers.
3. Go to **Authentication → Users → Add user → Create new user**:
   - **Email**: `bidyadhar@joblegder.app`
   - **Password**: `Bidyadhar1!`
   - **Auto Confirm User**: ✅ ON
   - Click **Create user**.

That's it for Supabase. ✅

---

##  2 · Deploy to Vercel (one-time)

1. Push this repo to GitHub (use Emergent's **Save to GitHub** button, or `git push`).
2. Go to <https://vercel.com/new> → import your `application-tracker` repo.
3. In the import screen set:
   - **Framework Preset**: `Create React App` (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn build` *(default)*
   - **Output Directory**: `build` *(default)*
4. Click **Environment Variables** and add the following (copy from `frontend/.env.example`):

| Key                          | Value                                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| `REACT_APP_SUPABASE_URL`     | `https://wxuroihkqxjxhxkobtzx.supabase.co`                             |
| `REACT_APP_SUPABASE_ANON_KEY`| `sb_publishable_T7QTHw9484ymee1q1AyAGw_ZAbWfGeR`                        |
| `REACT_APP_ADMIN_EMAIL`      | `bidyadhar@joblegder.app`                                              |
| `GEMINI_API_KEY`             | *(your free key from <https://aistudio.google.com/app/apikey>)*        |
| `GEMINI_MODEL`               | `gemini-2.0-flash`                                                     |

5. Click **Deploy**. Done.

> **Note**: If you skip `GEMINI_API_KEY`, the rest of the app still works — only the Smart Paste AI button will show an error until you add the key.

---

##  3 · Use the app

- **Public**: `https://your-app.vercel.app/`
- **Admin login**: `https://your-app.vercel.app/admin/login`
  - Username: `bidyadhar`
  - Password: `Bidyadhar1!`
- **Install as app**: On Android Chrome, tap menu → “Add to home screen”. On iPhone Safari, tap Share → “Add to Home Screen”.

---

##  4 · Local development

```bash
cd frontend
yarn install
yarn start    # opens http://localhost:3000
```

Note: The `/api/smart-parse` serverless function only runs on Vercel. For local AI testing run `npx vercel dev` in the `frontend/` folder.

---

##  5 · Project structure

```
repo-root/
├── frontend/              # ← Vercel Root Directory
│   ├── api/
│   │   └── smart-parse.js # Vercel serverless function (AI)
│   ├── public/            # PWA manifest, icons, service worker
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabase.js  # Supabase client
│   │   │   └── api.js       # CRUD + auth helpers
│   │   ├── pages/           # Landing, AdminLogin, AdminDashboard
│   │   └── components/      # JobCard, JobFormModal, SmartPasteModal, ...
│   ├── vercel.json
│   └── package.json
├── backend/               # (legacy FastAPI — not used on Vercel)
└── supabase-schema.sql    # one-time SQL to run in Supabase
```
