import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  biometricLocked: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setBiometricLocked: (locked: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  biometricLocked: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setBiometricLocked: (locked) => set({ biometricLocked: locked }),
  clear: () => set({ user: null, loading: false, biometricLocked: false }),
}));
