import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function GET() {
  try {
    await connectDB();
    const meetings = await Meeting.find().sort({ date: -1 });
    return NextResponse.json(meetings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const meeting = await Meeting.create(body);
    return NextResponse.json(meeting, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
