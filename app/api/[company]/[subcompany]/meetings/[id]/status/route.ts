import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getMeetingModel } from '@/models/Meeting';
import { getAgendaModel } from '@/models/Agenda';
import { getMinutesModel } from '@/models/Minutes';

type Ctx = { params: Promise<{ company: string; subcompany: string; id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany, id } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const [meeting, agenda, minutes] = await Promise.all([
    getMeetingModel(conn).findById(id),
    getAgendaModel(conn).findOne({ meetingId: id }),
    getMinutesModel(conn).findOne({ meetingId: id }),
  ]);
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    hasAgenda: !!(agenda && agenda.items.length > 0),
    hasMinutes: !!(minutes && minutes.items.length > 0),
    agendaItemCount: agenda?.items.length ?? 0,
    minutesItemCount: minutes?.items.length ?? 0,
  });
}
