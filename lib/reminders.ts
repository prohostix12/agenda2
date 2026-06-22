import nodemailer from 'nodemailer';

/* ────────────────────────────────────────────────────────────────
   Gupshup helpers
   ──────────────────────────────────────────────────────────────── */

function gupshupConfig() {
  const apiKey    = process.env.GUPSHUP_API_KEY;
  const sourceNum = process.env.GUPSHUP_SOURCE_NUMBER;
  const appName   = process.env.GUPSHUP_APP_NAME ?? 'MOM';
  return { apiKey, sourceNum, appName };
}

function normalisePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

/* ────────────────────────────────────────────────────────────────
   Send a plain-text WhatsApp message via Gupshup session API.
   Works without template approval — delivers if recipient has
   messaged the business number within the last 24 hours, OR
   on Gupshup sandbox apps.
   ──────────────────────────────────────────────────────────────── */

export async function sendWhatsAppText(
  to: string,
  text: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { apiKey, sourceNum, appName } = gupshupConfig();
  if (!apiKey || !sourceNum) return { ok: false, error: 'Gupshup credentials not configured' };

  const toNorm = normalisePhone(to);

  try {
    const form = new URLSearchParams({
      channel:     'whatsapp',
      source:      sourceNum,
      destination: toNorm,
      message:     JSON.stringify({ type: 'text', text }),
      'src.name':  appName,
    });

    const res = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    console.log(`[Gupshup session → ${toNorm}]`, JSON.stringify(data));

    if (!res.ok || data.status === 'error') {
      return { ok: false, error: (data.message as string) ?? `Gupshup HTTP ${res.status}` };
    }
    return { ok: true, messageId: data.messageId as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ────────────────────────────────────────────────────────────────
   Send a WhatsApp template message via Gupshup.
   Requires templates to be approved in the Gupshup dashboard.
   ──────────────────────────────────────────────────────────────── */

export async function sendWhatsAppTemplate({
  to,
  templateId,
  params,
}: {
  to: string;
  templateId: string;
  params: string[];
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { apiKey, sourceNum, appName } = gupshupConfig();
  if (!apiKey || !sourceNum) return { ok: false, error: 'Gupshup credentials not configured' };

  const toNorm = normalisePhone(to);

  try {
    const form = new URLSearchParams({
      channel:     'whatsapp',
      source:      sourceNum,
      destination: toNorm,
      template:    JSON.stringify({ id: templateId, params }),
      'src.name':  appName,
    });

    const res = await fetch('https://api.gupshup.io/wa/api/v1/template/msg', {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    console.log(`[Gupshup template "${templateId}" → ${toNorm}]`, JSON.stringify(data));

    if (!res.ok || data.status === 'error') {
      return { ok: false, error: (data.message as string) ?? `Gupshup HTTP ${res.status}` };
    }
    return { ok: true, messageId: data.messageId as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ────────────────────────────────────────────────────────────────
   Build the formatted reminder text used for session messages
   ──────────────────────────────────────────────────────────────── */

export function buildReminderText({
  meetingName,
  subject,
  actionBy,
  daysLeft,
  dateOfAction,
  extendLink,
}: {
  meetingName: string;
  subject: string;
  actionBy: string;
  daysLeft: number;
  dateOfAction: string;
  extendLink?: string;
}): string {
  const urgency =
    daysLeft < 0
      ? `⚠️ *OVERDUE by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}*`
      : daysLeft === 0
      ? `🔴 *Due TODAY*`
      : daysLeft === 1
      ? `🟠 *Due TOMORROW*`
      : `🟡 *${daysLeft} days remaining*`;

  const [y, m, d] = dateOfAction.substring(0, 10).split('-').map(Number);
  const dateStr = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const lines = [
    `🔔 *Action Reminder — MOM*`,
    ``,
    `*Meeting:* ${meetingName}`,
    `*Subject:* ${subject.split('\n')[0].trim()}`,
    `*Assigned to:* ${actionBy}`,
    `*Deadline:* ${dateStr}`,
    `*Status:* ${urgency}`,
    ``,
    `Please ensure this action is completed on time.`,
  ];

  if (extendLink && daysLeft <= 0) {
    lines.push(``, `🔗 *Need more time? Request a deadline extension:*`, extendLink);
  }

  lines.push(`— _MOM, Minutes of Meeting System_`);
  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────────────
   High-level: send a WhatsApp reminder.
   Tries template first → falls back to session plain-text.
   ──────────────────────────────────────────────────────────────── */

export async function sendWhatsAppReminder({
  to,
  meetingName,
  subject,
  actionBy,
  daysLeft,
  dateOfAction,
  extendLink,
  templateId,
  templateParams,
  customBody,
}: {
  to: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  daysLeft: number;
  dateOfAction: string;
  extendLink?: string;
  templateId?: string;
  templateParams?: string[];
  customBody?: string;
}): Promise<{ ok: boolean; method?: 'template' | 'session'; error?: string }> {
  const { apiKey, sourceNum } = gupshupConfig();
  if (!apiKey || !sourceNum) return { ok: false, error: 'Gupshup credentials not configured' };

  // Try template first if provided
  if (templateId && templateParams) {
    const tpl = await sendWhatsAppTemplate({ to, templateId, params: templateParams });
    if (tpl.ok) return { ok: true, method: 'template' };
    console.log(`[Gupshup] Template "${templateId}" failed for ${normalisePhone(to)}: ${tpl.error} — falling back to session message`);
  }

  // Fallback: session plain-text message
  const text = customBody ?? buildReminderText({ meetingName, subject, actionBy, daysLeft, dateOfAction, extendLink });
  const session = await sendWhatsAppText(to, text);
  if (session.ok) return { ok: true, method: 'session' };

  return { ok: false, error: session.error };
}

/* ────────────────────────────────────────────────────────────────
   Email reminder via existing SMTP (Nodemailer)
   ──────────────────────────────────────────────────────────────── */

export async function sendEmailReminder({
  to,
  meetingName,
  subject,
  actionBy,
  daysLeft,
  dateOfAction,
  extendLink,
  customSubject,
  customBody,
}: {
  to: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  daysLeft: number;
  dateOfAction: string;
  extendLink?: string;
  customSubject?: string;
  customBody?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let transporter;
    if (!host || !port || !user || !pass) {
      const test = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: test.smtp.host, port: test.smtp.port, secure: test.smtp.secure,
        auth: { user: test.user, pass: test.pass },
      });
    } else {
      transporter = nodemailer.createTransport({
        host, port: parseInt(port),
        secure: process.env.SMTP_SECURE === 'true' || port === '465',
        auth: { user, pass },
      });
    }

    const [y, m, d] = dateOfAction.substring(0, 10).split('-').map(Number);
    const dateStr = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const urgencyLabel =
      daysLeft < 0  ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}`
      : daysLeft === 0 ? 'Due Today'
      : daysLeft === 1 ? 'Due Tomorrow'
      : `${daysLeft} days remaining`;

    const urgencyColor =
      daysLeft < 0  ? '#dc2626'
      : daysLeft === 0 ? '#ea580c'
      : daysLeft === 1 ? '#d97706'
      : '#2563eb';

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:20px;">
  <div style="max-width:520px;margin:auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.1);">
    <div style="background:#0f172a;padding:24px;text-align:center;">
      <h1 style="color:#fbbf24;margin:0;font-size:28px;font-family:Georgia,serif;">MOM</h1>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:12px;letter-spacing:2px;">MINUTES OF MEETING</p>
    </div>
    <div style="padding:24px;">
      <div style="background:${urgencyColor}15;border-left:4px solid ${urgencyColor};border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;font-weight:bold;color:${urgencyColor};font-size:15px;">⏰ ${urgencyLabel}</p>
      </div>
      <h2 style="color:#1e293b;font-size:16px;margin:0 0 16px;">Action Item Reminder</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;width:120px;">Meeting</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${meetingName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Assigned to</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${actionBy}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Deadline</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;vertical-align:top;">Subject</td><td style="padding:8px 0;color:#1e293b;">${subject.split('\n')[0].trim()}</td></tr>
      </table>
      ${customBody ? `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px;color:#1e293b;margin-top:16px;">${customBody}</pre>` : `<p style="color:#64748b;font-size:13px;margin-top:20px;">Please ensure this action item is completed before the deadline.</p>`}
      ${extendLink && daysLeft <= 0 ? `<div style="margin-top:20px;text-align:center;"><a href="${extendLink}" style="background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">🔗 Request Deadline Extension</a></div>` : ''}
    </div>
    <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">MOM — Minutes of Meeting System &copy; IITS Group</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? `"MOM Reminders" <${user}>`,
      to,
      subject: customSubject ?? `⏰ Action Reminder: ${urgencyLabel} — ${meetingName}`,
      html,
      text: customBody ?? `Action Reminder\n\nMeeting: ${meetingName}\nAssigned to: ${actionBy}\nDeadline: ${dateStr}\nStatus: ${urgencyLabel}\n\nSubject: ${subject.split('\n')[0].trim()}\n\nPlease complete this action on time.\n— MOM`,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
