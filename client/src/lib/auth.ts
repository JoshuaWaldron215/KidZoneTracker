import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: string | null;
  isStaff: boolean;
  setAuth: (token: string, role: string, isStaff: boolean) => void;
  clearAuth: () => void;
  hasPermission: (requiredRoles: string[]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  isStaff: !!localStorage.getItem('isStaff'),
  
  setAuth: (token: string, role: string, isStaff: boolean) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('isStaff', String(isStaff));
    set({ token, role, isStaff });
  },
  
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('isStaff');
    set({ token: null, role: null, isStaff: false });
  },

  hasPermission: (requiredRoles: string[]) => {
    const { role } = get();
    return role ? requiredRoles.includes(role) : false;
  },
}));

export const rolePermissions = {
  admin: ['manage_staff', 'manage_rooms', 'update_occupancy'],
  supervisor: ['manage_rooms', 'update_occupancy'],
  staff: ['update_occupancy'],
};
