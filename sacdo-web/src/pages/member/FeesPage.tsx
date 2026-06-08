import { useEffect, useState } from 'react';
import { getMembershipFees, getMemberPayments } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';
import type { MembershipFee, Payment } from '../../types';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function MemberFeesPage() {
  const { user } = useAuthStore();
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMembershipFees(), getMemberPayments(user!.id)]).then(([f, p]) => {
      setFees(f);
      setPayments(p);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Membership Fees</h1>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Fee schedule */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Fee Schedule</h2>
          {loading ? (
            [1, 2].map((i) => <div key={i} className="bg-white rounded-xl p-4 mb-2 animate-pulse h-16" />)
          ) : fees.length === 0 ? (
            <p className="text-gray-400 text-sm">No fees configured.</p>
          ) : (
            fees.map((fee) => (
              <div key={fee.id} className="bg-white rounded-xl p-4 mb-2 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{fee.membershipType}</p>
                    {fee.description && <p className="text-sm text-gray-500">{fee.description}</p>}
                  </div>
                  <p className="text-lg font-bold text-[#1a3a5c]">{fmt(fee.amount)}</p>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Payment history */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">My Payment History</h2>
          {loading ? (
            [1, 2].map((i) => <div key={i} className="bg-white rounded-xl p-4 mb-2 animate-pulse h-16" />)
          ) : payments.length === 0 ? (
            <p className="text-gray-400 text-sm">No payments recorded.</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 mb-2 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{p.membershipType}</p>
                    <p className="text-sm text-gray-500">
                      {p.paymentDate?.toLocaleDateString()}
                      {p.paymentType ? ` · ${p.paymentType}` : ''}
                    </p>
                    {p.notes && <p className="text-xs text-gray-400">{p.notes}</p>}
                  </div>
                  <p className="text-base font-bold text-gray-700">{fmt(p.amount)}</p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
