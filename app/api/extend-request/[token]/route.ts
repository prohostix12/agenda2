import { NextResponse } from 'next/server';
import { verifyExtendToken } from '@/lib/extendToken';
import { makeReviewToken } from '@/lib/reviewToken';
import { connectDB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';
import { sendWhatsAppText, sendEmailReminder } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

const APP_URL = (
  process.env.APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  'http://localhost:3000'
).replace(/\/$/, '');

type Ctx = { params: Promise<{ token: string }> };

function fmtDate(d: string) {
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getDbName(company: string, sub?: string) {
  return sub ? dbForSubCompany(company, sub) : dbForCompany(company);
}

/* GET — return task details so the page can pre-fill */
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
      meetingName:         meeting?.name ?? 'Unknown Meeting',
      subject:             item.subject,
      actionBy:            item.actionBy ?? '',
      originalDeadline:    item.dateOfAction ?? '',
      originalDeadlineFmt: item.dateOfAction ? fmtDate(item.dateOfAction) : '',
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/* POST — submit the extension request, notify admin */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const payload = verifyExtendToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

    const { company, sub, meetingId, itemIndex } = payload;
    const { reason, requestedDeadline } = await req.json();

    if (!reason?.trim())            return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    if (!requestedDeadline?.trim()) return NextResponse.json({ error: 'New deadline is required' }, { status: 400 });

    const conn    = await connectDB(getDbName(company, sub));
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);
    const ExtReq  = getExtensionRequestModel(conn);

    const [minutes, meeting] = await Promise.all([
      Minutes.findOne({ meetingId }).lean(),
      Meeting.findById(meetingId).lean(),
    ]);

    if (!minutes || !minutes.items[itemIndex]) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const item        = minutes.items[itemIndex];
    const meetingName = meeting?.name ?? 'Unknown Meeting';
    const companyLabel = sub ? sub : company;

    // Save the request to sub-company (or company) DB
    const extReqDoc = await ExtReq.create({
      company: companyLabel,
      meetingId,
      itemIndex,
      subject:           item.subject,
      actionBy:          item.actionBy ?? '',
      meetingName,
      originalDeadline:  item.dateOfAction ?? '',
      reason:            reason.trim(),
      requestedDeadline: requestedDeadline.trim(),
    });

    // Single-use link for the meeting admin to approve/reject this specific request
    const reviewToken = makeReviewToken({ company, sub, requestId: String(extReqDoc._id) });
    const reviewLink   = `${APP_URL}/review-request/${reviewToken}`;

    // Build notification message
    const adminMsg = [
      `📋 *Deadline Extension Request — MOM*`,
      ``,
      `*Company:* ${companyLabel.toUpperCase()}`,
      `*Meeting:* ${meetingName}`,
      `*Requested by:* ${item.actionBy || 'Unknown'}`,
      `*Subject:* ${item.subject.split('\n')[0].trim()}`,
      `*Original Deadline:* ${item.dateOfAction ? fmtDate(item.dateOfAction) : '—'}`,
      `*New Deadline Requested:* ${fmtDate(requestedDeadline)}`,
      ``,
      `*Reason:*`,
      `${reason.trim()}`,
      ``,
      `👉 Review and respond to this request:`,
      reviewLink,
      ``,
      `— _MOM, Minutes of Meeting System_`,
    ].join('\n');

    // Notify only the meeting-level admin
    const recipients: { phone?: string; email?: string; name?: string }[] = [];

    if (meeting?.adminPhone || meeting?.adminEmail) {
      recipients.push({
        phone: (meeting.adminPhone as string | undefined)?.trim(),
        email: (meeting.adminEmail as string | undefined)?.trim(),
        name:  'Meeting Admin',
      });
    }

    // Send WhatsApp + email to each admin
    for (const admin of recipients) {
      if (admin.phone) {
        // No approved Gupshup template exists for this notification (it is NOT the
        // "action item is now due" mom_extend template — that one is assignee-only
        // and expects 4 different params). Send the full message as WhatsApp session
        // text instead of misusing mom_extend.
        await sendWhatsAppText(admin.phone, adminMsg);
      }
      if (admin.email) {
        await sendEmailReminder({
          to:            admin.email,
          meetingName,
          subject:       `[Extension Request] ${item.subject.split('\n')[0].trim()}`,
          actionBy:      item.actionBy ?? '',
          daysLeft:      -999,
          dateOfAction:  requestedDeadline,
          extendLink:    reviewLink,
          actionLabel:   '📋 Review & Respond to Request',
          customSubject: `📋 Extension Request from ${item.actionBy || 'Employee'} — ${meetingName}`,
          customBody:    adminMsg,
        });
      }
    }

    const adminName = recipients[0]?.name ?? 'Admin';
    return NextResponse.json({ ok: true, adminName });
  } catch (e) {
    console.error('[extend-request POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
