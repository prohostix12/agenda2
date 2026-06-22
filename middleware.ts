import { NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.AUTH_SECRET ?? 'mom-fallback-secret-change-in-production';
const RESERVED = new Set(['login', 'admin', 'api', '_next', 'favicon.ico']);

// ── Web Crypto helpers (Edge-compatible, no Node.js crypto) ──────────────────

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifySession(token: string): Promise<{ role: string; slug?: string; companySlug?: string; name: string; exp: number; isAdmin?: boolean } | null> {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;

    const data = token.slice(0, dot);
    const sig  = token.slice(dot + 1);

    // Import HMAC key from the secret
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify signature
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(sig) as unknown as ArrayBuffer,
      new TextEncoder().encode(data)
    );
    if (!valid) return null;

    // Decode payload
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(data)));
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always pass Next.js internals and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Public: login page + auth API
  if (
    pathname === '/login' ||
    pathname.startsWith('/login?') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout')
  ) {
    return NextResponse.next();
  }

  // Cron routes are secured by CRON_SECRET header, not session cookies
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  // Deadline extension request pages — public (employees have no account)
  if (pathname.startsWith('/extend-request/') || pathname.startsWith('/api/extend-request/')) {
    return NextResponse.next();
  }

  // Gupshup webhook — public (receives delivery status callbacks)
  if (pathname.startsWith('/api/gupshup/')) {
    return NextResponse.next();
  }

  // Read and verify session cookie
  const token   = req.cookies.get('mom_session')?.value ?? '';
  const session = token ? await verifySession(token) : null;

  // Not authenticated → redirect to login
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // /admin (exact superadmin panel) requires superadmin role
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')) {
    if (session.role !== 'superadmin') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // /api/companies mutating operations require superadmin
  if (pathname === '/api/companies' && req.method !== 'GET') {
    if (session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
  }

  const segs = pathname.split('/').filter(Boolean);
  const firstSeg = segs[0];

  if (firstSeg && !RESERVED.has(firstSeg)) {
    if (session.role === 'superadmin') return NextResponse.next();

    if (session.role === 'company') {
      // Company users can only access /{orgSlug}/{companySlug}/*
      const allowed = session.slug === firstSeg && session.companySlug === segs[1];
      if (!allowed) {
        const url = req.nextUrl.clone();
        url.pathname = `/${session.slug}/${session.companySlug}`;
        return NextResponse.redirect(url);
      }
    } else {
      // Org users can only access their own org slug
      if (session.slug !== firstSeg) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }
      // Admin (notification admin) users can only access /{slug}/admin — not the management panel
      if (session.isAdmin) {
        const isAdminPath = segs[1] === 'admin' && segs.length === 2;
        const isApiPath   = pathname.startsWith('/api/');
        if (!isAdminPath && !isApiPath) {
          const url = req.nextUrl.clone();
          url.pathname = `/${session.slug}/admin`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
