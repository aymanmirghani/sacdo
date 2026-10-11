import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FilePlus } from 'lucide-react';
import { getAllInvoicesForMember, markInvoicePaid, generateInvoicesOnDemand, getCurrentPeriod } from '../../services/invoices';
import { getPaymentTypes } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';
import PeriodSelect from '../../components/PeriodSelect';
import type { Invoice } from '../../types';
import clsx from 'clsx';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid:    'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
};

export default function AdminMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Mark as paid dialog
  const [markTarget, setMarkTarget] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [markError, setMarkError] = useState('');

  // Generate invoice dialog
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePeriod, setGeneratePeriod] = useState(getCurrentPeriod);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');

  const memberName = invoices[0]?.memberName ?? '';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inv, pt] = await Promise.all([
        getAllInvoicesForMember(id),
        getPaymentTypes(),
      ]);
      setInvoices(inv);
      setPaymentTypes(pt.map((t) => t.name));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function openMarkPaid(invoice: Invoice) {
    setMarkTarget(invoice);
    setPayMethod(paymentTypes[0] ?? '');
    setReference('');
    setNotes('');
    setMarkError('');
  }

  async function handleMarkPaid() {
    if (!markTarget || !payMethod) { setMarkError('Please select a payment method.'); return; }
    setSaving(true);
    try {
      await markInvoicePaid(markTarget.id, {
        paymentMethod: payMethod,
        paymentReference: reference,
        notes,
        processedBy: `${user!.firstName} ${user!.lastName}`,
      });
      setMarkTarget(null);
      load();
    } catch { setMarkError('Failed to mark as paid. Please try again.'); }
    finally { setSaving(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenMsg('');
    try {
      const result = await generateInvoicesOnDemand(id, generatePeriod);
      if (result.created === 0) {
        setGenMsg(`An invoice for ${generatePeriod} already exists for this member.`);
      } else {
        setShowGenerate(false);
        load();
      }
    } catch { setGenMsg('Failed to generate invoice. Make sure invoice configuration is set up.'); }
    finally { setGenerating(false); }
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white p-1">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Invoices</h1>
            {memberName && <p className="text-blue-200 text-xs">{memberName}</p>}
          </div>
        </div>
        <button
          onClick={() => { setGenMsg(''); setGeneratePeriod(getCurrentPeriod()); setShowGenerate(true); }}
          className="flex items-center gap-1 bg-[#c8a951] text-[#1a3a5c] text-sm font-semibold px-3 py-1.5 rounded-xl"
        >
          <FilePlus size={15} /> Generate
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 pb-6">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-28 animate-pulse" />)
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No invoices found.</p>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold text-gray-800">{inv.period}</p>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_STYLES[inv.status])}>
                  {inv.status.toUpperCase()}
                </span>
              </div>

              <p className="text-xl font-extrabold text-gray-900 mb-1">{fmt(inv.amount)}</p>
              {inv.pastDueAmount > 0 && (
                <p className="text-xs text-red-600 mb-1">Includes {fmt(inv.pastDueAmount)} past due</p>
              )}

              <p className="text-xs text-gray-400">
                Invoice: {inv.invoiceDate?.toLocaleDateString()} · Due: {inv.dueDate?.toLocaleDateString()}
              </p>

              {inv.status === 'paid' && inv.paidDate && (
                <div className="mt-1 text-xs text-green-700 space-y-0.5">
                  <p>Paid {inv.paidDate.toLocaleDateString()} via {inv.paymentMethod}</p>
                  {inv.processedBy && <p>Processed by: {inv.processedBy}</p>}
                  {inv.paymentReference && <p>Ref: {inv.paymentReference}</p>}
                  {inv.notes && <p>Notes: {inv.notes}</p>}
                </div>
              )}

              {inv.status !== 'paid' && (
                <button
                  onClick={() => openMarkPaid(inv)}
                  className="mt-3 w-full py-2 rounded-xl border border-[#1a3a5c] text-[#1a3a5c] text-sm font-semibold"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Mark as Paid — full-screen modal */}
      {markTarget && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          {/* Header */}
          <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3 shrink-0">
            <button onClick={() => setMarkTarget(null)} className="text-white p-1">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">Mark as Paid</h2>
              <p className="text-blue-200 text-xs">{markTarget.period} — {fmt(markTarget.amount)}</p>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Payment Method *</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] bg-white"
              >
                {paymentTypes.length === 0
                  ? <option value="">No payment types configured</option>
                  : paymentTypes.map((pt) => <option key={pt} value={pt}>{pt}</option>)
                }
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Reference Number (optional)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] resize-none"
              />
            </div>

            {markError && <p className="text-red-600 text-sm">{markError}</p>}
          </div>

          {/* Footer — always visible */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex gap-3 safe-bottom bg-white">
            <button onClick={() => setMarkTarget(null)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">
              Cancel
            </button>
            <button onClick={handleMarkPaid} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Generate Invoice — full-screen modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          {/* Header */}
          <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3 shrink-0">
            <button onClick={() => setShowGenerate(false)} className="text-white p-1">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Invoice</h2>
              {memberName && <p className="text-blue-200 text-xs">For {memberName}</p>}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Period</label>
              <PeriodSelect
                value={generatePeriod}
                onChange={setGeneratePeriod}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] bg-white"
              />
            </div>

            {genMsg && <p className="text-sm text-amber-600">{genMsg}</p>}
          </div>

          {/* Footer — always visible */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex gap-3 safe-bottom bg-white">
            <button onClick={() => setShowGenerate(false)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">
              Cancel
            </button>
            <button onClick={handleGenerate} disabled={generating} className="flex-1 py-3 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60">
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
