import { NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/googleAuth';
import { connectDB } from '@/lib/mongodb';
import GoogleToken from '@/models/GoogleToken';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') ?? '/';

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  await connectDB();
  await GoogleToken.findOneAndUpdate(
    {},
    {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiryDate: tokens.expiry_date!,
    },
    { upsert: true, returnDocument: 'after' }
  );

  const returnTo = decodeURIComponent(state);
  return NextResponse.redirect(new URL(returnTo, req.url));
}
