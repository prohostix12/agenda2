import { NextResponse } from 'next/server';
import { connectDB, dbForCompany } from '@/lib/mongodb';
import { getSettingsModel } from '@/models/Settings';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ company: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { company } = await params;
    const conn = await connectDB(dbForCompany(company));
    const Settings = getSettingsModel(conn);
    const settings = await Settings.findOne().lean();
    return NextResponse.json({
      adminName:  settings?.adminName  ?? '',
      adminPhone: settings?.adminPhone ?? '',
      adminEmail: settings?.adminEmail ?? '',
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { company } = await params;
    const { adminName, adminPhone, adminEmail } = await req.json();
    const conn = await connectDB(dbForCompany(company));
    const Settings = getSettingsModel(conn);
    await Settings.findOneAndUpdate(
      {},
      { adminName: adminName ?? '', adminPhone: adminPhone ?? '', adminEmail: adminEmail ?? '' },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
