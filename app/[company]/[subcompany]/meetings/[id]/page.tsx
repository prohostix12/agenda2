'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';
import AgendaTab from '@/components/AgendaTab';
import MinutesTab from '@/components/MinutesTab';

interface Meeting {
  _id: string; name: string; date: string;
  location?: string; chairperson?: string; meetLink?: string;
}
type Tab = 'agenda' | 'minutes';

export default function MeetingPage() {
  const params = useParams<{ company: string; subcompany: string; id: string }>();
  const org = params?.company ?? '';
  const company = params?.subcompany ?? '';
  const id = params?.id ?? '';

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [tab, setTab] = useState<Tab>('agenda');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org || !company || !id) return;
    fetch(`/api/${org}/${company}/meetings/${id}`)
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data?.error) throw new Error(data?.error || `Failed (${r.status})`);
        return data;
      })
      .then(data => {
        if (data?._id) setMeeting(data);
        else { setMeeting(null); setError('Meeting not found.'); }
      })
      .catch(err => { setMeeting(null); setError(err instanceof Error ? err.message : 'Failed to fetch'); })
      .finally(() => setLoading(false));
  }, [org, company, id]);

  if (loading) return (
    <div className="text-center py-20 text-gray-400">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-4" />Loading...
    </div>
  );
  if (!meeting) return (
    <div className="text-center py-20">
      <p className="text-red-600 font-medium">{error || 'Meeting not found.'}</p>
      <Link href={`/${org}/${company}`} className="text-blue-600 mt-4 inline-block">← Back to Meetings</Link>
    </div>
  );

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const meetDay = parseLocalDate(meeting.date); meetDay.setHours(0, 0, 0, 0);
  const isUpcoming = meetDay >= today;

  // Pass compound slug so AgendaTab/MinutesTab use /api/{org}/{company}/...
  const companySlug = `${org}/${company}`;

  return (
    <div>
      <div className="mb-6">
        <Link href={`/${org}/${company}`} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          All Meetings
        </Link>
        <div className="bg-blue-900 text-white rounded-2xl p-6">
          <h1 className="text-2xl font-bold">{meeting.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-blue-200 text-sm">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {format(parseLocalDate(meeting.date), 'EEEE, dd MMMM yyyy')}
            </span>
            {meeting.location && <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{meeting.location}</span>}
            {meeting.chairperson && <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>Chairperson: {meeting.chairperson}</span>}
            {meeting.meetLink && isUpcoming && (
              <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Join Meet
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button onClick={() => setTab('agenda')} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${tab === 'agenda' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Agenda</button>
        <button onClick={() => setTab('minutes')} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${tab === 'minutes' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Minutes</button>
      </div>

      {tab === 'agenda' && <AgendaTab key={meeting._id} meeting={meeting} companySlug={companySlug} />}
      {tab === 'minutes' && <MinutesTab key={meeting._id} meeting={meeting} companySlug={companySlug} />}
    </div>
  );
}
