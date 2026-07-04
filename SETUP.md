# FloodAid — VS Code Quickstart

Get the project running on your machine in ~5 minutes. Full details are in `README.md`;
this is the fast path.

## 0. Prerequisites
- **Node.js 18+** — check with `node -v`. If missing, install from https://nodejs.org (LTS).
- **VS Code** — https://code.visualstudio.com

## 1. Open the folder in VS Code
Unzip `floodaid.zip`, then either:
- Drag the `floodaid` folder onto VS Code, **or**
- From a terminal:
  ```bash
  cd path/to/floodaid
  code .
  ```
When VS Code opens, it will suggest installing the recommended extensions
(Tailwind, ESLint, Prettier, MongoDB) — click **Install**. They're optional but nice.

## 2. Install dependencies
Open the VS Code terminal (**View → Terminal**, or `Ctrl+``) and run:
```bash
npm install
```

## 3. Create your `.env.local`
```bash
cp .env.example .env.local     # macOS/Linux
# on Windows PowerShell:  Copy-Item .env.example .env.local
```
Then open `.env.local` and fill in the five things below. All have free tiers.

| Variable | Where to get it |
|----------|-----------------|
| `MONGODB_URI` | MongoDB Atlas → create free cluster → Connect → Drivers → copy string |
| `NEXTAUTH_SECRET` | run `openssl rand -base64 32` and paste the output |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey → Create API key |

In Supabase, also create a **public Storage bucket named `evidence`** (Storage → New bucket).

> Tip: the app still runs without a Gemini key — AI scoring falls back to a local heuristic —
> so you can get the UI up first and add the key later.

## 4. (Optional) Seed demo data
```bash
npm run seed
```
Creates three logins (password `password123`): `admin@floodaid.dev`,
`focal@floodaid.dev`, `donor@floodaid.dev`.

## 5. Run it
```bash
npm run dev
```
Open http://localhost:3000. Press `Ctrl+C` in the terminal to stop.

## Troubleshooting
- **`MONGODB_URI` error on start** → `.env.local` missing or the URI is wrong. In Atlas, make
  sure your IP is allow-listed (Network Access → Add IP → Allow from anywhere for dev).
- **Module not found** → re-run `npm install`.
- **Port 3000 in use** → run `npm run dev -- -p 3001`.
- **Images won't upload** → confirm the Supabase bucket name matches `SUPABASE_BUCKET`
  (default `evidence`) and the service role key is set.

## Push to GitHub (optional)
```bash
git init
git add .
git commit -m "Initial FloodAid commit"
git branch -M main
git remote add origin https://github.com/<you>/floodaid.git
git push -u origin main
```
`.env.local` and `node_modules` are already git-ignored, so your secrets won't be committed.
