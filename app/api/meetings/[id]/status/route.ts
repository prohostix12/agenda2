import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getMeetingModel } from '@/models/Meeting';
import { getAgendaModel } from '@/models/Agenda';
import { getMinutesModel } from '@/models/Minutes';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const conn = await connectDB();
    const Meeting = getMeetingModel(conn);
    const Agenda = getAgendaModel(conn);
    const Minutes = getMinutesModel(conn);
    const { id } = await params;

    const [meeting, agenda, minutes] = await Promise.all([
      Meeting.findById(id),
      Agenda.findOne({ meetingId: id }),
      Minutes.findOne({ meetingId: id }),
    ]);

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({
      hasAgenda: !!(agenda && agenda.items.length > 0),
      hasMinutes: !!(minutes && minutes.items.length > 0),
      agendaItemCount: agenda?.items.length ?? 0,
      minutesItemCount: minutes?.items.length ?? 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch meeting status' }, { status: 500 });
  }
}
