import { NextResponse } from 'next/server';
import { verifyReviewToken } from '@/lib/reviewToken';
import { connectDB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';

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

/* GET — return the extension request so the admin can review it (or see it's already handled) */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const payload = verifyReviewToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

    const { company, sub, requestId } = payload;
    const conn   = await connectDB(getDbName(company, sub));
    const ExtReq = getExtensionRequestModel(conn);

    const request = await ExtReq.findById(requestId).lean();
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    return NextResponse.json({
      company,
      sub,
      meetingName:            request.meetingName,
      subject:                request.subject,
      actionBy:                request.actionBy,
      originalDeadline:       request.originalDeadline,
      originalDeadlineFmt:    request.originalDeadline ? fmtDate(request.originalDeadline) : '',
      requestedDeadline:      request.requestedDeadline,
      requestedDeadlineFmt:   fmtDate(request.requestedDeadline),
      reason:                 request.reason,
      status:                 request.status,
      decidedAt:              request.decidedAt ?? null,
      createdAt:              request.createdAt,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/* POST — approve or reject the request. Single-use: only works while status is 'pending'. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const payload = verifyReviewToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

    const { action } = await req.json();
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { company, sub, requestId } = payload;
    const conn    = await connectDB(getDbName(company, sub));
    const ExtReq  = getExtensionRequestModel(conn);
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);

    const request = await ExtReq.findById(requestId);
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been handled', status: request.status }, { status: 409 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const decidedAt = new Date();

    request.status = newStatus;
    request.decidedAt = decidedAt;
    await request.save();

    // Record the decision in the task's deadline history, and apply the new deadline if approved
    const minutes = await Minutes.findOne({ meetingId: request.meetingId });
    const item = minutes?.items[request.itemIndex];
    if (minutes && item) {
      item.deadlineHistory = item.deadlineHistory ?? [];
      item.deadlineHistory.push({
        previousDeadline:  item.dateOfAction,
        requestedDeadline: request.requestedDeadline,
        reason:            request.reason,
        status:            newStatus,
        decidedAt,
      });
      if (newStatus === 'approved') {
        item.dateOfAction = request.requestedDeadline;
      }
      await minutes.save();
    }

    const meeting = await Meeting.findById(request.meetingId).lean();

    return NextResponse.json({
      ok: true,
      status: newStatus,
      meetingName: meeting?.name ?? request.meetingName,
    });
  } catch (e) {
    console.error('[review-request POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
