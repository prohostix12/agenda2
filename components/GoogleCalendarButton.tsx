'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GoogleCalendarButton() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then((r) => r.json())
      .then((data) => setConnected(!!data.connected))
      .catch(() => setConnected(false));
  }, []);

  if (connected === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white/50 text-xs font-semibold">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        Checking Google connection...
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-semibold shadow-sm">
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span>Google Connected</span>
      </div>
    );
  }

  const authUrl = `/api/auth/google?returnTo=${encodeURIComponent(pathname)}`;

  return (
    <a
      href={authUrl}
      className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold shadow-sm transition-all hover:shadow hover:scale-[1.01]"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
      <span>Connect Google Calendar</span>
    </a>
  );
}
