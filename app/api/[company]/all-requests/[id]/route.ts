import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, dbForCompany, dbForSubCompany } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getSubCompanyModel } from '@/models/SubCompany';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';
import { getMinutesModel } from '@/models/Minutes';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ company: string; id: string }> };

function getSession(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const match  = cookie.match(/mom_session=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { company: orgSlug, id } = await params;
    const session = getSession(req);
    if (!session || (session.role !== 'superadmin' && !(session.role === 'org' && session.slug === orgSlug))) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { status } = await req.json();
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const masterConn = await connectDB(MASTER_DB);
    const SubCompany = getSubCompanyModel(masterConn);
    const subCompanies = await SubCompany.find({ orgSlug }).lean();

    let dbName = '';
    let reqDoc: InstanceType<ReturnType<typeof getExtensionRequestModel>> | null = null;

    const orgDbName = dbForCompany(orgSlug);
    const orgConn = await connectDB(orgDbName);
    const OrgExtReq = getExtensionRequestModel(orgConn);
    reqDoc = await OrgExtReq.findById(id);
    if (reqDoc) dbName = orgDbName;

    if (!reqDoc) {
      for (const sub of subCompanies) {
        const subDbName = dbForSubCompany(orgSlug, sub.slug);
        const subConn = await connectDB(subDbName);
        const SubExtReq = getExtensionRequestModel(subConn);
        reqDoc = await SubExtReq.findById(id);
        if (reqDoc) { dbName = subDbName; break; }
      }
    }

    if (!reqDoc) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    reqDoc.status = status;
    await reqDoc.save();

    if (status === 'approved') {
      const conn = await connectDB(dbName);
      const Minutes = getMinutesModel(conn);
      const minutes = await Minutes.findOne({ meetingId: reqDoc.meetingId });
      if (minutes && minutes.items[reqDoc.itemIndex]) {
        minutes.items[reqDoc.itemIndex].dateOfAction = reqDoc.requestedDeadline;
        minutes.markModified('items');
        await minutes.save();
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error('[all-requests PATCH]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
