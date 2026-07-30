# Fix Report: Restore `mom_extend` Send Block in Cron

**Status:** Change applied locally — NOT yet committed or pushed  
**File changed:** `app/api/cron/reminders/route.ts`

---

## What was changed

A single send block was added back into the `processDb` function, immediately after the existing `mom_admin_reminder` block:

```typescript
// ── WhatsApp: assignee — extend link on/after due date ────────
if (daysLeft <= 0 && extendLink && item.actionByPhone?.trim()) {
  const tplExtend = process.env.GUPSHUP_TPL_EXTEND ?? 'd88bf9b1-690f-4967-92f2-a8af3dbc44f7';
  const r = await sendWhatsAppReminder({
    to:             item.actionByPhone.trim(),
    templateId:     tplExtend,
    templateParams: [subjectLine, meetingName, extendLink],
  });
  if (r.ok) result.sent++; else result.errors.push(`wa-extend:${item.actionByPhone}: ${r.error}`);
}
```

---

## Why this block

This block was the original code that sent the `mom_extend` template to the task assignee on/after their due date. It was accidentally deleted during a previous refactoring session (commits `2b6d08a` and `87fe119`) and never restored. The analysis report `MOM_EXTEND_ANALYSIS.md` identified this as Issue 1 — the primary cause of the extension link not being sent.

---

## How it works

| Condition | Meaning |
|---|---|
| `daysLeft <= 0` | The task is due today or already overdue |
| `extendLink` is defined | The extend URL is built when `daysLeft <= 0` — so this is always true here |
| `item.actionByPhone?.trim()` | The assignee has a WhatsApp number stored on the action item |

When all three conditions are met, the `mom_extend` template is sent to the assignee with these 3 params:

| Param | Value | Example |
|---|---|---|
| `{{1}}` | Subject (first line only) | `Submit Q2 financials` |
| `{{2}}` | Meeting name | `Board Meeting June 2026` |
| `{{3}}` | Full extend request link | `https://yourapp.vercel.app/extend-request/TOKEN` |

---

## What is NOT changed

- **`mom_reminder` block** — unchanged. Still sent daily to the assignee regardless of daysLeft.
- **`mom_admin_reminder` block** — unchanged. Still sent to the meeting admin when `daysLeft <= 3`.
- **`lib/reminders.ts`** — unchanged.
- **`app/api/extend-request/[token]/route.ts`** — unchanged. Admin still gets `mom_extend` when the assignee submits a request.
- **All other files** — untouched.

---

## Effect on the system

### New behaviour (after this change)
On the cron run (daily at 8 AM IST), for every action item where:
- the task is due today or overdue (`daysLeft <= 0`), AND
- the assignee has a phone number

The assignee will receive **two** WhatsApp messages from the cron:

1. `mom_reminder` — the regular daily reminder (meeting, task, deadline, countdown)
2. `mom_extend` — a second message with the extension request link so they can request more time

### No change for non-overdue items
Items where `daysLeft > 0` are completely unaffected — they continue to receive only the regular `mom_reminder`.

### No change for admin notifications
The meeting admin notification (`mom_admin_reminder` when `daysLeft <= 3`) is unchanged.

---

## Risk assessment

| Risk | Level | Notes |
|---|---|---|
| Breaking existing `mom_reminder` sends | None | Block is independent; different condition (`daysLeft <= 0` vs always) |
| Breaking `mom_admin_reminder` sends | None | Block is independent; different condition |
| `mom_extend` API call fails | Low | Error is caught and logged in `result.errors` — does not crash the cron or affect the other two sends |
| URL too long for Gupshup param | Low–Medium | URL is ~165 chars; within the 1024-char hard limit, but some Gupshup tiers may warn at 60 chars. If this is an issue it will show in `result.errors`. |
| `APP_URL` not set → localhost link | Medium | If `APP_URL` env var is not set in Vercel, the link points to localhost. Set `APP_URL=https://yourdomain.vercel.app` in Vercel project settings to fix. |

---

## How to verify after committing

1. Open `https://yourapp.vercel.app/api/cron/reminders` in browser (or call with `Authorization: Bearer <CRON_SECRET>`)
2. Check the JSON response — look for `wa-extend:` entries in `results[].errors`
3. If a task is overdue AND has `actionByPhone` set, `totalSent` should increase by 1 per overdue item (the extend message)
4. The assignee should receive the `mom_extend` WhatsApp message with the link on the due date

---

**Approve this change by asking to commit and push.**
