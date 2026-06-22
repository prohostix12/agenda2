import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ company: string; subcompany: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const Minutes = getMinutesModel(conn);
  const Meeting = getMeetingModel(conn);
  const ExtReq  = getExtensionRequestModel(conn);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [allMinutes, pendingExtRequests] = await Promise.all([
    Minutes.find().lean(),
    ExtReq.find({ $or: [{ status: 'pending' }, { status: { $exists: false } }] }).sort({ createdAt: -1 }).lean(),
  ]);

  const meetingIds = [...new Set(allMinutes.map(m => String(m.meetingId)))];
  const meetings = await Meeting.find({ _id: { $in: meetingIds } });
  const meetingMap = new Map(meetings.map(m => [String(m._id), m.name]));

  type NotifItem = {
    type: 'action' | 'extension';
    meetingId: string; meetingName: string; subject: string;
    actionBy: string; remarks: string; dateOfAction: string | null;
    daysLeft: number | null; followedUp: boolean;
    extensionId?: string; requestedDeadline?: string; reason?: string;
  };

  const notifications: NotifItem[] = [];

  for (const mins of allMinutes) {
    const meetingName = meetingMap.get(String(mins.meetingId)) ?? 'Unknown Meeting';
    for (const item of mins.items as Array<{ subject?: string; actionBy?: string; remarks?: string; dateOfAction?: string; followedUp?: boolean }>) {
      if (!item.subject?.trim()) continue;
      let daysLeft: number | null = null;
      let dateOfAction: string | null = null;
      if (item.dateOfAction?.trim()) {
        const [y, mo, d] = item.dateOfAction.substring(0, 10).split('-').map(Number);
        const actionDate = new Date(y, mo - 1, d); actionDate.setHours(0, 0, 0, 0);
        daysLeft = Math.round((actionDate.getTime() - today.getTime()) / 86_400_000);
        dateOfAction = item.dateOfAction;
      }
      notifications.push({ type: 'action', meetingId: String(mins.meetingId), meetingName, subject: item.subject, actionBy: item.actionBy ?? '', remarks: item.remarks ?? '', dateOfAction, daysLeft, followedUp: item.followedUp ?? false });
    }
  }

  for (const ext of pendingExtRequests) {
    notifications.unshift({
      type: 'extension',
      meetingId: String(ext.meetingId),
      meetingName: ext.meetingName,
      subject: ext.subject,
      actionBy: ext.actionBy,
      remarks: '',
      dateOfAction: ext.originalDeadline,
      daysLeft: null,
      followedUp: false,
      extensionId: String(ext._id),
      requestedDeadline: ext.requestedDeadline,
      reason: ext.reason,
    });
  }

  notifications.sort((a, b) => {
    if (a.type === 'extension' && b.type !== 'extension') return -1;
    if (a.type !== 'extension' && b.type === 'extension') return 1;
    if (a.daysLeft === null && b.daysLeft === null) return 0;
    if (a.daysLeft === null) return 1; if (b.daysLeft === null) return -1;
    return a.daysLeft - b.daysLeft;
  });
  return NextResponse.json(notifications);
}
