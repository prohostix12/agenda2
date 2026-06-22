'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const RESERVED = new Set(['login', 'admin', 'api']);

/** Build the API base path for notifications based on current URL.
 *  /{org}/{company}/... → /api/{org}/{company}
 *  /{org}/...          → null (org panel has no notifications)
 */
function apiBaseFromPath(path: string): string | null {
  const segs = path.split('/').filter(Boolean);
  const first = segs[0];
  if (!first || RESERVED.has(first)) return null;
  const second = segs[1];
  if (!second || second === 'meetings') return null; // org-level page
  return `/api/${first}/${second}`;
}

interface NotifItem {
  meetingId: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  dateOfAction: string;
  daysLeft: number | null;
  followedUp: boolean;
}

function urgencyStyle() {
  return {
    label: 'Due Today',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-500',
    dotColor: 'bg-orange-500',
  };
}

function formatDate(d: string) {
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotificationBell() {
  const pathname = usePathname();
  const apiBase = apiBaseFromPath(pathname ?? '');
  const apiUrl = apiBase ? `${apiBase}/notifications` : null;

  const [allItems, setAllItems] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const dueItems = allItems.filter((i) => i.daysLeft === 0 && !i.followedUp);
  const count = dueItems.length;

  const load = useCallback(() => {
    if (!apiUrl) return;
    fetch(apiUrl)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAllItems(data);
      })
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    load();
    // refresh every 5 minutes
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={count > 0 ? `${count} action deadline${count !== 1 ? 's' : ''} approaching` : 'Notifications'}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/15 transition-colors"
      >
        {/* Bell icon — slightly animated when there are alerts */}
        <svg
          className={`w-5 h-5 text-white ${count > 0 ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-[350px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Panel header */}
          <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="font-bold text-sm">Action Reminders</span>
              {count > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Empty state */}
          {dueItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-semibold">All clear!</p>
              <p className="text-gray-400 text-xs mt-1">No action deadlines due today.</p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
              {dueItems.map((item, i) => {
                const { label, textColor, bgColor, iconColor, dotColor } = urgencyStyle();
                return (
                  <Link
                    key={i}
                    href={apiBase ? `${apiBase.replace('/api', '')}/meetings/${item.meetingId}` : `/meetings/${item.meetingId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors group"
                  >
                    {/* Clock icon */}
                    <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 ${bgColor}`}>
                      <svg className={`w-4 h-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <p className="text-xs font-bold text-blue-900 truncate group-hover:text-blue-700">
                          {item.meetingName}
                        </p>
                      </div>
                      <p className="text-sm text-gray-800 leading-snug line-clamp-2">{item.subject}</p>
                      <div className="flex items-center justify-between mt-1.5 flex-wrap gap-1">
                        {item.actionBy && (
                          <span className="text-xs text-gray-400">By: {item.actionBy}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(item.dateOfAction)}</span>
                      </div>
                    </div>

                    {/* Urgency badge */}
                    <span
                      className={`shrink-0 self-center text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap ${bgColor} ${textColor}`}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Footer hint */}
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            Today&apos;s deadlines only • All items visible on meeting cards
          </div>
        </div>
      )}
    </div>
  );
}
