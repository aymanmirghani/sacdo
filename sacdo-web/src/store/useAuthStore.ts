import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  biometricLocked: boolean;
  pendingEnrollmentUser: User | null; // waiting for biometric enrollment decision
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setBiometricLocked: (locked: boolean) => void;
  setPendingEnrollmentUser: (user: User | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  biometricLocked: false,
  pendingEnrollmentUser: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setBiometricLocked: (locked) => set({ biometricLocked: locked }),
  setPendingEnrollmentUser: (user) => set({ pendingEnrollmentUser: user }),
  clear: () => set({ user: null, loading: false, biometricLocked: false, pendingEnrollmentUser: null }),
}));
