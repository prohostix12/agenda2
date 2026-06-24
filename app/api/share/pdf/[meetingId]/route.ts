import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getMinutesModel } from '@/models/Minutes';
import { getMeetingModel } from '@/models/Meeting';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const conn = await connectDB();
    const Minutes = getMinutesModel(conn);
    const Meeting = getMeetingModel(conn);
    const { meetingId } = await params;

    const minutes = await Minutes.findOne({ meetingId });

    if (!minutes || !minutes.pdfBase64) {
      return new NextResponse('Meeting minutes PDF not found or not yet generated.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    let filename = 'Minutes.pdf';
    try {
      const meeting = await Meeting.findById(meetingId);
      if (meeting && meeting.name) {
        const safeName = meeting.name.replace(/[^a-zA-Z0-9\s-_]/g, '');
        filename = `Minutes - ${safeName}.pdf`;
      }
    } catch (err) {
      console.error('Error fetching meeting for PDF filename:', err);
    }

    const pdfBuffer = Buffer.from(minutes.pdfBase64, 'base64');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (e) {
    console.error('Error serving minutes PDF:', e);
    return new NextResponse('Internal server error occurred while retrieving PDF.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
