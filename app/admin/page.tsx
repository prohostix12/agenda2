'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

const COLOR_OPTIONS = [
  { key: 'blue',   bg: 'bg-blue-600',   label: 'Blue' },
  { key: 'indigo', bg: 'bg-indigo-600', label: 'Indigo' },
  { key: 'violet', bg: 'bg-violet-600', label: 'Violet' },
  { key: 'emerald',bg: 'bg-emerald-600',label: 'Emerald' },
  { key: 'rose',   bg: 'bg-rose-600',   label: 'Rose' },
  { key: 'amber',  bg: 'bg-amber-500',  label: 'Amber' },
  { key: 'cyan',   bg: 'bg-cyan-600',   label: 'Cyan' },
  { key: 'slate',  bg: 'bg-slate-600',  label: 'Slate' },
];

function colorBg(c: string) {
  return COLOR_OPTIONS.find(o => o.key === c)?.bg ?? 'bg-blue-600';
}

export default function AdminPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [form, setForm] = useState({ name: '', description: '', color: 'blue', username: '', password: '' });
  // Edit form state
  const [editForm, setEditForm] = useState({ name: '', description: '', color: 'blue', username: '', password: '' });

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    setLoading(true);
    const res = await fetch('/api/companies');
    const data = await res.json();
    setOrgs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function createOrg() {
    if (!form.name || !form.username || !form.password) {
      setError('Name, username and password are required.'); return;
    }
    setSaving(true); setError('');
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create'); setSaving(false); return; }
    setForm({ name: '', description: '', color: 'blue', username: '', password: '' });
    setShowCreate(false);
    setSaving(false);
    loadOrgs();
  }

  async function saveEdit() {
    if (!editOrg) return;
    setSaving(true); setError('');
    const res = await fetch('/api/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: editOrg.slug, ...editForm }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to update'); setSaving(false); return; }
    setEditOrg(null);
    setSaving(false);
    loadOrgs();
  }

  async function deleteOrg(slug: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/companies?slug=${slug}`, { method: 'DELETE' });
    loadOrgs();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <svg width="32" height="32" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="#0f172a"/>
              <rect x="20" y="15" width="40" height="50" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M48 15 L60 27 L48 27 Z" fill="#0f172a"/>
              <path d="M48 15 L60 27" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M28 52 L28 34 L40 46 L52 34 L52 52" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <span className="mom-wordmark text-xl font-black text-white tracking-tight">MOM</span>
              <span className="text-gray-400 text-xs ml-2">SuperAdmin Panel</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            ⚡ SuperAdmin
          </span>
          <button onClick={logout}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Page title + add button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Organisations</h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage companies and their access credentials</p>
          </div>
          <button onClick={() => { setShowCreate(true); setError(''); }}
            className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Organisation
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Organisation list */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
            Loading organisations…
          </div>
        ) : (
          <div className="grid gap-4">
            {orgs.map(org => (
              <div key={org._id}
                className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-white/20 transition">
                <div className="flex items-center gap-4">
                  {/* Color badge */}
                  <div className={`w-12 h-12 ${colorBg(org.color)} rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0`}>
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{org.name}</h3>
                      {org.slug === 'iits' && (
                        <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">DEFAULT</span>
                      )}
                    </div>
                    {org.description && <p className="text-gray-400 text-xs mt-0.5">{org.description}</p>}
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-mono text-gray-300">{org.username}</span>
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16" />
                        </svg>
                        <span className="font-mono text-gray-400">{org.dbName}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/${org.slug}`}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Meetings
                  </Link>
                  <button onClick={() => { setEditOrg(org); setEditForm({ name: org.name, description: org.description ?? '', color: org.color, username: org.username, password: '' }); setError(''); }}
                    className="text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition">
                    Edit
                  </button>
                  {org.slug !== 'iits' && (
                    <button onClick={() => deleteOrg(org.slug, org.name)}
                      className="text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Organisation Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-5">New Organisation</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Organisation Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description"
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Login Username *</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. acme"
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Set a password"
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.key} type="button" onClick={() => setForm(f => ({ ...f, color: c.key }))}
                      className={`w-7 h-7 ${c.bg} rounded-lg transition-all ${form.color === c.key ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                      title={c.label} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createOrg} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl text-sm transition">
                {saving ? 'Creating…' : 'Create Organisation'}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organisation Modal */}
      {editOrg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOrg(null); }}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-5">Edit — {editOrg.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Organisation Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</label>
                <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Username</label>
                  <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">New Password</label>
                  <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Leave blank to keep"
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.key} type="button" onClick={() => setEditForm(f => ({ ...f, color: c.key }))}
                      className={`w-7 h-7 ${c.bg} rounded-lg transition-all ${editForm.color === c.key ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                      title={c.label} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl text-sm transition">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditOrg(null)}
                className="px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
