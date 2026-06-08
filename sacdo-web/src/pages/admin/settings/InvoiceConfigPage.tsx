import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getMembershipFees } from '../../../services/members';
import { getInvoiceConfig, saveInvoiceConfig, generateInvoicesOnDemand } from '../../../services/invoices';
import { useAuthStore } from '../../../store/useAuthStore';

function getPeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

const PERIOD_OPTIONS = getPeriodOptions();

export default function InvoiceConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [form, setForm] = useState({ generationDay: '1', dueDay: '15', membershipType: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [genMsg, setGenMsg] = useState('');
  const [genError, setGenError] = useState('');
  const [confirmGen, setConfirmGen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [config, fees] = await Promise.all([getInvoiceConfig(), getMembershipFees()]);
        const types = fees.map((f) => f.membershipType);
        setFeeTypes(types);
        if (config) {
          setForm({ generationDay: String(config.generationDay), dueDay: String(config.dueDay), membershipType: config.membershipType });
        } else if (types.length > 0) {
          setForm((p) => ({ ...p, membershipType: types[0] }));
        }
      } finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleSave() {
    setSaveMsg(''); setSaveError('');
    const genDay = parseInt(form.generationDay, 10);
    const dueDay = parseInt(form.dueDay, 10);
    if (isNaN(genDay) || genDay < 1 || genDay > 28) { setSaveError('Generation day must be 1–28.'); return; }
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 28) { setSaveError('Due day must be 1–28.'); return; }
    if (!form.membershipType) { setSaveError('Please select a membership type.'); return; }
    setSaving(true);
    try {
      await saveInvoiceConfig({ generationDay: genDay, dueDay, membershipType: form.membershipType }, { id: user!.id, name: `${user!.firstName} ${user!.lastName}` });
      setSaveMsg('Configuration saved.');
    } catch { setSaveError('Failed to save.'); }
    finally { setSaving(false); }
  }

  async function handleGenerate() {
    setConfirmGen(false);
    setGenMsg(''); setGenError('');
    setGenerating(true);
    try {
      const result = await generateInvoicesOnDemand(undefined, selectedPeriod);
      setGenMsg(`${result.created} invoice(s) generated for ${selectedPeriod}.`);
    } catch { setGenError('Failed to generate invoices. Make sure configuration is saved first.'); }
    finally { setGenerating(false); }
  }

  if (loading) return <div className="min-h-full bg-gray-100 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#1a3a5c] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white p-1"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold text-white">Invoice Configuration</h1>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Schedule */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Schedule</h2>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Generation Day of Month (1–28)</label>
            <input type="number" min={1} max={28} value={form.generationDay}
              onChange={(e) => setForm({ ...form, generationDay: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]" />
            <p className="text-xs text-gray-400 mt-1">Invoices are automatically generated on this day each month.</p>
          </div>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Due Day of Month (1–28)</label>
            <input type="number" min={1} max={28} value={form.dueDay}
              onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Membership Type for Invoices</label>
            <select value={form.membershipType} onChange={(e) => setForm({ ...form, membershipType: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] bg-white">
              {feeTypes.length === 0
                ? <option value="">No fee types configured</option>
                : feeTypes.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
            </select>
          </div>
          {saveError && <p className="text-red-600 text-sm mb-2">{saveError}</p>}
          {saveMsg && <p className="text-green-600 text-sm mb-2">{saveMsg}</p>}
          <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl bg-[#1a3a5c] text-white font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>

        {/* Generate now */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1">Generate Invoices Now</h2>
          <p className="text-xs text-gray-400 mb-4">Members who already have an invoice for the selected period will be skipped.</p>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Period</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] bg-white">
              {PERIOD_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {genError && <p className="text-red-600 text-sm mb-2">{genError}</p>}
          {genMsg && <p className="text-green-600 text-sm mb-2">{genMsg}</p>}
          <button onClick={() => setConfirmGen(true)} disabled={generating} className="w-full py-3 rounded-xl border border-[#1a3a5c] text-[#1a3a5c] font-semibold disabled:opacity-60">
            {generating ? 'Generating…' : 'Generate for All Members'}
          </button>
        </div>
      </div>

      {/* Confirm generate */}
      {confirmGen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Generate Invoices</h2>
            <p className="text-sm text-gray-500 mb-5">Generate invoices for {selectedPeriod} for all active members who don't already have one?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmGen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
              <button onClick={handleGenerate} className="flex-1 py-2.5 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold">Generate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
