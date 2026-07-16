import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';

type Ctx = { params: Promise<{ company: string; subcompany: string; meetingId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany, meetingId } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const minutes = await getMinutesModel(conn).findOne({ meetingId }).lean();
  return NextResponse.json(minutes ?? { meetingId, attendees: [], items: [] });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { company, subcompany, meetingId } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const body = await req.json();
  const minutes = await getMinutesModel(conn).findOneAndUpdate(
    { meetingId },
    { meetingId, ...body },
    { returnDocument: 'after', upsert: true, strict: false }
  );
  return NextResponse.json(minutes?.toObject() ?? null);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { company, subcompany, meetingId } = await params;
  const { itemIndex, followedUp } = await req.json();
  if (typeof itemIndex !== 'number' || typeof followedUp !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const key = `items.${itemIndex}.followedUp`;
  const minutes = await getMinutesModel(conn).findOneAndUpdate(
    { meetingId },
    { $set: { [key]: followedUp } },
    { returnDocument: 'after' }
  );
  if (!minutes) return NextResponse.json({ error: 'Minutes not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
