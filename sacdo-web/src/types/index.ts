export type UserRole = 'Member';
export type UserStatus = 'active' | 'inactive';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue';
export type InvoiceFilter =
  | 'generatedThisMonth'
  | 'generatedLastMonth'
  | 'pending'
  | 'overdue'
  | 'paidThisMonth'
  | 'paidLastMonth';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
  status: UserStatus;
  createdAt: Date;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
}

export interface RegistrationRequest {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  status: RegistrationStatus;
  rejectionReason?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface MembershipFee {
  id: string;
  membershipType: string;
  amount: number;
  description: string;
  updatedAt: Date;
}

export interface PaymentType {
  id: string;
  name: string;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName?: string;
  amount: number;
  paymentDate: Date;
  recordedBy: string;
  membershipType: string;
  paymentType?: string;
  notes?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  createdBy: string;
}

export interface Invoice {
  id: string;
  memberId: string;
  memberName: string;
  baseAmount: number;
  pastDueAmount: number; // always 0 on invoices generated after Oct 2026
  amount: number; // the period's fee only — prior balances are not rolled in
  period: string; // 'YYYY-MM'
  invoiceDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  paidDate?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  autoPayEnabled?: boolean;
  stripePaymentIntentId?: string;
  generatedBy?: string;
  processedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  collection: string;
  itemId?: string;
  itemDescription?: string;
  changes: Array<{ field: string; oldValue: string | number | null; newValue: string | number | null }>;
  timestamp: Date;
}

export interface InvoiceConfig {
  generationDay: number;
  dueDay: number;
  membershipType: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface DashboardStats {
  activeMembersCount: number;
  invoicesThisMonth: number;
  invoicesLastMonth: number;
  pendingInvoicesCount: number;
  overdueInvoicesCount: number;
  paidThisMonthCount: number;
  paidLastMonthCount: number;
}
