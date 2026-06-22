import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) throw new Error('Please define MONGODB_URI in .env.local');

// Extract the database name from the URI (e.g. "meeting-manager")
export const DEFAULT_DB = (() => {
  const m = MONGODB_URI.match(/\/([^/?]+)(\?|$)/);
  return m ? m[1] : 'meeting-manager';
})();

// Company registry lives in its own database on the same cluster
export const MASTER_DB = 'agenda-master';

/** Replace the database name portion of the URI */
function buildUri(dbName: string): string {
  return MONGODB_URI.replace(/\/([^/?]+)(\?|$)/, `/${dbName}$2`);
}

/** Derive a database name from a company slug */
export function dbForCompany(slug: string): string {
  if (slug === 'iits') return DEFAULT_DB;
  return `agenda-${slug}`;
}

/** Derive a database name for a sub-company inside an org */
export function dbForSubCompany(orgSlug: string, companySlug: string): string {
  return `agenda-${orgSlug}-${companySlug}`;
}

// ─── Connection cache ────────────────────────────────────────────────────────
const connCache = new Map<string, mongoose.Connection>();
const promiseCache = new Map<string, Promise<mongoose.Connection>>();

/**
 * Returns a mongoose Connection for the given database name.
 * Each database on the same Atlas cluster gets its own cached connection.
 */
export async function connectDB(dbName?: string): Promise<mongoose.Connection> {
  const db = dbName ?? DEFAULT_DB;

  if (connCache.has(db)) return connCache.get(db)!;

  if (!promiseCache.has(db)) {
    const uri = buildUri(db);
    const p = mongoose.createConnection(uri).asPromise()
      .then(conn => { connCache.set(db, conn); return conn; })
      .catch(err => { promiseCache.delete(db); throw err; });
    promiseCache.set(db, p);
  }

  return promiseCache.get(db)!;
}
