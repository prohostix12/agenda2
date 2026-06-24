import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';

export const dynamic = 'force-dynamic';

export interface NotifItem {
  meetingId: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  remarks: string;
  dateOfAction: string | null;
  daysLeft: number | null;
  followedUp: boolean;
}

export async function GET() {
  try {
    const conn = await connectDB();
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allMinutes = await Minutes.find();
    if (!allMinutes.length) return NextResponse.json([]);

    const meetingIds = [...new Set(allMinutes.map((m) => String(m.meetingId)))];
    const meetings = await Meeting.find({ _id: { $in: meetingIds } });
    const meetingMap = new Map(meetings.map((m) => [String(m._id), m.name]));

    const notifications: NotifItem[] = [];

    for (const minutes of allMinutes) {
      const meetingName = meetingMap.get(String(minutes.meetingId)) ?? 'Unknown Meeting';
      for (const item of minutes.items) {
        if (!item.subject?.trim()) continue;

        let daysLeft: number | null = null;
        let dateOfAction: string | null = null;

        if (item.dateOfAction?.trim()) {
          const [y, mo, d] = item.dateOfAction.substring(0, 10).split('-').map(Number);
          const actionDate = new Date(y, mo - 1, d);
          actionDate.setHours(0, 0, 0, 0);
          daysLeft = Math.round((actionDate.getTime() - today.getTime()) / 86_400_000);
          dateOfAction = item.dateOfAction;
        }

        notifications.push({
          meetingId: String(minutes.meetingId),
          meetingName,
          subject: item.subject,
          actionBy: item.actionBy ?? '',
          remarks: item.remarks ?? '',
          dateOfAction,
          daysLeft,
          followedUp: item.followedUp ?? false,
        });
      }
    }

    notifications.sort((a, b) => {
      if (a.daysLeft === null && b.daysLeft === null) return 0;
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });

    return NextResponse.json(notifications);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
