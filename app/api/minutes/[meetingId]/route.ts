import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Minutes from '@/models/Minutes';

export async function GET(_req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    await connectDB();
    const { meetingId } = await params;
    // .lean() returns the raw MongoDB document — all fields including followedUp are preserved
    const minutes = await Minutes.findOne({ meetingId }).lean();
    return NextResponse.json(minutes ?? { meetingId, attendees: [], items: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch minutes' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    await connectDB();
    const { meetingId } = await params;
    const body = await req.json();
    // strict: false ensures no fields (e.g. followedUp) are stripped during save
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
