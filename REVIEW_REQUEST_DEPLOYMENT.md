# Extension Review Page — What You Need To Do

**TL;DR: nothing new to add to env. Just push the code.** This feature reuses the SMTP, Mongo, and `AUTH_SECRET`/`APP_URL` config you already have in `.env.local` / your production env. No new env vars, no new database migration, no new third-party setup.

## Why no new env vars

| Used for | Env var | Status |
|---|---|---|
| Signing/verifying the single-use review link | `AUTH_SECRET` | Already set |
| Building the review link's domain (`APP_URL/review-request/...`) | `APP_URL` | Already set |
| Sending the admin email that contains the review link | `SMTP_HOST/PORT/USER/PASS/SECURE/FROM` | Already set |
| Sending the existing WhatsApp ping to the meeting admin | `GUPSHUP_*` | Already set, unchanged |
| MongoDB | `MONGODB_URI` | Already set |

The new `deadlineHistory` field on minutes items and `decidedAt` on extension requests are additive/optional — Mongoose doesn't need a migration, existing documents just won't have them until the first approve/reject happens on that item.

## Things to double-check before/after deploying (not code changes, just config/data)

1. **`APP_URL` must be your real production domain**, not `http://localhost:3000`. This is what gets embedded in the review link sent to admins — if it's wrong, the link in the email will be broken in production. Check whichever of `APP_URL` / Vercel's auto-detected URL your deploy actually resolves to.
2. **Every meeting that should use this feature needs an Admin Email set.** The review link is only emailed to `meeting.adminEmail` — if a meeting has no admin email configured, no notification (and no review link) goes out at all, silently. Set this per-meeting: `New Meeting` form or the meeting's edit page (`adminEmail` / `adminPhone` fields), or per-org default in `/admin`.
3. **Confirm your SMTP config is real, not the Ethereal fallback.** `sendEmailReminder()` silently falls back to a throwaway Ethereal test inbox if `SMTP_HOST/PORT/USER/PASS` aren't all set — emails would "send" successfully but nobody would receive them. If extension-request emails already work today in your environment, this is already fine; nothing changed here.
4. **After deploying, do one real end-to-end test**: submit a test extension request from `/extend-request/<token>` (or wait for a real overdue-item reminder to generate one), confirm the admin email arrives with a working "Review & Respond to Request" button, click it, approve or reject, and confirm:
   - The page shows the locked "already handled" state on a second visit/refresh.
   - On approve, the task's deadline actually updates in the meeting's minutes.

## Explicitly not built yet (per your call)

The super/main-admin WhatsApp "a request was sent to the assigned admin" notification was intentionally left out — there's no `SUPER_ADMIN_PHONE` env var or approved Gupshup template for it. When you're ready for that, it'll need:
- A `SUPER_ADMIN_PHONE` env var (or similar), and
- Either a plain-text WhatsApp send (works immediately, no setup) or a new approved template in the Gupshup dashboard (more reliable, requires you to create/approve it there first).
