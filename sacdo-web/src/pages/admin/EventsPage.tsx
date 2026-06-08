import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Calendar, MapPin } from 'lucide-react';
import { getEvents, upsertEvent, deleteEvent } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';
import type { Event } from '../../types';

type Form = { title: string; description: string; location: string; startDate: string; endDate: string };
const EMPTY: Form = { title: '', description: '', location: '', startDate: '', endDate: '' };

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function parseDate(s: string): Date | null { const d = new Date(s + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; }

export default function AdminEventsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setEvents(await getEvents());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditingEvent(null); setForm(EMPTY); setFormError(''); setShowDialog(true); }
  function openEdit(e: Event) {
    setEditingEvent(e);
    setForm({ title: e.title, description: e.description ?? '', location: e.location ?? '', startDate: toDateStr(e.startDate), endDate: e.endDate ? toDateStr(e.endDate) : '' });
    setFormError('');
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.startDate.trim()) { setFormError('Title and start date are required.'); return; }
    const startDate = parseDate(form.startDate);
    if (!startDate) { setFormError('Start date must be YYYY-MM-DD.'); return; }
    const endDate = form.endDate.trim() ? parseDate(form.endDate) : null;
    if (form.endDate.trim() && !endDate) { setFormError('End date must be YYYY-MM-DD.'); return; }
    setSaving(true);
    try {
      await upsertEvent({ id: editingEvent?.id, title: form.title.trim(), description: form.description.trim(), location: form.location.trim(), startDate, endDate: endDate ?? startDate, createdBy: editingEvent?.createdBy ?? user!.id });
      setShowDialog(false);
      load();
    } catch { setFormError('Failed to save event.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEvent(deleteTarget.id);
      setEvents((p) => p.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert('Failed to delete event.'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Events</h1>
        <button onClick={openNew} className="flex items-center gap-1 bg-[#c8a951] text-[#1a3a5c] text-sm font-semibold px-3 py-1.5 rounded-xl">
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 pb-24">
        {loading ? (
          [1, 2].map((i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)
        ) : events.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No events yet. Tap Add to create one.</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-semibold text-gray-800 mb-1">{e.title}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                <Calendar size={12} />
                <span>{e.startDate.toLocaleDateString()}{e.endDate && e.endDate.getTime() !== e.startDate.getTime() ? ` — ${e.endDate.toLocaleDateString()}` : ''}</span>
              </div>
              {e.location && <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><MapPin size={12} /><span>{e.location}</span></div>}
              {e.description && <p className="text-sm text-gray-600 mb-2">{e.description}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => openEdit(e)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#1a3a5c] text-[#1a3a5c] text-sm font-medium"><Pencil size={13} /> Edit</button>
                <button onClick={() => setDeleteTarget(e)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-400 text-red-600 text-sm font-medium"><Trash2 size={13} /> Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDialog(false); }}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90svh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{editingEvent ? 'Edit Event' : 'New Event'}</h2>
            {[
              { label: 'Title *', key: 'title' as const, type: 'text', placeholder: '' },
              { label: 'Start Date * (YYYY-MM-DD)', key: 'startDate' as const, type: 'text', placeholder: '2025-01-15' },
              { label: 'End Date (YYYY-MM-DD)', key: 'endDate' as const, type: 'text', placeholder: '2025-01-15' },
              { label: 'Location', key: 'location' as const, type: 'text', placeholder: '' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input type={type} placeholder={placeholder} value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]" />
              </div>
            ))}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] resize-none" />
            </div>
            {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowDialog(false)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Delete Event</h2>
            <p className="text-sm text-gray-500 mb-5">Delete "{deleteTarget.title}"? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
