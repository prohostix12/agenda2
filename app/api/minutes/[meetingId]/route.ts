import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Minutes from '@/models/Minutes';

export async function GET(_req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    await connectDB();
    const { meetingId } = await params;
    const minutes = await Minutes.findOne({ meetingId });
    return NextResponse.json(minutes ?? { meetingId, attendees: [], apologies: [], items: [] });
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
    const minutes = await Minutes.findOneAndUpdate(
      { meetingId },
      { meetingId, ...body },
      { returnDocument: 'after', upsert: true }
    );
    return NextResponse.json(minutes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save minutes' }, { status: 500 });
  }
}
