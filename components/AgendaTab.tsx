'use client';

import { useEffect, useState } from 'react';
import AgendaPreview from './AgendaPreview';
import { downloadAgendaPdf, getAgendaTextSummary } from '@/lib/downloadPdf';

interface AgendaItem {
  order: number;
  title: string;
  description: string;
  duration: string;
  presenters: string[];
}

interface Meeting {
  _id: string;
  name: string;
  date: string;
  location?: string;
  chairperson?: string;
  meetLink?: string;
}

const emptyItem = (): AgendaItem => ({
  order: 1,
  title: '',
  description: '',
  duration: '',
  presenters: [''],
});

export default function AgendaTab({ meeting, companySlug }: { meeting: Meeting; companySlug?: string }) {
  const apiBase = companySlug ? `/api/${companySlug}` : '/api';
  const [items, setItems] = useState<AgendaItem[]>([emptyItem()]);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waToast, setWaToast] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/agenda/${meeting._id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items && data.items.length > 0) {
          setItems(
            data.items.map((item: AgendaItem) => ({
              ...item,
              description: item.description ?? '',
              duration: item.duration ?? '',
              presenters: item.presenters?.length ? item.presenters : [''],
            }))
          );
        } else {
          setItems([emptyItem()]);
        }
      })
      .catch((err) => {
        console.error('Error fetching agenda:', err);
        setItems([emptyItem()]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [meeting._id]);

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem(), order: prev.length + 1 }]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }))
    );
  }

  function updateItem(index: number, field: 'title' | 'description' | 'duration', value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const newItems = [...items];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[index], newItems[swapIdx]] = [newItems[swapIdx], newItems[index]];
    setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
  }

  function addPresenter(itemIdx: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx ? { ...item, presenters: [...item.presenters, ''] } : item
      )
    );
  }

  function updatePresenter(itemIdx: number, pIdx: number, val: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? { ...item, presenters: item.presenters.map((p, j) => (j === pIdx ? val : p)) }
          : item
      )
    );
  }

  function removePresenter(itemIdx: number, pIdx: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? { ...item, presenters: item.presenters.filter((_, j) => j !== pIdx) }
          : item
      )
    );
  }

  async function save() {
    setSaving(true);
    await fetch(`${apiBase}/agenda/${meeting._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function shareOnWhatsApp() {
    const text = getAgendaTextSummary(meeting, items);
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const a = document.createElement('a');
      a.href = `whatsapp://send?text=${encodeURIComponent(text)}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
    setWaToast(true);
    setTimeout(() => setWaToast(false), 5000);
  }

  if (loading) return <div className="text-gray-400 py-10 text-center">Loading agenda...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView('edit')}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              view === 'edit' ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setView('preview')}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              view === 'preview' ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {view === 'edit' && (
            <button
              onClick={save}
              disabled={saving}
              className="bg-blue-900 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Agenda'}
            </button>
          )}
          {view === 'preview' && (
            <div className="flex items-center gap-2">
              <button
                onClick={shareOnWhatsApp}
                className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share on WhatsApp
              </button>
              <button
                onClick={() => downloadAgendaPdf(meeting, items)}
                className="bg-blue-900 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {view === 'edit' && (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {item.order}
                  </span>
                  <span className="text-sm font-semibold text-gray-500">Agenda Item</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move up">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move down">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button onClick={() => removeItem(index)} disabled={items.length === 1} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 ml-1" title="Remove item">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label>
                  <input
                    value={item.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    placeholder="e.g. Opening and Welcome"
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description / Notes</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Brief description of this agenda item..."
                    rows={2}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</label>
                    <input
                      value={item.duration}
                      onChange={(e) => updateItem(index, 'duration', e.target.value)}
                      placeholder="e.g. 15 mins"
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Presenter(s)</label>
                    <div className="space-y-1 mt-1">
                      {item.presenters.map((p, pIdx) => (
                        <div key={pIdx} className="flex gap-1">
                          <input
                            value={p}
                            onChange={(e) => updatePresenter(index, pIdx, e.target.value)}
                            placeholder={`Presenter ${pIdx + 1}`}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <button
                            onClick={() => removePresenter(index, pIdx)}
                            disabled={item.presenters.length === 1}
                            className="text-red-400 hover:text-red-600 px-1 disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addPresenter(index)}
                        className="text-blue-600 text-xs font-medium hover:text-blue-800 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Presenter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addItem}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Agenda Item
          </button>

          <div className="flex justify-end pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="bg-blue-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Agenda'}
            </button>
          </div>
        </div>
      )}

      {view === 'preview' && <AgendaPreview meeting={meeting} items={items} />}

      {waToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-bounce">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Opening WhatsApp…
        </div>
      )}
    </div>
  );
}
