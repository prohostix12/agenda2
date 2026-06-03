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

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.json({ error: 'Failed to obtain access token from Google' }, { status: 500 });
    }

    await connectDB();

    const update: Record<string, string | number> = {
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    };
    if (tokens.refresh_token) {
      update.refreshToken = tokens.refresh_token;
    }

    const existing = await GoogleToken.findOne();
    if (existing) {
      await GoogleToken.findOneAndUpdate({}, update);
    } else {
      if (!tokens.refresh_token) {
        return NextResponse.json(
          { error: 'No refresh token received. Please revoke app access at myaccount.google.com and try again.' },
          { status: 400 }
        );
      }
      await GoogleToken.create({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date ?? Date.now() + 3600 * 1000,
      });
    }

    const returnTo = decodeURIComponent(state);
    return NextResponse.redirect(new URL(returnTo, req.url));
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return NextResponse.json(
      { error: 'Failed to complete Google authentication', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
