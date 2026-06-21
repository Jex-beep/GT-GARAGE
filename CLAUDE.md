# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GT Garage — a website for a real auto-repair shop in Mabalacat, Pampanga. Customers browse services, read blog posts, and book a service; the owner manages everything from an admin panel. **It is deployed and live.**

- **Frontend** — Angular 21 (standalone components, signals), plain CSS. Repo root.
- **Backend** — Node/Express (ESM) in `backend/`. The only thing the frontend talks to.
- **Data/Auth/Storage** — Supabase (Postgres + Auth + Storage). **Email** — Resend.
- **Live:** frontend on **Vercel** (`gt-garage.vercel.app`), backend on **Render** (`gt-garage-api.onrender.com`).

## Commands

```bash
# Frontend (repo root)
npm start            # ng serve → http://localhost:4200
npm run build        # ng build → dist/GTGARAGE/browser  (production by default)

# Backend (cd backend)
npm run dev          # node --watch src/server.js → http://localhost:3000 (auto-reloads)
npm start            # node src/server.js (used by Render)
```

There is no lint step and the test runner has no specs — verify changes with `npm run build` (it type-checks) and by running the app. The Angular `production` config does `fileReplacements` of `environment.ts` → `environment.prod.ts`.

## Architecture — the big picture

**All data flows frontend → `ApiService` → Express → Supabase.** The frontend never hits Supabase for data; it calls the Express API, which uses the Supabase **service-role** key. The two exceptions are auth and (historically) blog reads — see below.

- **`src/app/core/api.ts` (`ApiService`)** — the single HTTP layer. Every backend call lives here (`getServices`, `createBooking`, `trackBooking`, `listServicesAdmin`, `uploadImage`, posts/tasks CRUD, etc.). Admin calls take a Supabase access token as an argument.
- **`src/app/core/auth.ts` (`AuthService`)** — admin login via Supabase Auth using the **anon** key. Exposes `token` (the JWT) and `isLoggedIn` signals. The token is passed to `ApiService` admin methods and **verified on every admin request by the backend** (`backend/src/supabase.js` `verifyToken`).
- **`backend/src/server.js`** — one Express app. Public endpoints: `GET /api/services` (10-min in-memory cache), `POST /api/bookings` (rate-limited), `GET /api/bookings/track/:id`, `POST /api/bookings/lookup`, `GET /api/posts` (published only), `GET /sitemap.xml` (dynamic, includes posts). Admin endpoints (token-verified): bookings list/patch, `POST /api/upload`, services/posts/tasks CRUD, `GET /api/services/all`.

**Key product decision — customers are NOT emailed.** Resend's free tier can't email arbitrary recipients without a verified domain, so the customer-facing confirmation is a **booking tracking page** (`/track`, `/track/:id`), not email. On a booking, the *shop* gets a Resend email; the *customer* checks status on `/track`. Admin confirmation saves an `admin_note` (shown on the tracking page) and still attempts a customer email (works once a domain is verified). Confirming a booking also auto-creates a calendar `task` on its date.

**Admin is a tabbed SPA** (`src/app/admin/`): Bookings, Calendar, Services, Blog. The CMS editors (`services-editor`, `blog-editor`) use a Quill rich-text editor (`core/rich-editor.ts`) and image uploads that go to Supabase Storage via `POST /api/upload`. Services have a `category` (`standard | free | package`) that groups them into sections on the public Services page.

**SEO** — `core/seo.ts` (`SeoService`) sets per-page title/description/canonical/OG/Twitter and JSON-LD; `src/index.html` holds the static `AutoRepair` LocalBusiness structured data and default OG tags. Blog posts have shareable `/blogs/:slug` URLs.

## Conventions (Angular 21 — important)

- **No `.component` / `.service` / `.directive` suffix** in filenames: `home.ts` (class `Home`), `api.ts` (class `ApiService`), `reveal.ts`. Components have **separate** `.ts` + `.html` + `.css` (no inline templates).
- Page folders live **directly under `src/app/`** (e.g. `src/app/home/`), not under `pages/`. Lazy routes: `import('./home/home').then(m => m.Home)`.
- Standalone components — deps go in the component's `imports: []`.
- Design system: CSS custom properties (`--steel-900`, `--blue`, `--grad-blue`, `--font-display`, `--shimmer`, etc.) live in global `src/styles.css` `:root`. Component CSS is scoped and depends on them. Fonts: Oswald (display) + Inter (body).

## Gotchas that will bite you

- **Rich HTML is rendered via `[innerHTML]` + `DomSanitizer.bypassSecurityTrustHtml`** (blog body, service descriptions). Scoped component CSS does **not** reach `innerHTML` content — style it with `:host ::ng-deep .body …` / `.rich-desc …`. Quill is configured to emit inline styles (alignment) so formatting survives outside the editor.
- **No horizontal scroll** is enforced by `html { overflow-x: hidden }` + `body { overflow-x: clip }`. `overflow-x: hidden` does **not** clip `position: fixed` elements (this caused a real mobile bug) — the mobile nav drawer uses `display: none` when closed, not an off-screen transform.
- **Database migrations are manual.** The service-role key can't run DDL, so schema changes are `.sql` files in `backend/` that **the user runs in the Supabase SQL Editor**. Deploying backend code that `SELECT`s a not-yet-added column breaks the live API — always confirm the migration is run first. New columns also need adding to the relevant `select(...)` in `server.js` and the zod schema in `schema.js`.
- **Two keys, don't mix them:** Supabase **service-role** key → `backend/.env` only. Supabase **anon/publishable** key → `src/environments/*.ts` (safe, RLS-protected).
- **CORS** reads `FRONTEND_ORIGIN` as a comma-separated list (localhost + the deployed site). **Backend on Render free tier sleeps after 15 min** — `ApiService.warmup()` pings it on app load and a GitHub Action (`.github/workflows/keep-warm.yml`) keeps it alive.
- **The deployed `siteUrl`/`apiUrl`** are baked into `environment.prod.ts` at build time (no runtime env on the static frontend). Changing the domain means editing `environment.prod.ts`, `index.html`, `public/sitemap.xml`, `public/robots.txt`, and Render's `FRONTEND_ORIGIN`/`SITE_URL`.
- This is a **Windows** dev box; git is configured so the editor preview and CRLF warnings are normal.
