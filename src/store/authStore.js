import { create } from 'zustand';
import * as authService from '../services/authService';
import { getUserData, getAccessToken } from '../services/secureStorage';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    const result = await authService.login(username, password);
    set({
      user: result.user,
      isAuthenticated: true,
    });
    return result;
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  restoreSession: async () => {
    try {
      const token = await getAccessToken();
      const userData = await getUserData();
      if (token && userData) {
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;
