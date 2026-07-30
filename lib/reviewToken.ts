import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? 'mom-fallback-secret-change-in-production';

export interface ReviewTokenPayload {
  company: string;    // org slug (always)
  sub?: string;        // set for sub-company tokens; DB = dbForSubCompany(company, sub)
  requestId: string;   // ExtensionRequest _id
}

export function makeReviewToken(payload: ReviewTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyReviewToken(token: string): ReviewTokenPayload | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    const data = token.slice(0, dot);
    const sig  = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(data, 'base64url').toString()) as ReviewTokenPayload;
  } catch {
    return null;
  }
}
