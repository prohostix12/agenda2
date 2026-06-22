import { NextResponse } from 'next/server';
import { connectDB, MASTER_DB, DEFAULT_DB, dbForCompany } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getSubCompanyModel } from '@/models/SubCompany';
import { getSettingsModel } from '@/models/Settings';
import { hashPassword, verifyToken } from '@/lib/auth';

async function getMasterConn() {
  return connectDB(MASTER_DB);
}

function requireSuperAdmin(req: Request): boolean {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/mom_session=([^;]+)/);
  if (!match) return false;
  const session = verifyToken(match[1]);
  return session?.role === 'superadmin';
}

// Checks whether a username is already taken across all orgs and sub-companies.
// excludeSlug = the org slug to ignore (for edits).
async function isUsernameTaken(
  uLower: string,
  conn: Parameters<typeof getCompanyModel>[0],
  excludeOrgSlug?: string,
  excludeIsAdmin?: boolean, // if true, only exclude adminUsername match for that slug
): Promise<boolean> {
  const Company    = getCompanyModel(conn);
  const SubCompany = getSubCompanyModel(conn);

  const orgQuery = excludeOrgSlug
    ? { $or: [{ username: uLower }, { adminUsername: uLower }], slug: { $ne: excludeOrgSlug } }
    : { $or: [{ username: uLower }, { adminUsername: uLower }] };

  const [org, sub] = await Promise.all([
    Company.findOne(orgQuery),
    SubCompany.findOne({ username: uLower }),
  ]);
  return !!(org || sub);
}

// Auto-seed IITS as the first organisation if none exist, and backfill any missing auth fields
async function seedIITS() {
  const conn = await getMasterConn();
  const Company = getCompanyModel(conn);
  const defaultPass = process.env.IITS_DEFAULT_PASS ?? 'IITS@MOM2025';

  const iits = await Company.findOne({ slug: 'iits' });
  if (!iits) {
    await Company.create({
      name: 'IITS', slug: 'iits', dbName: DEFAULT_DB,
      description: 'International IT Services — parent organisation',
      color: 'blue', username: 'iits',
      passwordHash: hashPassword(defaultPass), passwordPlain: defaultPass,
    });
  } else {
    const fix: Record<string, string> = {};
    if (!iits.username)      fix.username     = 'iits';
    if (!iits.passwordPlain) fix.passwordPlain = defaultPass;
    if (!iits.passwordHash)  fix.passwordHash  = hashPassword(iits.passwordPlain ?? defaultPass);
    if (Object.keys(fix).length) await Company.updateOne({ slug: 'iits' }, { $set: fix });
  }

  const orgsWithoutAuth = await Company.find({
    slug: { $ne: 'iits' },
    $or: [{ username: { $exists: false } }, { passwordHash: { $exists: false } }],
  });
  for (const org of orgsWithoutAuth) {
    const fix: Record<string, string> = {};
    if (!org.username)      fix.username     = org.slug;
    if (!org.passwordPlain) fix.passwordPlain = defaultPass;
    if (!org.passwordHash)  fix.passwordHash  = hashPassword(org.passwordPlain ?? defaultPass);
    if (Object.keys(fix).length) await Company.updateOne({ _id: org._id }, { $set: fix });
  }
}

