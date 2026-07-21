import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getSubCompanyModel } from '@/models/SubCompany';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';
import { sendEmailReminder, sendWhatsAppReminder, normalisePhone } from '@/lib/reminders';
import { makeExtendToken } from '@/lib/extendToken';

const APP_URL = (
  process.env.APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  'http://localhost:3000'
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';
export const maxDuration = 60;


type Result = { label: string; sent: number; skipped: number; no_contact: number; errors: string[] };

async function processDb(
  dbName: string,
  label: string,
  today: Date,
  makeToken: (meetingId: string, itemIndex: number) => string,
): Promise<Result> {
  const result: Result = { label, sent: 0, skipped: 0, no_contact: 0, errors: [] };
  try {
    const conn    = await connectDB(dbName);
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);

    const allMinutes = await Minutes.find().lean();

    if (!allMinutes.length) return result;

    const meetingIds = [...new Set(allMinutes.map(m => String(m.meetingId)))];
    const meetings   = await Meeting.find({ _id: { $in: meetingIds } }).lean();
    const meetingMap = new Map(meetings.map(m => [String(m._id), m]));

    for (const minutes of allMinutes) {
      const meetingDoc  = meetingMap.get(String(minutes.meetingId));
      const meetingName = meetingDoc?.name ?? 'Unknown Meeting';
      const adminPhone  = meetingDoc?.adminPhone?.trim() || '';
      const adminEmail  = meetingDoc?.adminEmail?.trim() || '';

      for (let idx = 0; idx < minutes.items.length; idx++) {
        const item = minutes.items[idx];
        if (!item.subject?.trim())       { result.skipped++; continue; }
        if (item.followedUp)             { result.skipped++; continue; }
        if (!item.dateOfAction?.trim())  { result.skipped++; continue; }

        const [y, mo, d] = item.dateOfAction.substring(0, 10).split('-').map(Number);
        const actionDate = new Date(y, mo - 1, d);
        actionDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((actionDate.getTime() - today.getTime()) / 86_400_000);

        const extendLink = daysLeft <= 0
          ? `${APP_URL}/extend-request/${makeToken(String(minutes.meetingId), idx)}`
          : undefined;

        const [dy, dm, dd] = item.dateOfAction.substring(0, 10).split('-').map(Number);
        const dateStr = new Date(dy, dm - 1, dd).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        });

        const payload = {
          meetingName,
          subject:      item.subject,
          actionBy:     item.actionBy ?? '',
          daysLeft,
          dateOfAction: item.dateOfAction,
          extendLink,
        };

        const tplReminder      = process.env.GUPSHUP_TPL_REMINDER       ?? '6f3eeb05-62d6-4db8-9290-4b8e3efe9ebc';
        const tplReminderAdmin = process.env.GUPSHUP_TPL_REMINDER_ADMIN ?? 'ff4db2ee-1639-45f7-a502-159d64b9de9d';

        const subjectLine = item.subject.split('\n')[0].trim();

        const countdownStr =
          daysLeft < 0  ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}`
          : daysLeft === 0 ? 'Due Today'
          : daysLeft === 1 ? '1 day left'
          : `${daysLeft} days left`;

        const hasContact = !!(item.actionByEmail?.trim() || item.actionByPhone?.trim() || adminEmail || adminPhone);
        if (!hasContact) { result.no_contact++; continue; }

        // ── Emails ───────────────────────────────────────────────────
        if (item.actionByEmail?.trim()) {
          const r = await sendEmailReminder({ to: item.actionByEmail.trim(), ...payload });
          if (r.ok) result.sent++; else result.errors.push(`email:${item.actionByEmail}: ${r.error}`);
        }
        if (adminEmail && adminEmail.toLowerCase() !== (item.actionByEmail?.trim() ?? '').toLowerCase() && daysLeft <= 3) {
          const r = await sendEmailReminder({ to: adminEmail, ...payload });
          if (r.ok) result.sent++; else result.errors.push(`admin-email: ${r.error}`);
        }

        // ── WhatsApp: assignee ────────────────────────────────────────
        if (item.actionByPhone?.trim()) {
          const r = await sendWhatsAppReminder({
            to:             item.actionByPhone.trim(),
            templateId:     tplReminder,
            templateParams: [meetingName, subjectLine, dateStr, countdownStr],
          });
          if (r.ok) result.sent++; else result.errors.push(`wa:${item.actionByPhone}: ${r.error}`);
        }

        // ── WhatsApp: admin — only ≤3 days ────────────────────────────
        if (adminPhone && normalisePhone(adminPhone) !== normalisePhone(item.actionByPhone?.trim() ?? '') && daysLeft <= 3) {
          const r = await sendWhatsAppReminder({
            to:             adminPhone,
            templateId:     tplReminderAdmin,
            templateParams: [meetingName, subjectLine, item.actionBy ?? '', dateStr, countdownStr],
          });
          if (r.ok) result.sent++; else result.errors.push(`admin-wa: ${r.error}`);
        }
      }
    }
  } catch (e) {
    result.errors.push(String(e instanceof Error ? e.message : e));
  }
  return result;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: Result[] = [];

  try {
    const masterConn = await connectDB(MASTER_DB);
    const Company    = getCompanyModel(masterConn);
    const SubCompany = getSubCompanyModel(masterConn);

    const [companies, subCompanies] = await Promise.all([
      Company.find().lean(),
      SubCompany.find().lean(),
    ]);

    // ── Process each org ────────────────────────────────────────────────────
    for (const company of companies) {
      const result = await processDb(
        dbForCompany(company.slug),
        company.slug,
        today,
        (meetingId, idx) => makeExtendToken({ company: company.slug, meetingId, itemIndex: idx }),
      );
      results.push(result);
    }

    // ── Process each sub-company ─────────────────────────────────────────────
    for (const sub of subCompanies) {
      const result = await processDb(
        dbForSubCompany(sub.orgSlug, sub.slug),
        `${sub.orgSlug}/${sub.slug}`,
        today,
        (meetingId, idx) => makeExtendToken({ company: sub.orgSlug, sub: sub.slug, meetingId, itemIndex: idx }),
      );
      results.push(result);
    }

    const totalSent   = results.reduce((n, r) => n + r.sent,   0);
    const totalErrors = results.reduce((n, r) => n + r.errors.length, 0);

    return NextResponse.json({
      ok: true,
      date:       today.toISOString().substring(0, 10),
      orgs:       companies.length,
      subOrgs:    subCompanies.length,
      totalSent,
      totalErrors,
      results,
    });
  } catch (err) {
    console.error('[cron/reminders]', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
