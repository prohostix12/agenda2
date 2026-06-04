'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Company {
  _id: string;
  name: string;
  slug: string;
  dbName: string;
  description?: string;
  color: string;
  createdAt: string;
}

const COLOR_MAP: Record<string, { bg: string; bar: string; icon: string; btn: string; light: string }> = {
  blue:   { bg: 'bg-blue-900',   bar: 'bg-blue-500',   icon: 'text-blue-600',   btn: 'bg-blue-900 hover:bg-blue-800',   light: 'bg-blue-50' },
  green:  { bg: 'bg-green-800',  bar: 'bg-green-500',  icon: 'text-green-600',  btn: 'bg-green-800 hover:bg-green-700', light: 'bg-green-50' },
  purple: { bg: 'bg-purple-900', bar: 'bg-purple-500', icon: 'text-purple-600', btn: 'bg-purple-900 hover:bg-purple-800', light: 'bg-purple-50' },
  red:    { bg: 'bg-red-800',    bar: 'bg-red-500',    icon: 'text-red-600',    btn: 'bg-red-800 hover:bg-red-700',     light: 'bg-red-50' },
  orange: { bg: 'bg-orange-700', bar: 'bg-orange-500', icon: 'text-orange-600', btn: 'bg-orange-700 hover:bg-orange-600', light: 'bg-orange-50' },
  teal:   { bg: 'bg-teal-800',   bar: 'bg-teal-500',   icon: 'text-teal-600',   btn: 'bg-teal-800 hover:bg-teal-700',   light: 'bg-teal-50' },
};
const COLORS = Object.keys(COLOR_MAP);

function getColor(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.blue;
}

function CompanyCard({ company, onDelete }: { company: Company; onDelete: (slug: string) => void }) {
  const router = useRouter();
  const c = getColor(company.color);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden group">
      <div className={`h-2 w-full ${c.bar}`} />
      <div className="flex-1 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 ${c.light} rounded-xl flex items-center justify-center`}>
            <svg className={`w-6 h-6 ${c.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          {company.slug !== 'iits' && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(company.slug); }}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
              title="Delete company"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
        {company.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{company.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-3 font-mono">db: {company.dbName}</p>
      </div>
      <div className="px-6 pb-5">
        <button
          onClick={() => router.push(`/${company.slug}`)}
          className={`w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-colors ${c.btn}`}
        >
          Open Company →
        </button>
      </div>
    </div>
  );
}

export default function CompanyDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: 'blue' });

  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCompanies(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function slugPreview(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '…';
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to create company'); return; }
      setCompanies((prev) => [...prev, data]);
      setForm({ name: '', description: '', color: 'blue' });
      setShowForm(false);
    } catch { setFormError('Failed to create company'); }
    finally { setSaving(false); }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Delete company "${slug}"? This does NOT delete its database.`)) return;
    await fetch(`/api/companies?slug=${slug}`, { method: 'DELETE' });
    setCompanies((prev) => prev.filter((c) => c.slug !== slug));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-xl leading-tight">IITS Group</div>
              <div className="text-blue-200 text-xs">Meeting Manager — Company Portal</div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white text-blue-900 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 mt-1">Select a company to manage its meetings, agendas and minutes.</p>
        </div>

        {loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-4" />
            Loading companies...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((c) => (
              <CompanyCard key={c._id} company={c} onDelete={handleDelete} />
            ))}

            {/* Add company card */}
            <button
              onClick={() => setShowForm(true)}
              className="rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors p-8 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-blue-600 min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-semibold text-sm">Add New Company</span>
            </button>
          </div>
        )}
      </main>

      {/* Create Company Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">New Company</h2>
              <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required placeholder="e.g. Acme Corp"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {form.name && (
                  <p className="text-xs text-gray-400 mt-1">
                    URL: <span className="font-mono text-blue-600">/{slugPreview(form.name)}</span>
                    &nbsp;&nbsp;DB: <span className="font-mono text-gray-600">agenda-{slugPreview(form.name)}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description (optional)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Brand Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: col }))}
                      className={`w-8 h-8 rounded-full transition-all ${COLOR_MAP[col].bar} ${form.color === col ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'opacity-70 hover:opacity-100'}`}
                      title={col}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-blue-900 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating…' : 'Create Company'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-600 text-sm font-semibold hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
