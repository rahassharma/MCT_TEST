# Vercel + Vite deployment review

**Repo:** `rahassharma/MCT_TEST` · **Scope:** the React/Vite dashboard at the repo root (the Android half is not in this checkout — `app/` is empty)
**Reviewed:** commit `63e383b`, 20 Oct 2026

## Verdict

**The Vercel deployment mechanics are fine. The security of what gets deployed is not.**

`npm ci && npm run build` succeeds on Node 22, Vercel auto-detects Vite, and the app is a pure static SPA — no API routes, no server functions, no build-time env vars. The output is a single **778 KB** `dist/index.html` (209 KB gzip).

The blocker is that the deployed bundle contains a Supabase URL + anon key, and the app's own setup SQL enables RLS with `USING (true)` policies on `app_users` and `user_data`. That means anyone who opens the site can read **every user's plaintext password**, read all screen-time data, and insert/update/delete rows. The GitHub repo is also **public**, so the same credentials are visible without even loading the site.

Do not share the production URL until the database access model is fixed (section 2).

---

## 1. What Vercel will do

### Measured locally (Node 22.22.3, npm 10.9.8)

| Step | Result |
|---|---|
| `npm ci` | 108 packages, ~6 s |
| `npm run build` | 2,213 modules, `dist/index.html` 778.43 kB (gzip 208.97 kB), ~6 s |
| `npx tsc --noEmit` | passes (no type errors) |
| `npm run preview` / static serve | `/` → 200, `/favicon.svg` → 200, `/some-route` → **404** |
| `npm audit --omit=dev` | 0 vulnerabilities in production deps |
| `npm audit` (all) | 11 (2 low, 1 moderate, 8 high) — all in build/dev tooling, none shipped in `dist` |

### Expected Vercel behavior

Vercel detects the `vite` dependency and applies the **Vite** framework preset:

- Install: `npm ci` (lockfile is committed)
- Build: `npm run build`
- Output: `dist`
- Node: whatever the project is set to; `package.json` had no `engines`, so this was not pinned

Vite 7 requires Node `^20.19.0 || >=22.12.0`, so Node 20.x (20.19+) or 22.12+ works. I pinned **22.x** in `package.json` so the build image does not drift.

There is no router in `App.tsx`, so `/` is the only real route. A catch-all rewrite is still recommended so future client-side routes and bookmarks do not get Vercel's 404 page (today `/some-route` returns 404 instead of the app).

There was no `vercel.json` in the repo, so this all came from Vercel's auto-detection. The new file makes the build settings explicit and adds the rewrite/headers described below. If you prefer to keep those settings in the dashboard instead, the file can be deleted without changing the build.

### Project settings to verify in the Vercel dashboard

| Setting | Value |
|---|---|
| Root Directory | `.` (repo root — **not** `app/`; that folder has no `package.json`) |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | default (npm, lockfile-aware) |
| Node.js Version | 22.x |
| Production Branch | `main` |

---

## 2. Critical: the database is effectively public

### 2.1 How the pieces line up

1. `src/db/supabase.ts:14-15` hard-codes the project URL and the anon JWT. The anon key is **designed** to be shipped in a browser bundle — it is not a secret by itself.
2. `src/components/DbSetupScreen.tsx:27-40` turns RLS on and then creates:

   ```sql
   CREATE POLICY "open_user_data" ON user_data FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "open_app_users" ON app_users  FOR ALL USING (true) WITH CHECK (true);
   ```

   `USING (true)` + `WITH CHECK (true)` is equivalent to no row filtering at all: the **anon** role can `SELECT`, `INSERT`, `UPDATE`, `DELETE` every row.
3. `src/db/sync.ts:29` selects `user_key, display, role, password` from `app_users`. Passwords are stored in **plaintext** and the login page reads them into the browser.
4. The GitHub repository is public (`gh repo view` → `isPrivate: false`).

### 2.2 What an outsider can do

With only the URL and anon key — both in the public repo and in the shipped JS — a single REST call can:

