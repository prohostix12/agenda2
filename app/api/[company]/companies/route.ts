import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB } from '@/lib/mongodb';
import { getSubCompanyModel } from '@/models/SubCompany';
import { getCompanyModel } from '@/models/Company';
import { hashPassword, verifyToken } from '@/lib/auth';

type Ctx = { params: Promise<{ company: string }> };

function getSession(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(/mom_session=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}

function requireOrgAdmin(req: Request, orgSlug: string): boolean {
  const s = getSession(req);
  if (!s) return false;
  if (s.role === 'superadmin') return true;
  return s.role === 'org' && s.slug === orgSlug;
}

export async function GET(req: Request, { params }: Ctx) {
  const { company: orgSlug } = await params;
  const session = getSession(req);
  if (!session || (session.role !== 'superadmin' && !(session.role === 'org' && session.slug === orgSlug))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const conn = await connectDB(MASTER_DB);
  const SubCompany = getSubCompanyModel(conn);
  const companies = await SubCompany.find({ orgSlug }).sort({ createdAt: 1 }).select('-passwordHash');
  return NextResponse.json(companies);
}

export async function POST(req: Request, { params }: Ctx) {
  const { company: orgSlug } = await params;
  if (!requireOrgAdmin(req, orgSlug)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { name, color, username, password } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!username?.trim()) return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  if (!password?.trim()) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const uLower = username.trim().toLowerCase();
  const conn = await connectDB(MASTER_DB);
  const SubCompany = getSubCompanyModel(conn);
  const Company = getCompanyModel(conn);

  const [existingSub, existingOrg, existingSlug] = await Promise.all([
    SubCompany.findOne({ username: uLower }),
    Company.findOne({ username: uLower }),
    SubCompany.findOne({ orgSlug, slug }),
  ]);
  if (existingSub || existingOrg) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
  }
  if (existingSlug) {
    return NextResponse.json({ error: 'Company name already taken in this organisation' }, { status: 409 });
  }

  const company = await SubCompany.create({
    orgSlug,
    name: name.trim(),
    slug,
    color: color ?? 'blue',
    username: username.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    passwordPlain: password,
  });

  const { passwordHash: _, ...safe } = company.toObject();
  return NextResponse.json(safe, { status: 201 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { company: orgSlug } = await params;
  if (!requireOrgAdmin(req, orgSlug)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { slug, name, color, username, password } = await req.json();
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const conn = await connectDB(MASTER_DB);
  const SubCompany = getSubCompanyModel(conn);

  const update: Record<string, string> = {};
  if (name) update.name = name.trim();
  if (color) update.color = color;
  if (username) {
    const uLower = username.trim().toLowerCase();
    const Company = getCompanyModel(conn);
    const [dupSub, dupOrg] = await Promise.all([
      SubCompany.findOne({ username: uLower, $or: [{ orgSlug: { $ne: orgSlug } }, { slug: { $ne: slug } }] }),
      Company.findOne({ username: uLower }),
    ]);
    if (dupSub || dupOrg) return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    update.username = uLower;
  }
  if (password) {
    update.passwordHash = hashPassword(password);
    update.passwordPlain = password;
  }

  const updated = await SubCompany.findOneAndUpdate({ orgSlug, slug }, update, { new: true }).select('-passwordHash');
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { company: orgSlug } = await params;
  if (!requireOrgAdmin(req, orgSlug)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const conn = await connectDB(MASTER_DB);
  const SubCompany = getSubCompanyModel(conn);
  await SubCompany.findOneAndDelete({ orgSlug, slug });
  return NextResponse.json({ success: true });
}
