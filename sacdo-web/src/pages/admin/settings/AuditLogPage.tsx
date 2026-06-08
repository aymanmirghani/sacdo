import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getAuditLog } from '../../../services/audit';
import type { AuditLogEntry } from '../../../types';

const ACTION_LABELS: Record<string, string> = {
  fee_created:             'Fee Created',
  fee_updated:             'Fee Updated',
  payment_type_created:    'Payment Type Created',
  payment_type_updated:    'Payment Type Updated',
  payment_type_deleted:    'Payment Type Deleted',
  invoice_config_updated:  'Invoice Config Updated',
};

const ACTION_COLORS: Record<string, string> = {
  fee_created:            'bg-green-100 text-green-800',
  fee_updated:            'bg-yellow-100 text-yellow-800',
  payment_type_created:   'bg-green-100 text-green-800',
  payment_type_updated:   'bg-yellow-100 text-yellow-800',
  payment_type_deleted:   'bg-red-100 text-red-800',
  invoice_config_updated: 'bg-blue-100 text-blue-800',
};

function fmtVal(v: string | number | null) {
  return v === null || v === undefined ? '—' : String(v);
}

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog(200).then((data) => { setEntries(data); setLoading(false); });
  }, []);

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white p-1"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold text-white">Audit Log</h1>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1,2,3].map((i) => <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />)
        ) : entries.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No audit log entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-xs text-gray-400">
                  {entry.timestamp?.toLocaleDateString()} {entry.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1"><span className="font-medium">Admin:</span> {entry.adminName}</p>
              {entry.itemDescription && (
                <p className="text-xs text-gray-500 mb-2"><span className="font-medium">Item:</span> {entry.itemDescription}</p>
              )}
              {entry.changes.map((c, i) => (
                <div key={i} className="mt-1.5 pt-1.5 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 capitalize mb-1">{c.field}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.oldValue !== null && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">{fmtVal(c.oldValue)}</span>}
                    {c.oldValue !== null && c.newValue !== null && <span className="text-xs text-gray-400">→</span>}
                    {c.newValue !== null && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{fmtVal(c.newValue)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
