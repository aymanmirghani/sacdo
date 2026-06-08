import { useEffect, useState } from 'react';
import { getPendingRequests, approveRegistration, rejectRegistration } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';
import type { RegistrationRequest } from '../../types';

export default function AdminRequestsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  async function load() {
    setLoading(true);
    try { setRequests(await getPendingRequests()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await approveRegistration(id, user!.id);
      setRequests((p) => p.filter((r) => r.id !== id));
    } catch { alert('Failed to approve request.'); }
    finally { setActionId(null); }
  }

  function openReject(id: string) {
    setReason('');
    setReasonError('');
    setRejectTarget(id);
  }

  async function handleReject() {
    if (!reason.trim()) { setReasonError('Please enter a reason.'); return; }
    const id = rejectTarget!;
    setRejectTarget(null);
    setActionId(id);
    try {
      await rejectRegistration(id, user!.id, reason.trim());
      setRequests((p) => p.filter((r) => r.id !== id));
    } catch { alert('Failed to reject request.'); }
    finally { setActionId(null); }
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Registration Requests</h1>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2].map((i) => <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />)
        ) : requests.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No pending requests.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-semibold text-gray-800">{r.firstName} {r.lastName}</p>
              <p className="text-sm text-gray-500">{r.phone}</p>
              <p className="text-sm text-gray-500">{r.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                Submitted {r.submittedAt?.toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleApprove(r.id)}
                  disabled={actionId !== null}
                  className="flex-1 py-2 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {actionId === r.id ? 'Processing…' : 'Approve'}
                </button>
                <button
                  onClick={() => openReject(r.id)}
                  disabled={actionId !== null}
                  className="flex-1 py-2 rounded-xl border border-red-400 text-red-600 text-sm font-semibold disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Reject Request</h2>
            <label className="block text-sm text-gray-600 mb-1">Reason for rejection</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] resize-none"
            />
            {reasonError && <p className="text-red-600 text-xs mt-1">{reasonError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRejectTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
              <button onClick={handleReject} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
