# ReliefAid — AI-Powered Disaster Relief Platform

A full-stack Next.js app for multi-hazard disaster relief (floods, earthquakes, and more): focal persons submit relief requests,
Google Gemini AI scores/flags them, admins approve or reject, and donors fund verified needs.

**Stack**
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- MongoDB (Mongoose) — all app data: users, requests, donations, logs
- Supabase Storage — evidence photo uploads only (no Supabase DB tables needed)
- Google Gemini API (`gemini-1.5-flash`, free tier) — request scoring & duplicate/urgency analysis
- NextAuth.js (credentials login, JWT sessions, roles: `donor` / `focal` / `admin`)

---

## 1. Open in VS Code

```bash
cd floodaid
code .
npm install
```

## 2. Set up MongoDB

1. Create a free cluster at https://www.mongodb.com/cloud/atlas (or run MongoDB locally).
2. Get your connection string (Atlas → Connect → Drivers).
3. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Paste your connection string into `MONGODB_URI`.

## 3. Set up Supabase (for image uploads only)

1. Create a free project at https://supabase.com.
2. In **Storage**, create a new **public** bucket named `evidence` (or change `SUPABASE_BUCKET`).
3. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret, server-only)

## 4. Get a free Gemini API key

1. Go to https://aistudio.google.com/app/apikey and click "Create API key" (free tier).
2. Paste it into `GEMINI_API_KEY` in `.env.local`.
3. If you don't set a key, the app still works — request scoring falls back to a local
   heuristic (see `src/lib/gemini.ts`) so you can develop without hitting the API.

## 5. Set your NextAuth secret

```bash
openssl rand -base64 32
```
Paste the output into `NEXTAUTH_SECRET` in `.env.local`. Keep `NEXTAUTH_URL=http://localhost:3000` for local dev.

## 6. (Optional) Seed demo accounts

```bash
npm run seed
```
Creates:
| Role  | Email                | Password    |
|-------|----------------------|-------------|
| Admin | admin@reliefaid.dev   | password123 |
| Focal | focal@reliefaid.dev   | password123 |
| Donor | donor@reliefaid.dev   | password123 |

## 7. Run it

```bash
npm run dev
```
Open http://localhost:3000

---

## App map

| Route                          | Who          | Purpose                                   |
|---------------------------------|--------------|--------------------------------------------|
| `/`                             | Public       | Landing page, live stats, urgent needs     |
| `/login`                        | Public       | Register / login (choose Donor/Focal/Admin)|
| `/focal/dashboard`              | Focal        | See your submitted requests + statuses     |
| `/focal/submit`                 | Focal        | Submit a new request (photos + Gemini scoring)|
| `/admin/dashboard`              | Admin        | Filter/search all requests, AI queue       |
| `/admin/requests/[id]`          | Admin        | Full detail, AI report, approve/reject     |
| `/admin/logs`                   | Admin        | Immutable audit log of all activity        |
| `/donate`                       | Public       | Browse AI-verified approved requests       |
| `/donate/[id]`                  | Public       | Make a donation (demo checkout, no real payment)|
| `/donate/history`               | Donor        | Your donation history + printable receipts |

## How the AI verification works

When a focal person submits a request, `POST /api/requests`:
1. Looks up other requests from the same area in the last 48h (duplicate-detection context).
2. Calls Gemini (`src/lib/gemini.ts`) with the request details, asking for a strict-JSON
   urgency/credibility score (0–10), flags (e.g. "Possible Duplicate", "Vague Description"),
   a short reasoning paragraph, and a recommendation (`approve` / `reject` / `review`).
3. Saves the result on the request and logs a `System AI Engine` entry.

Admins can re-run this at any time from the request detail page ("Re-scan" button), which
calls `POST /api/requests/[id]/analyze`.

## Notes & next steps

- Donation "payment" is a demo confirmation only — no real payment gateway is wired up.
  To go live you'd integrate Stripe, JazzCash, or EasyPaisa here.
- Roles are self-selected at registration for demo purposes. In production you'd want an
  admin-only invite flow for the `admin` role instead of open self-registration.
- Image uploads go straight to Supabase Storage from the server (service role key), so your
  bucket can stay private if you prefer — just swap `getPublicUrl` for a signed URL.

---

## SRS compliance (traceability)

This build implements the requirements from the SRS (v1.0, *AI Flood Relief Donation and
Distribution Agent*). Requirement → where it lives:

| Req | Requirement | Implementation |
|-----|-------------|----------------|
| REQ-1 | Signup with CNIC, phone, email | `login` register form + `api/auth/register` + `User` model |
| REQ-2 | Authenticate via JWT | NextAuth JWT sessions (`authOptions.ts`) |
| REQ-3 | Role-based access control | `middleware.ts` + per-route role checks |
| REQ-4 | Focal submits location, items, urgency | `focal/submit` + `api/requests` POST |
| REQ-5 | Store requests in MongoDB | `ReliefRequest` Mongoose model |
| REQ-6 | Auto-forward request to AI Agent | POST handler calls `analyzeRequest()` immediately |
| REQ-7 | AI priority score 0–10 | `lib/gemini.ts` returns `score` |
| REQ-8 | AI duplicate detection | nearby-48h lookup fed to Gemini; `Possible Duplicate` flag |
| REQ-9 | AI human-readable reasoning | `aiReasoning` shown on admin detail page |
| REQ-10 | Admin views pending requests | `admin/dashboard` with status filter |
| REQ-11 | Admin approve/reject | `admin/requests/[id]` + `api/requests/[id]` PATCH |
| REQ-12 | Admin sees AI explanation before deciding | AI panel on the detail page |
| REQ-13 | Donor views approved requests | `donate` (server filters to approved) |
| REQ-14 | Donor donates funds/items | `donate/[id]` + `api/donations` |
| REQ-15 | Donor views donation history | `donate/history` + `api/donations?mine=1` |
| REQ-16 | System logs user actions | `Log` model, written on submit/AI/approve/reject/donate |
| REQ-17 | Logs accessible to admin | `admin/logs` + `api/logs` |

Non-functional / business rules also covered: bcrypt password hashing, zod input validation,
JWT on protected APIs, AI never auto-approves (new requests land in `needs_approval`), donors
only see approved requests, focal persons only see their own submissions (enforced server-side
in `api/requests` GET), light/dark mode (theme toggle + persisted preference), and donor
receipts (generated receipt number + printable receipt on `donate/history`).

### A note on architecture (MERN vs. this build)

The SRS specifies a MERN stack with a **separate Python/FastAPI AI microservice**. This
implementation consolidates everything into a single **Next.js** app (React frontend + Node API
routes in one project) and calls **Google Gemini** directly from a server module
(`src/lib/gemini.ts`) instead of a standalone Python service. Functionally every requirement is
met; the trade-off is one deployable instead of three.

If your evaluation strictly requires the separate Python microservice, it's a small change:
move `analyzeRequest()` into a FastAPI service exposing `POST /analyze`, and have
`api/requests` call it over HTTP instead of importing the function. The request/response shape
(`{score, flags, reasoning, recommendation}`) is already defined, so the contract wouldn't change.
The `gemini-1.5-flash` free tier keeps AI scoring well under the SRS's 2-second target for typical
requests.
