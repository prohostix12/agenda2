# Analysis Report: `mom_extend` WhatsApp Template Not Sending on Deadline Date

**Date:** 2026-07-28  
**Files analysed:**
- `app/api/cron/reminders/route.ts`
- `lib/reminders.ts`
- `lib/extendToken.ts`
- `app/api/extend-request/[token]/route.ts`
- `models/Meeting.ts`
- `models/Minutes.ts`

---

## Executive Summary

The `mom_extend` WhatsApp template message that should be sent to an assignee on/after their task due date **is not sent at all** in the current codebase. The send block was deleted during a recent refactoring session and was never restored. There are also several secondary issues that would have prevented it from working correctly even if the block had been kept.

---

## Issue 1 — CRITICAL: The `mom_extend` send block is completely missing from the cron

**File:** `app/api/cron/reminders/route.ts`  
**Severity:** Critical — this is the direct cause of the message not being sent.

### What happened

The cron originally had a third WhatsApp send block specifically for overdue/due-today items:

```typescript
// ── WhatsApp: assignee — extend request on/after due date ────
if (daysLeft <= 0 && extendLink && item.actionByPhone?.trim()) {
  const r = await sendWhatsAppReminder({
    to:             item.actionByPhone.trim(),
    templateId:     tplExtend,
    templateParams: [item.subject, meetingName, extendLink],
  });
  if (r.ok) result.sent++; else result.errors.push(`wa-extend:${item.actionByPhone}: ${r.error}`);
}
```

During a fix attempt for the extend-link display issue, this block was replaced by embedding the URL in param 4 of `mom_reminder`. That replacement was then reverted (because it caused Gupshup to reject the template). **The original `tplExtend` block was never put back.**

### Current state of the cron (after both changes)

The cron now only sends two WhatsApp messages per item:

| Message | Template | Condition | Extend link included? |
|---|---|---|---|
| Assignee daily reminder | `mom_reminder` (4 params) | `actionByPhone` set | ❌ No |
| Meeting admin reminder | `mom_admin_reminder` (5 params) | `adminPhone` set AND `daysLeft <= 3` | ❌ No |

**There is no code path that sends the `mom_extend` template to the assignee.** The `GUPSHUP_TPL_EXTEND` env var is not read anywhere in the cron at all.

---

## Issue 2 — HIGH: `mom_extend` is used for two incompatible purposes with different param meanings

**Files:** `app/api/cron/reminders/route.ts` (original block) vs `app/api/extend-request/[token]/route.ts` line 132–136  
**Severity:** High — even if the cron block is restored, the template may not render the URL correctly.

The same `mom_extend` template UUID (`d88bf9b1-690f-4967-92f2-a8af3dbc44f7`) is used for two completely different scenarios:

| Where | Audience | Param 1 | Param 2 | Param 3 |
|---|---|---|---|---|
| Cron (assignee) | Task assignee | Subject | Meeting name | Full extend URL (`https://app.com/extend-request/TOKEN`) |
| Extend-request handler (admin) | Meeting admin | Subject | Meeting name | `"Extension requested to 30 January 2026"` |

The template body was approved with a specific placeholder meaning for param 3. These two uses put completely different content into param 3:
- For the cron: a 150–175 character URL
- For the admin handler: a short human-readable date string

If the template body treats `{{3}}` as a short descriptive text, the URL from the cron will either display as an unstyled long string or be rejected by WhatsApp's content validation at the BSP layer.

---

## Issue 3 — HIGH: `sendWhatsAppTemplate` has no support for CTA button URL suffix

**File:** `lib/reminders.ts` lines 83–89  
**Severity:** High — if `mom_extend` uses a WhatsApp CTA (URL) button rather than a plain-text param for the link, the button URL will never be set.

The current implementation only passes body text params:

```typescript
const form = new URLSearchParams({
  channel:     'whatsapp',
  source:      sourceNum,
  destination: toNorm,
  template:    JSON.stringify({ id: templateId, params }),   // ← only params, no buttons
  'src.name':  appName,
});
```

Gupshup's WhatsApp template API requires a `buttons` array in the template JSON for templates that have a dynamic URL button:

```json
{
  "id": "template-uuid",
  "params": ["body-param-1", "body-param-2"],
  "buttons": [{ "type": "url", "index": 0, "url_suffix": "TOKEN_HERE" }]
}
```

If `mom_extend` was set up in Gupshup with a URL button (which is the recommended way to send clickable links via WhatsApp templates), the button will never receive the dynamic URL suffix using the current code. The `buttons` field is missing entirely from `sendWhatsAppTemplate`.

---

