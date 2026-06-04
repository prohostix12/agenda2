import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Slugs that are real app routes, not company slugs
const RESERVED = new Set(['login', 'admin', 'api', '_next', 'favicon.ico', 'public']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Public routes — no auth needed
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) {
    return NextResponse.next();
  }

  // Read session cookie
  const token = req.cookies.get('mom_session')?.value;
  const session = token ? verifyToken(token) : null;

  // Not logged in → redirect to login
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // /admin routes require superadmin
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (session.role !== 'superadmin') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // /api/companies requires superadmin (except GET which is used by dashboard)
  if (pathname.startsWith('/api/companies') && req.method !== 'GET') {
    if (session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // /{company}/* — org users can only access their own slug; superadmin can access all
  const firstSegment = pathname.split('/')[1];
  if (firstSegment && !RESERVED.has(firstSegment)) {
    if (session.role !== 'superadmin' && session.slug !== firstSegment) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
