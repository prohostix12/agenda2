import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getSubCompanyModel } from '@/models/SubCompany';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ company: string }> };

function getSession(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const match  = cookie.match(/mom_session=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { company: orgSlug } = await params;
    const session = getSession(req);
    if (!session || (session.role !== 'superadmin' && !(session.role === 'org' && session.slug === orgSlug))) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const masterConn = await connectDB(MASTER_DB);
    const Company    = getCompanyModel(masterConn);
    const SubCompany = getSubCompanyModel(masterConn);

    const [org, subCompanies] = await Promise.all([
      Company.findOne({ slug: orgSlug }).lean(),
      SubCompany.find({ orgSlug }).lean(),
    ]);

    const orgDisplayName = org?.name ?? orgSlug;

    // Fetch from org's own DB
    const orgRequests = await (async () => {
      try {
        const conn   = await connectDB(dbForCompany(orgSlug));
        const ExtReq = getExtensionRequestModel(conn);
        const reqs   = await ExtReq.find().sort({ createdAt: -1 }).lean();
        return reqs.map(r => ({ ...r, companyName: orgDisplayName, companySlug: orgSlug, isOrgLevel: true }));
      } catch { return []; }
    })();

    // Fetch from every sub-company DB in parallel
    const subRequests = await Promise.all(
      subCompanies.map(async (sub) => {
        try {
          const conn   = await connectDB(dbForSubCompany(orgSlug, sub.slug));
          const ExtReq = getExtensionRequestModel(conn);
          const reqs   = await ExtReq.find().sort({ createdAt: -1 }).lean();
          return reqs.map(r => ({ ...r, companyName: sub.name, companySlug: sub.slug, isOrgLevel: false }));
        } catch { return []; }
      })
    );

    const flat = [...orgRequests, ...subRequests.flat()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(flat);
  } catch (e) {
    console.error('[all-requests]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
