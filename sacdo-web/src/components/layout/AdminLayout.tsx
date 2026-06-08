import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Users, Calendar, Settings } from 'lucide-react';
import clsx from 'clsx';

const tabs = [
  { to: '/admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/requests',   icon: UserCheck,       label: 'Requests' },
  { to: '/admin/members',    icon: Users,           label: 'Members' },
  { to: '/admin/events',     icon: Calendar,        label: 'Events' },
  { to: '/admin/settings',   icon: Settings,        label: 'Settings' },
];

export default function AdminLayout() {
  return (
    <div className="flex flex-col min-h-svh bg-gray-100">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
        <div className="flex">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors',
                  isActive ? 'text-[#1a3a5c]' : 'text-gray-400'
                )
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
