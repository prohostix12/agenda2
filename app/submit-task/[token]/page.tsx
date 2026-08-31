'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Submission {
  title: string;
  notes?: string;
  driveLinks?: string[];
  submittedAt: string;
}

interface TaskInfo {
  company: string;
  sub?: string;
  meetingName: string;
  subject: string;
  description: string;
  actionBy: string;
  deadline: string;
  deadlineFmt: string;
  followedUp: boolean;
  submission: Submission | null;
}

export default function SubmitTaskPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';

  const [task, setTask] = useState<TaskInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [driveLinks, setDriveLinks] = useState<string[]>([]);
  const [driveInput, setDriveInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/submit-task/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setLoadError(d.error);
        else setTask(d);
      })
      .catch(() => setLoadError('Failed to load task details.'))
      .finally(() => setLoading(false));
  }, [token]);

  function addDriveLink() {
    const link = driveInput.trim();
    if (!link) return;
    setDriveLinks(links => [...links, link]);
    setDriveInput('');
  }

  function removeDriveLink(i: number) {
    setDriveLinks(links => links.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!title.trim()) { setSubmitError('Please give this submission a title.'); return; }
    setSubmitting(true); setSubmitError('');
    try {
      const res = await fetch(`/api/submit-task/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), notes: notes.trim(), driveLinks }),
      });
      const d = await res.json();
      if (!res.ok) { setSubmitError(d.error ?? 'Submission failed.'); return; }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#060d1f] via-[#0f172a] to-[#1a2744] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-400/30 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen bg-gradient-to-br from-[#060d1f] via-[#0f172a] to-[#1a2744] flex items-center justify-center p-4">
      <div className="bg-white/5 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-white font-bold text-lg mb-2">Invalid Link</h2>
        <p className="text-red-300 text-sm">{loadError}</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm font-semibold transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Meetings
        </Link>
      </div>
    </div>
  );

  const backHref = task ? (task.sub ? `/${task.company}/${task.sub}` : `/${task.company}`) : '/';

  // Already submitted (just now, or before this page loaded)
  const existing = submitted ? { title: title.trim(), notes: notes.trim(), driveLinks } : task?.submission;
  const isDone = submitted || task?.followedUp;

  if (isDone) return (
    <div className="min-h-screen bg-gradient-to-br from-[#060d1f] via-[#0f172a] to-[#1a2744] flex items-center justify-center p-4">
      <div className="bg-white/5 border border-green-500/30 rounded-2xl p-8 text-center max-w-md">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-white font-bold text-xl mb-2">
          {submitted ? 'Task Submitted!' : 'Already Submitted'}
        </h2>
        <p className="text-green-300 text-sm mb-4">
          {submitted ? 'Your submission has been sent to the admin.' : 'This task was already marked as done — this link has already been used.'}
        </p>
        {task && (
          <div className="bg-white/5 rounded-xl p-4 text-left text-sm space-y-1">
            <div className="text-gray-400">Task: <span className="text-white">{task.subject.split('\n')[0].trim()}</span></div>
            <div className="text-gray-400">Meeting: <span className="text-white">{task.meetingName}</span></div>
            {existing?.title && <div className="text-gray-400">Title: <span className="text-white">{existing.title}</span></div>}
            {!!existing?.driveLinks?.length && (
              <div className="text-gray-400">Files: <span className="text-white">{existing.driveLinks.length} link(s) attached</span></div>
            )}
          </div>
        )}
        <Link href={backHref} className="mt-6 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Meetings
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060d1f] via-[#0f172a] to-[#1a2744] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        <div className="mb-4">
          <Link href={backHref} className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to All Meetings
          </Link>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="36" height="36" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="#0f172a"/>
              <rect x="20" y="15" width="40" height="50" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M48 15 L60 27 L48 27 Z" fill="#0f172a"/>
              <path d="M48 15 L60 27" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M28 52 L28 34 L40 46 L52 34 L52 52" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="text-white font-black text-2xl tracking-tight">MOM</span>
          </div>
          <h1 className="text-white font-bold text-xl">Submit Task</h1>
          <p className="text-blue-300 text-sm mt-1">Mark this action item as done</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

          {/* Task details */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Your Assigned Task</p>
            <div className="space-y-1">
              <div className="text-white font-semibold text-sm">{task?.subject.split('\n')[0].trim()}</div>
              {task?.description && <div className="text-gray-300 text-xs mt-1 whitespace-pre-wrap">{task.description}</div>}
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="text-xs text-blue-300">📋 {task?.meetingName}</span>
                <span className="text-xs text-gray-400">👤 {task?.actionBy}</span>
                {task?.deadlineFmt && <span className="text-xs text-red-400 font-semibold">⏰ Deadline: {task.deadlineFmt}</span>}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-blue-300 mb-2">
                Submission Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Finished creating report"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-blue-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes related to this task..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-blue-300 mb-2">
                Attach Files (Google Drive links)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={driveInput}
                  onChange={e => setDriveInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDriveLink(); } }}
                  placeholder="Paste a Google Drive share link..."
                  className="flex-1 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <button
                  type="button"
                  onClick={addDriveLink}
                  className="shrink-0 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  + Add
                </button>
              </div>
              {!!driveLinks.length && (
                <ul className="mt-2 space-y-1.5">
                  {driveLinks.map((link, i) => (
                    <li key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs">
                      <svg className="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      <span className="flex-1 text-gray-300 truncate">{link}</span>
                      <button type="button" onClick={() => removeDriveLink(i)} className="shrink-0 text-red-400 hover:text-red-300">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">
                {submitError}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />Submitting...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Mark as Done</>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">MOM — Minutes of Meeting System © IITS Group</p>
      </div>
    </div>
  );
}
