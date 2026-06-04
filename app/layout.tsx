import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import NotificationBell from '@/components/NotificationBell';
import DeadlineToast from '@/components/DeadlineToast';
import CompanyHeader from '@/components/CompanyHeader';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'MOM — Minutes of Meeting',
  description: 'Manage meeting agendas, minutes and action items',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <CompanyHeader notificationBell={<NotificationBell />} />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <DeadlineToast />
        <footer className="border-t border-gray-200 mt-16 py-6 text-center text-gray-400 text-sm print:hidden">
          <span className="mom-wordmark font-black text-gray-500">MOM</span>
          <span className="mx-2 text-gray-300">&mdash;</span>
          Minutes of Meeting System &copy; {new Date().getFullYear()} IITS Group
        </footer>
      </body>
    </html>
  );
}
