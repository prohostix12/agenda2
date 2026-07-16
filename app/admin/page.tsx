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
  passwordPlain: string;
  adminUsername?: string;
  adminPasswordPlain?: string;
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

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <span className={`font-mono text-xs ${show ? 'text-white' : 'text-gray-600 tracking-widest select-none'}`}>
        {show ? value : '••••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="text-gray-500 hover:text-gray-300 transition"
        title={show ? 'Hide' : 'Reveal'}
      >
        {show ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

interface ExtRequest {
  _id: string;
  orgName: string;
  orgSlug: string;
  companyName: string;
  companySlug: string;
  isSubCompany: boolean;
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

const BLANK_FORM = { name: '', description: '', color: 'blue', username: '', password: '', adminName: '', adminPhone: '', adminEmail: '', adminUsername: '', adminPassword: '' };

export default function AdminPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(BLANK_FORM);
  const [editForm, setEditForm] = useState(BLANK_FORM);

  const [extRequests, setExtRequests] = useState<ExtRequest[]>([]);
  const [showExtRequests, setShowExtRequests] = useState(true);

  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestLoading, setWaTestLoading] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ ok: boolean; hint?: string; results?: Record<string, unknown>[] } | null>(null);
  const [showWaTest, setShowWaTest] = useState(false);

  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<Record<string, unknown> | null>(null);
  const [showCron, setShowCron] = useState(false);

  useEffect(() => { loadOrgs(); loadExtRequests(); }, []);

  async function loadOrgs() {
    setLoading(true);
    const res = await fetch('/api/companies');
    const data = await res.json();
    setOrgs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadExtRequests() {
    const res = await fetch('/api/admin/all-requests');
    const data = await res.json();
    if (Array.isArray(data)) setExtRequests(data);
  }

  async function createOrg() {
    if (!form.name || !form.username || !form.password) {
      setError('Name, username and password are required.'); return;
    }
    if (form.adminUsername && !form.adminPassword) {
      setError('Admin password is required when admin username is set.'); return;
    }
    setSaving(true); setError('');
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create'); setSaving(false); return; }
    setForm(BLANK_FORM);
    setShowCreate(false);
    setSaving(false);
    loadOrgs();
  }

  async function saveEdit() {
    if (!editOrg) return;
    if (editForm.adminUsername && !editForm.adminPassword && !editOrg.adminUsername) {
      setError('Admin password is required when setting an admin username.'); return;
    }
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

  async function testWhatsApp() {
    if (!waTestPhone.trim()) return;
    setWaTestLoading(true);
    setWaTestResult(null);
    try {
      const res = await fetch('/api/admin/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waTestPhone.trim() }),
      });
      const data = await res.json();
      setWaTestResult(data);
    } catch (e) {
      setWaTestResult({ ok: false, hint: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setWaTestLoading(false);
    }
  }

  async function runCron() {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/admin/run-cron', { method: 'POST' });
      const data = await res.json();
      setCronResult(data);
    } catch (e) {
      setCronResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setCronRunning(false);
    }
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
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Color badge */}
                  <div className={`w-12 h-12 ${colorBg(org.color)} rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0`}>
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white">{org.name}</h3>
                      {org.slug === 'iits' && (
                        <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">DEFAULT</span>
                      )}
                    </div>
                    {org.description && <p className="text-gray-400 text-xs mb-2">{org.description}</p>}

                    {/* Org credentials */}
                    <div className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 space-y-1">
                      <CredentialRow label="Username" value={org.username} />
                      <CredentialRow label="Password" value={org.passwordPlain ?? '—'} />
                    </div>
                    {/* Admin credentials */}
                    {org.adminUsername && (
                      <div className="mt-1.5 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 space-y-1">
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Admin Login</p>
                        <CredentialRow label="Username" value={org.adminUsername} />
                        <CredentialRow label="Password" value={org.adminPasswordPlain ?? '—'} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button onClick={async () => {
                    setEditOrg(org);
                    setEditForm({ name: org.name, description: org.description ?? '', color: org.color, username: org.username, password: '', adminName: '', adminPhone: '', adminEmail: '', adminUsername: org.adminUsername ?? '', adminPassword: '' });
                    setError('');
                    try {
                      const s = await fetch(`/api/${org.slug}/settings`).then(r => r.json());
                      setEditForm(f => ({ ...f, adminName: s.adminName ?? '', adminPhone: s.adminPhone ?? '', adminEmail: s.adminEmail ?? '' }));
                    } catch { /* ignore */ }
                  }}
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

        {/* WhatsApp Test */}
        <div className="mt-8">
          <button
            onClick={() => setShowWaTest(v => !v)}
            className="w-full flex items-center justify-between bg-gray-900 border border-white/10 rounded-2xl px-5 py-4 hover:border-white/20 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-white text-sm">WhatsApp Notifications</p>
                <p className="text-gray-500 text-xs">Test and diagnose Gupshup WhatsApp delivery</p>
              </div>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showWaTest ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showWaTest && (
            <div className="mt-3 bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Test Phone Number (with country code)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    value={waTestPhone}
                    onChange={e => setWaTestPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="flex-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/50"
                    onKeyDown={e => e.key === 'Enter' && testWhatsApp()}
                  />
                  <button
                    onClick={testWhatsApp}
                    disabled={waTestLoading || !waTestPhone.trim()}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2"
                  >
                    {waTestLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                        Send Test
                      </>
                    )}
                  </button>
                </div>
              </div>

              {waTestResult && (
                <div className={`rounded-xl border p-4 text-sm ${waTestResult.ok
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <p className="font-bold mb-1">
                    {waTestResult.ok ? '✓ Message submitted to Gupshup' : '✗ Failed to send'}
                  </p>
                  <p className="text-xs opacity-80">{waTestResult.hint}</p>
                  {waTestResult.results && (
                    <div className="mt-2 space-y-1">
                      {waTestResult.results.map((r, i) => (
                        <div key={i} className="text-xs font-mono bg-black/30 rounded-lg px-3 py-1.5">
                          {String(r.type)}: {r.ok ? '✓ submitted' : `✗ ${String(r.error ?? 'failed')}`}
                          {r.method ? ` (via ${String(r.method)})` : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-400 mb-2">Setup Checklist</p>
                <ul className="text-xs text-gray-400 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">1.</span>
                    <span>Go to <strong className="text-white">Gupshup Dashboard → WhatsApp → {`{your app}`}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">2.</span>
                    <span>Make sure the app status is <strong className="text-green-400">Live</strong> (not Sandbox)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">3.</span>
                    <span>Create templates: <code className="text-blue-300">mom_reminder</code>, <code className="text-blue-300">mom_admin_reminder</code>, <code className="text-blue-300">mom_extend</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">4.</span>
                    <span>Wait for template approval (usually 1-24 hours)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">5.</span>
                    <span>Meanwhile, <strong className="text-white">session messages work immediately</strong> — recipients just need to send any message to your business number first</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Run Cron Now */}
        <div className="mt-4">
          <button
            onClick={() => setShowCron(v => !v)}
            className="w-full flex items-center justify-between bg-gray-900 border border-white/10 rounded-2xl px-5 py-4 hover:border-white/20 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-white text-sm">Send Reminders Now</p>
                <p className="text-gray-500 text-xs">Manually trigger today's reminder run (auto-runs daily at 6 AM)</p>
              </div>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCron ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCron && (
            <div className="mt-3 bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <p className="text-sm text-gray-400">
                This will send WhatsApp and email reminders for <strong className="text-white">all pending action items</strong> across all organisations right now.
              </p>
              <button
                onClick={runCron}
                disabled={cronRunning}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition flex items-center gap-2"
              >
                {cronRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending reminders…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run Now
                  </>
                )}
              </button>

              {cronResult && (
                <div className={`rounded-xl border p-4 text-sm ${cronResult.ok ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                  <p className="font-bold mb-2">{cronResult.ok ? '✓ Reminders sent' : '✗ Error'}</p>
                  {cronResult.ok ? (
                    <div className="space-y-1 text-xs">
                      <p>Total sent: <strong>{String(cronResult.totalSent ?? 0)}</strong></p>
                      <p>Errors: <strong>{String(cronResult.totalErrors ?? 0)}</strong></p>
                      <p>Organisations: <strong>{String(cronResult.orgs ?? 0)}</strong> org + <strong>{String(cronResult.subOrgs ?? 0)}</strong> sub</p>
                      {Array.isArray(cronResult.results) && (cronResult.results as Array<{label: string; errors: string[]}>).some(r => r.errors?.length > 0) && (
                        <div className="mt-3 space-y-2">
                          <p className="font-bold text-red-400">Error details:</p>
                          {(cronResult.results as Array<{label: string; errors: string[]}>).filter(r => r.errors?.length > 0).map((r, i) => (
                            <div key={i} className="bg-black/30 rounded-lg px-3 py-2">
                              <p className="font-semibold text-white mb-1">{r.label}</p>
                              {r.errors.map((e, j) => <p key={j} className="text-red-300 break-all">{e}</p>)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs">{String(cronResult.error ?? 'Unknown error')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extension Requests */}
        <div className="mt-8">
          <button
            onClick={() => setShowExtRequests(v => !v)}
            className="w-full flex items-center justify-between bg-gray-900 border border-white/10 rounded-2xl px-5 py-4 hover:border-white/20 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-white text-sm">Extension Requests</p>
                <p className="text-gray-500 text-xs">{extRequests.length} total across all organisations</p>
              </div>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showExtRequests ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExtRequests && (
            <div className="mt-3 space-y-3">
              {extRequests.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-sm bg-gray-900/50 border border-white/5 rounded-2xl">
                  No extension requests yet
                </div>
              ) : (
                extRequests.map(req => (
                  <div key={req._id} className="bg-gray-900 border border-white/10 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        {req.orgName}
                      </span>
                      {req.isSubCompany && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full">
                          {req.companyName}
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        {req.meetingName}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        {req.actionBy}
                      </span>
                      <span className="ml-auto text-[10px] text-gray-500">{fmtDate(req.createdAt)}</span>
                    </div>
                    <p className="text-white text-sm font-semibold mb-1">{req.subject}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
                      <span>Original: <span className="text-white">{fmtDate(req.originalDeadline)}</span></span>
                      <span>Requested: <span className="text-amber-300">{fmtDate(req.requestedDeadline)}</span></span>
                    </div>
                    {req.reason && (
                      <div className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 italic">
                        {req.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create Organisation Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 pb-0 shrink-0">
            <h3 className="font-bold text-white text-lg mb-5">New Organisation</h3>
            </div>
            <div className="overflow-y-auto flex-1 px-6 space-y-4">
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

              {/* Notification Admin */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  Admin Panel Login
                </p>
                <p className="text-xs text-gray-500 mb-3">This person receives all notifications and can log in to view extension requests.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Name</label>
                    <input value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
                      placeholder="e.g. John Manager"
                      className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">WhatsApp No.</label>
                      <input value={form.adminPhone} onChange={e => setForm(f => ({ ...f, adminPhone: e.target.value }))}
                        placeholder="+91 9876543210"
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</label>
                      <input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                        placeholder="admin@org.com"
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Username</label>
                      <input value={form.adminUsername} onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))}
                        placeholder="e.g. john.admin"
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Password</label>
                      <input type="password" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                        placeholder="Admin login password"
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 shrink-0 border-t border-white/10 mt-2">
              {error && (
                <div className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {error}
                </div>
              )}
              <div className="flex gap-3">
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
        </div>
      )}

      {/* Edit Organisation Modal */}
      {editOrg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOrg(null); }}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 pb-0 shrink-0">
            <h3 className="font-bold text-white text-lg mb-5">Edit — {editOrg.name}</h3>
            </div>
            <div className="overflow-y-auto flex-1 px-6 space-y-4">
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

              {/* Notification Admin */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  Admin Panel Login
                </p>
                <p className="text-xs text-gray-500 mb-3">Update notification contact and admin login credentials.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Name</label>
                    <input value={editForm.adminName} onChange={e => setEditForm(f => ({ ...f, adminName: e.target.value }))}
                      placeholder="e.g. John Manager"
                      className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">WhatsApp No.</label>
                      <input value={editForm.adminPhone} onChange={e => setEditForm(f => ({ ...f, adminPhone: e.target.value }))}
                        placeholder="+91 9876543210"
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</label>
                      <input type="email" value={editForm.adminEmail} onChange={e => setEditForm(f => ({ ...f, adminEmail: e.target.value }))}
                        placeholder="admin@org.com"
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Username</label>
                      <input value={editForm.adminUsername} onChange={e => setEditForm(f => ({ ...f, adminUsername: e.target.value }))}
                        placeholder={editOrg?.adminUsername ? editOrg.adminUsername : 'e.g. john.admin'}
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Password</label>
                      <input type="password" value={editForm.adminPassword} onChange={e => setEditForm(f => ({ ...f, adminPassword: e.target.value }))}
                        placeholder={editOrg?.adminUsername ? 'Leave blank to keep' : 'New admin password'}
                        className="w-full mt-1 bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 shrink-0 border-t border-white/10 mt-2">
              {error && (
                <div className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {error}
                </div>
              )}
              <div className="flex gap-3">
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
        </div>
      )}

    </div>
  );
}
