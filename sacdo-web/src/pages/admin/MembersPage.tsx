import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText } from 'lucide-react';
import { getAllMembers, updateMember } from '../../services/members';
import type { User } from '../../types';
import clsx from 'clsx';

type EditForm = { firstName: string; lastName: string; phone: string; email: string; isAdmin: boolean; status: 'active' | 'inactive' };

export default function AdminMembersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<EditForm>({ firstName: '', lastName: '', phone: '', email: '', isAdmin: false, status: 'active' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    try { setMembers(await getAllMembers()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q)
    );
  });

  function openEdit(m: User) {
    setForm({ firstName: m.firstName, lastName: m.lastName, phone: m.phone, email: m.email, isAdmin: m.isAdmin, status: m.status });
    setFormError('');
    setEditing(m);
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.email.trim()) {
      setFormError('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      await updateMember(editing!.id, form);
      setEditing(null);
      load();
    } catch { setFormError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Members</h1>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">{search ? 'No members match your search.' : 'No members found.'}</p>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-gray-800">{m.firstName} {m.lastName}</p>
                <div className="flex gap-1 flex-wrap justify-end">
                  {m.isAdmin && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Admin</span>}
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full', m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {m.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500">{m.phone}</p>
              <p className="text-sm text-gray-500">{m.email}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(m)} className="flex-1 py-1.5 rounded-xl border border-[#1a3a5c] text-[#1a3a5c] text-sm font-medium">Edit</button>
                <button onClick={() => navigate(`/admin/members/${m.id}`)} className="flex-1 py-1.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium flex items-center justify-center gap-1">
                  <FileText size={14} /> Invoices
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Member — full-screen modal */}
      {editing && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          {/* Header */}
          <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3 shrink-0">
            <button onClick={() => setEditing(null)} className="text-white p-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">Edit Member</h2>
              <p className="text-blue-200 text-xs">{editing.firstName} {editing.lastName}</p>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {[
              { label: 'First Name', key: 'firstName' as const, type: 'text' },
              { label: 'Last Name',  key: 'lastName'  as const, type: 'text' },
              { label: 'Phone',      key: 'phone'     as const, type: 'tel' },
              { label: 'Email',      key: 'email'     as const, type: 'email' },
            ].map(({ label, key, type }) => (
              <div key={key} className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input type={type} value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                />
              </div>
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-100">
              <span className="text-sm text-gray-700">Administrator</span>
              <button onClick={() => setForm({ ...form, isAdmin: !form.isAdmin })}
                className={clsx('relative w-10 h-6 rounded-full transition-colors', form.isAdmin ? 'bg-[#1a3a5c]' : 'bg-gray-300')}>
                <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', form.isAdmin ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </div>
            <div className="flex justify-between items-center py-3 border-t border-gray-100">
              <span className="text-sm text-gray-700">Active</span>
              <button onClick={() => setForm({ ...form, status: form.status === 'active' ? 'inactive' : 'active' })}
                className={clsx('relative w-10 h-6 rounded-full transition-colors', form.status === 'active' ? 'bg-[#1a3a5c]' : 'bg-gray-300')}>
                <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', form.status === 'active' ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </div>
            {formError && <p className="text-red-600 text-sm mt-3">{formError}</p>}
          </div>

          {/* Footer — always visible */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex gap-3 safe-bottom bg-white">
            <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#1a3a5c] text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
