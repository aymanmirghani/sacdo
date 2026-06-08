import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { signOut } from '../../services/auth';
import { getMemberTotalDue } from '../../services/invoices';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function MemberHomePage() {
  const { user, clear } = useAuthStore();
  const [totalDue, setTotalDue] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setTotalDue(await getMemberTotalDue(user.id));
    } catch {
      setTotalDue(null);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSignOut() {
    await signOut();
    clear();
  }

  const hasDue = totalDue !== null && totalDue > 0;

  return (
    <div className="min-h-full bg-gray-100">
      {/* Header */}
      <div className="bg-[#1a3a5c] px-4 pt-4 pb-6 safe-top">
        <p className="text-blue-200 text-sm mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold text-white">{user?.firstName} {user?.lastName}</h1>
      </div>

      <div className="px-4 -mt-3 pb-6">
        {/* Total Due card */}
        <div className={`bg-white rounded-2xl p-4 shadow-sm mb-4 border-l-4 ${hasDue ? 'border-red-600' : 'border-green-600'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${hasDue ? 'bg-red-50' : 'bg-green-50'}`}>
              {hasDue
                ? <AlertCircle size={24} className="text-red-600" />
                : <CheckCircle size={24} className="text-green-600" />}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total Due</p>
              {totalDue === null ? (
                <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <>
                  <p className={`text-2xl font-extrabold ${hasDue ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(totalDue)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {hasDue ? 'Outstanding balance' : 'All invoices paid'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Use the tabs below to view upcoming events, membership fees, and invoices.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl border border-[#1a3a5c] text-[#1a3a5c] text-sm font-medium disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