- list every account and its password (`/rest/v1/app_users?select=user_key,display,role,password`);
- change any password or promote any account to admin;
- read/modify/delete any user's entire `user_data` state;
- delete accounts, create accounts, and poison requests/notifications once those tables are reachable.

You do not need to be logged in. `fetchCloudUsers()` is exactly this query, and the app itself proves it works.

### 2.3 Authentication is client-side only

`src/AuthContext.tsx` stores the logged-in user in `localStorage` (`screentime_user`) including `role`. `isAdmin` is just `user?.role === 'admin'`. Editing one localStorage value gives the admin UI. Admin-only writes then succeed because the anon role has full table access. There is no server-side check, no signed session, and no auth on Supabase.

The passwords are also copied into `localStorage` (`screentime_passwords`), so any XSS or malicious browser extension gets every family member's password in plaintext.

### 2.4 Default credentials are committed, and the two copies disagree

- `src/AuthContext.tsx:46-49` has fallback users `admin` and `rahas` with passwords.
- `src/components/DbSetupScreen.tsx:42-44` seeds a **different** admin password and a different `rahas` password.

Which password works depends on whether the cloud request succeeds. `login()` merges cloud users over local defaults (`AuthContext.tsx:117-122`), so when Supabase is slow/unreachable the app falls back to the local defaults — and on the next sync can overwrite cloud data. That is both a security problem and a "wrong password" support problem.

### 2.5 Immediate containment (in this order)

1. **Make the GitHub repo private** (Settings → General → Danger Zone → Change visibility). This stops new readers, but Git history still contains the keys.
2. **Rotate the Supabase JWT secret/API keys** (Project Settings → API → JWT Settings). The current anon JWT expires in 2095, so it will not rotate itself. Update the code/env and redeploy.
3. **Change every account password** and remove the hard-coded defaults from `AuthContext.tsx` and the setup SQL.
4. **Turn on Vercel Authentication → All Deployments** (Project → Settings → Deployment Protection). It is free on all plans as of September 2026 and makes every deployment URL require a Vercel account with access to the project. This hides the bundle, but **does not protect Supabase** from someone who already has the key. It is also a stopgap for a family dashboard if the other members do not have Vercel accounts.
5. **Fix RLS** — this is the actual fix (below). Rotating keys without fixing policies only buys time.

### 2.6 The correct long-term fix

The static app talks to Supabase directly, so it needs a real identity to scope rows to:

1. Enable **Supabase Auth** (email/password or magic link) for each family member.
2. Add a `profiles` table keyed by `auth.uid()` with the role (`admin`/`user`); do not store passwords at all — GoTrue hashes them.
3. Replace the open policies with per-user ones, for example:

   ```sql
   alter table public.user_data enable row level security;

   create policy "read own state"
     on public.user_data for select
     to authenticated
     using ((select auth.uid()) = user_id);

   create policy "write own state"
     on public.user_data for insert
     to authenticated
     with check ((select auth.uid()) = user_id);
   ```

   (You would need a `user_id uuid references auth.users(id)` column; the current `user_key text` can remain as a display key.)
4. Keep `app_users` passwords out of the client entirely. Admin actions (change role, delete user, reset password) should go through an **Edge Function / Vercel Function** that checks the caller's role server-side and uses the `service_role` key — never a `VITE_*` variable.
5. Run **Supabase Dashboard → Advisors → Security Advisor** and clear both `rls_enabled_no_policy` and `permissive_rls_policy` warnings.

This is a rewrite of `AuthContext`, not a config tweak. If that is too much right now, the honest interim position is: Vercel Authentication on, repo private, keys rotated, passwords changed — and accept that the app is only as private as the Vercel account. Do not put it on a public custom domain.

### 2.7 Verify the exposure yourself

From a machine outside the project (use your own key, do not paste it in chat):

