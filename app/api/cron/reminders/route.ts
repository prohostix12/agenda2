import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, dbForCompany } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';
import { sendEmailReminder, sendWhatsAppReminder } from '@/lib/reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds — long-running cron

/* Number of days ahead (inclusive) to send reminders. Overdue items always included. */
const REMIND_WITHIN_DAYS = Number(process.env.REMIND_WITHIN_DAYS ?? 3);

export async function GET(req: Request) {
  // Verify the cron secret so only Vercel (or your scheduler) can trigger this
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type Result = {
    company: string;
    sent: number;
    skipped: number;
    errors: string[];
  };

  const results: Result[] = [];

  try {
    // ── 1. Load all companies from the master registry ──────────────────────
    const masterConn = await connectDB(MASTER_DB);
    const Company = getCompanyModel(masterConn);
    const companies = await Company.find().lean();

    // ── 2. Process each company ──────────────────────────────────────────────
    for (const company of companies) {
      const dbName = dbForCompany(company.slug);
      const result: Result = { company: company.slug, sent: 0, skipped: 0, errors: [] };

      try {
        const conn = await connectDB(dbName);
        const Minutes = getMinutesModel(conn);
        const Meeting = getMeetingModel(conn);

        const allMinutes = await Minutes.find().lean();
        if (!allMinutes.length) { results.push(result); continue; }

        // Build meeting name lookup
        const meetingIds = [...new Set(allMinutes.map(m => String(m.meetingId)))];
        const meetings = await Meeting.find({ _id: { $in: meetingIds } }).lean();
        const meetingMap = new Map(meetings.map(m => [String(m._id), m.name]));

        // ── 3. Iterate action items ──────────────────────────────────────────
        for (const minutes of allMinutes) {
          const meetingName = meetingMap.get(String(minutes.meetingId)) ?? 'Unknown Meeting';

          for (const item of minutes.items) {
            if (!item.subject?.trim()) { result.skipped++; continue; }
            if (item.followedUp)       { result.skipped++; continue; }
            if (!item.dateOfAction?.trim()) { result.skipped++; continue; }

            const [y, mo, d] = item.dateOfAction.substring(0, 10).split('-').map(Number);
            const actionDate = new Date(y, mo - 1, d);
            actionDate.setHours(0, 0, 0, 0);
            const daysLeft = Math.round((actionDate.getTime() - today.getTime()) / 86_400_000);

            // Only remind if overdue or due within threshold
            if (daysLeft > REMIND_WITHIN_DAYS) { result.skipped++; continue; }

            const payload = {
              meetingName,
              subject:      item.subject,
              actionBy:     item.actionBy ?? '',
              daysLeft,
              dateOfAction: item.dateOfAction,
            };

            // ── Email reminder ──────────────────────────────────────────────
            if (item.actionByEmail?.trim()) {
              const r = await sendEmailReminder({ to: item.actionByEmail.trim(), ...payload });
              if (r.ok) result.sent++;
              else result.errors.push(`email:${item.actionByEmail}: ${r.error}`);
            }

            // ── WhatsApp reminder ───────────────────────────────────────────
            if (item.actionByPhone?.trim()) {
              const r = await sendWhatsAppReminder({ to: item.actionByPhone.trim(), ...payload });
              if (r.ok) result.sent++;
              else result.errors.push(`wa:${item.actionByPhone}: ${r.error}`);
            }
          }
        }
      } catch (companyErr) {
        result.errors.push(String(companyErr instanceof Error ? companyErr.message : companyErr));
      }

      results.push(result);
    }

    const totalSent   = results.reduce((n, r) => n + r.sent,   0);
    const totalErrors = results.reduce((n, r) => n + r.errors.length, 0);

    return NextResponse.json({
      ok: true,
      date: today.toISOString().substring(0, 10),
      companies: companies.length,
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
