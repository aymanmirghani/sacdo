import { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getMemberInvoices,
  updateAutoPayPreference,
  createPaymentIntent,
  createSetupIntent,
} from '../../services/invoices';
import PaymentModal from '../../components/PaymentModal';
import type { Invoice } from '../../types';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  paid:     'bg-green-100 text-green-800',
  overdue:  'bg-red-100 text-red-800',
};

interface PaymentState {
  clientSecret: string;
  mode: 'payment' | 'setup';
  invoiceId: string;
}

export default function MemberInvoicesPage() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [actionId, setActionId] = useState<string | null>(null); // invoice being acted on

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await getMemberInvoices(user!.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handlePayNow(invoice: Invoice) {
    setActionId(invoice.id);
    try {
      const { clientSecret } = await createPaymentIntent(invoice.id);
      setPayment({ clientSecret, mode: 'payment', invoiceId: invoice.id });
    } catch {
      alert('Failed to start payment. Please try again.');
    } finally {
      setActionId(null);
    }
  }

  async function handleToggleAutoPay(invoice: Invoice) {
    const next = !invoice.autoPayEnabled;
    setActionId(invoice.id);
    try {
      if (next && !user?.stripePaymentMethodId) {
        // No saved card — set up one first
        const { setupIntentClientSecret } = await createSetupIntent();
        setPayment({ clientSecret: setupIntentClientSecret, mode: 'setup', invoiceId: invoice.id });
      } else {
        await updateAutoPayPreference(invoice.id, next);
        setInvoices((prev) =>
          prev.map((inv) => inv.id === invoice.id ? { ...inv, autoPayEnabled: next } : inv)
        );
      }
    } catch {
      alert('Failed to update auto-pay preference.');
    } finally {
      setActionId(null);
    }
  }

  async function handlePaymentSuccess() {
    setPayment(null);
    if (payment?.mode === 'setup') {
      // Card saved — now enable auto-pay on the invoice
      await updateAutoPayPreference(payment.invoiceId, true);
      setInvoices((prev) =>
        prev.map((inv) => inv.id === payment.invoiceId ? { ...inv, autoPayEnabled: true } : inv)
      );
    } else {
      await load();
    }
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Invoices</h1>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-32" />
          ))
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No invoices found.</p>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice.id} className="bg-white rounded-xl p-4 shadow-sm">
              {/* Header row */}
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-gray-800">{invoice.period}</p>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_STYLES[invoice.status])}>
                  {invoice.status.toUpperCase()}
                </span>
              </div>

              {/* Amount */}
              <p className="text-xl font-extrabold text-gray-900 mb-1">
                {fmt(invoice.amount)}
              </p>
              {invoice.pastDueAmount > 0 && (
                <div className="flex gap-4 text-xs text-red-600 mb-2">
                  <span>Current: {fmt(invoice.baseAmount)}</span>
                  <span>Past Due: {fmt(invoice.pastDueAmount)}</span>
                </div>
              )}

              {/* Dates */}
              <p className="text-xs text-gray-400">
                Invoiced {invoice.invoiceDate?.toLocaleDateString()} · Due {invoice.dueDate?.toLocaleDateString()}
              </p>
              {invoice.status === 'paid' && invoice.paidDate && (
                <p className="text-xs text-green-600 mt-1">
                  Paid {invoice.paidDate.toLocaleDateString()}
                  {invoice.paymentMethod ? ` via ${invoice.paymentMethod}` : ''}
                </p>
              )}

              {/* Actions for unpaid invoices */}
              {invoice.status !== 'paid' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  {/* AutoPay toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Auto Pay</span>
                    <button
                      onClick={() => handleToggleAutoPay(invoice)}
                      disabled={actionId !== null}
                      className={clsx(
                        'relative w-10 h-6 rounded-full transition-colors disabled:opacity-50',
                        invoice.autoPayEnabled ? 'bg-[#1a3a5c]' : 'bg-gray-300'
                      )}
                    >
                      <span className={clsx(
                        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        invoice.autoPayEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>

                  {/* Pay Now */}
                  <button
                    onClick={() => handlePayNow(invoice)}
                    disabled={actionId !== null}
                    className="px-4 py-2 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {actionId === invoice.id ? 'Loading…' : 'Pay Now'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Stripe payment modal */}
      {payment && (
        <PaymentModal
          clientSecret={payment.clientSecret}
          mode={payment.mode}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPayment(null)}
        />
      )}
    </div>
  );
}
