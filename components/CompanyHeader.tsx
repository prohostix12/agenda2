'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const RESERVED = new Set(['login', 'admin', 'api']);

function getCompany(pathname: string): string | null {
  const seg = (pathname ?? '').split('/').filter(Boolean)[0];
  if (!seg || RESERVED.has(seg)) return null;
  return seg;
}

export default function CompanyHeader({ notificationBell }: { notificationBell: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const company = getCompany(pathname ?? '');

  // Hide header on login page, admin panel (has its own), and root dashboard
  if (!company) return null;

  const companyLabel = company.toUpperCase();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="bg-blue-900 text-white shadow-md print:hidden">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Left: MOM logo + company breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group">
            {/* MOM mini logo */}
            <svg width="34" height="34" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="rgba(255,255,255,0.12)"/>
              <rect x="20" y="14" width="40" height="52" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M48 14 L60 26 L48 26 Z" fill="rgba(30,58,138,0.8)"/>
              <path d="M48 14 L60 26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M27 52 L27 34 L40 47 L53 34 L53 52" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <div className="mom-wordmark text-lg font-black text-white leading-none tracking-tight">MOM</div>
              <div className="text-blue-300 text-[10px] leading-none">Minutes of Meeting</div>
            </div>
          </Link>

          <svg className="w-4 h-4 text-blue-500 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          <Link href={`/${company}`} className="hover:opacity-90 transition-opacity hidden sm:block">
            <div className="font-bold text-sm leading-tight">{companyLabel}</div>
            <div className="text-blue-300 text-[10px]">All Meetings</div>
          </Link>
        </div>

        {/* Right: bell + new meeting + sign out */}
        <div className="flex items-center gap-2">
          {notificationBell}
          <Link
            href={`/${company}/meetings/new`}
            className="bg-white text-blue-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
          >
            + New Meeting
          </Link>
          <button
            onClick={signOut}
            title="Sign Out"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-blue-300 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
