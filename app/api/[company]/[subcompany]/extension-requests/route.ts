import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getExtensionRequestModel } from '@/models/ExtensionRequest';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ company: string; subcompany: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const requests = await getExtensionRequestModel(conn).find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(requests);
}
