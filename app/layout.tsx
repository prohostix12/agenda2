import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import DeadlineToast from '@/components/DeadlineToast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Meeting Manager',
  description: 'Agenda and Minutes Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <header className="bg-blue-900 text-white shadow-md print:hidden">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-lg leading-tight">Meeting Manager</div>
                <div className="text-blue-200 text-xs">Agenda &amp; Minutes System</div>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link
                href="/meetings/new"
                className="bg-white text-blue-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
              >
                + New Meeting
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <DeadlineToast />
        <footer className="border-t border-gray-200 mt-16 py-6 text-center text-gray-400 text-sm print:hidden">
          Meeting Manager &mdash; Agenda &amp; Minutes System
        </footer>
      </body>
    </html>
  );
}
