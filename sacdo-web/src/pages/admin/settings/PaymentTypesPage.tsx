import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { getPaymentTypes, upsertPaymentType, deletePaymentType } from '../../../services/members';
import { useAuthStore } from '../../../store/useAuthStore';
import type { PaymentType } from '../../../types';

export default function PaymentTypesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [types, setTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PaymentType | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() { setLoading(true); setTypes(await getPaymentTypes()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditingType(null); setName(''); setNameError(''); setShowDialog(true); }
  function openEdit(t: PaymentType) { setEditingType(t); setName(t.name); setNameError(''); setShowDialog(true); }

  async function handleSave() {
    if (!name.trim()) { setNameError('Name is required.'); return; }
    setSaving(true);
    try {
      await upsertPaymentType({ id: editingType?.id, name: name.trim() }, { id: user!.id, name: `${user!.firstName} ${user!.lastName}` });
      setShowDialog(false);
      load();
    } catch { setNameError('Failed to save.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentType(deleteTarget.id, { id: user!.id, name: `${user!.firstName} ${user!.lastName}` });
      setTypes((p) => p.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert('Failed to delete.'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white p-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-bold text-white">Payment Types</h1>
        </div>
        <button onClick={openNew} className="flex items-center gap-1 bg-[#c8a951] text-[#1a3a5c] text-sm font-semibold px-3 py-1.5 rounded-xl">
          <Plus size={16} /> Add
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {loading ? [1,2,3].map((i) => <div key={i} className="bg-white rounded-xl h-14 animate-pulse" />) :
         types.length === 0 ? <p className="text-center text-gray-400 mt-12">No payment types configured.</p> :
         types.map((t) => (
          <div key={t.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex justify-between items-center">
            <p className="font-medium text-gray-800">{t.name}</p>
            <div className="flex gap-2">
              <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500"><Pencil size={15} /></button>
              <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded-lg border border-red-200 text-red-500"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3 shrink-0">
            <button onClick={() => setShowDialog(false)} className="text-white p-1"><ArrowLeft size={22} /></button>
            <h2 className="text-lg font-semibold text-white">{editingType ? 'Edit Payment Type' : 'New Payment Type'}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <label className="block text-sm text-gray-600 mb-1">Name *</label>
            <input type="text" placeholder="e.g. Cash, Cheque, Bank Transfer" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]" />
            {nameError && <p className="text-red-600 text-sm mt-2">{nameError}</p>}
          </div>
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex gap-3 safe-bottom bg-white">
            <button onClick={() => setShowDialog(false)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          <div className="bg-red-600 px-4 py-4 safe-top flex items-center gap-3 shrink-0">
            <button onClick={() => setDeleteTarget(null)} className="text-white p-1"><ArrowLeft size={22} /></button>
            <h2 className="text-lg font-semibold text-white">Delete Payment Type</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <p className="text-gray-600">Delete "<span className="font-semibold">{deleteTarget.name}</span>"?</p>
            <p className="text-sm text-gray-400 mt-1">This cannot be undone.</p>
          </div>
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex gap-3 safe-bottom bg-white">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
