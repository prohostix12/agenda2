import { NextResponse } from 'next/server';
import { sendWhatsAppTemplate, sendWhatsAppText, sendEmailReminder, normalisePhone } from '@/lib/reminders';
import { NOTIFICATION_CATALOG } from '@/lib/notificationCatalog';

const APP_URL = (
  process.env.APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  'http://localhost:3000'
).replace(/\/$/, '');

const SAMPLE = {
  meeting:     'Test Meeting',
  task:        'Test action item',
  assignee:    'Test Assignee',
  dateStr:     '24 Jun 2026',
  isoDate:     new Date().toISOString(),
  status:      'Due Today',
  submitLink:  `${APP_URL}/submit-task/TEST_TOKEN`,
  extendLink:  `${APP_URL}/extend-request/TEST_TOKEN`,
  reviewLink:  `${APP_URL}/review-request/TEST_TOKEN`,
};

type SendResult = { ok: boolean; error?: string; note?: string };

async function whatsappResult(fn: () => Promise<SendResult>): Promise<SendResult> {
  try { return await fn(); } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function POST(req: Request) {
  const { key, phone, email, chairPhone } = await req.json();

  const entry = NOTIFICATION_CATALOG.find(n => n.key === key);
  if (!entry) return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
  if (!phone && !email) return NextResponse.json({ error: 'Provide a phone number or email to test with' }, { status: 400 });

  const result: { ok: boolean; whatsapp?: SendResult; email?: SendResult } = { ok: true };

  switch (key) {
    case 'daily_reminder_assignee': {
      if (phone) {
        const tplId = process.env.GUPSHUP_TPL_REMINDER ?? '6f3eeb05-62d6-4db8-9290-4b8e3efe9ebc';
        result.whatsapp = await whatsappResult(() => sendWhatsAppTemplate({
          to: phone, templateId: tplId,
          params: [SAMPLE.meeting, SAMPLE.task, SAMPLE.dateStr, SAMPLE.status, SAMPLE.submitLink],
        }));
      }
      if (email) {
        result.email = await sendEmailReminder({
          to: email, meetingName: SAMPLE.meeting, subject: SAMPLE.task, actionBy: SAMPLE.assignee,
          daysLeft: 0, dateOfAction: SAMPLE.isoDate,
          submitLink: SAMPLE.submitLink, submitLabel: '✅ Mark Task as Done',
        });
      }
      break;
    }

    case 'daily_reminder_admin': {
      if (phone) {
        const tplId = process.env.GUPSHUP_TPL_REMINDER_ADMIN ?? 'ff4db2ee-1639-45f7-a502-159d64b9de9d';
        result.whatsapp = await whatsappResult(() => sendWhatsAppTemplate({
          to: phone, templateId: tplId,
          params: [SAMPLE.meeting, SAMPLE.task, SAMPLE.assignee, SAMPLE.dateStr, SAMPLE.status],
        }));
      }
      if (email) {
        result.email = await sendEmailReminder({
          to: email, meetingName: SAMPLE.meeting, subject: SAMPLE.task, actionBy: SAMPLE.assignee,
          daysLeft: 2, dateOfAction: SAMPLE.isoDate,
        });
      }
      break;
    }

    case 'overdue_extend_assignee': {
      if (phone) {
        const tplId = process.env.GUPSHUP_TPL_EXTEND ?? 'd88bf9b1-690f-4967-92f2-a8af3dbc44f7';
        result.whatsapp = await whatsappResult(() => sendWhatsAppTemplate({
          to: phone, templateId: tplId,
          params: [SAMPLE.task, SAMPLE.meeting, SAMPLE.submitLink, SAMPLE.extendLink],
        }));
      }
      if (email) {
        result.email = { ok: false, error: 'No separate email for this notification — see "Daily Reminder — Assignee" above.' };
      }
      break;
    }

    case 'extension_requested_admin': {
      if (phone) {
        // No approved Gupshup template exists for this notification, so the live
        // code sends it as WhatsApp session text (not a template) — this test
        // mirrors that exactly.
        const waBody = [
          `📋 *Deadline Extension Request — MOM*`, ``,
          `*Meeting:* ${SAMPLE.meeting}`, `*Requested by:* ${SAMPLE.assignee}`, `*Subject:* ${SAMPLE.task}`,
          `*Original Deadline:* ${SAMPLE.dateStr}`, `*New Deadline Requested:* ${SAMPLE.dateStr}`, ``,
          `*Reason:*`, `(sample reason text)`, ``,
          `👉 Review and respond to this request:`, SAMPLE.reviewLink, ``,
          `— _MOM, Minutes of Meeting System_`,
        ].join('\n');
        result.whatsapp = await whatsappResult(() => sendWhatsAppText(phone, waBody));
        if (result.whatsapp) result.whatsapp.note = 'Sent as plain WhatsApp session text (no approved template for this yet) — delivers only if the admin has messaged your business number in the last 24h, or on a sandbox app.';
      }
      if (email) {
        const body = [
          `📋 *Deadline Extension Request — MOM*`, ``,
          `*Meeting:* ${SAMPLE.meeting}`, `*Requested by:* ${SAMPLE.assignee}`, `*Subject:* ${SAMPLE.task}`,
          `*Original Deadline:* ${SAMPLE.dateStr}`, `*New Deadline Requested:* ${SAMPLE.dateStr}`, ``,
          `*Reason:*`, `(sample reason text)`, ``,
          `👉 Review and respond to this request:`, SAMPLE.reviewLink, ``,
          `— _MOM, Minutes of Meeting System_`,
        ].join('\n');
        result.email = await sendEmailReminder({
          to: email, meetingName: SAMPLE.meeting, subject: `[Extension Request] ${SAMPLE.task}`, actionBy: SAMPLE.assignee,
          daysLeft: -999, dateOfAction: SAMPLE.isoDate,
          extendLink: SAMPLE.reviewLink, actionLabel: '📋 Review & Respond to Request',
          customSubject: `📋 Extension Request from ${SAMPLE.assignee} — ${SAMPLE.meeting}`,
          customBody: body,
        });
      }
      break;
    }

    case 'task_submitted_admin': {
      const recipients = [phone, chairPhone]
        .filter((p): p is string => !!p?.trim())
        .map((p: string) => p.trim());
      const uniqueRecipients = [...new Set(recipients.map(normalisePhone))]
        .map(np => recipients.find(p => normalisePhone(p) === np)!);

      if (uniqueRecipients.length) {
        const tplId = process.env.GUPSHUP_TPL_TASK_ACCEPT_NOTIFY;
        if (!tplId) {
          result.whatsapp = { ok: false, error: 'GUPSHUP_TPL_TASK_ACCEPT_NOTIFY is not set' };
        } else {
          const sends = await Promise.all(uniqueRecipients.map(to => whatsappResult(() => sendWhatsAppTemplate({
            to, templateId: tplId,
            params: [SAMPLE.meeting, SAMPLE.assignee, SAMPLE.task, 'Finished creating report'],
          }))));
          const failed = sends.filter(s => !s.ok);
          result.whatsapp = {
            ok: failed.length === 0,
            error: failed.length ? failed.map(f => f.error).join('; ') : undefined,
            note: `Sent to ${uniqueRecipients.length} recipient(s): ${uniqueRecipients.join(', ')}${chairPhone ? '' : ' — add a Chairperson Test Phone above to test that recipient too.'}`,
          };
        }
      }
      if (email) {
        const body = [
          `✅ *A task has been submitted — MOM*`, ``,
          `*Meeting:* ${SAMPLE.meeting}`, `*Submitted by:* ${SAMPLE.assignee}`, `*Task:* ${SAMPLE.task}`,
          `*Title:* Finished creating report`, ``,
          `*Notes:*`, `(sample notes text)`, ``,
          `*Files (Drive links):*`, `- https://drive.google.com/sample`, ``,
          `— _MOM, Minutes of Meeting System_`,
        ].join('\n');
        result.email = await sendEmailReminder({
          to: email, meetingName: SAMPLE.meeting, subject: SAMPLE.task, actionBy: SAMPLE.assignee,
          daysLeft: -999, dateOfAction: SAMPLE.isoDate,
          customSubject: `✅ Task Submitted: ${SAMPLE.task} — ${SAMPLE.meeting}`,
          customBody: body,
        });
      }
      break;
    }

    case 'extension_approved_assignee': {
      if (phone) {
        const tplId = process.env.GUPSHUP_TPL_EXTEND_ACCEPT;
        result.whatsapp = tplId
          ? await whatsappResult(() => sendWhatsAppTemplate({
              to: phone, templateId: tplId,
              params: [SAMPLE.meeting, SAMPLE.task, SAMPLE.dateStr, SAMPLE.dateStr],
            }))
          : { ok: false, error: 'GUPSHUP_TPL_EXTEND_ACCEPT is not set' };
      }
      if (email) {
        const body = [
          `📋 *Your deadline extension has been approved.*`, ``,
          `*Meeting:* ${SAMPLE.meeting}`, `*Task:* ${SAMPLE.task}`,
          `*New deadline:* ${SAMPLE.dateStr}`, `*Approved on:* ${SAMPLE.dateStr}`, ``,
          `Please submit your task before the date.`, ``,
          `— _MOM, Minutes of Meeting System_`,
        ].join('\n');
        result.email = await sendEmailReminder({
          to: email, meetingName: SAMPLE.meeting, subject: SAMPLE.task, actionBy: SAMPLE.assignee,
          daysLeft: -999, dateOfAction: SAMPLE.isoDate,
          customSubject: `✅ Extension Approved — ${SAMPLE.task} — ${SAMPLE.meeting}`,
          customBody: body,
        });
      }
      break;
    }

    default:
      return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
  }

  result.ok = (result.whatsapp?.ok ?? true) && (result.email?.ok ?? true);
  return NextResponse.json(result);
}
