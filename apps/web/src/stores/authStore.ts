import { create } from 'zustand';
import { UserRole, UserDto, LoginInput } from '@pharmacy/shared';
import { apiFetch } from '../lib/api';

export const DEMO_USERS: Record<UserRole, UserDto> = {
  [UserRole.ADMIN]: {
    id: 'demo-admin-id',
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@pharmacare.pk',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  [UserRole.PHARMACIST]: {
    id: 'demo-pharma-id',
    username: 'pharmacist',
    fullName: 'Dr. Tariq Khan (Pharmacist)',
    email: 'pharmacist@pharmacare.pk',
    role: UserRole.PHARMACIST,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  [UserRole.CASHIER]: {
    id: 'demo-cashier-id',
    username: 'cashier',
    fullName: 'Bilal Cashier (POS 1)',
    email: 'cashier@pharmacare.pk',
    role: UserRole.CASHIER,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  [UserRole.INVENTORY]: {
    id: 'demo-inventory-id',
    username: 'inventory',
    fullName: 'Kamran (Inventory Manager)',
    email: 'inventory@pharmacare.pk',
    role: UserRole.INVENTORY,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  [UserRole.ACCOUNTANT]: {
    id: 'demo-accountant-id',
    username: 'accountant',
    fullName: 'Sajid (Head Accountant)',
    email: 'accountant@pharmacare.pk',
    role: UserRole.ACCOUNTANT,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

interface AuthState {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginInput) => Promise<boolean>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize with stored state or default Admin demo user
  const storedToken = localStorage.getItem('pharma_token');
  const storedUserJson = localStorage.getItem('pharma_user');
  let initialUser: UserDto | null = null;

  if (storedUserJson) {
    try {
      initialUser = JSON.parse(storedUserJson);
    } catch {
      initialUser = null;
    }
  }

  // If no user is logged in, default to Admin for immediate Phase 0 demonstration
  if (!initialUser) {
    initialUser = DEMO_USERS[UserRole.ADMIN];
  }

  return {
    user: initialUser,
    token: storedToken || 'mock-dev-token',
    isLoading: false,
    error: null,

    login: async (credentials: LoginInput) => {
      set({ isLoading: true, error: null });
      try {
        const res = await apiFetch<{ success: boolean; data: { token: string; user: UserDto } }>(
          '/api/auth/login',
          {
            method: 'POST',
            body: JSON.stringify(credentials),
          }
        );

        if (res.success && res.data) {
          localStorage.setItem('pharma_token', res.data.token);
          localStorage.setItem('pharma_user', JSON.stringify(res.data.user));
          set({ user: res.data.user, token: res.data.token, isLoading: false });
          return true;
        }
        throw new Error('Login failed');
      } catch (err: any) {
        // Fallback to match demo users if API server is not yet connected
        const foundRole = Object.values(UserRole).find(
          (r) => r.toLowerCase() === credentials.username.toLowerCase()
        );
        if (foundRole) {
          const demoUser = DEMO_USERS[foundRole];
          localStorage.setItem('pharma_token', 'demo-token');
          localStorage.setItem('pharma_user', JSON.stringify(demoUser));
          set({ user: demoUser, token: 'demo-token', isLoading: false });
          return true;
        }

        set({
          error: err.message || 'Invalid credentials or API server unavailable',
          isLoading: false,
        });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem('pharma_token');
      localStorage.removeItem('pharma_user');
      set({ user: null, token: null, error: null });
    },

    switchDemoRole: (role: UserRole) => {
      const demoUser = DEMO_USERS[role];
      localStorage.setItem('pharma_token', `demo-${role.toLowerCase()}-token`);
      localStorage.setItem('pharma_user', JSON.stringify(demoUser));
      set({ user: demoUser, token: `demo-${role.toLowerCase()}-token`, error: null });
    },

    clearError: () => set({ error: null }),

    checkAuth: async () => {
      const token = localStorage.getItem('pharma_token');
      if (!token || token.startsWith('demo-')) return;
      try {
        const res = await apiFetch<{ success: boolean; data: UserDto }>('/api/auth/me');
        if (res.success && res.data) {
          set({ user: res.data });
        }
      } catch {
        // Keep existing demo or stored state
      }
    },
  };
});
