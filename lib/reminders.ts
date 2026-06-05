import nodemailer from 'nodemailer';

/* ────────────────────────────────────────────────────────────────
   WhatsApp reminder via Twilio REST API (no SDK — plain fetch)
   ──────────────────────────────────────────────────────────────── */

export async function sendWhatsAppReminder({
  to,
  meetingName,
  subject,
  actionBy,
  daysLeft,
  dateOfAction,
}: {
  to: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  daysLeft: number;
  dateOfAction: string;
}): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'; // sandbox default

  if (!accountSid || !authToken) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }

  // Normalise phone: strip spaces, ensure "whatsapp:" prefix
  const toNorm = `whatsapp:${to.replace(/\s+/g, '').replace(/^whatsapp:/, '')}`;

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

  const body = [
    `🔔 *Action Reminder — MOM*`,
    ``,
    `*Meeting:* ${meetingName}`,
    `*Subject:* ${subject.split('\n')[0].trim()}`,
    `*Assigned to:* ${actionBy}`,
    `*Deadline:* ${dateStr}`,
    `*Status:* ${urgency}`,
    ``,
    `Please ensure this action is completed on time.`,
    `— _MOM, Minutes of Meeting System_`,
  ].join('\n');

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const creds = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const form  = new URLSearchParams({ From: fromNumber, To: toNorm, Body: body });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { message?: string }).message ?? `Twilio HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
}: {
  to: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  daysLeft: number;
  dateOfAction: string;
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
      <p style="color:#64748b;font-size:13px;margin-top:20px;">Please ensure this action item is completed before the deadline.</p>
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
      subject: `⏰ Action Reminder: ${urgencyLabel} — ${meetingName}`,
      html,
      text: `Action Reminder\n\nMeeting: ${meetingName}\nAssigned to: ${actionBy}\nDeadline: ${dateStr}\nStatus: ${urgencyLabel}\n\nSubject: ${subject.split('\n')[0].trim()}\n\nPlease complete this action on time.\n— MOM`,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
