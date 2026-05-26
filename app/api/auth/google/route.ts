import { NextResponse } from 'next/server';
import { getOAuthClient, SCOPES } from '@/lib/googleAuth';

export async function GET(req: Request) {
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
