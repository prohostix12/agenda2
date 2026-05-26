import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Agenda from '@/models/Agenda';

export async function GET(_req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    await connectDB();
    const { meetingId } = await params;
    const agenda = await Agenda.findOne({ meetingId });
    return NextResponse.json(agenda ?? { meetingId, items: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch agenda' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    await connectDB();
    const { meetingId } = await params;
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
