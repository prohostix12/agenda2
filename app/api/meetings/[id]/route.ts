import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getMeetingModel } from '@/models/Meeting';
import { getAgendaModel } from '@/models/Agenda';
import { getMinutesModel } from '@/models/Minutes';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const conn = await connectDB();
    const Meeting = getMeetingModel(conn);
    const { id } = await params;
    const meeting = await Meeting.findById(id);
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(meeting);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const conn = await connectDB();
    const Meeting = getMeetingModel(conn);
    const { id } = await params;
    const body = await req.json();
    const meeting = await Meeting.findByIdAndUpdate(id, body, { returnDocument: 'after' });
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(meeting);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const conn = await connectDB();
    const Meeting = getMeetingModel(conn);
    const { id } = await params;
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    const meeting = await Meeting.findByIdAndUpdate(id, { name: name.trim() }, { returnDocument: 'after' });
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(meeting);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update meeting name' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const conn = await connectDB();
    const Meeting = getMeetingModel(conn);
    const Agenda = getAgendaModel(conn);
    const Minutes = getMinutesModel(conn);
    const { id } = await params;
    await Meeting.findByIdAndDelete(id);
    await Agenda.findOneAndDelete({ meetingId: id });
    await Minutes.findOneAndDelete({ meetingId: id });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