```bash
curl "$SUPABASE_URL/rest/v1/app_users?select=user_key,display,role,password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

If rows come back, the table is open. After the RLS fix, the same request should return `[]` or an error.

---

## 3. High-priority deployment issues

### 3.1 The setup SQL creates 2 of the 6 tables the app uses

`src/db/sync.ts` queries: `user_data`, `app_users`, `app_requests`, `app_notifications`, `app_deleted_users`, `minecraft_usage`.

`DbSetupScreen.tsx` only creates the first two. The other four are missing from the provisioning SQL, and every Supabase error is swallowed (`catch { return [] }`), so on a fresh project the UI silently behaves as if there are no requests, notifications, deleted users, or device rows.

Also note that `AppInner` only shows `DbSetupScreen` when `CLOUD_ENABLED` is false. With credentials baked into the build, the screen is unreachable — a fresh Supabase project cannot be provisioned from the deployed app at all.

Suggested DDL (inferred from `sync.ts` — adjust types if the Android writer differs; `app/` is empty in this checkout):

```sql
create table if not exists public.app_requests (
  id text primary key,
  type text not null,
  user_key text not null,
  user_display text,
  status text not null,
  data jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_notifications (
  id text primary key,
  target_user_key text not null,
  from_admin text,
  message text not null,
  type text not null,
  read_by text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.app_deleted_users (
  user_key text primary key,
  reason text,
  deleted_at timestamptz default now()
);

create table if not exists public.minecraft_usage (
  user_key text not null,
  date date not null,
  minutes_played integer not null default 0,
  app_breakdown jsonb,
  last_synced timestamptz default now(),
  primary key (user_key, date)
);

create index if not exists app_requests_created_idx
  on public.app_requests (created_at desc);
create index if not exists app_notifications_target_idx
  on public.app_notifications (target_user_key, created_at desc);
create index if not exists minecraft_usage_user_date_idx
  on public.minecraft_usage (user_key, date desc);
```

These tables need the same RLS treatment as `user_data`; do not copy the `USING (true)` policies.

### 3.2 Preview deployments use production data

Because the Supabase credentials are hard-coded, **every** Vercel preview URL — including a branch deploy or a one-off test — talks to the same database as production. A preview is not a sandbox. Fix by moving the credentials to `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and scoping different values to **Production** and **Preview** in Vercel (ideally a separate Supabase project for preview). See section 5.

### 3.3 The single-file build throws away Vercel's asset caching

`vite-plugin-singlefile` inlines the JS and CSS into `dist/index.html`. I compared both builds:

| Build | Output | Gzip |
|---|---|---|
| Current (`viteSingleFile`) | `index.html` 778.43 kB | 208.97 kB |
| Normal Vite build | `index.html` 0.94 kB + `index-*.js` 706.56 kB + `index-*.css` 70.94 kB | 0.49 + 196.99 + 11.67 kB |

Total bytes are similar, but with the single file the browser must revalidate/download the whole document on every visit, and Vercel cannot serve the JS/CSS as immutable, hashed assets. With a normal build, `/assets/*` gets `max-age=31536000, immutable`, so repeat visits only fetch the 0.9 KB HTML. The normal build also removes the inline-script burden and lets you add a stricter CSP later.

Make single-file an opt-in, not the default:

```ts
// vite.config.ts
const singleFile = process.env.BUILD_SINGLE_FILE === 'true';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(singleFile ? [viteSingleFile()] : []),
  ],
  // ...
});
```

```json
"scripts": {
  "build": "vite build",
  "build:single": "cross-env BUILD_SINGLE_FILE=true vite build"
}
```

(`cross-env` only if you build from Windows; on Vercel/Linux the env prefix works as-is. You could also use Vite's `loadEnv`/`mode` instead of a process env var.)

The normal build also prints `Some chunks are larger than 500 kB`; if you want to act on it, split vendor code:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom'],
        supabase: ['@supabase/supabase-js'],
        motion: ['framer-motion'],
      },
    },
  },
},
```

### 3.4 The build does not run the type checker

`npm run build` is only `vite build`; Vite transpiles TypeScript without checking it, so type errors would deploy successfully. `tsc --noEmit` passes today. Add a `typecheck` script and run it in the build (or as a separate CI step):

```json
"build": "tsc --noEmit && vite build"
```

I added the `typecheck` script but left `build` unchanged so the deploy behaves exactly as before; switch it when you are ready.

### 3.5 No SPA fallback

Verified against the built output: `/some-route` returns 404. The app has no router today, so this is not breaking now, but any future client-side route, bookmark, or `window.location` path will hit Vercel's 404. I added the standard catch-all rewrite in `vercel.json`. If you ever enable `cleanUrls`, change the destination to `/` (Vercel's documented caveat).

### 3.6 No security headers and no indexing control

There were no custom headers. For a private dashboard, add at minimum `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy`, and `X-Robots-Tag: noindex`. I added these in `vercel.json`, plus `public/robots.txt`, a `robots` meta tag, and a favicon link.

A full Content-Security-Policy is deliberately **not** included: the current single-file build has one huge inline `<script>`, which forces `'unsafe-inline'` (or a per-build hash) and makes the policy mostly decorative. Revisit CSP after switching to the normal build.

### 3.7 The login page polls Supabase every 5 seconds

`AuthContext.tsx:94-105` runs three queries (`app_requests`, `app_notifications`, `app_deleted_users`) every 5 s, and the effect runs even when no user is logged in. That is 51,840 REST requests per day for every open login tab, plus battery/CPU on phones and unnecessary Supabase egress.

- Raise the interval to 30–60 s.
- Skip polling when `document.visibilityState === 'hidden'`.
- Better: use Supabase Realtime for requests/notifications instead of polling.

### 3.8 A transient network error can overwrite newer cloud data

`fetchUserData()` returns `null` for both "no row exists" and "the request failed" (`sync.ts:12-14`). `useStore.ts:80-95` treats `null` as "cloud is empty" and, if local state has any data, uploads the local state to the cloud.

Scenario: a device has stale local data, the network blips during the initial load, the fetch is read as "no cloud data", and the stale state overwrites the newer row. Fix by returning a discriminated result:

```ts
type FetchResult =
  | { status: 'found'; state: AppState }
  | { status: 'empty' }
  | { status: 'error'; message: string };
