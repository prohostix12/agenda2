import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NotificationBell from '@/components/NotificationBell';
import DeadlineToast from '@/components/DeadlineToast';
import CompanyHeader from '@/components/CompanyHeader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Meeting Manager',
  description: 'Agenda and Minutes Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <CompanyHeader notificationBell={<NotificationBell />} />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <DeadlineToast />
        <footer className="border-t border-gray-200 mt-16 py-6 text-center text-gray-400 text-sm print:hidden">
          Meeting Manager &mdash; Agenda &amp; Minutes System
        </footer>
      </body>
    </html>
  );
}
