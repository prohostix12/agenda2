import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    console.log('[Gupshup Webhook]', body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Gupshup Webhook Error]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Gupshup webhook is active' });
}
