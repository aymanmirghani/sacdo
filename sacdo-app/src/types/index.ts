export type UserRole = 'Member' | 'Administrator';
export type UserStatus = 'active' | 'inactive';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
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

// Navigation param lists
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  OTP: { method: 'phone' | 'email'; contact: string };
  Register: undefined;
};

export type MemberTabParamList = {
  Home: undefined;
  Events: undefined;
  MembershipFees: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  RegistrationRequests: undefined;
  Members: undefined;
  Settings: undefined;
  Events: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  MemberPayments: { memberId: string; memberName: string };
  FeeConfig: undefined;
  PaymentTypes: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MemberApp: undefined;
  AdminApp: undefined;
};
