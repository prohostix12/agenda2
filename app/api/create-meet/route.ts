import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/googleAuth';
import { connectDB } from '@/lib/mongodb';
import { getGoogleTokenModel } from '@/models/GoogleToken';

export async function POST(req: Request) {
  try {
    const conn = await connectDB();
    const GoogleToken = getGoogleTokenModel(conn);
    const tokenDoc = await GoogleToken.findOne();
    if (!tokenDoc) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 401 });
    }

    const { name, date } = await req.json();

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: tokenDoc.accessToken,
      refresh_token: tokenDoc.refreshToken,
      expiry_date: tokenDoc.expiryDate,
    });

    // Auto-refresh token if expired
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await GoogleToken.findOneAndUpdate(
          {},
          {
            accessToken: tokens.access_token,
            ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
            expiryDate: tokens.expiry_date ?? tokenDoc.expiryDate,
          }
        );
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startDate = new Date(date);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(10, 0, 0, 0);

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: name,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetLink = event.data.hangoutLink;
    if (!meetLink) {
      return NextResponse.json({ error: 'Meet link not generated' }, { status: 500 });
    }

    return NextResponse.json({ meetLink });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create Meet link' }, { status: 500 });
  }
}
