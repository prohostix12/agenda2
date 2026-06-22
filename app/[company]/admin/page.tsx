'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ExtRequest {
  _id: string;
  companyName?: string;
  companySlug?: string;
  isOrgLevel?: boolean;
  meetingName: string;
  actionBy: string;
  subject: string;
  originalDeadline: string;
  requestedDeadline: string;
  reason: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const map: Record<string, string> = {
    blue:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    gray:   'bg-white/5 text-gray-300 border-white/10',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${map[color] ?? map.gray}`}>
      {children}
    </span>
  );
}

// Decode org name + admin flag from session cookie without re-verifying (middleware already did)
function readSession(): { name: string; isAdmin: boolean } | null {
  try {
    const match = document.cookie.match(/mom_session=([^;]+)/);
    if (!match) return null;
    const data    = match[1].split('.')[0];
    const payload = JSON.parse(atob(data.replace(/-/g, '+').replace(/_/g, '/')));
    return { name: payload.name ?? '', isAdmin: !!payload.isAdmin };
  } catch { return null; }
}

export default function OrgAdminDashboard() {
  const router = useRouter();
  const params = useParams<{ company: string }>();
  const orgSlug = params.company;

  const [orgName,   setOrgName]   = useState('');
  const [adminName, setAdminName] = useState('');
  const [requests,  setRequests]  = useState<ExtRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('');

  useEffect(() => {
    const s = readSession();
    if (s) setOrgName(s.name);
    load();
  }, [orgSlug]);

  async function load() {
    setLoading(true);
    try {
      const [reqRes, settingsRes] = await Promise.all([
        fetch(`/api/${orgSlug}/all-requests`),
        fetch(`/api/${orgSlug}/settings`),
      ]);
      const reqs     = await reqRes.json();
      const settings = await settingsRes.json();
      if (Array.isArray(reqs)) setRequests(reqs);
      if (settings?.adminName) setAdminName(settings.adminName);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    try {
      const res = await fetch(`/api/${orgSlug}/all-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r));
      }
    } catch { /* ignore */ }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const q = filter.toLowerCase();
  const filtered = requests.filter(r =>
    !filter ||
    (r.companyName ?? '').toLowerCase().includes(q) ||
    r.meetingName.toLowerCase().includes(q) ||
    r.actionBy.toLowerCase().includes(q) ||
    r.subject.toLowerCase().includes(q)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="#0f172a"/>
              <rect x="20" y="15" width="40" height="50" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M48 15 L60 27 L48 27 Z" fill="#0f172a"/>
              <path d="M48 15 L60 27" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M28 52 L28 34 L40 46 L52 34 L52 52" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <p className="font-black text-white text-base leading-tight">
                {orgName || orgSlug.toUpperCase()}
              </p>
              <p className="text-gray-500 text-[11px] uppercase tracking-widest">Admin Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {adminName && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Logged in as <span className="text-white font-semibold">{adminName}</span>
              </span>
            )}
            <button onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Extension Requests</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Deadline extension requests submitted by employees
            </p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-5 py-3 text-center shrink-0">
            <p className="text-3xl font-black text-orange-400 leading-none">{requests.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Total</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search by company, meeting, person or subject…"
            className="w-full bg-gray-900 border border-white/10 text-white placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/40"
          />
          {filter && (
            <button onClick={() => setFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Requests list */}
        {loading ? (
          <div className="text-center py-24 text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-orange-400 rounded-full animate-spin mx-auto mb-4" />
            Loading requests…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/40 border border-white/5 rounded-2xl">
            <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">
              {filter ? 'No matching requests' : 'No extension requests yet'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {filter ? 'Try a different search term' : 'Requests submitted by employees will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(req => (
              <div key={String(req._id)}
                className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${
                  req.status === 'approved' ? 'border-green-500/30' : req.status === 'rejected' ? 'border-red-500/30 opacity-60' : 'border-white/10 hover:border-white/20'
                }`}>
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {req.companyName && (
                    <Badge color={req.isOrgLevel ? 'indigo' : 'blue'}>{req.companyName}</Badge>
                  )}
                  {req.meetingName && <Badge color="gray">{req.meetingName}</Badge>}
                  {req.actionBy    && <Badge color="purple">{req.actionBy}</Badge>}
                  {req.status === 'approved' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full">Approved</span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">Rejected</span>
                  )}
                  {(!req.status || req.status === 'pending') && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">Pending</span>
                  )}
                  <span className="ml-auto text-[11px] text-gray-500 shrink-0">
                    {fmtDate(req.createdAt)}
                  </span>
                </div>

                {/* Subject */}
                <p className="text-white font-semibold text-sm mb-3 leading-snug">{req.subject}</p>

                {/* Deadlines */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-black/30 border border-white/5 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Original Deadline</p>
                    <p className="text-white text-sm font-mono">{fmtDate(req.originalDeadline)}</p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-amber-500 uppercase tracking-widest mb-1">Requested Extension</p>
                    <p className="text-amber-300 text-sm font-mono font-semibold">{fmtDate(req.requestedDeadline)}</p>
                  </div>
                </div>

                {/* Reason */}
                {req.reason && (
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 mb-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Reason</p>
                    <p className="text-gray-300 text-sm leading-relaxed">"{req.reason}"</p>
                  </div>
                )}

                {/* Approve / Reject buttons */}
                {(!req.status || req.status === 'pending') && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { if (confirm(`Approve this extension? The deadline will be updated to ${fmtDate(req.requestedDeadline)}.`)) updateStatus(String(req._id), 'approved'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 hover:text-green-300 font-semibold text-sm py-2 rounded-xl transition">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Approve
                    </button>
                    <button
                      onClick={() => { if (confirm('Reject this extension request?')) updateStatus(String(req._id), 'rejected'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-semibold text-sm py-2 rounded-xl transition">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
