import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? 'mom-fallback-secret-change-in-production';
const SESSION_COOKIE = 'mom_session';
const SESSION_HOURS = 10;

export { SESSION_COOKIE };

/* ── Password hashing (Node built-in crypto, no extra packages) ── */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const input = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(input, 'hex'));
  } catch {
    return false;
  }
}

/* ── HMAC-signed session tokens (stored in cookie) ── */

export interface SessionPayload {
  role: 'superadmin' | 'org' | 'company';
  slug?: string;         // org slug
  companySlug?: string;  // sub-company slug (role: 'company' only)
  name: string;
  exp: number;
  isAdmin?: boolean;     // true when logged in via adminUsername (notification admin)
}

export function createToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    const data = token.slice(0, dot);
    const sig  = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function makeSessionCookie(payload: SessionPayload): string {
  const token = createToken({
    ...payload,
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  });
  const maxAge = SESSION_HOURS * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/* ── Superadmin credential check (from env) ── */

export function isSuperAdmin(username: string, password: string): boolean {
  const adminUser = process.env.SUPER_ADMIN_USER ?? 'superadmin';
  const adminPass = process.env.SUPER_ADMIN_PASS ?? '';
  return username === adminUser && password === adminPass;
}
