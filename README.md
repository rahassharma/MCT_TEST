# STLOG Track

This repo now holds both halves of the screen-time system:

- **`/`** (this root) — the web dashboard: React + Vite + TypeScript, synced to Supabase.
  `npm install && npm run dev` to run it.
- **`/app`** — the Android companion app ("MC Tracker" + the Guardian extension: face-verified
  limit enforcement, app freezing, PIN bonus time). Open `app/` as its own project in Android
  Studio — it has its own Gradle build and is independent of the web app's `npm`/Vite setup.
  See `app/README.md` and `app/GUARDIAN_README.md`.

Both halves talk to the same Supabase project (`src/db/supabase.ts` on the web side,
`app/app/src/main/java/com/screentime/mctracker/guardian/GuardianConfig.kt` on the Android
side) — the phone logs usage and the dashboard reads/displays it, and they share the same
`user_data`/penalty-and-behavior-score logic (ported 1:1 into Kotlin — see
`app/app/src/main/java/.../guardian/PenaltyEngine.kt`).

`/app` carries its own git history (it was previously a separate repo, `MCT`) — moved in here
as a plain subfolder, not a submodule, so a `git log` on it won't show through this repo's own
history unless/until that's merged deliberately.
