import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getGoogleTokenModel } from '@/models/GoogleToken';

export async function GET() {
  try {
    const conn = await connectDB();
    const GoogleToken = getGoogleTokenModel(conn);
    const token = await GoogleToken.findOne();
    return NextResponse.json({ connected: !!token });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