```

Only upload local state when `status === 'empty'`. On `error`, show `offline`/`error` and do not save.

### 3.9 Google Fonts are a third-party, render-blocking dependency

`index.html` loads Inter from `fonts.googleapis.com` plus two preconnects. That adds DNS/TLS/RTT before first paint, fails behind some networks, and sends visitor IPs to Google. For a dashboard used in India, self-hosting is a measurable win:

```bash
npm install @fontsource-variable/inter
```

```ts
// src/main.tsx
import '@fontsource-variable/inter';
```

Then remove the three Google Fonts links and keep `font-family: 'Inter', ...` in `index.css`.

---

## 4. Lower-priority findings

| Finding | Detail |
|---|---|
| `.DS_Store` is tracked | `.DS_Store` and `src/.DS_Store` are committed. Remove them (`git rm --cached`) — Vercel uploads them, and they add noise. |
| `app/` is empty | README says the Android companion app lives there, but there are 0 files. If Vercel's Root Directory is ever set to `app/`, the build fails (no `package.json`). |
| No `engines` / Node pin | Fixed: `"engines": { "node": "22.x" }`. |
| Dev-only advisories | `npm audit` reports 8 high issues in build tooling: `vite@7.3.2` (fixed in 7.3.7), `vite-plugin-singlefile@2.3.0` via `braces`/`micromatch` (fixed in 2.3.4), plus `esbuild`/`postcss` dev-server issues. They are not in `dist`, but update locally. |
| No 404 page | The catch-all rewrite serves the app for unknown paths. If you prefer a real 404, exclude paths with file extensions. |
| Title/brand mismatch | Browser title is "Screen Time"; the classic layout says "STLOG Track"; the glass layout says "Screen Time". Cosmetic. |
| Backups are limited | Free-tier backup retention is short/limited; do not rely on it as the only copy. Use the app's JSON export or a periodic `pg_dump` if the data matters. |
| Anon key expiry | The JWT's `exp` is 2095. It is not a short-lived credential; plan key rotation manually. |

---

## 5. Moving Supabase credentials to Vercel environment variables

Currently there is no runtime cloud configuration: `saveSupabaseConfig` is a no-op and unused. `Settings → Cloud → View Setup` removes the local skip flag and reloads, but `AppInner` only renders `DbSetupScreen` when `CLOUD_ENABLED` is false — so the button just reloads the dashboard. Changing the Supabase project requires editing `src/db/supabase.ts` and redeploying. Vercel env vars make this cleaner and, more importantly, let Preview and Production use different databases.

```ts
// src/db/supabase.ts
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_URL = url || 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = key || '';
export const CLOUD_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
```

Add `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Vercel: Project → Settings → Environment Variables → add both for **Production** and **Preview**, then redeploy. Vite inlines `VITE_*` values at build time, so changing a value requires a new deployment. Never put a `service_role` / secret key in a `VITE_*` variable — it will be in the bundle.

