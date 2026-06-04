import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, DEFAULT_DB } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';

async function getMasterConn() {
  return connectDB(MASTER_DB);
}

// Auto-seed IITS as the first company if none exist
async function seedIITS() {
  const conn = await getMasterConn();
  const Company = getCompanyModel(conn);
  const count = await Company.countDocuments();
  if (count === 0) {
    await Company.create({
      name: 'IITS',
      slug: 'iits',
      dbName: DEFAULT_DB,
      description: 'International IT Services — parent company',
      color: 'blue',
    });
  }
}

export async function GET() {
  try {
    await seedIITS();
    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);
    const companies = await Company.find().sort({ createdAt: 1 });
    return NextResponse.json(companies);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, description, color } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const dbName = `agenda-${slug}`;

    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);

    const existing = await Company.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: 'A company with this name already exists' }, { status: 409 });
    }

    const company = await Company.create({ name: name.trim(), slug, dbName, description, color: color ?? 'blue' });
    return NextResponse.json(company, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
    if (slug === 'iits') return NextResponse.json({ error: 'Cannot delete IITS' }, { status: 403 });

    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);
    await Company.findOneAndDelete({ slug });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
