'use client';

import { useEffect, useState } from 'react';
import MinutesPreview from './MinutesPreview';
import { downloadMinutesPdf, shareMinutesPdf } from '@/lib/downloadPdf';

interface Attendee { name: string; designation: string; }
interface MinutesItem { subject: string; actionBy: string; dateOfAction: string; remarks: string; }
interface MinutesData {
  meetingType: string;
  meetingReference: string;
  attendees: Attendee[];
  items: MinutesItem[];
  nextMeetingDate: string;
  nextMeetingLocation: string;
}
interface Meeting {
  _id: string; name: string; date: string; location?: string; chairperson?: string; meetLink?: string;
}

const emptyAttendee = (): Attendee => ({ name: '', designation: '' });
const emptyItem = (): MinutesItem => ({ subject: '', actionBy: '', dateOfAction: '', remarks: '' });
const defaultData = (): MinutesData => ({
  meetingType: 'OFFICE',
  meetingReference: '',
  attendees: [emptyAttendee()],
  items: [emptyItem()],
  nextMeetingDate: '',
  nextMeetingLocation: '',
});

export default function MinutesTab({ meeting }: { meeting: Meeting }) {
  const [data, setData] = useState<MinutesData>(defaultData());
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/minutes/${meeting._id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d._id) {
          setData({
            meetingType: d.meetingType ?? 'OFFICE',
            meetingReference: d.meetingReference ?? '',
            attendees: d.attendees?.length ? d.attendees : [emptyAttendee()],
            items: d.items?.length ? d.items : [emptyItem()],
            nextMeetingDate: d.nextMeetingDate ?? '',
            nextMeetingLocation: d.nextMeetingLocation ?? '',
          });
        } else {
          setData(defaultData());
        }
      })
      .catch((err) => {
        console.error('Error fetching minutes:', err);
        setData(defaultData());
      })
      .finally(() => {
        setLoading(false);
      });
  }, [meeting._id]);

  async function save() {
    setSaving(true);
    await fetch(`/api/minutes/${meeting._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateAttendee(i: number, field: keyof Attendee, val: string) {
    setData((d) => ({ ...d, attendees: d.attendees.map((a, idx) => idx === i ? { ...a, [field]: val } : a) }));
  }
  function addAttendee() { setData((d) => ({ ...d, attendees: [...d.attendees, emptyAttendee()] })); }
  function removeAttendee(i: number) {
    setData((d) => ({ ...d, attendees: d.attendees.filter((_, idx) => idx !== i) }));
  }

  function updateItem(i: number, field: keyof MinutesItem, val: string) {
    setData((d) => ({ ...d, items: d.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));
  }
  function addItem() { setData((d) => ({ ...d, items: [...d.items, emptyItem()] })); }
  function removeItem(i: number) {
    setData((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));
  }

  function shareEmail() { shareMinutesPdf(meeting, data, 'email'); }
  function shareWhatsApp() { shareMinutesPdf(meeting, data, 'whatsapp'); }

  if (loading) return <div className="text-gray-400 py-10 text-center">Loading minutes...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setView('edit')} className={`px-5 py-2 text-sm font-medium transition-colors ${view === 'edit' ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Edit</button>
          <button onClick={() => setView('preview')} className={`px-5 py-2 text-sm font-medium transition-colors ${view === 'preview' ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Preview</button>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Saved
            </span>
          )}
          {view === 'edit' && (
            <button onClick={save} disabled={saving} className="bg-blue-900 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Minutes'}
            </button>
          )}
          {view === 'preview' && (
            <>
              <button
                onClick={shareEmail}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Email
              </button>
              <button
                onClick={shareWhatsApp}
                className="border border-green-500 text-green-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button
                onClick={() => downloadMinutesPdf(meeting, data)}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'edit' && (
        <div className="space-y-6">

          {/* Meeting Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Meeting Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type of Meeting</label>
                <input
                  value={data.meetingType}
                  onChange={(e) => setData((d) => ({ ...d, meetingType: e.target.value }))}
                  placeholder="e.g. OFFICE, BOARD, AGM"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Meeting Reference No.</label>
                <input
                  value={data.meetingReference}
                  onChange={(e) => setData((d) => ({ ...d, meetingReference: e.target.value }))}
                  placeholder="e.g. 10"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-900 rounded-full text-xs flex items-center justify-center font-bold">A</span>
              Attendees
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Name</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Designation</span>
              </div>
              {data.attendees.map((att, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 items-center">
                  <input
                    value={att.name}
                    onChange={(e) => updateAttendee(i, 'name', e.target.value)}
                    placeholder="Full name"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="flex gap-2">
                    <input
                      value={att.designation}
                      onChange={(e) => updateAttendee(i, 'designation', e.target.value)}
                      placeholder="e.g. General Manager"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button onClick={() => removeAttendee(i)} disabled={data.attendees.length === 1} className="text-red-400 hover:text-red-600 px-1 disabled:opacity-30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addAttendee} className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1 mt-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Attendee
              </button>
            </div>
          </div>

          {/* Discussion Items */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-blue-900 text-white px-6 py-3">
              <h3 className="font-bold text-sm">Subjects / Discussions</h3>
            </div>
            <div className="p-4 space-y-3">
              {data.items.map((item, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <button onClick={() => removeItem(i)} disabled={data.items.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30 text-xs flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject / Discussion *</label>
                      <textarea
                        value={item.subject}
                        onChange={(e) => updateItem(i, 'subject', e.target.value)}
                        placeholder="Describe the subject discussed..."
                        rows={3}
                        className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Action By</label>
                        <input
                          value={item.actionBy}
                          onChange={(e) => updateItem(i, 'actionBy', e.target.value)}
                          placeholder="Person responsible"
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Action</label>
                        <input
                          type="date"
                          value={item.dateOfAction}
                          onChange={(e) => updateItem(i, 'dateOfAction', e.target.value)}
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remarks</label>
                        <input
                          value={item.remarks}
                          onChange={(e) => updateItem(i, 'remarks', e.target.value)}
                          placeholder="Remarks..."
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Discussion Item
              </button>
            </div>
          </div>

          {/* Next Meeting */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Next Meeting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Meeting Date</label>
                <input type="date" value={data.nextMeetingDate} onChange={(e) => setData((d) => ({ ...d, nextMeetingDate: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Meeting Location</label>
                <input value={data.nextMeetingLocation} onChange={(e) => setData((d) => ({ ...d, nextMeetingLocation: e.target.value }))} placeholder="Location" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={save} disabled={saving} className="bg-blue-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Minutes'}
            </button>
          </div>
        </div>
      )}

      {view === 'preview' && <MinutesPreview meeting={meeting} data={data} />}
    </div>
  );
}
