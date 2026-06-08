import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard, AdminGuard, GuestGuard } from '../components/AuthGuard';

import MemberLayout from '../components/layout/MemberLayout';
import AdminLayout from '../components/layout/AdminLayout';

import WelcomePage from '../pages/auth/WelcomePage';
import LoginPage from '../pages/auth/LoginPage';
import OTPPage from '../pages/auth/OTPPage';
import RegisterPage from '../pages/auth/RegisterPage';

import MemberHomePage from '../pages/member/HomePage';
import MemberEventsPage from '../pages/member/EventsPage';
import MemberFeesPage from '../pages/member/FeesPage';
import MemberInvoicesPage from '../pages/member/InvoicesPage';
import MemberProfilePage from '../pages/member/ProfilePage';

import AdminDashboardPage from '../pages/admin/DashboardPage';
import AdminRequestsPage from '../pages/admin/RequestsPage';
import AdminMembersPage from '../pages/admin/MembersPage';
import AdminMemberDetailPage from '../pages/admin/MemberDetailPage';
import AdminEventsPage from '../pages/admin/EventsPage';
import AdminSettingsPage from '../pages/admin/SettingsPage';
import InvoiceListPage from '../pages/admin/InvoiceListPage';
import FeeConfigPage from '../pages/admin/settings/FeeConfigPage';
import PaymentTypesPage from '../pages/admin/settings/PaymentTypesPage';
import InvoiceConfigPage from '../pages/admin/settings/InvoiceConfigPage';
import AuditLogPage from '../pages/admin/settings/AuditLogPage';

export const router = createBrowserRouter([
  // Guest-only auth routes
  { path: '/',         element: <GuestGuard><WelcomePage /></GuestGuard> },
  { path: '/login',    element: <GuestGuard><LoginPage /></GuestGuard> },
  { path: '/otp',      element: <GuestGuard><OTPPage /></GuestGuard> },
  { path: '/register', element: <RegisterPage /> },

  // Member routes
  {
    path: '/member',
    element: <AuthGuard><MemberLayout /></AuthGuard>,
    children: [
      { index: true,      element: <Navigate to="home" replace /> },
      { path: 'home',     element: <MemberHomePage /> },
      { path: 'events',   element: <MemberEventsPage /> },
      { path: 'fees',     element: <MemberFeesPage /> },
      { path: 'invoices', element: <MemberInvoicesPage /> },
      { path: 'profile',  element: <MemberProfilePage /> },
    ],
  },

  // Admin routes
  {
    path: '/admin',
    element: <AdminGuard><AdminLayout /></AdminGuard>,
    children: [
      { index: true,                         element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',                   element: <AdminDashboardPage /> },
      { path: 'requests',                    element: <AdminRequestsPage /> },
      { path: 'members',                     element: <AdminMembersPage /> },
      { path: 'members/:id',                 element: <AdminMemberDetailPage /> },
      { path: 'events',                      element: <AdminEventsPage /> },
      { path: 'settings',                    element: <AdminSettingsPage /> },
      { path: 'invoices/:filter',            element: <InvoiceListPage /> },
      { path: 'settings/fees',               element: <FeeConfigPage /> },
      { path: 'settings/payment-types',      element: <PaymentTypesPage /> },
      { path: 'settings/invoice-config',     element: <InvoiceConfigPage /> },
      { path: 'settings/audit-log',          element: <AuditLogPage /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
