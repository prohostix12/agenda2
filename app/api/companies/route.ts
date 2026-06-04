import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, DEFAULT_DB } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { hashPassword, verifyToken, SESSION_COOKIE } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getMasterConn() {
  return connectDB(MASTER_DB);
}

function requireSuperAdmin(req: Request): boolean {
  // Check Authorization header (for server-side calls) or cookie
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/mom_session=([^;]+)/);
  if (!match) return false;
  const session = verifyToken(match[1]);
  return session?.role === 'superadmin';
}

// Auto-seed IITS as the first organisation if none exist
async function seedIITS() {
  const conn = await getMasterConn();
  const Company = getCompanyModel(conn);
  const count = await Company.countDocuments();
  if (count === 0) {
    const defaultPass = process.env.IITS_DEFAULT_PASS ?? 'IITS@MOM2025';
    await Company.create({
      name: 'IITS',
      slug: 'iits',
      dbName: DEFAULT_DB,
      description: 'International IT Services — parent organisation',
      color: 'blue',
      username: 'iits',
      passwordHash: hashPassword(defaultPass),
    });
  }
}

export async function GET() {
  try {
    await seedIITS();
    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);
    const companies = await Company.find().sort({ createdAt: 1 }).select('-passwordHash');
    return NextResponse.json(companies);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!requireSuperAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { name, description, color, username, password } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Organisation name is required' }, { status: 400 });
    if (!username?.trim()) return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    if (!password?.trim()) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const dbName = `agenda-${slug}`;

    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);

    const existing = await Company.findOne({ $or: [{ slug }, { username: username.trim().toLowerCase() }] });
    if (existing) {
      return NextResponse.json({ error: 'Organisation name or username already taken' }, { status: 409 });
    }

    const company = await Company.create({
      name: name.trim(),
      slug,
      dbName,
      description,
      color: color ?? 'blue',
      username: username.trim().toLowerCase(),
      passwordHash: hashPassword(password),
    });

    const { passwordHash: _, ...safe } = company.toObject();
    return NextResponse.json(safe, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create organisation' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!requireSuperAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { slug, name, description, color, username, password } = await req.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);

    const update: Record<string, string> = {};
    if (name)        update.name = name.trim();
    if (description !== undefined) update.description = description;
    if (color)       update.color = color;
    if (username)    update.username = username.trim().toLowerCase();
    if (password)    update.passwordHash = hashPassword(password);

    const updated = await Company.findOneAndUpdate({ slug }, update, { new: true }).select('-passwordHash');
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update organisation' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!requireSuperAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

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
    return NextResponse.json({ error: 'Failed to delete organisation' }, { status: 500 });
  }
}
