import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getMeetingModel } from '@/models/Meeting';

type Ctx = { params: Promise<{ company: string; subcompany: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const Meeting = getMeetingModel(conn);
  const meetings = await Meeting.find().sort({ date: -1 });
  return NextResponse.json(meetings);
}

export async function POST(req: Request, { params }: Ctx) {
  const { company, subcompany } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const Meeting = getMeetingModel(conn);
  const body = await req.json();
  const meeting = await Meeting.create(body);
  return NextResponse.json(meeting, { status: 201 });
}