export async function GET(req: Request) {
  try {
    await seedIITS();
    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);
    const isSA = requireSuperAdmin(req);
    const select = isSA ? '-passwordHash -adminPasswordHash' : '-passwordHash -passwordPlain -adminPasswordHash -adminPasswordPlain';
    const companies = await Company.find().sort({ createdAt: 1 }).select(select);
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

    const { name, description, color, username, password,
            adminName, adminPhone, adminEmail,
            adminUsername, adminPassword } = await req.json();

    if (!name?.trim())     return NextResponse.json({ error: 'Organisation name is required' }, { status: 400 });
    if (!username?.trim()) return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    if (!password?.trim()) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

    const slug   = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uLower = username.trim().toLowerCase();
    const dbName = `agenda-${slug}`;

    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);

    // Check slug uniqueness
    const existingSlug = await Company.findOne({ slug });
    if (existingSlug) return NextResponse.json({ error: 'Organisation name already taken' }, { status: 409 });

    // Check org username uniqueness
    if (await isUsernameTaken(uLower, conn)) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    // Check admin username uniqueness (if provided)
    let aLower: string | undefined;
    if (adminUsername?.trim()) {
      const al = adminUsername.trim().toLowerCase();
      aLower = al;
      if (al === uLower) {
        return NextResponse.json({ error: 'Admin username must be different from the org username' }, { status: 409 });
      }
      if (await isUsernameTaken(al, conn)) {
        return NextResponse.json({ error: 'Admin username is already taken' }, { status: 409 });
      }
    }

    const createData: Record<string, string> = {
      name: name.trim(), slug, dbName,
      description: description ?? '',
      color: color ?? 'blue',
      username: uLower,
      passwordHash: hashPassword(password),
      passwordPlain: password,
    };
    if (aLower && adminPassword?.trim()) {
      createData.adminUsername      = aLower;
      createData.adminPasswordHash  = hashPassword(adminPassword);
      createData.adminPasswordPlain = adminPassword;
    }

    const company = await Company.create(createData);

    // Save admin notification contact into the org's own DB (best-effort — don't fail the whole request)
    if (adminName || adminPhone || adminEmail) {
      try {
        const companyConn = await connectDB(dbForCompany(slug));
        const Settings = getSettingsModel(companyConn);
        await Settings.findOneAndUpdate(
          {},
          { adminName: adminName ?? '', adminPhone: adminPhone ?? '', adminEmail: adminEmail ?? '' },
          { upsert: true }
        );
      } catch (settingsErr) {
        console.error('[companies POST] settings save failed (org still created):', settingsErr);
      }
    }

    const { passwordHash: _p, adminPasswordHash: _a, ...safe } = company.toObject();
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

    const { slug, name, description, color, username, password,
            adminName, adminPhone, adminEmail,
            adminUsername, adminPassword } = await req.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const conn = await getMasterConn();
    const Company = getCompanyModel(conn);

    const update: Record<string, string> = {};
    if (name)                      update.name        = name.trim();
    if (description !== undefined) update.description = description;
    if (color)                     update.color       = color;

    if (username) {
      const uLower = username.trim().toLowerCase();
      const taken  = await isUsernameTaken(uLower, conn, slug);
      if (taken) return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      update.username     = uLower;
    }
    if (password) {
      update.passwordHash  = hashPassword(password);
      update.passwordPlain = password;
    }

    if (adminUsername !== undefined) {
      if (adminUsername.trim() === '') {
        // Clear admin credentials
        await Company.findOneAndUpdate({ slug }, { $unset: { adminUsername: 1, adminPasswordHash: 1, adminPasswordPlain: 1 } });
      } else {
        const aLower = adminUsername.trim().toLowerCase();
        const current = await Company.findOne({ slug });
        if (aLower !== current?.adminUsername) {
          if (aLower === (current?.username ?? slug)) {
            return NextResponse.json({ error: 'Admin username must be different from the org username' }, { status: 409 });
          }
          const taken = await isUsernameTaken(aLower, conn, slug);
          if (taken) return NextResponse.json({ error: 'Admin username is already taken' }, { status: 409 });
        }
        update.adminUsername = aLower;
      }
    }
    if (adminPassword?.trim()) {
      update.adminPasswordHash  = hashPassword(adminPassword);
      update.adminPasswordPlain = adminPassword;
    }

    // Save admin notification settings
    if (adminName !== undefined || adminPhone !== undefined || adminEmail !== undefined) {
      try {
        const companyConn = await connectDB(dbForCompany(slug));
        const Settings = getSettingsModel(companyConn);
        const settingsUpdate: Record<string, string> = {};
        if (adminName  !== undefined) settingsUpdate.adminName  = adminName;
        if (adminPhone !== undefined) settingsUpdate.adminPhone = adminPhone;
        if (adminEmail !== undefined) settingsUpdate.adminEmail = adminEmail;
        await Settings.findOneAndUpdate({}, settingsUpdate, { upsert: true });
      } catch { /* ignore */ }
    }

    const updated = await Company.findOneAndUpdate({ slug }, update, { new: true })
      .select('-passwordHash -adminPasswordHash');
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
