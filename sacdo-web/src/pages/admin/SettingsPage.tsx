import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const items = [
  { label: 'Membership Fees', to: '/admin/settings/fees' },
  { label: 'Payment Types',   to: '/admin/settings/payment-types' },
  { label: 'Invoice Config',  to: '/admin/settings/invoice-config' },
  { label: 'Audit Log',       to: '/admin/settings/audit-log' },
];

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-[#1a3a5c] mb-4">Settings</h2>
      <div className="bg-white rounded-xl divide-y divide-gray-100">
        {items.map(({ label, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center justify-between px-4 py-4 text-left text-gray-800"
          >
            <span>{label}</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
