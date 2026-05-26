import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import GoogleToken from '@/models/GoogleToken';

export async function GET() {
  try {
    await connectDB();
    const token = await GoogleToken.findOne();
    return NextResponse.json({ connected: !!token });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
