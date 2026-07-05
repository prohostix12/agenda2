import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function requireSuperAdmin(req: Request): boolean {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/mom_session=([^;]+)/);
  if (!match) return false;
  const session = verifyToken(match[1]);
  return session?.role === 'superadmin';
}

export async function POST(req: Request) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const APP_URL = (
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = {};
  if (secret) headers['Authorization'] = `Bearer ${secret}`;

  const res = await fetch(`${APP_URL}/api/cron/reminders`, { headers });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
