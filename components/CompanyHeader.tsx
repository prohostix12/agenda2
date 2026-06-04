'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Derive company slug from pathname like /iits or /iits/meetings/123 */
function getCompany(pathname: string): string | null {
  const seg = (pathname ?? '').split('/').filter(Boolean)[0];
  if (!seg || seg === 'api') return null;
  return seg;
}

export default function CompanyHeader({ notificationBell }: { notificationBell: React.ReactNode }) {
  const pathname = usePathname();
  const company = getCompany(pathname ?? '');

  // On the root company dashboard, no header — it has its own header
  if (!company) return null;

  const companyLabel = company.toUpperCase();
  const meetingsHref = `/${company}`;
  const newMeetingHref = `/${company}/meetings/new`;

  return (
    <header className="bg-blue-900 text-white shadow-md print:hidden">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left: logo + company breadcrumb */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-blue-200 text-sm hidden sm:block">Companies</span>
          </Link>

          <svg className="w-4 h-4 text-blue-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          <Link href={meetingsHref} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div>
              <div className="font-bold text-base leading-tight">{companyLabel}</div>
              <div className="text-blue-200 text-xs">Meeting Manager</div>
            </div>
          </Link>
        </div>

        {/* Right: bell + new meeting */}
        <div className="flex items-center gap-3">
          {notificationBell}
          <Link
            href={newMeetingHref}
            className="bg-white text-blue-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
          >
            + New Meeting
          </Link>
        </div>
      </div>
    </header>
  );
}
