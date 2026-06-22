import { NextResponse } from 'next/server';
import { connectDB, dbForCompany } from '@/lib/mongodb';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ company: string }> }) {
  try {
    const { company } = await params;
    const conn = await connectDB(dbForCompany(company));
    const ExtReq = getExtensionRequestModel(conn);
    const requests = await ExtReq.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(requests);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
