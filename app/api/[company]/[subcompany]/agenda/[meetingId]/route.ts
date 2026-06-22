import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getAgendaModel } from '@/models/Agenda';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ company: string; subcompany: string; meetingId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany, meetingId } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const agenda = await getAgendaModel(conn).findOne({ meetingId });
  return NextResponse.json(agenda ?? { meetingId, items: [] });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { company, subcompany, meetingId } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const body = await req.json();
  const agenda = await getAgendaModel(conn).findOneAndUpdate(
    { meetingId },
    { meetingId, items: body.items },
    { returnDocument: 'after', upsert: true }
  );
  return NextResponse.json(agenda);
}
