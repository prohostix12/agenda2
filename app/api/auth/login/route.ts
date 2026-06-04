import { NextResponse } from 'next/server';
import { isSuperAdmin, verifyPassword, makeSessionCookie } from '@/lib/auth';
import { connectDB, MASTER_DB } from '@/lib/mongodb';
import { getCompanyModel } from '@/models/Company';

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

    // Check organisation credentials
    const conn = await connectDB(MASTER_DB);
    const Company = getCompanyModel(conn);
    const org = await Company.findOne({ username: u });

    if (!org || !verifyPassword(password, org.passwordHash)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const cookie = makeSessionCookie({ role: 'org', slug: org.slug, name: org.name, exp: 0 });
    return NextResponse.json(
      { role: 'org', slug: org.slug, name: org.name, redirect: `/${org.slug}` },
      { headers: { 'Set-Cookie': cookie } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
