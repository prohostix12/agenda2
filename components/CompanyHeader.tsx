'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const RESERVED = new Set(['login', 'admin', 'api']);

export default function CompanyHeader({ notificationBell }: { notificationBell: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const segs = pathname.split('/').filter(Boolean);
  const first = segs[0];
  const second = segs[1];

  // Hide on reserved routes and root
  if (!first || RESERVED.has(first)) return null;

  // Org admin panel pages render their own header — hide the global one
  // when at exactly /{org} (no subcompany)
  const hasSubCompany = !!second && second !== 'meetings';
  if (!hasSubCompany) return null;

  // Sub-company page: /{org}/{company}/...
  const org = first;
  const company = second;

  return (
    <header className="bg-blue-900 text-white shadow-md print:hidden">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${org}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <svg width="34" height="34" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="rgba(255,255,255,0.12)"/>
              <rect x="20" y="14" width="40" height="52" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M48 14 L60 26 L48 26 Z" fill="rgba(30,58,138,0.8)"/>
              <path d="M48 14 L60 26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M27 52 L27 34 L40 47 L53 34 L53 52" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <div className="mom-wordmark text-lg font-black text-white leading-none tracking-tight">MOM</div>
              <div className="text-blue-300 text-[10px] leading-none">{org.toUpperCase()}</div>
            </div>
          </Link>

          <svg className="w-4 h-4 text-blue-500 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          <Link href={`/${org}/${company}`} className="hover:opacity-90 transition-opacity hidden sm:block">
            <div className="font-bold text-sm leading-tight">{company.toUpperCase()}</div>
            <div className="text-blue-300 text-[10px]">All Meetings</div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {notificationBell}
          <Link href={`/${org}/${company}/meetings/new`}
            className="bg-white text-blue-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors">
            + New Meeting
          </Link>
        </div>
      </div>
    </header>
  );
}
