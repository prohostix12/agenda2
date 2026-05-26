'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

interface Meeting {
  _id: string;
  name: string;
  date: string;
  location?: string;
  chairperson?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const response = await fetch('/api/meetings');
        const data = await response.json().catch(() => null);

        if (!response.ok || data?.error) {
          setMeetings([]);
          setError(data?.error || `Failed to load meetings (${response.status})`);
          return;
        }

        setMeetings(Array.isArray(data) ? data : []);
        setError(null);
      } catch {
        setMeetings([]);
        setError('Failed to load meetings');
      } finally {
        setLoading(false);
      }
    };

    loadMeetings();
  }, []);

  async function deleteMeeting(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also remove its agenda and minutes.`)) return;
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    setMeetings((prev) => prev.filter((m) => m._id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 mt-1">Manage your meeting agendas and minutes</p>
        </div>
        <Link
          href="/meetings/new"
          className="bg-blue-900 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Meeting
        </Link>
      </div>

      {loading && (
        <div className="text-center py-20 text-gray-400">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-4" />
          Loading meetings...
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-20 bg-white rounded-2xl border border-red-100 shadow-sm">
          <p className="text-red-600 font-medium">{error}</p>
          {error.toLowerCase().includes('database connection failed') && (
            <p className="text-gray-500 mt-2">Please check your MongoDB connection and refresh the page.</p>
          )}
        </div>
      )}

      {!loading && !error && meetings.length === 0 && (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No meetings yet</h2>
          <p className="text-gray-400 mb-6">Create your first meeting to get started</p>
          <Link href="/meetings/new" className="bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors">
            Create Meeting
          </Link>
        </div>
      )}

      {!loading && !error && meetings.length > 0 && (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <div key={meeting._id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-900 rounded-xl flex flex-col items-center justify-center text-white shrink-0">
                  <span className="text-xs font-medium leading-none">
                    {format(parseLocalDate(meeting.date), 'MMM')}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {format(parseLocalDate(meeting.date), 'dd')}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{meeting.name}</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{format(parseLocalDate(meeting.date), 'EEEE, dd MMMM yyyy')}</span>
                    {meeting.location && <span>&bull; {meeting.location}</span>}
                    {meeting.chairperson && <span>&bull; Chair: {meeting.chairperson}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={`/meetings/${meeting._id}`}
                  className="bg-blue-50 text-blue-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  Open
                </Link>
                <button
                  onClick={() => deleteMeeting(meeting._id, meeting.name)}
                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete meeting"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
