'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Org {
  _id: string;
  name: string;
  slug: string;
  dbName: string;
  description?: string;
  color: string;
  username: string;
  createdAt: string;
}

const COLOR_MAP: Record<string, { bar: string; icon: string; light: string; btn: string }> = {
  blue:    { bar: 'bg-blue-600',   icon: 'text-blue-600',   light: 'bg-blue-50',    btn: 'bg-blue-900 hover:bg-blue-800' },
  indigo:  { bar: 'bg-indigo-600', icon: 'text-indigo-600', light: 'bg-indigo-50',  btn: 'bg-indigo-900 hover:bg-indigo-800' },
  violet:  { bar: 'bg-violet-600', icon: 'text-violet-600', light: 'bg-violet-50',  btn: 'bg-violet-900 hover:bg-violet-800' },
  emerald: { bar: 'bg-emerald-600',icon: 'text-emerald-600',light: 'bg-emerald-50', btn: 'bg-emerald-800 hover:bg-emerald-700' },
  rose:    { bar: 'bg-rose-600',   icon: 'text-rose-600',   light: 'bg-rose-50',    btn: 'bg-rose-800 hover:bg-rose-700' },
  amber:   { bar: 'bg-amber-500',  icon: 'text-amber-600',  light: 'bg-amber-50',   btn: 'bg-amber-600 hover:bg-amber-500' },
  cyan:    { bar: 'bg-cyan-600',   icon: 'text-cyan-600',   light: 'bg-cyan-50',    btn: 'bg-cyan-800 hover:bg-cyan-700' },
  slate:   { bar: 'bg-slate-600',  icon: 'text-slate-600',  light: 'bg-slate-50',   btn: 'bg-slate-800 hover:bg-slate-700' },
};
const COLOR_KEYS = Object.keys(COLOR_MAP);
function c(color: string) { return COLOR_MAP[color] ?? COLOR_MAP.blue; }

function OrgCard({ org }: { org: Org }) {
  const router = useRouter();
  const col = c(org.color);
  return (
    <div
      onClick={() => router.push(`/${org.slug}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col overflow-hidden cursor-pointer group"
    >
      <div className={`h-1.5 w-full ${col.bar}`} />
      <div className="flex-1 p-6">
        <div className={`w-14 h-14 ${col.light} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
          <span className={`text-2xl font-black ${col.icon}`}>
            {org.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-900 transition-colors">{org.name}</h2>
        {org.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{org.description}</p>}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-mono">{org.username}</span>
        </div>
      </div>
      <div className="px-6 pb-5">
        <div className={`w-full py-2.5 rounded-xl text-white font-semibold text-sm text-center ${col.btn} transition-colors`}>
          Open Organisation →
        </div>
      </div>
    </div>
  );
}

export default function OrgDashboard() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Fetch session info
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUserRole(d.user?.role ?? null))
      .catch(() => {});

    fetch('/api/companies')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setOrgs(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard header */}
      <header className="bg-gradient-to-r from-[#0f172a] to-[#1e3a8a] text-white shadow-xl print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* MOM logo */}
            <svg width="44" height="44" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="rgba(255,255,255,0.08)"/>
              <rect x="20" y="14" width="40" height="52" rx="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <path d="M48 14 L60 26 L48 26 Z" fill="rgba(15,23,42,0.7)"/>
              <path d="M48 14 L60 26" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <path d="M27 52 L27 34 L40 47 L53 34 L53 52" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <div className="mom-wordmark text-3xl font-black text-white tracking-tight leading-none">MOM</div>
              <div className="text-blue-300 text-xs tracking-[0.2em] uppercase mt-0.5">Minutes of Meeting</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userRole === 'superadmin' && (
              <button
                onClick={() => router.push('/admin')}
                className="text-amber-300 hover:text-amber-200 text-xs font-bold bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Panel
              </button>
            )}
            <button
              onClick={signOut}
              className="text-blue-300 hover:text-white text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-gray-500 text-sm mt-1">Select an organisation to manage its meetings, agendas and minutes.</p>
        </div>

        {loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-4" />
            Loading organisations…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgs.map(org => <OrgCard key={org._id} org={org} />)}
          </div>
        )}
      </main>
    </div>
  );
}
