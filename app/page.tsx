'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

/* ─────────────── Types ─────────────── */
interface Meeting {
  _id: string;
  name: string;
  date: string;
  location?: string;
  chairperson?: string;
  meetLink?: string;
  createdAt: string;
}
interface ActionItem {
  subject: string;
  actionBy: string;
  remarks: string;
  dateOfAction: string | null;
  daysLeft: number | null;
  followedUp: boolean;
}
type Urgency = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'none';

/* ─────────────── Helpers ─────────────── */
function getUrgency(items: ActionItem[]): Urgency {
  const dated = items.filter((i) => i.daysLeft !== null && !i.followedUp);
  if (!dated.length) return 'none';
  const min = Math.min(...dated.map((i) => i.daysLeft as number));
  if (min < 0) return 'overdue';
  if (min === 0) return 'today';
  if (min === 1) return 'tomorrow';
  if (min <= 7) return 'soon';
  return 'none';
}

const URGENCY: Record<Urgency, { bar: string; pill: string; text: string; label: string }> = {
  overdue:  { bar: 'bg-red-500',    pill: 'bg-red-100 text-red-600',      text: 'text-red-600',    label: 'Overdue' },
  today:    { bar: 'bg-orange-500', pill: 'bg-orange-100 text-orange-600', text: 'text-orange-600', label: 'Due Today' },
  tomorrow: { bar: 'bg-yellow-400', pill: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700', label: 'Due Tomorrow' },
  soon:     { bar: 'bg-blue-500',   pill: 'bg-blue-100 text-blue-700',     text: 'text-blue-700',   label: 'Due Soon' },
  none:     { bar: 'bg-gray-200',   pill: '',                              text: '',                label: '' },
};

function DeadlinePill({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) {
    const d = Math.abs(daysLeft);
    return <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">Overdue {d}d</span>;
  }
  if (daysLeft === 0) return <span className="shrink-0 text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">Today</span>;
  if (daysLeft === 1) return <span className="shrink-0 text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">Tomorrow</span>;
  return <span className="shrink-0 text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">{daysLeft}d left</span>;
}

function fmtActionDate(d: string) {
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/* ─────────────── Meeting Card ─────────────── */
function MeetingCard({
  meeting,
  items,
  onDelete,
  onRename,
}: {
  meeting: Meeting;
  items: ActionItem[];
  onDelete: (id: string, name: string) => void;
  onRename: (id: string, newName: string) => void;
}) {
  const urgency = getUrgency(items);
  const { bar, pill, label } = URGENCY[urgency];
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(meeting.name);
  const [showAll, setShowAll] = useState(false);

  const LIMIT = 3;
  const visibleItems = showAll ? items : items.slice(0, LIMIT);
  const hasMore = items.length > LIMIT;

  // Only show Join Meet for today's and future meetings
  const meetingDay = parseLocalDate(meeting.date);
  meetingDay.setHours(0, 0, 0, 0);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const isUpcoming = meetingDay >= todayMidnight;

  async function saveEdit() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== meeting.name) {
      await fetch(`/api/meetings/${meeting._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      onRename(meeting._id, trimmed);
    }
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow flex flex-col overflow-hidden">

      {/* Urgency top bar */}
      <div className={`h-1.5 w-full ${bar}`} />

      {/* Card body */}
      <div className="flex-1 p-5">

        {/* Date + name row */}
        <div className="flex items-start gap-3 mb-4">
          {/* Calendar date badge */}
          <div className="shrink-0 w-14 h-14 bg-blue-900 rounded-xl flex flex-col items-center justify-center text-white shadow-sm">
            <span className="text-[10px] font-semibold uppercase leading-none tracking-wide opacity-80">
              {format(parseLocalDate(meeting.date), 'MMM')}
            </span>
            <span className="text-2xl font-bold leading-tight">
              {format(parseLocalDate(meeting.date), 'dd')}
            </span>
            <span className="text-[9px] opacity-70 leading-none">
              {format(parseLocalDate(meeting.date), 'yyyy')}
            </span>
          </div>

          {/* Name + urgency badge + controls */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {editing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                  onBlur={saveEdit}
                  className="flex-1 text-base font-bold text-gray-900 border border-blue-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              ) : (
                <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-2 flex-1">{meeting.name}</h2>
              )}
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <button onClick={() => { setEditing(true); setEditName(meeting.name); }}
                  className="text-gray-300 hover:text-blue-500 p-1 rounded-lg hover:bg-blue-50 transition-colors" title="Rename">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(meeting._id, meeting.name)}
                  className="text-gray-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Urgency badge (only when relevant) */}
            {label && (
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pill}`}>
                {label}
              </span>
            )}

            {/* Meta */}
            <div className="mt-2 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(parseLocalDate(meeting.date), 'EEEE, dd MMMM yyyy')}
              </div>
              {meeting.location && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {meeting.location}
                </div>
              )}
              {meeting.chairperson && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {meeting.chairperson}
                </div>
              )}
              {meeting.meetLink && isUpcoming && (
                <div>
                  <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors mt-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join Meet
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Items */}
        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Action Items
              </span>
              <span className="text-[10px] text-gray-400 font-semibold">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-1">
              {visibleItems.map((item, i) => (
                <div key={i}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                    item.followedUp ? 'bg-green-50'
                    : item.daysLeft === null ? 'bg-gray-50'
                    : item.daysLeft < 0 ? 'bg-red-50'
                    : item.daysLeft === 0 ? 'bg-orange-50'
                    : item.daysLeft === 1 ? 'bg-yellow-50'
                    : 'bg-blue-50/50'
                  }`}
                >
                  {/* Colored dot */}
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                    item.followedUp ? 'bg-green-400'
                    : item.daysLeft === null ? 'bg-gray-300'
                    : item.daysLeft < 0 ? 'bg-red-400'
                    : item.daysLeft === 0 ? 'bg-orange-400'
                    : item.daysLeft === 1 ? 'bg-yellow-400'
                    : 'bg-blue-400'
                  }`} />

                  {/* Subject */}
                  <span className={`flex-1 text-xs truncate font-medium ${item.followedUp ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {item.subject.split('\n')[0].trim()}
                  </span>

                  {/* Date + pill */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.dateOfAction && !item.followedUp && (
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        {fmtActionDate(item.dateOfAction)}
                      </span>
                    )}
                    {item.followedUp ? (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-0.5">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Done
                      </span>
                    ) : item.daysLeft !== null ? (
                      <DeadlinePill daysLeft={item.daysLeft} />
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">No date</span>
                    )}
                  </div>
                </div>
              ))}

              {hasMore && (
                <button onClick={() => setShowAll((p) => !p)}
                  className="w-full text-[11px] text-blue-600 hover:text-blue-800 font-semibold py-1 rounded-lg hover:bg-blue-50 transition-colors">
                  {showAll ? '▲ Show less' : `▼ Show ${items.length - LIMIT} more`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Open button */}
      <div className="px-5 pb-4">
        <Link href={`/meetings/${meeting._id}`}
          className="block w-full text-center bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
          Open Meeting →
        </Link>
      </div>
    </div>
  );
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({
  icon, label, value, color, onClick,
}: {
  icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void;
}) {
  const clickable = !!onClick && value > 0;
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`flex items-center gap-3 bg-white rounded-xl border shadow-sm px-4 py-3 transition-all
        ${clickable
          ? 'border-gray-200 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99]'
          : 'border-gray-100'
        }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div className="flex-1">
        <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
      {clickable && (
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
}

/* ─────────────── Page ─────────────── */
export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingItems, setMeetingItems] = useState<Record<string, ActionItem[]>>({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [mRes, nRes] = await Promise.allSettled([
        fetch('/api/meetings').then((r) => r.json()),
        fetch('/api/notifications').then((r) => r.json()),
      ]);

      if (mRes.status === 'fulfilled') {
        const d = mRes.value;
        if (d?.error) { setError(d.error); setMeetings([]); }
        else { setMeetings(Array.isArray(d) ? d : []); setError(null); }
      } else {
        setError('Failed to load meetings'); setMeetings([]);
      }

      if (nRes.status === 'fulfilled' && Array.isArray(nRes.value)) {
        const map: Record<string, ActionItem[]> = {};
        (nRes.value as Array<ActionItem & { meetingId: string }>).forEach((item) => {
          if (!item.subject?.trim()) return;
          if (item.followedUp) return; // hide done items from the countdown
          if (!map[item.meetingId]) map[item.meetingId] = [];
          map[item.meetingId].push(item);
        });
        Object.values(map).forEach((arr) =>
          arr.sort((a, b) => {
            if (a.daysLeft === null && b.daysLeft === null) return 0;
            if (a.daysLeft === null) return 1;
            if (b.daysLeft === null) return -1;
            return a.daysLeft - b.daysLeft;
          })
        );
        setMeetingItems(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  function deleteMeeting(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also remove its agenda and minutes.`)) return;
    fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    setMeetings((prev) => prev.filter((m) => m._id !== id));
  }

  function renameMeeting(id: string, newName: string) {
    setMeetings((prev) => prev.map((m) => (m._id === id ? { ...m, name: newName } : m)));
  }

  const todayDate = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const q = search.toLowerCase();
  const filtered = (arr: Meeting[]) =>
    arr.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.location ?? '').toLowerCase().includes(q) ||
        (m.chairperson ?? '').toLowerCase().includes(q)
    );

  const upcoming = useMemo(
    () => meetings
      .filter((m) => parseLocalDate(m.date) >= todayDate)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()),
    [meetings, todayDate]
  );

  const past = useMemo(
    () => meetings
      .filter((m) => parseLocalDate(m.date) < todayDate)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()),
    [meetings, todayDate]
  );

  const totalDueToday = useMemo(
    () => Object.values(meetingItems).flat().filter((i) => i.daysLeft === 0 && !i.followedUp).length,
    [meetingItems]
  );

  const totalOverdue = useMemo(
    () => Object.values(meetingItems).flat().filter((i) => i.daysLeft !== null && i.daysLeft < 0 && !i.followedUp).length,
    [meetingItems]
  );

  // All meetings: upcoming first (asc), then past (desc) — must be before early returns
  const all = useMemo(() => [...upcoming, ...past], [upcoming, past]);

  // Flat list of all overdue items enriched with meeting name — for the modal
  const overdueItems = useMemo(() => {
    const result: Array<ActionItem & { meetingId: string; meetingName: string }> = [];
    Object.entries(meetingItems).forEach(([meetingId, items]) => {
      const meetingName = meetings.find((m) => m._id === meetingId)?.name ?? 'Unknown Meeting';
      items.forEach((item) => {
        if (item.daysLeft !== null && item.daysLeft < 0 && !item.followedUp) {
          result.push({ ...item, meetingId, meetingName });
        }
      });
    });
    // Most overdue first
    return result.sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number));
  }, [meetingItems, meetings]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="text-center py-24 text-gray-400">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-4" />
        Loading meetings...
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border border-red-100 shadow-sm">
        <p className="text-red-600 font-semibold">{error}</p>
        <p className="text-gray-400 text-sm mt-2">Check your database connection and refresh.</p>
      </div>
    );
  }

  /* ── Empty ── */
  if (meetings.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">No meetings yet</h2>
        <p className="text-gray-400 mb-6">Create your first meeting to get started</p>
        <Link href="/meetings/new" className="bg-blue-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors">
          Create Meeting
        </Link>
      </div>
    );
  }

  const tabList = filtered(
    activeTab === 'all' ? all : activeTab === 'upcoming' ? upcoming : past
  );

  const TABS = [
    { key: 'all',      label: 'All Meetings', count: meetings.length,  dot: 'bg-blue-500' },
    { key: 'upcoming', label: 'Upcoming',      count: upcoming.length,  dot: 'bg-green-500' },
    { key: 'past',     label: 'Past',          count: past.length,      dot: 'bg-gray-400' },
  ] as const;

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 mt-1">Manage your agendas and minutes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-48"
            />
          </div>
          <Link href="/meetings/new"
            className="bg-blue-900 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors flex items-center gap-2 whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Meeting
          </Link>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          label="Total Meetings" value={meetings.length} color="bg-blue-50"
        />
        <StatCard
          icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          label="Upcoming" value={upcoming.length} color="bg-green-50"
        />
        <StatCard
          icon={<svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Due Today" value={totalDueToday} color="bg-orange-50"
        />
        <StatCard
          icon={<svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          label="Overdue Actions" value={totalOverdue} color="bg-red-50"
          onClick={() => setShowOverdueModal(true)}
        />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${tab.dot}`} />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Card grid ── */}
      {tabList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tabList.map((m) => (
            <MeetingCard key={m._id} meeting={m} items={meetingItems[m._id] ?? []}
              onDelete={deleteMeeting} onRename={renameMeeting} />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {search ? (
            <>
              <p className="text-gray-500 font-medium">No meetings match &ldquo;{search}&rdquo;</p>
              <button onClick={() => setSearch('')} className="text-blue-600 text-sm mt-2 hover:underline">Clear search</button>
            </>
          ) : (
            <>
              <p className="text-gray-500 font-medium">
                {activeTab === 'upcoming' ? 'No upcoming meetings' : activeTab === 'past' ? 'No past meetings' : 'No meetings yet'}
              </p>
              {activeTab !== 'past' && (
                <Link href="/meetings/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">Schedule one →</Link>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Overdue Actions Modal ── */}
      {showOverdueModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOverdueModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-base leading-none">Overdue Action Items</p>
                  <p className="text-red-200 text-xs mt-0.5">{overdueItems.length} item{overdueItems.length !== 1 ? 's' : ''} past their deadline</p>
                </div>
              </div>
              <button onClick={() => setShowOverdueModal(false)} className="text-red-200 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Column labels */}
            <div className="grid grid-cols-[1fr_auto] gap-3 px-6 py-2 bg-red-50 border-b border-red-100 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Meeting / Subject</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Overdue</span>
            </div>

            {/* Item list */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {overdueItems.map((item, i) => {
                const days = Math.abs(item.daysLeft as number);
                const [y, mo, d] = (item.dateOfAction ?? '').substring(0, 10).split('-').map(Number);
                const dueDateStr = item.dateOfAction
                  ? new Date(y, mo - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '';
                return (
                  <Link
                    key={i}
                    href={`/meetings/${item.meetingId}`}
                    onClick={() => setShowOverdueModal(false)}
                    className="grid grid-cols-[1fr_auto] gap-3 items-start px-6 py-3.5 hover:bg-red-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <p className="text-xs font-bold text-blue-900 truncate group-hover:text-blue-700">
                          {item.meetingName}
                        </p>
                      </div>
                      <p className="text-sm text-gray-800 truncate font-medium pl-3">
                        {item.subject.split('\n')[0].trim()}
                      </p>
                      <div className="flex items-center gap-3 mt-1 pl-3">
                        {item.actionBy && (
                          <span className="text-[11px] text-gray-400">By: {item.actionBy}</span>
                        )}
                        {dueDateStr && (
                          <span className="text-[11px] text-gray-400">Due: {dueDateStr}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center mt-1">
                      <span className="text-[11px] font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {days} {days === 1 ? 'day' : 'days'} ago
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 shrink-0 text-xs text-gray-400 text-center">
              Click any item to open its meeting &mdash; click outside to close
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
