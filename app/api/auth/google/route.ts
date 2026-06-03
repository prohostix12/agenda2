import { NextResponse } from 'next/server';
import { getOAuthClient, SCOPES } from '@/lib/googleAuth';

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.' },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('returnTo') ?? '/';

  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: encodeURIComponent(returnTo),
  });

  return NextResponse.redirect(url);
}
