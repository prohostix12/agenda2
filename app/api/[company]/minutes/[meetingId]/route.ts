import { NextResponse } from 'next/server';
import { connectDB, dbForCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';

type Params = { params: Promise<{ company: string; meetingId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { company, meetingId } = await params;
    const conn = await connectDB(dbForCompany(company));
    const Minutes = getMinutesModel(conn);
    const minutes = await Minutes.findOne({ meetingId }).lean();
    return NextResponse.json(minutes ?? { meetingId, attendees: [], items: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch minutes' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { company, meetingId } = await params;
    const conn = await connectDB(dbForCompany(company));
    const Minutes = getMinutesModel(conn);
    const body = await req.json();
    const minutes = await Minutes.findOneAndUpdate(
      { meetingId },
      { meetingId, ...body },
      { returnDocument: 'after', upsert: true, strict: false }
    );
    return NextResponse.json(minutes?.toObject() ?? null);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save minutes' }, { status: 500 });
  }
}
