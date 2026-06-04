'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NotifItem {
  meetingId: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  daysLeft: number | null;
  followedUp: boolean;
}

const AUTO_DISMISS_MS = 8000;

export default function DeadlineToast() {
  const pathname = usePathname();
  const company = pathname?.split('/').filter(Boolean)[0] ?? null;

  const [items, setItems] = useState<NotifItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!company) return;
    fetch(`/api/${company}/notifications`)
      .then((r) => r.json())
      .then((data: NotifItem[]) => {
        if (!Array.isArray(data)) return;
        const todayItems = data.filter((i) => i.daysLeft === 0 && !i.followedUp);
        if (todayItems.length === 0) return;
        setItems(todayItems);
        // Small delay so the page finishes rendering first
        setTimeout(() => setVisible(true), 900);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    setClosing(true);
    setTimeout(() => setVisible(false), 350);
  }

  if (!visible || items.length === 0) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[340px] bg-white rounded-2xl shadow-2xl border border-orange-200 overflow-hidden
        ${closing ? 'opacity-0 translate-x-8 transition-all duration-300' : 'animate-slide-in-right'}`}
    >
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="font-bold text-sm">
            {items.length} Action{items.length !== 1 ? 's' : ''} Due Today
          </span>
        </div>
        <button
          onClick={dismiss}
          className="text-orange-100 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Items */}
      <div className="max-h-60 overflow-y-auto divide-y divide-orange-50">
        {items.map((item, i) => (
          <Link
            key={i}
            href={`/meetings/${item.meetingId}`}
            onClick={dismiss}
            className="flex items-start gap-3 px-4 py-3 hover:bg-orange-50 transition-colors group"
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-900 truncate group-hover:text-blue-700">
                {item.meetingName}
              </p>
              <p className="text-sm text-gray-800 leading-snug line-clamp-2 mt-0.5">
                {item.subject.split('\n')[0].trim()}
              </p>
              {item.actionBy && (
                <p className="text-xs text-gray-400 mt-0.5">By: {item.actionBy}</p>
              )}
            </div>
            <span className="shrink-0 self-center text-[11px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full whitespace-nowrap">
              Due Today
            </span>
          </Link>
        ))}
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-1 bg-orange-100">
        <div
          className="h-full bg-orange-400 animate-shrink-bar"
          style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }}
        />
      </div>
    </div>
  );
}
