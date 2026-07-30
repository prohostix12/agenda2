'use client';

import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

interface Attendee { name: string; designation: string; }
interface DeadlineHistoryEntry { previousDeadline: string; requestedDeadline: string; reason: string; status: 'approved' | 'rejected'; decidedAt: string; }
interface MinutesItem { subject: string; actionBy: string; dateOfAction: string; remarks: string; followedUp?: boolean; actionByPhone?: string; actionByEmail?: string; deadlineHistory?: DeadlineHistoryEntry[]; }
interface AgendaItem { order: number; title: string; description: string; duration: string; presenters: string[]; }
interface MinutesData {
  meetingType: string; meetingReference: string;
  purpose: string; departments: string[];
  attendees: Attendee[]; items: MinutesItem[];
  nextMeetingDate: string; nextMeetingLocation: string;
}
interface Meeting {
  name: string; date: string; location?: string; chairperson?: string; meetLink?: string;
}

function SubjectLines({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  return (
    <div className="space-y-0.5 leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-1">
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}

export default function MinutesPreview({ meeting, data, agendaItems = [] }: { meeting: Meeting; data: MinutesData; agendaItems?: AgendaItem[] }) {
  const attendees = data.attendees.filter((a) => a.name.trim());
  const items = data.items.filter((i) => i.subject.trim());
  const agenda = agendaItems.filter((a) => a.title.trim());

  return (
    <div className="bg-gray-100 p-4 rounded-2xl">
      {/* Outer document border — full A4-like frame */}
      <div className="bg-white border-2 border-gray-700 rounded shadow-lg max-w-4xl mx-auto">
        <div className="p-8 font-sans text-sm text-gray-900">

          {/* Header */}
          <div className="flex border border-gray-600 mb-0">
            <div className="flex-1 flex flex-col items-center justify-center p-5 border-r border-gray-600">
              <div className="text-xl font-bold tracking-widest uppercase text-center">{meeting.name}</div>
              <div className="text-sm font-bold uppercase tracking-wider mt-1">Minutes of Meeting</div>
            </div>
            <div className="w-72 p-4 space-y-1 text-xs">
              <div className="flex gap-2">
                <span className="font-semibold w-36 shrink-0">Types of Meeting</span>
                <span>: {data.meetingType || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold w-36 shrink-0">Meeting Reference</span>
                <span>: {data.meetingReference || '—'}</span>
              </div>
              {data.departments?.filter(d => d.trim()).length > 0 && (
                <div className="flex gap-2">
                  <span className="font-semibold w-36 shrink-0">Department</span>
                  <span>
                    : {data.departments.filter(d => d.trim()).map((d, i) => (
                      <span key={i} className="block">{i + 1}. {d}</span>
                    ))}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-semibold w-36 shrink-0">Meeting Venue</span>
                <span>: {meeting.location || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold w-36 shrink-0">Date &amp; Time</span>
                <span>: {format(parseLocalDate(meeting.date), 'dd.MM.yyyy')}</span>
              </div>
              {meeting.chairperson && (
                <div className="flex gap-2">
                  <span className="font-semibold w-36 shrink-0">Chairperson</span>
                  <span>: {meeting.chairperson}</span>
                </div>
              )}
            </div>
          </div>

          {/* Purpose of Meeting */}
          {data.purpose && (
            <div className="mb-0">
              <div className="border-x border-b border-gray-600 px-3 py-1.5 font-bold text-sm bg-gray-50">Purpose of Meeting</div>
              <div className="border-x border-b border-gray-600 px-3 py-3 text-sm whitespace-pre-wrap">
                {data.purpose}
              </div>
            </div>
          )}

          {/* Agenda */}
          {agenda.length > 0 && (
            <div className="mb-0">
              <div className="border-x border-b border-gray-600 px-3 py-1.5 font-bold text-sm bg-gray-50">Agenda</div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-x border-b border-gray-600 px-3 py-2 text-left w-14 font-bold bg-gray-50">SL NO</th>
                    <th className="border-x border-b border-gray-600 px-3 py-2 text-left font-bold bg-gray-50">Agenda Item</th>
                    <th className="border-x border-b border-gray-600 px-3 py-2 text-left w-28 font-bold bg-gray-50">Presenter(s)</th>
                    <th className="border-x border-b border-gray-600 px-3 py-2 text-left w-24 font-bold bg-gray-50">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {agenda.map((item, i) => (
                    <tr key={i}>
                      <td className="border-x border-b border-gray-600 px-3 py-2">{item.order}</td>
                      <td className="border-x border-b border-gray-600 px-3 py-2">
                        <div className="font-medium">{item.title}</div>
                        {item.description && <div className="text-gray-500 text-xs mt-0.5">{item.description}</div>}
                      </td>
                      <td className="border-x border-b border-gray-600 px-3 py-2 text-xs">{item.presenters?.filter(p => p.trim()).join(', ') || '—'}</td>
                      <td className="border-x border-b border-gray-600 px-3 py-2 text-xs">{item.duration || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="mb-0">
              <div className="border-x border-b border-gray-600 px-3 py-1.5 font-bold text-sm bg-gray-50">Attendees</div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-x border-b border-gray-600 px-3 py-2 text-left w-14 font-bold bg-gray-50">SL NO</th>
                    <th className="border-x border-b border-gray-600 px-3 py-2 text-left font-bold bg-gray-50">Name</th>
                    <th className="border-x border-b border-gray-600 px-3 py-2 text-left font-bold bg-gray-50">Designation</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((att, i) => (
                    <tr key={i}>
                      <td className="border-x border-b border-gray-600 px-3 py-2">{i + 1}</td>
                      <td className="border-x border-b border-gray-600 px-3 py-2 font-medium">{att.name}</td>
                      <td className="border-x border-b border-gray-600 px-3 py-2">{att.designation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Discussion Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-600 px-3 py-2 text-left w-10 font-bold bg-gray-50">SN</th>
                <th className="border border-gray-600 px-3 py-2 text-left font-bold bg-gray-50">Subject/Discussions</th>
                <th className="border border-gray-600 px-3 py-2 text-left w-28 font-bold bg-gray-50">Action By</th>
                <th className="border border-gray-600 px-3 py-2 text-left w-28 font-bold bg-gray-50">Date of Action</th>
                <th className="border border-gray-600 px-3 py-2 text-left w-28 font-bold bg-gray-50">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={item.followedUp ? 'bg-green-50' : ''}>
                  <td className="border border-gray-600 px-3 py-3 align-top font-medium">{i + 1}</td>
                  <td className="border border-gray-600 px-3 py-3 align-top">
                    <SubjectLines text={item.subject} />
                    {item.followedUp && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Followed Up
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-600 px-3 py-3 align-top">
                    <div className="font-semibold">{item.actionBy || ''}</div>
                  </td>
                  <td className="border border-gray-600 px-3 py-3 align-top">
                    {item.dateOfAction ? format(parseLocalDate(item.dateOfAction), 'dd.MM.yyyy') : ''}
                    {!!item.deadlineHistory?.length && (
                      <div className="mt-1 text-[10px] text-blue-700" title={item.deadlineHistory.map(h => `${h.status === 'approved' ? 'Extended' : 'Extension rejected'}: ${format(parseLocalDate(h.previousDeadline), 'dd.MM.yyyy')} → ${format(parseLocalDate(h.requestedDeadline), 'dd.MM.yyyy')}`).join('\n')}>
                        {item.deadlineHistory.some(h => h.status === 'approved')
                          ? `Extended ${item.deadlineHistory.filter(h => h.status === 'approved').length}x`
                          : 'Extension request rejected'}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-600 px-3 py-3 align-top">{item.remarks || ''}</td>
                </tr>
              ))}
              {[...Array(Math.max(0, 2 - items.length))].map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-gray-600 px-3 py-6"></td>
                  <td className="border border-gray-600 px-3 py-6"></td>
                  <td className="border border-gray-600 px-3 py-6"></td>
                  <td className="border border-gray-600 px-3 py-6"></td>
                  <td className="border border-gray-600 px-3 py-6"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Next Meeting */}
          {(data.nextMeetingDate || data.nextMeetingLocation) && (
            <div className="border border-t-0 border-gray-600 px-4 py-3 text-sm">
              <span className="font-bold text-xs uppercase tracking-widest text-blue-900">Next Meeting — </span>
              {data.nextMeetingDate && <span>{format(parseLocalDate(data.nextMeetingDate), 'dd MMMM yyyy')}</span>}
              {data.nextMeetingDate && data.nextMeetingLocation && <span className="mx-2">|</span>}
              {data.nextMeetingLocation && <span>{data.nextMeetingLocation}</span>}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-16 mt-10 pt-6 border-t-2 border-gray-600">
            <div>
              <div className="border-b border-gray-500 mb-2 h-10"></div>
              <div className="font-semibold text-sm">{meeting.chairperson ? `Chairperson — ${meeting.chairperson}` : 'Chairperson'}</div>
              <div className="text-xs text-gray-400 mt-1">Date: _______________</div>
            </div>
            <div>
              <div className="border-b border-gray-500 mb-2 h-10"></div>
              <div className="font-semibold text-sm">Secretary / Recorder</div>
              <div className="text-xs text-gray-400 mt-1">Date: _______________</div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200">
            <span>Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
            <span>Confidential — For Internal Use Only</span>
          </div>

        </div>
      </div>
    </div>
  );
}