## Issue 4 — MEDIUM: Token URL length (~150–175 chars) is risky as a plain text param

**File:** `app/api/cron/reminders/route.ts` line 60–62  
**Severity:** Medium — likely to cause silent failures on certain Gupshup account tiers.

The extend link is constructed as:
```
https://{APP_URL}/extend-request/{base64url(JSON)}.{base64url(HMAC-SHA256)}
```

Example breakdown:
- Base URL: `https://yourapp.vercel.app/extend-request/` → ~45 chars
- Payload: `base64url({"company":"acme","meetingId":"67c1...24hex...","itemIndex":0})` → ~60–80 chars  
- Signature: `base64url(HMAC-SHA256)` → always 43 chars
- **Total: ~148–168 characters**

WhatsApp Business API template body variable limits (per Meta's policy): **60 characters recommended, 1024 characters hard limit**. Gupshup enforces the 1024 hard limit but may warn or rate-limit at 60. In practice, URLs longer than ~100 characters in body text params have been reported to fail silently on some Gupshup app configurations.

---

## Issue 5 — MEDIUM: `APP_URL` may resolve to `http://localhost:3000` in production

**File:** `app/api/cron/reminders/route.ts` lines 10–15  
**Severity:** Medium — makes the extend link non-functional even if the message is sent.

```typescript
const APP_URL = (
  process.env.APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  'http://localhost:3000'          // ← fallback used if all three env vars are unset
).replace(/\/$/, '');
```

- `APP_URL` is a custom env var — must be manually added to Vercel project settings.
- `VERCEL_PROJECT_PRODUCTION_URL` is available only on Pro/Enterprise Vercel plans and only for production deployments.
- `VERCEL_URL` is set by Vercel but points to the **current deployment URL** (which may be a preview URL like `project-abc123.vercel.app`, not the production domain).

If `APP_URL` is not explicitly set and the deployment is not on the production domain, the generated links will either point to a preview deployment URL (which may expire) or to `localhost` (which is completely unreachable by the recipient).

---

## Issue 6 — LOW: `tplReminder` and `tplReminderAdmin` are resolved inside the item loop

**File:** `app/api/cron/reminders/route.ts` lines 78–79  
**Severity:** Low / performance — no functional impact but wasteful.

```typescript
// These two lines are inside the per-item for loop:
const tplReminder      = process.env.GUPSHUP_TPL_REMINDER       ?? '...';
const tplReminderAdmin = process.env.GUPSHUP_TPL_REMINDER_ADMIN ?? '...';
```

`process.env` reads are cheap but these should be moved outside the inner loop or outside `processDb` entirely. They are constant for the lifetime of the process.

---

## Issue 7 — LOW: `buildReminderText` is defined but never called

**File:** `lib/reminders.ts` lines 113–160  
**Severity:** Low — dead code, not a functional issue.

The `buildReminderText` function constructs a formatted session-API message that correctly includes the extend link in the body when `daysLeft <= 0`. However, this function is never called anywhere in the codebase. It was likely intended for session-based (non-template) WhatsApp messages but was never wired up.

---

## Root Cause Summary

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | `tplExtend` send block deleted from cron, never restored | `app/api/cron/reminders/route.ts` | **Message never sent** |
| 2 | Same template used for 2 incompatible purposes (assignee URL vs admin text) | cron vs extend-request handler | Wrong message content |
| 3 | `sendWhatsAppTemplate` missing `buttons` support for CTA URL buttons | `lib/reminders.ts` | Button URL never set |
| 4 | Token URL (~165 chars) risky as body text param | cron | Silent API rejection |
| 5 | `APP_URL` may fall back to `localhost` or preview URL | cron | Link non-functional |
| 6 | Template constants resolved inside item loop | cron | Minor performance |
| 7 | `buildReminderText` is dead code | `lib/reminders.ts` | Unused utility |

---

## What Needs to Change (No code written here — analysis only)

1. **Restore the `tplExtend` send block** in `app/api/cron/reminders/route.ts` for `daysLeft <= 0` items. This is the single most important fix.

2. **Decide on the template structure** for `mom_extend`:
   - If it has a plain-text body with 3 params: restore the block with the URL as param 3.
   - If it has a URL CTA button: add `buttons` support to `sendWhatsAppTemplate` and pass only the token suffix (not the full URL) in the `buttons` array.

3. **Set `APP_URL`** explicitly in Vercel environment variables to the production domain (e.g., `https://yourapp.vercel.app`).

4. **Either separate the `mom_extend` template** into two templates (one for sending the link to the assignee, one for notifying the admin), or accept that param 3 carries different content in each context and verify the template body supports it.
