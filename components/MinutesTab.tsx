'use client';

import { useEffect, useState } from 'react';
import MinutesPreview from './MinutesPreview';
import { downloadMinutesPdf, shareMinutesPdf, getMinutesPdfBase64, getMinutesTextSummary } from '@/lib/downloadPdf';

interface Attendee { name: string; designation: string; }
interface DeadlineHistoryEntry { previousDeadline: string; requestedDeadline: string; reason: string; status: 'approved' | 'rejected'; decidedAt: string; }
interface TaskSubmission { title: string; notes?: string; driveLinks?: string[]; submittedAt: string; }
interface MinutesItem {
  subject: string;
  actionBy: string;
  dateOfAction: string;
  remarks: string;
  followedUp?: boolean;
  actionByPhone?: string;
  actionByEmail?: string;
  deadlineHistory?: DeadlineHistoryEntry[];
  submission?: TaskSubmission;
}
interface AgendaItem { order: number; title: string; description: string; duration: string; presenters: string[]; }
interface MinutesData {
  meetingType: string;
  meetingReference: string;
  purpose: string;
  departments: string[];   // array — shows as numbered list in preview/PDF
  attendees: Attendee[];
  items: MinutesItem[];
  nextMeetingDate: string;
  nextMeetingLocation: string;
}
interface Meeting {
  _id: string; name: string; date: string; location?: string; chairperson?: string; meetLink?: string;
}

function fmtShortDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const emptyAttendee = (): Attendee => ({ name: '', designation: '' });
const emptyItem = (): MinutesItem => ({ subject: '', actionBy: '', dateOfAction: '', remarks: '', followedUp: false, actionByPhone: '', actionByEmail: '' });
const defaultData = (): MinutesData => ({
  meetingType: 'OFFICE',
  meetingReference: '',
  purpose: '',
  departments: [''],
  attendees: [emptyAttendee()],
  items: [emptyItem()],
  nextMeetingDate: '',
  nextMeetingLocation: '',
});