Until the auth rewrite, the anon key remains public by design; the security still comes from RLS.

---

## 6. Changes applied in this branch

| File | Change |
|---|---|
| `vercel.json` (new) | Explicit Vite build/output, SPA fallback rewrite, security headers, `noindex`, immutable caching for `/assets/*`. |
| `index.html` | Added favicon link, description, theme-color, `robots noindex`. |
| `public/robots.txt` (new) | `Disallow: /` for a private dashboard. |
| `package.json` | Pinned `engines.node` to `22.x`; added `npm run typecheck`. |
| `VERCEL_DEPLOYMENT_REVIEW.md` (new) | This document. |

Deliberately **not** changed: the Supabase auth/RLS model, the setup SQL, the single-file build, and the sync error handling. Those are behavioural changes that need your decision; the exact patches are in sections 2, 3.1, 3.3 and 3.8.

---

## 7. Recommended order of work

**Before sharing the URL (today)**

1. Repo → private.
2. Rotate Supabase keys + change all passwords.
3. Vercel → Deployment Protection → Vercel Authentication → All Deployments.
4. Fix RLS / move to Supabase Auth (section 2.6), then verify with the curl check.
5. Confirm the deployed bundle no longer grants more than it should.

**Before real use**

6. Add the four missing tables and indexes.
7. Move Supabase credentials to Vercel env vars, with separate Preview values or no preview deployments.
8. Switch off `viteSingleFile` for Vercel; add `/assets/*` caching (already configured).
9. Make `npm run build` run `tsc --noEmit`.
10. Fix the initial-sync error handling and reduce the 5 s polling.
11. Self-host Inter.

**Nice to have**

12. Vendor chunk splitting, CSP, uptime/error monitoring, Supabase backups.

---

## 8. Post-deploy verification checklist

- [ ] Production URL requires Vercel login (if Deployment Protection enabled).
- [ ] `curl -I https://<domain>` shows `x-content-type-options: nosniff`, `x-robots-tag: noindex, nofollow`.
- [ ] `https://<domain>/robots.txt` returns `Disallow: /`.
- [ ] `https://<domain>/some-route` serves the app (not Vercel's 404).
- [ ] Login works in a private window; sync indicator reaches "Synced".
- [ ] Edit a value, reload, and confirm it persists; do the same in a second browser.
- [ ] DevTools → Network: no CORS errors to `*.supabase.co`; no 401/404/`relation does not exist`.
- [ ] `curl` against `app_users` returns no password rows.
- [ ] Vercel build log shows Node 22.x and the expected 2,213 modules.
- [ ] `npm audit --omit=dev` still reports 0.

---

## 9. Bottom line

Vercel will build and serve this reliably; there is nothing exotic in the Vite setup and no server-side code to misconfigure. The deployment risk is entirely in the **data access model**: a public bundle plus permissive RLS plus plaintext passwords plus client-side roles. Fix that first; then the caching, schema-completeness, and sync issues are ordinary polish.
