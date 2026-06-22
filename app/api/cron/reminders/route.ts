import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getSubCompanyModel } from '@/models/SubCompany';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';
import { getSettingsModel } from '@/models/Settings';
import { sendEmailReminder, sendWhatsAppReminder } from '@/lib/reminders';
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
  orgAdminPhone?: string,
  orgAdminEmail?: string,
): Promise<Result> {
  const result: Result = { label, sent: 0, skipped: 0, no_contact: 0, errors: [] };
  try {
    const conn     = await connectDB(dbName);
    const Minutes  = getMinutesModel(conn);
    const Meeting  = getMeetingModel(conn);
    const Settings = getSettingsModel(conn);

    const [allMinutes, settings] = await Promise.all([
      Minutes.find().lean(),
      Settings.findOne().lean(),
    ]);

    const adminPhone = settings?.adminPhone?.trim() || orgAdminPhone || '';
    const adminEmail = settings?.adminEmail?.trim() || orgAdminEmail || '';

    if (!allMinutes.length) return result;

    const meetingIds = [...new Set(allMinutes.map(m => String(m.meetingId)))];
    const meetings   = await Meeting.find({ _id: { $in: meetingIds } }).lean();
    const meetingMap = new Map(meetings.map(m => [String(m._id), m.name]));

    for (const minutes of allMinutes) {
      const meetingName = meetingMap.get(String(minutes.meetingId)) ?? 'Unknown Meeting';

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

        const tplReminder      = process.env.GUPSHUP_TPL_REMINDER       ?? 'action_reminder';
        const tplReminderAdmin = process.env.GUPSHUP_TPL_REMINDER_ADMIN ?? 'action_reminder_admin';
        const tplExtend        = process.env.GUPSHUP_TPL_EXTEND         ?? 'extend_request';

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
        if (adminEmail && adminEmail !== item.actionByEmail?.trim() && daysLeft <= 3) {
          const r = await sendEmailReminder({ to: adminEmail, ...payload });
          if (r.ok) result.sent++; else result.errors.push(`admin-email: ${r.error}`);
        }

        // ── WhatsApp: assignee — daily, includes deadline ────────────
        if (item.actionByPhone?.trim()) {
          const r = await sendWhatsAppReminder({
            to:             item.actionByPhone.trim(),
            meetingName,
            subject:        item.subject,
            actionBy:       item.actionBy ?? '',
            daysLeft,
            dateOfAction:   item.dateOfAction,
            extendLink,
            templateId:     tplReminder,
            templateParams: [meetingName, item.subject, dateStr, countdownStr],
          });
          if (r.ok) result.sent++; else result.errors.push(`wa:${item.actionByPhone}: ${r.error}`);
        }

        // ── WhatsApp: admin — only ≤3 days, includes assigned + date ─
        if (adminPhone && adminPhone !== item.actionByPhone?.trim() && daysLeft <= 3) {
          const r = await sendWhatsAppReminder({
            to:             adminPhone,
            meetingName,
            subject:        item.subject,
            actionBy:       item.actionBy ?? '',
            daysLeft,
            dateOfAction:   item.dateOfAction,
            extendLink,
            templateId:     tplReminderAdmin,
            templateParams: [meetingName, item.subject, item.actionBy ?? '', dateStr, countdownStr],
          });
          if (r.ok) result.sent++; else result.errors.push(`admin-wa: ${r.error}`);
        }

        // ── WhatsApp: assignee — extend request on/after due date ────
        if (daysLeft <= 0 && extendLink && item.actionByPhone?.trim()) {
          const r = await sendWhatsAppReminder({
            to:             item.actionByPhone.trim(),
            meetingName,
            subject:        item.subject,
            actionBy:       item.actionBy ?? '',
            daysLeft,
            dateOfAction:   item.dateOfAction,
            extendLink,
            templateId:     tplExtend,
            templateParams: [item.subject, meetingName, extendLink],
          });
          if (r.ok) result.sent++; else result.errors.push(`wa-extend:${item.actionByPhone}: ${r.error}`);
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
      // Load org admin contact as fallback for sub-company with no settings
      let orgAdminPhone: string | undefined;
      let orgAdminEmail: string | undefined;
      try {
        const orgConn     = await connectDB(dbForCompany(sub.orgSlug));
        const OrgSettings = getSettingsModel(orgConn);
        const orgSettings = await OrgSettings.findOne().lean();
        orgAdminPhone = orgSettings?.adminPhone?.trim();
        orgAdminEmail = orgSettings?.adminEmail?.trim();
      } catch { /* ignore */ }

      const result = await processDb(
        dbForSubCompany(sub.orgSlug, sub.slug),
        `${sub.orgSlug}/${sub.slug}`,
        today,
        (meetingId, idx) => makeExtendToken({ company: sub.orgSlug, sub: sub.slug, meetingId, itemIndex: idx }),
        orgAdminPhone,
        orgAdminEmail,
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
