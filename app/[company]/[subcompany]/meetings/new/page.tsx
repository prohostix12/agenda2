'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function NewMeetingPage() {
  const router = useRouter();
  const params = useParams<{ company: string; subcompany: string }>();
  const org = params?.company ?? '';
  const company = params?.subcompany ?? '';

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', location: '', chairperson: '', meetLink: '' });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSubmitError(null);
    try {
      const res = await fetch(`/api/${org}/${company}/meetings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error || `Failed (${res.status})`);
      if (!data?._id) throw new Error('Created without an ID.');
      router.push(`/${org}/${company}/meetings/${data._id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <Link href={`/${org}/${company}`} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Meetings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">New Meeting</h1>
        <p className="text-gray-500 mt-1 capitalize">{company} — Enter meeting details</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Meeting Name <span className="text-red-500">*</span></label>
          <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Board Meeting Q2 2026"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Meeting Date <span className="text-red-500">*</span></label>
          <input name="date" type="date" value={form.date} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location / Venue</label>
          <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Conference Room A"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Chairperson</label>
          <input name="chairperson" value={form.chairperson} onChange={handleChange} placeholder="e.g. Dr. Jane Smith"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Google Meet Link</label>
          <div className="flex gap-2">
            <input name="meetLink" value={form.meetLink} onChange={handleChange} placeholder="Paste your Google Meet link here"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              New Meet
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-1">Click &ldquo;New Meet&rdquo; to create a link, then paste it above.</p>
        </div>

        {submitError && (
          <p className="text-red-500 text-sm font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {submitError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
            {saving ? 'Creating...' : 'Create Meeting'}
          </button>
          <Link href={`/${org}/${company}`} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
