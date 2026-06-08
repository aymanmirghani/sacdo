import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getInvoicesByFilter } from '../../services/invoices';
import type { Invoice } from '../../types';
import clsx from 'clsx';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid:    'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
};

export default function InvoiceListPage() {
  const { filter = '' } = useParams<{ filter: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const title = (location.state as { title?: string })?.title ?? 'Invoices';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoicesByFilter(filter);
      data.sort((a, b) => (b.invoiceDate?.getTime() ?? 0) - (a.invoiceDate?.getTime() ?? 0));
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const total = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>

      {/* Summary bar */}
      {!loading && invoices.length > 0 && (
        <div className="bg-white px-4 py-2.5 border-b border-gray-100">
          <p className="text-sm text-gray-500 font-medium">
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} · {fmt(total)}
          </p>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No invoices found.</p>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-gray-800 flex-1 mr-2">{inv.memberName}</p>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', STATUS_STYLES[inv.status])}>
                  {inv.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm text-gray-400">{inv.period}</p>
                <p className="text-base font-bold text-gray-800">{fmt(inv.amount)}</p>
              </div>
              {inv.pastDueAmount > 0 && (
                <p className="text-xs text-red-600 mb-1">Includes {fmt(inv.pastDueAmount)} past due</p>
              )}
              <p className="text-xs text-gray-400">Due: {inv.dueDate?.toLocaleDateString()}</p>
              {inv.status === 'paid' && inv.paidDate && (
                <div className="text-xs text-green-700 mt-1">
                  <p>Paid {inv.paidDate.toLocaleDateString()} via {inv.paymentMethod}</p>
                  {inv.processedBy && <p>Processed by: {inv.processedBy}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
