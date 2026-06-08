import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { signOut } from '../../services/auth';
import { getDashboardStats, type DashboardStats } from '../../services/invoices';
import clsx from 'clsx';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function monthLabel(offset: 0 | -1) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleString('default', { month: 'long' });
}

interface StatCardProps {
  label: string;
  count: string;
  amount?: string;
  accentColor: string;
  iconBg: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

function StatCard({ label, count, amount, accentColor, iconBg, icon, onClick }: StatCardProps) {
  const inner = (
    <div className={clsx('bg-white rounded-xl p-4 shadow-sm border-l-4 flex items-center gap-3', `border-l-[${accentColor}]`)}
      style={{ borderLeftColor: accentColor }}>
      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-bold text-gray-800">{count}</p>
        {amount && <p className="text-xs font-semibold mt-0.5" style={{ color: accentColor }}>{amount}</p>}
      </div>
      {onClick && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
    </div>
  );
  return onClick
    ? <button onClick={onClick} className="w-full text-left">{inner}</button>
    : inner;
}

function SectionLabel({ title }: { title: string }) {
  return <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-5 mb-2 ml-1">{title}</p>;
}

function Skeleton() {
  return <div className="bg-white rounded-xl h-16 animate-pulse shadow-sm" />;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setStats(await getDashboardStats());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSignOut() {
    await signOut();
    clear();
  }

  const thisMonth = monthLabel(0);
  const lastMonth = monthLabel(-1);

  return (
    <div className="min-h-full bg-gray-100">
      {/* Header */}
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex justify-between items-center">
        <div>
          <p className="text-blue-200 text-xs">Welcome back</p>
          <h1 className="text-xl font-bold text-white">{user?.firstName} {user?.lastName}</h1>
          <p className="text-blue-200 text-xs mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={handleSignOut} className="text-white text-xs border border-white/40 px-3 py-1.5 rounded-lg">
          Sign Out
        </button>
      </div>

      <div className="p-4 pb-6">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="text-xs text-[#1a3a5c] border border-[#1a3a5c]/30 px-3 py-1 rounded-lg disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(7)].map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <>
            <SectionLabel title="Members" />
            <StatCard label="Active Members" count={String(stats?.activeMembers ?? 0)} accentColor="#1565C0" iconBg="#E3F2FD"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#1565C0"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>}
            />

            <SectionLabel title={`This Month — ${thisMonth}`} />
            <div className="flex flex-col gap-2">
              <StatCard label="Generated" count={`${stats?.thisMonth.count ?? 0} invoices`} amount={fmt(stats?.thisMonth.amount ?? 0)}
                accentColor="#546E7A" iconBg="#ECEFF1"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#546E7A"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>}
                onClick={() => navigate('/admin/invoices/generatedThisMonth', { state: { title: `Generated — ${thisMonth}` } })} />
              <StatCard label="Paid" count={`${stats?.paidThisMonth.count ?? 0} invoices`} amount={fmt(stats?.paidThisMonth.amount ?? 0)}
                accentColor="#2E7D32" iconBg="#E8F5E9"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D32"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                onClick={() => navigate('/admin/invoices/paidThisMonth', { state: { title: `Paid — ${thisMonth}` } })} />
            </div>

            <SectionLabel title={`Last Month — ${lastMonth}`} />
            <div className="flex flex-col gap-2">
              <StatCard label="Generated" count={`${stats?.lastMonth.count ?? 0} invoices`} amount={fmt(stats?.lastMonth.amount ?? 0)}
                accentColor="#546E7A" iconBg="#ECEFF1"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#546E7A"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>}
                onClick={() => navigate('/admin/invoices/generatedLastMonth', { state: { title: `Generated — ${lastMonth}` } })} />
              <StatCard label="Paid" count={`${stats?.paidLastMonth.count ?? 0} invoices`} amount={fmt(stats?.paidLastMonth.amount ?? 0)}
                accentColor="#2E7D32" iconBg="#E8F5E9"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D32"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                onClick={() => navigate('/admin/invoices/paidLastMonth', { state: { title: `Paid — ${lastMonth}` } })} />
            </div>

            <SectionLabel title="Outstanding" />
            <div className="flex flex-col gap-2">
              <StatCard label="Pending" count={`${stats?.pending.count ?? 0} invoices`} amount={fmt(stats?.pending.amount ?? 0)}
                accentColor="#E65100" iconBg="#FFF3E0"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#E65100"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>}
                onClick={() => navigate('/admin/invoices/pending', { state: { title: 'Pending Invoices' } })} />
              <StatCard label="Past Due" count={`${stats?.overdue.count ?? 0} invoices`} amount={fmt(stats?.overdue.amount ?? 0)}
                accentColor="#C62828" iconBg="#FFEBEE"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#C62828"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>}
                onClick={() => navigate('/admin/invoices/overdue', { state: { title: 'Past Due Invoices' } })} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
