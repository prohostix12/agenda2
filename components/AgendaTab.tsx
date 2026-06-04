'use client';

import { useEffect, useState } from 'react';
import AgendaPreview from './AgendaPreview';
import { downloadAgendaPdf } from '@/lib/downloadPdf';

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
            <button
              onClick={() => downloadAgendaPdf(meeting, items)}
              className="bg-blue-900 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
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
    </div>
  );
}
