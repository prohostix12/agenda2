import { NextResponse } from 'next/server';
import { connectDB, dbForCompany } from '@/lib/mongodb';
import { getAgendaModel } from '@/models/Agenda';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ company: string; meetingId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { company, meetingId } = await params;
    const conn = await connectDB(dbForCompany(company));
    const Agenda = getAgendaModel(conn);
    const agenda = await Agenda.findOne({ meetingId });
    return NextResponse.json(agenda ?? { meetingId, items: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch agenda' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { company, meetingId } = await params;
    const conn = await connectDB(dbForCompany(company));
    const Agenda = getAgendaModel(conn);
    const body = await req.json();
    const agenda = await Agenda.findOneAndUpdate(
      { meetingId },
      { meetingId, items: body.items },
      { returnDocument: 'after', upsert: true }
    );
    return NextResponse.json(agenda);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save agenda' }, { status: 500 });
  }
}
