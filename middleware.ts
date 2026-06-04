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

async function verifySession(token: string): Promise<{ role: string; slug?: string; name: string; exp: number } | null> {
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
      base64urlDecode(sig),
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

  // /admin requires superadmin role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
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

  // /{company}/* — org users can only access their own slug
  const firstSeg = pathname.split('/')[1];
  if (firstSeg && !RESERVED.has(firstSeg)) {
    if (session.role !== 'superadmin' && session.slug !== firstSeg) {
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
