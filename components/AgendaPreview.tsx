'use client';

import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

interface AgendaItem {
  order: number;
  title: string;
  description: string;
  duration: string;
  presenters: string[];
}

interface Meeting {
  name: string;
  date: string;
  location?: string;
  chairperson?: string;
}

export default function AgendaPreview({
  meeting,
  items,
}: {
  meeting: Meeting;
  items: AgendaItem[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div id="agenda-print-area" className="p-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center border-b-2 border-blue-900 pb-6 mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-900 mb-2">
            Official Agenda
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{meeting.name}</h1>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 mt-4">
            <div className="text-center">
              <div className="text-xs uppercase font-semibold text-gray-400 tracking-wide mb-1">Date</div>
              <div className="font-semibold">{format(parseLocalDate(meeting.date), 'EEEE, dd MMMM yyyy')}</div>
            </div>
            {meeting.location && (
              <div className="text-center">
                <div className="text-xs uppercase font-semibold text-gray-400 tracking-wide mb-1">Location</div>
                <div className="font-semibold">{meeting.location}</div>
              </div>
            )}
            {meeting.chairperson && (
              <div className="text-center">
                <div className="text-xs uppercase font-semibold text-gray-400 tracking-wide mb-1">Chairperson</div>
                <div className="font-semibold">{meeting.chairperson}</div>
              </div>
            )}
          </div>
        </div>

        {/* Agenda Items */}
        <div className="space-y-0">
          {items.filter((i) => i.title.trim()).length === 0 && (
            <p className="text-gray-400 text-center py-8">No agenda items added yet.</p>
          )}

          {/* Table header */}
          {items.filter((i) => i.title.trim()).length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-3 text-left font-semibold w-10">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Agenda Item</th>
                  <th className="px-4 py-3 text-left font-semibold w-32">Presenter</th>
                  <th className="px-4 py-3 text-left font-semibold w-24">Duration</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((item) => item.title.trim())
                  .map((item, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-4 py-4 font-bold text-blue-900 align-top">{item.order}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-gray-900">{item.title}</div>
                        {item.description && (
                          <div className="text-gray-500 mt-1 text-xs leading-relaxed">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-700 align-top">
                        {item.presenters?.filter(p => p.trim()).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-4 text-gray-700 align-top">{item.duration || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex justify-between text-xs text-gray-400">
          <span>Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
          <span>Confidential</span>
        </div>
      </div>
    </div>
  );
}
