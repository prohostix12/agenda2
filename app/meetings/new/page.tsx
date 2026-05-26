'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewMeetingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', date: '', location: '', chairperson: '', meetLink: '',
  });

  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then((r) => r.json())
      .then((data) => setIsGoogleConnected(!!data.connected))
      .catch(() => setIsGoogleConnected(false));
  }, []);

  async function handleAutoGenerateMeet() {
    if (!form.name || !form.date) {
      setGenerateError('Please enter a Meeting Name and Date first.');
      return;
    }
    setGenerateError(null);
    setIsGeneratingMeet(true);
    try {
      const res = await fetch('/api/create-meet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, date: form.date }),
      });
      const data = await res.json();
      if (data.meetLink) {
        setForm((f) => ({ ...f, meetLink: data.meetLink }));
      } else {
        setGenerateError(data.error || 'Failed to auto-generate link.');
      }
    } catch {
      setGenerateError('Error generating Meet link.');
    } finally {
      setIsGeneratingMeet(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Failed to create meeting (${res.status})`);
      }

      if (!data?._id) {
        throw new Error('Meeting was created without an ID.');
      }

      router.push(`/meetings/${data._id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create meeting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Meetings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">New Meeting</h1>
        <p className="text-gray-500 mt-1">Enter the meeting details to get started</p>
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
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              name="meetLink"
              value={form.meetLink}
              onChange={handleChange}
              placeholder="Paste your Google Meet link here"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isGoogleConnected ? (
              <button
                type="button"
                onClick={handleAutoGenerateMeet}
                disabled={isGeneratingMeet}
                className="bg-blue-900 hover:bg-blue-800 disabled:bg-blue-300 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isGeneratingMeet ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span>Auto-Generate</span>
                  </>
                )}
              </button>
            ) : (
              <a
                href={`/api/auth/google?returnTo=/meetings/new`}
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                </svg>
                Auto-Generate (Sign In)
              </a>
            )}
            <a
              href="https://meet.google.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Manual Meet
            </a>
          </div>
          {generateError && (
            <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {generateError}
            </p>
          )}
          {submitError && (
            <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {submitError}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {isGoogleConnected 
              ? "Click 'Auto-Generate' to automatically schedule a Google Meet on your Google Calendar and fetch the link."
              : "To auto-schedule on Google Calendar and fetch the Meet link, sign in using the button above."}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
            {saving ? 'Creating...' : 'Create Meeting'}
          </button>
          <Link href="/" className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
