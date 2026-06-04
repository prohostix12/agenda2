import { NextResponse } from 'next/server';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/mom_session=([^;]+)/);
  if (!match) return NextResponse.json({ user: null });

  const session = verifyToken(match[1]);
  if (!session) return NextResponse.json({ user: null });

  return NextResponse.json({ user: { role: session.role, slug: session.slug, name: session.name } });
}
