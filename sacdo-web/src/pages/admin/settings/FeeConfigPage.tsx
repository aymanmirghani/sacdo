import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { getMembershipFees, upsertMembershipFee } from '../../../services/members';
import { useAuthStore } from '../../../store/useAuthStore';
import type { MembershipFee } from '../../../types';

type Form = { membershipType: string; amount: string; description: string };

export default function FeeConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<MembershipFee | null>(null);
  const [form, setForm] = useState<Form>({ membershipType: '', amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() { setLoading(true); setFees(await getMembershipFees()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditingFee(null); setForm({ membershipType: '', amount: '', description: '' }); setFormError(''); setShowDialog(true); }
  function openEdit(f: MembershipFee) { setEditingFee(f); setForm({ membershipType: f.membershipType, amount: f.amount.toString(), description: f.description }); setFormError(''); setShowDialog(true); }

  async function handleSave() {
    if (!form.membershipType.trim() || !form.amount.trim()) { setFormError('Membership type and amount are required.'); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { setFormError('Amount must be a positive number.'); return; }
    setSaving(true);
    try {
      await upsertMembershipFee(
        { id: editingFee?.id ?? undefined, membershipType: form.membershipType.trim(), amount, description: form.description.trim() },
        { id: user!.id, name: `${user!.firstName} ${user!.lastName}` }
      );
      setShowDialog(false);
      load();
    } catch { setFormError('Failed to save.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white p-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-bold text-white">Fee Configuration</h1>
        </div>
        <button onClick={openNew} className="flex items-center gap-1 bg-[#c8a951] text-[#1a3a5c] text-sm font-semibold px-3 py-1.5 rounded-xl">
          <Plus size={16} /> Add
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {loading ? [1,2].map((i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />) :
         fees.length === 0 ? <p className="text-center text-gray-400 mt-12">No fee types configured.</p> :
         fees.map((f) => (
          <div key={f.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-800">{f.membershipType}</p>
              {f.description && <p className="text-sm text-gray-500">{f.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-lg font-bold text-[#1a3a5c]">${f.amount.toFixed(2)}</p>
              <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500"><Pencil size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3 shrink-0">
            <button onClick={() => setShowDialog(false)} className="text-white p-1"><ArrowLeft size={22} /></button>
            <h2 className="text-lg font-semibold text-white">{editingFee ? 'Edit Fee' : 'New Fee Type'}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {[
              { label: 'Membership Type *', key: 'membershipType' as const, type: 'text', placeholder: 'e.g. Annual' },
              { label: 'Amount ($) *',      key: 'amount'         as const, type: 'number', placeholder: '0.00' },
              { label: 'Description',       key: 'description'    as const, type: 'text', placeholder: '' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input type={type} placeholder={placeholder} value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]" />
              </div>
            ))}
            {formError && <p className="text-red-600 text-sm">{formError}</p>}
          </div>
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex gap-3 safe-bottom bg-white">
            <button onClick={() => setShowDialog(false)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
