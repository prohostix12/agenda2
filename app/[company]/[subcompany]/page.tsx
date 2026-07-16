'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
function parseLocalDate(d: string | Date | undefined): Date {
  if (!d) return new Date();
  const s = typeof d === 'string' ? d : d.toISOString();
  const [y, m, day] = s.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function fmt(d: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return pattern
    .replace('EEE',  DAYS[d.getDay()])
    .replace('MMM',  MONTHS[d.getMonth()])
    .replace('yyyy', String(d.getFullYear()))
    .replace('dd',   pad(d.getDate()))
    .replace('MM',   pad(d.getMonth() + 1));
}

function format(d: Date, pattern: string): string { return fmt(d, pattern); }

interface ExtensionRequest {
  _id: string; subject: string; actionBy: string; meetingName: string;
  originalDeadline: string; requestedDeadline: string; reason: string; createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}
interface Meeting {
  _id: string; name: string; date: string;
  location?: string; chairperson?: string; meetLink?: string; createdAt: string;
}
interface ActionItem {
  subject: string; actionBy: string; remarks: string;
  dateOfAction: string | null; daysLeft: number | null; followedUp: boolean;
  itemIndex?: number;
}
type Urgency = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'none';

function getUrgency(items: ActionItem[]): Urgency {
  const dated = items.filter(i => i.daysLeft !== null && !i.followedUp);
  if (!dated.length) return 'none';
  const min = Math.min(...dated.map(i => i.daysLeft as number));
  if (min < 0) return 'overdue'; if (min === 0) return 'today';
  if (min === 1) return 'tomorrow'; if (min <= 7) return 'soon';
  return 'none';
}
const URGENCY: Record<Urgency, { bar: string; pill: string; label: string }> = {
  overdue:  { bar: 'bg-red-500',    pill: 'bg-red-100 text-red-600',      label: 'Overdue' },
  today:    { bar: 'bg-orange-500', pill: 'bg-orange-100 text-orange-600', label: 'Due Today' },
  tomorrow: { bar: 'bg-yellow-400', pill: 'bg-yellow-100 text-yellow-700', label: 'Due Tomorrow' },
  soon:     { bar: 'bg-blue-500',   pill: 'bg-blue-100 text-blue-700',    label: 'Due Soon' },
  none:     { bar: 'bg-gray-200',   pill: '',                             label: '' },
};

function DeadlinePill({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) return <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">Overdue {Math.abs(daysLeft)}d</span>;
  if (daysLeft === 0) return <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">Today</span>;
  if (daysLeft === 1) return <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">Tomorrow</span>;
  return <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">{daysLeft}d left</span>;
}

function fmtActionDate(d: string) {
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void }) {
  const clickable = !!onClick && value > 0;
  return (
    <div onClick={clickable ? onClick : undefined}
      className={`flex items-center gap-3 bg-white rounded-xl border shadow-sm px-4 py-3 transition-all ${clickable ? 'border-gray-200 cursor-pointer hover:shadow-md hover:scale-[1.02]' : 'border-gray-100'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div className="flex-1">
        <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
      {clickable && <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
    </div>
  );
}

function MeetingCard({ meeting, org, company, items, onDelete, onRename, onItemDone }: {
  meeting: Meeting; org: string; company: string; items: ActionItem[];
  onDelete: (id: string, name: string) => void; onRename: (id: string, name: string) => void;
  onItemDone: (meetingId: string, itemIndex: number, done: boolean) => void;
}) {
  const urgency = getUrgency(items);
  const { bar, pill, label } = URGENCY[urgency];
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(meeting.name);
  const [showAll, setShowAll] = useState(false);
  const [togglingIdx, setTogglingIdx] = useState<number | null>(null);
  const LIMIT = 3;
  const visibleItems = showAll ? items : items.slice(0, LIMIT);
  const hasMore = items.length > LIMIT;
  const meetingDay = parseLocalDate(meeting.date); meetingDay.setHours(0, 0, 0, 0);
  const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
  const isUpcoming = meetingDay >= todayMid;
  const isToday    = meetingDay.getTime() === todayMid.getTime();
  const isFuture   = meetingDay > todayMid;

  async function saveEdit() {
    const t = editName.trim();
    if (t && t !== meeting.name) {
      await fetch(`/api/${org}/${company}/meetings/${meeting._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: t }),
      });
      onRename(meeting._id, t);
    }
    setEditing(false);
  }

  async function toggleDone(itemIndex: number, currentDone: boolean) {
    setTogglingIdx(itemIndex);
    await fetch(`/api/${org}/${company}/minutes/${meeting._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIndex, followedUp: !currentDone }),
    });
    onItemDone(meeting._id, itemIndex, !currentDone);
    setTogglingIdx(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow flex flex-col overflow-hidden">
      <div className={`h-1.5 w-full ${bar}`} />
      <div className="flex-1 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-14 h-14 bg-blue-900 rounded-xl flex flex-col items-center justify-center text-white shadow-sm">
            <span className="text-[10px] font-semibold uppercase leading-none opacity-80">{format(parseLocalDate(meeting.date), 'MMM')}</span>
            <span className="text-2xl font-bold leading-tight">{format(parseLocalDate(meeting.date), 'dd')}</span>
            <span className="text-[9px] opacity-70 leading-none">{format(parseLocalDate(meeting.date), 'yyyy')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {editing ? (
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                  onBlur={saveEdit}
                  className="flex-1 text-base font-bold border border-blue-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              ) : (
                <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-2 flex-1">{meeting.name}</h2>
              )}
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <button onClick={() => { setEditing(true); setEditName(meeting.name); }}
                  className="text-gray-300 hover:text-blue-500 p-1 rounded-lg hover:bg-blue-50 transition-colors" title="Rename">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" /></svg>
                </button>
                <button onClick={() => onDelete(meeting._id, meeting.name)}
                  className="text-gray-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            {label && <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pill}`}>{label}</span>}
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {format(parseLocalDate(meeting.date), 'EEE, dd MMM yyyy')}
              </div>
              {meeting.location && <div className="flex items-center gap-1.5 text-xs text-gray-500"><svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{meeting.location}</div>}
              {meeting.chairperson && <div className="flex items-center gap-1.5 text-xs text-gray-500"><svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>{meeting.chairperson}</div>}
              {meeting.meetLink && isUpcoming && (
                <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors mt-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Join Meet
                </a>
              )}
            </div>
          </div>
        </div>
        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Action Items</span>
              <span className="text-[10px] text-gray-400">{items.length}</span>
            </div>
            <div className="space-y-1">
              {visibleItems.map((item, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${item.followedUp ? 'bg-green-50' : item.daysLeft === null ? 'bg-gray-50' : item.daysLeft < 0 ? 'bg-red-50' : item.daysLeft === 0 ? 'bg-orange-50' : item.daysLeft === 1 ? 'bg-yellow-50' : 'bg-blue-50/50'}`}>
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${item.followedUp ? 'bg-green-400' : item.daysLeft === null ? 'bg-gray-300' : item.daysLeft < 0 ? 'bg-red-400' : item.daysLeft === 0 ? 'bg-orange-400' : item.daysLeft === 1 ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                  <span className={`flex-1 text-xs truncate font-medium ${item.followedUp ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.subject.split('\n')[0].trim()}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.dateOfAction && !item.followedUp && <span className="text-[10px] text-gray-400 hidden sm:inline">{fmtActionDate(item.dateOfAction)}</span>}
                    {item.followedUp ? (
                      <button onClick={() => toggleDone(item.itemIndex ?? i, true)} disabled={togglingIdx === (item.itemIndex ?? i)}
                        className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 hover:bg-green-200 transition-colors">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Done
                      </button>
                    ) : (
                      <button onClick={() => toggleDone(item.itemIndex ?? i, false)} disabled={togglingIdx === (item.itemIndex ?? i)}
                        className="text-[10px] font-semibold text-gray-500 bg-gray-100 hover:bg-green-100 hover:text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors border border-gray-200 disabled:opacity-50">
                        {togglingIdx === (item.itemIndex ?? i) ? '…' : '✓'}
                      </button>
                    )}
                    {!item.followedUp && item.daysLeft !== null && <DeadlinePill daysLeft={item.daysLeft} />}
                    {!item.followedUp && item.daysLeft === null && <span className="text-[10px] text-gray-400 italic">No date</span>}
                  </div>
                </div>
              ))}
              {hasMore && <button onClick={() => setShowAll(p => !p)} className="w-full text-[11px] text-blue-600 hover:text-blue-800 font-semibold py-1 rounded-lg hover:bg-blue-50">{showAll ? '▲ Less' : `▼ ${items.length - LIMIT} more`}</button>}
            </div>
          </div>
        )}
      </div>
      <div className="px-5 pb-4">
        {isFuture ? (
          <div className="block w-full text-center bg-gray-200 text-gray-400 text-sm font-semibold py-2.5 rounded-xl cursor-not-allowed select-none">
            Scheduled for {format(meetingDay, 'dd MMM yyyy')}
          </div>
        ) : (
          <Link href={`/${org}/${company}/meetings/${meeting._id}`}
            className="block w-full text-center bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
            Open Meeting →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CompanyMeetings() {
  const params = useParams<{ company: string; subcompany: string }>();
  const org = params?.company ?? '';
  const company = params?.subcompany ?? '';
  const router = useRouter();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingItems, setMeetingItems] = useState<Record<string, ActionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [extRequests, setExtRequests] = useState<ExtensionRequest[]>([]);
  const [showExtRequests, setShowExtRequests] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (!showSettings || !company) return;
    fetch(`/api/${org}/${company}/settings`).then(r => r.json()).then(d => {
      setAdminPhone(d.adminPhone ?? '');
      setAdminEmail(d.adminEmail ?? '');
    }).catch(() => {});
  }, [showSettings, org, company]);

  async function saveSettings() {
    setSettingsSaving(true);
    await fetch(`/api/${org}/${company}/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPhone, adminEmail }),
    });
    setSettingsSaving(false); setSettingsSaved(true);
    setTimeout(() => { setSettingsSaved(false); setShowSettings(false); }, 1500);
  }

  useEffect(() => {
    if (!org || !company) return;
    const load = async () => {
      const [mRes, nRes, eRes] = await Promise.allSettled([
        fetch(`/api/${org}/${company}/meetings`).then(r => r.json()),
        fetch(`/api/${org}/${company}/notifications`).then(r => r.json()),
        fetch(`/api/${org}/${company}/extension-requests`).then(r => r.json()),
      ]);
      if (mRes.status === 'fulfilled') {
        const d = mRes.value;
        if (d?.error) { setError(d.error); setMeetings([]); }
        else { setMeetings(Array.isArray(d) ? d : []); setError(null); }
      } else { setError('Failed to load meetings'); setMeetings([]); }
      if (nRes.status === 'fulfilled' && Array.isArray(nRes.value)) {
        const map: Record<string, ActionItem[]> = {};
        (nRes.value as Array<ActionItem & { meetingId: string }>).forEach(item => {
          if (!item.subject?.trim() || item.followedUp) return;
          if (!map[item.meetingId]) map[item.meetingId] = [];
          map[item.meetingId].push(item);
        });
        Object.values(map).forEach(arr => arr.sort((a, b) => {
          if (a.daysLeft === null) return 1; if (b.daysLeft === null) return -1; return a.daysLeft - b.daysLeft;
        }));
        setMeetingItems(map);
      }
      if (eRes.status === 'fulfilled' && Array.isArray(eRes.value)) setExtRequests(eRes.value);
      setLoading(false);
    };
    load();
  }, [org, company]);

  function deleteMeeting(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    fetch(`/api/${org}/${company}/meetings/${id}`, { method: 'DELETE' });
    setMeetings(prev => prev.filter(m => m._id !== id));
  }
  function markItemDone(meetingId: string, itemIndex: number, done: boolean) {
    setMeetingItems(prev => {
      const items = prev[meetingId] ?? [];
      const updated = items.map((item, idx) => idx === itemIndex ? { ...item, followedUp: done } : item);
      return { ...prev, [meetingId]: updated };
    });
  }
  function renameMeeting(id: string, newName: string) {
    setMeetings(prev => prev.map(m => m._id === id ? { ...m, name: newName } : m));
  }

  const todayDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const q = search.toLowerCase();
  const filtered = (arr: Meeting[]) => arr.filter(m => m.name.toLowerCase().includes(q) || (m.location ?? '').toLowerCase().includes(q) || (m.chairperson ?? '').toLowerCase().includes(q));
  const upcoming = useMemo(() => meetings.filter(m => parseLocalDate(m.date) >= todayDate).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()), [meetings, todayDate]);
  const past = useMemo(() => meetings.filter(m => parseLocalDate(m.date) < todayDate).sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()), [meetings, todayDate]);
  const all = useMemo(() => [...upcoming, ...past], [upcoming, past]);
  const totalDueToday = useMemo(() => Object.values(meetingItems).flat().filter(i => i.daysLeft === 0 && !i.followedUp).length, [meetingItems]);
  const totalOverdue = useMemo(() => Object.values(meetingItems).flat().filter(i => i.daysLeft !== null && i.daysLeft < 0 && !i.followedUp).length, [meetingItems]);
  const overdueItems = useMemo(() => {
    const result: Array<ActionItem & { meetingId: string; meetingName: string }> = [];
    Object.entries(meetingItems).forEach(([meetingId, items]) => {
      const meetingName = meetings.find(m => m._id === meetingId)?.name ?? 'Unknown';
      items.forEach(item => { if (item.daysLeft !== null && item.daysLeft < 0 && !item.followedUp) result.push({ ...item, meetingId, meetingName }); });
    });
    return result.sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number));
  }, [meetingItems, meetings]);

  const TABS = [
    { key: 'all', label: 'All Meetings', count: meetings.length, dot: 'bg-blue-500' },
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length, dot: 'bg-green-500' },
    { key: 'past', label: 'Past', count: past.length, dot: 'bg-gray-400' },
  ] as const;
  const tabList = filtered(activeTab === 'all' ? all : activeTab === 'upcoming' ? upcoming : past);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const pendingExtCount = extRequests.filter(r => !r.status || r.status === 'pending').length;

  if (loading) return <div className="text-center py-24 text-gray-400"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-4" />Loading...</div>;
  if (error) return <div className="text-center py-24 bg-white rounded-2xl border border-red-100"><p className="text-red-600">{error}</p></div>;

  return (
    <div className="space-y-6">
      {pendingExtCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-orange-800 text-sm">{pendingExtCount} Pending Extension Request{pendingExtCount > 1 ? 's' : ''}</p>
            <p className="text-xs text-orange-600 mt-0.5">Waiting for admin approval. Scroll down to view details.</p>
          </div>
          <button onClick={() => { setShowExtRequests(true); document.querySelector('[data-ext-section]')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition shrink-0">
            View
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${org}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to {org.toUpperCase()}
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href={`/${org}`} className="uppercase font-semibold hover:text-blue-600 transition-colors">{org}</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-800 font-bold uppercase">{company}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 capitalize">{company} Meetings</h1>
          <p className="text-gray-500 mt-1">Manage agendas and minutes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-44" />
          </div>
          <Link href={`/${org}/admin`} className="border border-orange-200 bg-orange-50 text-orange-700 px-3 py-2 rounded-xl font-semibold text-sm hover:bg-orange-100 transition-colors flex items-center gap-2 relative">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Extensions
            {pendingExtCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingExtCount}</span>
            )}
          </Link>
          <button onClick={logout} title="Sign Out" className="border border-gray-200 bg-white text-gray-500 p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
          <Link href={`/${org}/${company}/meetings/new`} className="bg-blue-900 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors flex items-center gap-2 whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Meeting
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} label="Total" value={meetings.length} color="bg-blue-50" />
        <StatCard icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} label="Upcoming" value={upcoming.length} color="bg-green-50" />
        <StatCard icon={<svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Due Today" value={totalDueToday} color="bg-orange-50" />
        <StatCard icon={<svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} label="Overdue Actions" value={totalOverdue} color="bg-red-50" onClick={() => setShowOverdueModal(true)} />
      </div>

      {extRequests.length > 0 && (() => {
        const pending  = extRequests.filter(r => !r.status || r.status === 'pending');
        const resolved = extRequests.filter(r => r.status === 'approved' || r.status === 'rejected');
        const fmtD = (d: string) => { if (!d) return '—'; const [y,m,day] = d.substring(0,10).split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
        return (
        <div data-ext-section className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
          <button onClick={() => setShowExtRequests(p => !p)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pending.length > 0 ? 'bg-orange-100 animate-pulse' : 'bg-gray-100'}`}>
                <svg className={`w-4 h-4 ${pending.length > 0 ? 'text-orange-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 text-sm">Deadline Extension Requests</p>
                <p className="text-xs text-gray-500">{pending.length > 0 ? `${pending.length} pending` : 'All reviewed'} · {extRequests.length} total</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pending.length > 0 && <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">{pending.length} pending</span>}
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showExtRequests ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>
          {showExtRequests && (
            <div className="border-t border-orange-100 divide-y divide-gray-100">
              {extRequests.map(req => (
                  <div key={req._id} className={`px-5 py-4 ${req.status === 'rejected' ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {(!req.status || req.status === 'pending') && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Pending</span>}
                      {req.status === 'approved' && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Approved</span>}
                      {req.status === 'rejected' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Rejected</span>}
                      <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">{req.subject.split('\n')[0].trim()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{req.actionBy || '—'} · {req.meetingName}</p>
                    <div className="flex gap-4 mt-2">
                      <div className="text-xs"><span className="text-gray-400">Original: </span><span className="font-medium text-red-600">{fmtD(req.originalDeadline)}</span></div>
                      <div className="text-xs"><span className="text-gray-400">Requested: </span><span className="font-medium text-blue-600">{fmtD(req.requestedDeadline)}</span></div>
                    </div>
                    {req.reason && (
                      <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Reason</p>
                        <p className="text-sm text-gray-700">{req.reason}</p>
                      </div>
                    )}
                  </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            <span className={`w-2 h-2 rounded-full ${tab.dot}`} />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {tabList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tabList.map(m => <MeetingCard key={m._id} meeting={m} org={org} company={company} items={meetingItems[m._id] ?? []} onDelete={deleteMeeting} onRename={renameMeeting} onItemDone={markItemDone} />)}
        </div>
      ) : (
        <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
          {search ? <><p className="text-gray-500">No meetings match &ldquo;{search}&rdquo;</p><button onClick={() => setSearch('')} className="text-blue-600 text-sm mt-2 hover:underline">Clear</button></> : <><p className="text-gray-500 font-medium">No meetings yet</p><Link href={`/${org}/${company}/meetings/new`} className="text-blue-600 text-sm mt-2 inline-block hover:underline">Create one →</Link></>}
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
              <div><h3 className="font-bold text-lg">Notification Admin</h3><p className="text-blue-300 text-xs mt-0.5">This person receives ALL reminder notifications</p></div>
              <button onClick={() => setShowSettings(false)} className="text-blue-300 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">Every daily reminder will <strong>also be sent</strong> to this admin.</div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Admin WhatsApp Number</label>
                <input value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="+91 9876543210" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Admin Email</label>
                <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@company.com" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t border-gray-100">
              <button onClick={() => setShowSettings(false)} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100">Cancel</button>
              <button onClick={saveSettings} disabled={settingsSaving} className="bg-blue-900 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
                {settingsSaved ? <><svg className="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Saved!</> : settingsSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverdueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowOverdueModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3"><p className="font-bold">Overdue Action Items</p><p className="text-red-200 text-xs">{overdueItems.length} items</p></div>
              <button onClick={() => setShowOverdueModal(false)} className="text-red-200 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {overdueItems.map((item, i) => {
                const days = Math.abs(item.daysLeft as number);
                const [y, mo, d] = (item.dateOfAction ?? '').substring(0, 10).split('-').map(Number);
                const dateStr = item.dateOfAction ? new Date(y, mo-1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                return (
                  <Link key={i} href={`/${org}/${company}/meetings/${item.meetingId}`} onClick={() => setShowOverdueModal(false)}
                    className="grid grid-cols-[1fr_auto] gap-3 items-start px-6 py-3.5 hover:bg-red-50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /><p className="text-xs font-bold text-blue-900 truncate">{item.meetingName}</p></div>
                      <p className="text-sm text-gray-800 truncate pl-3">{item.subject.split('\n')[0].trim()}</p>
                      <div className="flex gap-3 mt-1 pl-3">{item.actionBy && <span className="text-[11px] text-gray-400">By: {item.actionBy}</span>}{dateStr && <span className="text-[11px] text-gray-400">Due: {dateStr}</span>}</div>
                    </div>
                    <span className="text-[11px] font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full whitespace-nowrap self-center">{days} {days===1?'day':'days'} ago</span>
                  </Link>
                );
              })}
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-400 text-center">Click any item to open its meeting</div>
          </div>
        </div>
      )}
    </div>
  );
}
