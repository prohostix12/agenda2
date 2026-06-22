import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getSubCompanyModel } from '@/models/SubCompany';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function requireSuperAdmin(req: Request): boolean {
  const cookie = req.headers.get('cookie') ?? '';
  const match  = cookie.match(/mom_session=([^;]+)/);
  if (!match) return false;
  return verifyToken(match[1])?.role === 'superadmin';
}

export async function GET(req: Request) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const masterConn = await connectDB(MASTER_DB);
    const Company    = getCompanyModel(masterConn);
    const SubCompany = getSubCompanyModel(masterConn);

    const [orgs, subs] = await Promise.all([
      Company.find().lean(),
      SubCompany.find().lean(),
    ]);

    // Fetch from all org DBs + all sub-company DBs in parallel
    const orgRequests = await Promise.all(
      orgs.map(async (org) => {
        try {
          const conn   = await connectDB(dbForCompany(org.slug));
          const ExtReq = getExtensionRequestModel(conn);
          const reqs   = await ExtReq.find().sort({ createdAt: -1 }).lean();
          return reqs.map(r => ({ ...r, orgName: org.name, orgSlug: org.slug, companyName: org.name, companySlug: org.slug, isSubCompany: false }));
        } catch { return []; }
      })
    );

    const subRequests = await Promise.all(
      subs.map(async (sub) => {
        try {
          const conn   = await connectDB(dbForSubCompany(sub.orgSlug, sub.slug));
          const ExtReq = getExtensionRequestModel(conn);
          const reqs   = await ExtReq.find().sort({ createdAt: -1 }).lean();
          return reqs.map(r => ({ ...r, orgName: sub.orgSlug, orgSlug: sub.orgSlug, companyName: sub.name, companySlug: sub.slug, isSubCompany: true }));
        } catch { return []; }
      })
    );

    const all = [...orgRequests.flat(), ...subRequests.flat()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(all);
  } catch (e) {
    console.error('[admin/all-requests]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
