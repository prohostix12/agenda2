import { NextResponse } from 'next/server';
import { connectDB, dbForCompany } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';

type Params = { params: Promise<{ company: string; meetingId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { company, meetingId } = await params;
    const conn = await connectDB(dbForCompany(company));
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);

    const minutes = await Minutes.findOne({ meetingId });
    if (!minutes || !minutes.pdfBase64) {
      return new NextResponse('PDF not found or not yet generated.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }

    let filename = 'Minutes.pdf';
    try {
      const meeting = await Meeting.findById(meetingId);
      if (meeting?.name) {
        filename = `Minutes - ${meeting.name.replace(/[^a-zA-Z0-9\s-_]/g, '')}.pdf`;
      }
    } catch { /* use default filename */ }

    const pdfBuffer = Buffer.from(minutes.pdfBase64, 'base64');
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse('Internal server error.', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
