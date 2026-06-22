import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';

type Ctx = { params: Promise<{ company: string; subcompany: string; meetingId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany, meetingId } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const minutes = await getMinutesModel(conn).findOne({ meetingId });
  if (!minutes?.pdfBase64) {
    return new NextResponse('PDF not found.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  let filename = 'Minutes.pdf';
  try {
    const meeting = await getMeetingModel(conn).findById(meetingId);
    if (meeting?.name) filename = `Minutes - ${meeting.name.replace(/[^a-zA-Z0-9\s-_]/g, '')}.pdf`;
  } catch { /* use default */ }

  return new NextResponse(Buffer.from(minutes.pdfBase64, 'base64'), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Cache-Control': 'no-store' },
  });
}
