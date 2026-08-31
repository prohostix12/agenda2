import { NextResponse } from 'next/server';
import { verifyExtendToken } from '@/lib/extendToken';
import { connectDB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';
import { sendWhatsAppTemplate, sendEmailReminder } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ token: string }> };

function fmtDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getDbName(company: string, sub?: string) {
  return sub ? dbForSubCompany(company, sub) : dbForCompany(company);
}

/* GET — return task details so the page can pre-fill (or show "already submitted") */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const payload = verifyExtendToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

    const { company, sub, meetingId, itemIndex } = payload;
    const conn    = await connectDB(getDbName(company, sub));
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);

    const minutes = await Minutes.findOne({ meetingId }).lean();
    if (!minutes) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const item = minutes.items[itemIndex];
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const meeting = await Meeting.findById(meetingId).lean();

    return NextResponse.json({
      company,
      sub,
      meetingName:      meeting?.name ?? 'Unknown Meeting',
      subject:          item.subject,
      description:      item.remarks ?? '',
      actionBy:         item.actionBy ?? '',
      deadline:         item.dateOfAction ?? '',
      deadlineFmt:      item.dateOfAction ? fmtDate(item.dateOfAction) : '',
      followedUp:       item.followedUp ?? false,
      submission:       item.submission ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/* POST — submit the task as done, record it, notify the meeting admin */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const payload = verifyExtendToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

    const { company, sub, meetingId, itemIndex } = payload;
    const { title, notes, driveLinks } = await req.json();

    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const links = Array.isArray(driveLinks)
      ? driveLinks.filter((l): l is string => typeof l === 'string' && l.trim().length > 0).map(l => l.trim())
      : [];

    const conn    = await connectDB(getDbName(company, sub));
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);

    const minutes = await Minutes.findOne({ meetingId });
    const item = minutes?.items[itemIndex];
    if (!minutes || !item) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (item.followedUp) {
      return NextResponse.json({ error: 'This task has already been submitted', status: 'already-submitted' }, { status: 409 });
    }

    const submittedAt = new Date();
    item.followedUp = true;
    item.submission = {
      title: title.trim(),
      notes: notes?.trim() ?? '',
      driveLinks: links,
      submittedAt,
    };
    await minutes.save();

    const meeting = await Meeting.findById(meetingId).lean();
    const meetingName = meeting?.name ?? 'Unknown Meeting';
    const taskName = item.subject.split('\n')[0].trim();

    // Notify the meeting admin
    if (meeting?.adminPhone) {
      const tplTaskAccept = process.env.GUPSHUP_TPL_TASK_ACCEPT_NOTIFY;
      if (tplTaskAccept) {
        await sendWhatsAppTemplate({
          to:         meeting.adminPhone,
          templateId: tplTaskAccept,
          params:     [meetingName, item.actionBy ?? 'Unknown', taskName, title.trim()],
        });
      }
    }
    if (meeting?.adminEmail) {
      const linksText = links.length ? links.map(l => `- ${l}`).join('\n') : '(none)';
      const adminMsg = [
        `✅ *A task has been submitted — MOM*`,
        ``,
        `*Meeting:* ${meetingName}`,
        `*Submitted by:* ${item.actionBy || 'Unknown'}`,
        `*Task:* ${taskName}`,
        `*Title:* ${title.trim()}`,
        ``,
        `*Notes:*`,
        notes?.trim() || '(none)',
        ``,
        `*Files (Drive links):*`,
        linksText,
        ``,
        `— _MOM, Minutes of Meeting System_`,
      ].join('\n');

      await sendEmailReminder({
        to:            meeting.adminEmail,
        meetingName,
        subject:       taskName,
        actionBy:      item.actionBy ?? '',
        daysLeft:      -999,
        dateOfAction:  item.dateOfAction ?? submittedAt.toISOString(),
        customSubject: `✅ Task Submitted: ${taskName} — ${meetingName}`,
        customBody:    adminMsg,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[submit-task POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
