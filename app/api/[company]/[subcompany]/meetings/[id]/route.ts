import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getMeetingModel } from '@/models/Meeting';
import { getAgendaModel } from '@/models/Agenda';
import { getMinutesModel } from '@/models/Minutes';

type Ctx = { params: Promise<{ company: string; subcompany: string; id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany, id } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const meeting = await getMeetingModel(conn).findById(id);
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PUT(req: Request, { params }: Ctx) {
  const { company, subcompany, id } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const body = await req.json();
  const meeting = await getMeetingModel(conn).findByIdAndUpdate(id, body, { returnDocument: 'after' });
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { company, subcompany, id } = await params;
  const body = await req.json();
  const update: Record<string, string> = {};
  if (body.name && typeof body.name === 'string') update.name = body.name.trim();
  if (typeof body.adminPhone === 'string') update.adminPhone = body.adminPhone.trim();
  if (typeof body.adminEmail === 'string') update.adminEmail = body.adminEmail.trim();
  if (typeof body.chairpersonPhone === 'string') update.chairpersonPhone = body.chairpersonPhone.trim();
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const meeting = await getMeetingModel(conn).findByIdAndUpdate(id, update, { returnDocument: 'after' });
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { company, subcompany, id } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  await Promise.all([
    getMeetingModel(conn).findByIdAndDelete(id),
    getAgendaModel(conn).deleteMany({ meetingId: id }),
    getMinutesModel(conn).deleteMany({ meetingId: id }),
  ]);
  return NextResponse.json({ success: true });
}
