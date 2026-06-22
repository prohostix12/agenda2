import { NextResponse } from 'next/server';
import { isSuperAdmin, verifyPassword, makeSessionCookie } from '@/lib/auth';
import { connectDB, MASTER_DB } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';
import { getSubCompanyModel } from '@/models/SubCompany';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const u = username.trim().toLowerCase();

    // Check superadmin first
    if (isSuperAdmin(username.trim(), password)) {
      const cookie = makeSessionCookie({ role: 'superadmin', name: 'Super Admin', exp: 0 });
      return NextResponse.json(
        { role: 'superadmin', redirect: '/admin' },
        { headers: { 'Set-Cookie': cookie } }
      );
    }

    // Check organisation credentials (org username OR org admin username)
    const conn = await connectDB(MASTER_DB);
    const Company = getCompanyModel(conn);
    const org = await Company.findOne({ $or: [{ username: u }, { adminUsername: u }] });

    if (org) {
      const matchesOrg   = verifyPassword(password, org.passwordHash);
      const matchesAdmin = org.adminPasswordHash ? verifyPassword(password, org.adminPasswordHash) : false;

      if (matchesOrg) {
        // Org manager login → full management panel
        const cookie = makeSessionCookie({ role: 'org', slug: org.slug, name: org.name, exp: 0 });
        return NextResponse.json(
          { role: 'org', slug: org.slug, name: org.name, redirect: `/${org.slug}` },
          { headers: { 'Set-Cookie': cookie } }
        );
      }
      if (matchesAdmin) {
        // Notification admin login → requests dashboard only
        const cookie = makeSessionCookie({ role: 'org', slug: org.slug, name: org.name, isAdmin: true, exp: 0 });
        return NextResponse.json(
          { role: 'org', slug: org.slug, name: org.name, isAdmin: true, redirect: `/${org.slug}/admin` },
          { headers: { 'Set-Cookie': cookie } }
        );
      }
    }

    // Check sub-company credentials (globally unique username)
    const SubCompany = getSubCompanyModel(conn);
    const sub = await SubCompany.findOne({ username: u });

    if (!sub || !verifyPassword(password, sub.passwordHash)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const cookie = makeSessionCookie({
      role: 'company',
      slug: sub.orgSlug,
      companySlug: sub.slug,
      name: sub.name,
      exp: 0,
    });
    return NextResponse.json(
      { role: 'company', slug: sub.orgSlug, companySlug: sub.slug, name: sub.name, redirect: `/${sub.orgSlug}/${sub.slug}` },
      { headers: { 'Set-Cookie': cookie } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