export default function MinutesTab({ meeting, companySlug }: { meeting: Meeting; companySlug?: string }) {
  const apiBase = companySlug ? `/api/${companySlug}` : '/api';
  const [data, setData] = useState<MinutesData>(defaultData());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [whatsAppToast, setWhatsAppToast] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/minutes/${meeting._id}`).then((r) => r.json()).catch(() => null),
      fetch(`${apiBase}/agenda/${meeting._id}`).then((r) => r.json()).catch(() => null),
    ]).then(([d, agendaData]) => {
      if (d && d._id) {
        setData({
          meetingType: d.meetingType ?? 'OFFICE',
          meetingReference: d.meetingReference ?? '',
          purpose: d.purpose ?? '',
          // Backward compat: old docs store a single string in `department`
          departments: d.departments?.length ? d.departments
                      : d.department ? [d.department]
                      : [''],
          attendees: d.attendees?.length ? d.attendees : [emptyAttendee()],
          items: d.items?.length ? d.items : [emptyItem()],
          nextMeetingDate: d.nextMeetingDate ?? '',
          nextMeetingLocation: d.nextMeetingLocation ?? '',
        });
      } else {
        setData(defaultData());
      }
      if (agendaData?.items?.length) {
        setAgendaItems(agendaData.items);
      }
    }).catch((err) => {
      console.error('Error fetching minutes/agenda:', err);
      setData(defaultData());
    }).finally(() => {
      setLoading(false);
    });
  }, [meeting._id]);

  async function save(dataToSave?: MinutesData) {
    const d = dataToSave ?? data;
    setSaving(true);
    const pdfBase64 = getMinutesPdfBase64(meeting, d);
    await fetch(`${apiBase}/minutes/${meeting._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, pdfBase64 }),
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
  function toggleFollowedUp(i: number) {
    const newData = {
      ...data,
      items: data.items.map((item, idx) =>
        idx === i ? { ...item, followedUp: !item.followedUp } : item
      ),
    };
    setData(newData);
    save(newData);
  }

  function openEmailModal() {
    setEmailTo('');
    setEmailSubject(`Minutes of Meeting — ${meeting?.name || 'Meeting'}`);
    setEmailBody(getMinutesTextSummary(meeting, data, false, undefined, agendaItems));
    setEmailError(null);
    setEmailSuccess(false);
    setIsEmailModalOpen(true);
  }

  function shareEmail() {
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && typeof navigator.canShare === "function") {
      shareMinutesPdf(meeting, data, 'email', agendaItems);
    } else {
      openEmailModal();
    }
  }

  async function sendEmail() {
    if (!emailTo) {
      setEmailError('Please enter a recipient email address.');
      return;
    }

    setEmailSending(true);
    setEmailError(null);

    try {
      const pdfBase64 = getMinutesPdfBase64(meeting, data, agendaItems);
      const filename = `Minutes - ${meeting?.name || 'Meeting'}.pdf`;

      const res = await fetch(`${apiBase}/share/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
          pdfBase64,
          filename,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        setEmailError(`${resData.message || 'Failed to send email'}. Falling back to your local email client...`);
        setTimeout(() => {
          setIsEmailModalOpen(false);
          shareMinutesPdf(meeting, data, 'email', agendaItems);
        }, 3000);
      } else {
        setEmailSuccess(true);
        setTimeout(() => {
          setIsEmailModalOpen(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Error sharing email direct:', err);
      setEmailError(err instanceof Error ? err.message : 'Failed to send email. Falling back to local client...');
      setTimeout(() => {
        setIsEmailModalOpen(false);
        shareMinutesPdf(meeting, data, 'email', agendaItems);
      }, 3000);
    } finally {
      setEmailSending(false);
    }
  }

  async function shareWhatsApp() {
    const pdfBase64 = getMinutesPdfBase64(meeting, data, agendaItems);
    // Ensure latest PDF is saved on server
    try {
      await fetch(`${apiBase}/minutes/${meeting._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, pdfBase64: getMinutesPdfBase64(meeting, data, agendaItems) }),
      });
    } catch (e) {
      console.error('Failed to upload latest PDF version to server', e);
    }

    // Build the text summary with hosted link
    const pdfUrl = typeof window !== 'undefined' && meeting._id
      ? `${window.location.origin}${apiBase}/share/pdf/${meeting._id}`
      : '';
    const bodyText = getMinutesTextSummary(meeting, data, true, pdfUrl, agendaItems);

    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && typeof navigator.canShare === 'function') {
      // Mobile: use native share sheet (PDF will be attached automatically)
      shareMinutesPdf(meeting, data, 'whatsapp', agendaItems);
    } else {
      // Desktop: try native OS share with PDF if supported (Web Share API Level 2)
      const pdfBase64 = getMinutesPdfBase64(meeting, data, agendaItems);
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const pdfBlob = new Blob([byteNumbers], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], `${meeting.name || 'Minutes'}.pdf`, { type: 'application/pdf' });
      const shareData = {
        title: `Minutes - ${meeting.name || ''}`,
        text: bodyText,
        files: [pdfFile],
      };
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: open WhatsApp with pre-filled text and optional download
        const waLink = document.createElement('a');
        waLink.href = `whatsapp://send?text=${encodeURIComponent(bodyText)}`;
        waLink.style.display = 'none';
        document.body.appendChild(waLink);
        waLink.click();
        document.body.removeChild(waLink);
        // Fallback to WhatsApp Web if native app not installed
        setTimeout(() => {
          if (document.hasFocus()) {
            window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(bodyText)}`, '_blank');
          }
        }, 1500);
      }
    }

    // Show toast guidance
    setWhatsAppToast(true);
    setTimeout(() => setWhatsAppToast(false), 7000);
  }
  

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
            <button onClick={() => save()} disabled={saving} className="bg-blue-900 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors">
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
                onClick={() => downloadMinutesPdf(meeting, data, agendaItems)}
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

          {/* Purpose of Meeting */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Purpose of Meeting</h3>
            <textarea
              value={data.purpose || ''}
              onChange={(e) => setData((d) => ({ ...d, purpose: e.target.value }))}
              placeholder="Describe the purpose of this meeting..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* Departments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Department(s)</h3>
            <div className="space-y-2">
              {data.departments.map((dept, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5 shrink-0 text-right">{i + 1}.</span>
                  <input
                    value={dept}
                    onChange={(e) => {
                      const next = [...data.departments];
                      next[i] = e.target.value;
                      setData((d) => ({ ...d, departments: next }));
                    }}
                    placeholder={`e.g. Finance`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setData((d) => ({ ...d, departments: d.departments.filter((_, idx) => idx !== i) }))
                    }
                    disabled={data.departments.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30 p-1"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setData((d) => ({ ...d, departments: [...d.departments, ''] }))}
                className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1 mt-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Department
              </button>
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
                <div key={i} className={`rounded-xl p-4 border transition-colors ${
                  item.followedUp
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    {/* Number + status badge */}
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        item.followedUp ? 'bg-green-500' : 'bg-blue-900'
                      }`}>{i + 1}</span>
                      {item.followedUp && (
                        <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Followed Up
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {/* Follow-up toggle */}
                      <button
                        type="button"
                        onClick={() => toggleFollowedUp(i)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                          item.followedUp
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 border border-gray-200'
                        }`}
                      >
                        {item.followedUp ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Done — Undo
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Mark as Done
                          </>
                        )}
                      </button>

                      {/* Remove */}
                      <button onClick={() => removeItem(i)} disabled={data.items.length === 1}
                        className="text-red-400 hover:text-red-600 disabled:opacity-30 text-xs flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 gap-3 ${item.followedUp ? 'opacity-60' : ''}`}>
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
                        <input value={item.actionBy} onChange={(e) => updateItem(i, 'actionBy', e.target.value)}
                          placeholder="Person responsible"
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Action</label>
                        <input type="date" value={item.dateOfAction} onChange={(e) => updateItem(i, 'dateOfAction', e.target.value)}
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        {!!item.deadlineHistory?.length && (
                          <details className="mt-1">
                            <summary className="text-[10px] text-blue-600 cursor-pointer select-none">
                              Extension history ({item.deadlineHistory.length})
                            </summary>
                            <ul className="mt-1 space-y-1">
                              {item.deadlineHistory.map((h, hi) => (
                                <li key={hi} className={`text-[10px] px-2 py-1 rounded ${h.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  {h.status === 'approved' ? 'Approved' : 'Rejected'}: {fmtShortDate(h.previousDeadline)} → {fmtShortDate(h.requestedDeadline)}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remarks</label>
                        <input value={item.remarks} onChange={(e) => updateItem(i, 'remarks', e.target.value)}
                          placeholder="Remarks..."
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                    </div>

                    {/* Reminder contact details */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Reminder Contact (for daily deadline alerts)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp No.
                          </label>
                          <input
                            value={item.actionByPhone ?? ''}
                            onChange={(e) => updateItem(i, 'actionByPhone', e.target.value)}
                            placeholder="+91 9876543210"
                            className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email
                          </label>
                          <input
                            type="email"
                            value={item.actionByEmail ?? ''}
                            onChange={(e) => updateItem(i, 'actionByEmail', e.target.value)}
                            placeholder="person@example.com"
                            className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submitted task details */}
                    {item.submission && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Submitted by {item.actionBy || 'assignee'} — {fmtShortDate(item.submission.submittedAt)}
                        </p>
                        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 space-y-1.5">
                          <div className="text-xs text-gray-700"><span className="font-semibold">Title:</span> {item.submission.title}</div>
                          {item.submission.notes && (
                            <div className="text-xs text-gray-700 whitespace-pre-wrap"><span className="font-semibold">Notes:</span> {item.submission.notes}</div>
                          )}
                          {!!item.submission.driveLinks?.length && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold">Files:</span>
                              <ul className="mt-1 space-y-0.5">
                                {item.submission.driveLinks.map((link, li) => (
                                  <li key={li}>
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{link}</a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
            <button onClick={() => save()} disabled={saving} className="bg-blue-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Minutes'}
            </button>
          </div>
        </div>
      )}

      {view === 'preview' && <MinutesPreview meeting={meeting} data={data} agendaItems={agendaItems} />}

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">Send Minutes via Email</h3>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="text-blue-200 hover:text-white transition-colors"
                disabled={emailSending}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {emailSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">Email Sent!</h4>
                  <p className="text-sm text-gray-500">The minutes of meeting and PDF attachment have been sent.</p>
                </div>
              ) : (
                <>
                  {emailError && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Notice
                      </div>
                      <p>{emailError}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To (Recipient Email) *</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="e.g. client@example.com"
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      disabled={emailSending}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Subject"
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      disabled={emailSending}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Body</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Write your email body here..."
                      rows={6}
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none font-mono text-xs leading-relaxed"
                      disabled={emailSending}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <svg className="w-5 h-5 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Attached PDF: Minutes - {meeting?.name || 'Meeting'}.pdf</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!emailSuccess && (
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t border-gray-100">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
                  disabled={emailSending}
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmail}
                  className="bg-blue-900 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                  disabled={emailSending}
                >
                  {emailSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Email'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Toast Notification */}
      {whatsAppToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-[#1a1a1a] text-white px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-fade-in-up">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-green-400">PDF Downloaded — WhatsApp Opening!</p>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Drag-and-drop the downloaded PDF file straight into your WhatsApp chat to send it instantly! (Or click <strong className="text-white">📎 Attach</strong> → <strong className="text-white">Document</strong>.)
            </p>
          </div>
          <button
            onClick={() => setWhatsAppToast(false)}
            className="shrink-0 text-gray-500 hover:text-white transition-colors mt-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
