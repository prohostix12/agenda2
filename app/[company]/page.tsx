'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubCompany {
  _id: string;
  name: string;
  slug: string;
  color: string;
  username: string;
  passwordPlain: string;
  createdAt: string;
}

const COLOR_OPTIONS = [
  { key: 'blue',    bg: 'bg-blue-600',    label: 'Blue' },
  { key: 'indigo',  bg: 'bg-indigo-600',  label: 'Indigo' },
  { key: 'violet',  bg: 'bg-violet-600',  label: 'Violet' },
  { key: 'emerald', bg: 'bg-emerald-600', label: 'Emerald' },
  { key: 'rose',    bg: 'bg-rose-600',    label: 'Rose' },
  { key: 'amber',   bg: 'bg-amber-500',   label: 'Amber' },
  { key: 'cyan',    bg: 'bg-cyan-600',    label: 'Cyan' },
  { key: 'slate',   bg: 'bg-slate-600',   label: 'Slate' },
];

function colorBg(c: string) {
  return COLOR_OPTIONS.find(o => o.key === c)?.bg ?? 'bg-blue-600';
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <span className={`font-mono text-xs ${show ? 'text-gray-900' : 'text-gray-400 tracking-widest select-none'}`}>
        {show ? value : '••••••••••'}
      </span>
      <button type="button" onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-gray-600 transition" title={show ? 'Hide' : 'Reveal'}>
        {show ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        )}
      </button>
    </div>
  );
}

interface ExtRequest {
  _id: string;
  companyName: string;
  companySlug: string;
  meetingName: string;
  actionBy: string;
  subject: string;
  originalDeadline: string;
  requestedDeadline: string;
  reason: string;
  createdAt: string;
}

function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OrgAdminPage() {
  const params = useParams<{ company: string }>();
  const org = params?.company ?? '';
  const router = useRouter();

  const [companies, setCompanies] = useState<SubCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCompany, setEditCompany] = useState<SubCompany | null>(null);

  const blankForm = { name: '', color: 'blue', username: '', password: '' };
  const [form, setForm] = useState(blankForm);
  const [editForm, setEditForm] = useState(blankForm);

  const [extRequests, setExtRequests] = useState<ExtRequest[]>([]);
  const [showExtRequests, setShowExtRequests] = useState(true);

  useEffect(() => { if (org) loadCompanies(); }, [org]);

  async function loadCompanies() {
    setLoading(true);
    const [compRes, reqRes] = await Promise.allSettled([
      fetch(`/api/${org}/companies`).then(r => r.json()),
      fetch(`/api/${org}/all-requests`).then(r => r.json()),
    ]);
    if (compRes.status === 'fulfilled') setCompanies(Array.isArray(compRes.value) ? compRes.value : []);
    if (reqRes.status === 'fulfilled' && Array.isArray(reqRes.value)) setExtRequests(reqRes.value);
    setLoading(false);
  }

  async function createCompany() {
    if (!form.name || !form.username || !form.password) { setError('Name, username and password are required.'); return; }
    setSaving(true); setError('');
    const res = await fetch(`/api/${org}/companies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create'); setSaving(false); return; }
    setForm(blankForm); setShowCreate(false); setSaving(false); loadCompanies();
  }

  async function saveEdit() {
    if (!editCompany) return;
    setSaving(true); setError('');
    const res = await fetch(`/api/${org}/companies`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: editCompany.slug, ...editForm }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to update'); setSaving(false); return; }
    setEditCompany(null); setSaving(false); loadCompanies();
  }

  async function deleteCompany(slug: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/${org}/companies?slug=${slug}`, { method: 'DELETE' });
    loadCompanies();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="rgba(255,255,255,0.12)"/>
              <rect x="20" y="14" width="40" height="52" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M48 14 L60 26 L48 26 Z" fill="rgba(30,58,138,0.8)"/>
              <path d="M48 14 L60 26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M27 52 L27 34 L40 47 L53 34 L53 52" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <div className="font-black text-lg leading-tight tracking-tight">MOM</div>
              <div className="text-blue-300 text-[10px]">{org.toUpperCase()} — Organisation Panel</div>
            </div>
          </div>
          <button onClick={logout} className="text-blue-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition" title="Sign Out">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage companies under <span className="font-semibold uppercase">{org}</span></p>
          </div>
          <button onClick={() => { setShowCreate(true); setError(''); }}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Company
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            Loading companies…
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">No companies yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first company to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {companies.map(company => (
              <div key={company._id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 ${colorBg(company.color)} rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0`}>
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{company.name}</h3>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 space-y-1 mt-1.5">
                      <CredentialRow label="Username" value={company.username} />
                      <CredentialRow label="Password" value={company.passwordPlain ?? '—'} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/${org}/${company.slug}`}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Dashboard
                  </Link>
                  <button onClick={() => { setEditCompany(company); setEditForm({ name: company.name, color: company.color, username: company.username, password: '' }); setError(''); }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                    Edit
                  </button>
                  <button onClick={() => deleteCompany(company.slug, company.name)}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Extension Requests Section */}
        {extRequests.length > 0 && (
          <div className="bg-white border border-orange-200 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowExtRequests(p => !p)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Deadline Extension Requests</p>
                  <p className="text-xs text-gray-500">{extRequests.length} request{extRequests.length !== 1 ? 's' : ''} across all companies</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">{extRequests.length}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showExtRequests ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showExtRequests && (
              <div className="border-t border-orange-100 divide-y divide-gray-50">
                {extRequests.map(req => (
                  <div key={req._id} className="px-5 py-4">
                    {/* Top row: company | meeting | user */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {req.companyName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        {req.meetingName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {req.actionBy || '—'}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>

                    {/* Subject */}
                    <p className="text-sm font-semibold text-gray-900 mb-1">{req.subject.split('\n')[0].trim()}</p>

                    {/* Deadlines */}
                    <div className="flex flex-wrap gap-4 mb-2 text-xs">
                      <span className="text-gray-500">Original: <span className="font-semibold text-red-600">{fmtDate(req.originalDeadline)}</span></span>
                      <span className="text-gray-500">Requested: <span className="font-semibold text-blue-700">{fmtDate(req.requestedDeadline)}</span></span>
                    </div>

                    {/* Reason */}
                    <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-0.5">Reason</p>
                      <p className="text-sm text-gray-700">{req.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-5">New Company</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username *</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. acme"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Set a password"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.key} type="button" onClick={() => setForm(f => ({ ...f, color: c.key }))}
                      className={`w-7 h-7 ${c.bg} rounded-lg transition-all ${form.color === c.key ? 'ring-2 ring-blue-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                      title={c.label} />
                  ))}
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={createCompany} disabled={saving}
                className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {saving ? 'Creating…' : 'Create Company'}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-800 rounded-xl text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditCompany(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-5">Edit — {editCompany.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</label>
                  <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New Password</label>
                  <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Leave blank to keep"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.key} type="button" onClick={() => setEditForm(f => ({ ...f, color: c.key }))}
                      className={`w-7 h-7 ${c.bg} rounded-lg transition-all ${editForm.color === c.key ? 'ring-2 ring-blue-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                      title={c.label} />
                  ))}
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditCompany(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-800 rounded-xl text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
