'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface RequestInfo {
  company: string;
  sub?: string;
  meetingName: string;
  subject: string;
  actionBy: string;
  originalDeadlineFmt: string;
  requestedDeadlineFmt: string;
  requestedDeadline: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt: string | null;
}

export default function ReviewRequestPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';

  const [info, setInfo] = useState<RequestInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [deciding, setDeciding] = useState(false);
  const [decideError, setDecideError] = useState('');
  const [outcome, setOutcome] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/review-request/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setLoadError(d.error);
        else setInfo(d);
      })
      .catch(() => setLoadError('Failed to load request details.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function decide(action: 'approve' | 'reject') {
    setDeciding(true); setDecideError('');
    try {
      const res = await fetch(`/api/review-request/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) { setDecideError(d.error ?? 'Failed to submit decision.'); return; }
      setOutcome(d.status);
    } catch {
      setDecideError('Network error. Please try again.');
    } finally {
      setDeciding(false);
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

  const backHref = info ? (info.sub ? `/${info.company}/${info.sub}` : `/${info.company}`) : '/';

  // Already decided on this visit (just now), or was already decided before this page loaded
  const finalStatus = outcome ?? (info?.status !== 'pending' ? info?.status : null);

  if (finalStatus) return (
    <div className="min-h-screen bg-gradient-to-br from-[#060d1f] via-[#0f172a] to-[#1a2744] flex items-center justify-center p-4">
      <div className={`bg-white/5 border rounded-2xl p-8 text-center max-w-md ${finalStatus === 'approved' ? 'border-green-500/30' : 'border-red-500/30'}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${finalStatus === 'approved' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {finalStatus === 'approved' ? (
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h2 className="text-white font-bold text-xl mb-2">
          {finalStatus === 'approved' ? 'Request Approved' : 'Request Rejected'}
        </h2>
        <p className={`text-sm mb-4 ${finalStatus === 'approved' ? 'text-green-300' : 'text-red-300'}`}>
          {outcome
            ? `You have ${finalStatus} this extension request.`
            : `This request was already ${finalStatus} — this link has already been used.`}
        </p>
        {info && (
          <div className="bg-white/5 rounded-xl p-4 text-left text-sm space-y-1">
            <div className="text-gray-400">Task: <span className="text-white">{info.subject.split('\n')[0].trim()}</span></div>
            <div className="text-gray-400">Meeting: <span className="text-white">{info.meetingName}</span></div>
            {finalStatus === 'approved' && (
              <div className="text-gray-400">New deadline: <span className="text-white font-semibold">{info.requestedDeadlineFmt}</span></div>
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
          <h1 className="text-white font-bold text-xl">Deadline Extension Request</h1>
          <p className="text-blue-300 text-sm mt-1">Review and respond to this request</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Task</p>
            <div className="space-y-1">
              <div className="text-white font-semibold text-sm">{info?.subject.split('\n')[0].trim()}</div>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="text-xs text-blue-300">📋 {info?.meetingName}</span>
                <span className="text-xs text-gray-400">👤 {info?.actionBy}</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Original Deadline</p>
                <p className="text-white text-sm font-semibold">{info?.originalDeadlineFmt}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Requested Deadline</p>
                <p className="text-white text-sm font-semibold">{info?.requestedDeadlineFmt}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-2">Reason</p>
              <p className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">{info?.reason}</p>
            </div>

            {decideError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">
                {decideError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => decide('reject')}
                disabled={deciding}
                className="flex-1 bg-white/5 hover:bg-red-500/20 disabled:opacity-50 border border-red-500/30 text-red-300 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Reject
              </button>
              <button
                onClick={() => decide('approve')}
                disabled={deciding}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {deciding ? (
                  <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
                Approve
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">MOM — Minutes of Meeting System © IITS Group</p>
      </div>
    </div>
  );
}
