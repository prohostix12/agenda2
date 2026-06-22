import { NextResponse } from 'next/server';
import { connectDB, dbForSubCompany } from '@/lib/mongodb';
import { getSettingsModel } from '@/models/Settings';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ company: string; subcompany: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { company, subcompany } = await params;
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  const settings = await getSettingsModel(conn).findOne().lean();
  return NextResponse.json({ adminName: settings?.adminName ?? '', adminPhone: settings?.adminPhone ?? '', adminEmail: settings?.adminEmail ?? '' });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { company, subcompany } = await params;
  const { adminName, adminPhone, adminEmail } = await req.json();
  const conn = await connectDB(dbForSubCompany(company, subcompany));
  await getSettingsModel(conn).findOneAndUpdate(
    {},
    { adminName: adminName ?? '', adminPhone: adminPhone ?? '', adminEmail: adminEmail ?? '' },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
