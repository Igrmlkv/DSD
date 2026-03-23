import { create } from 'zustand';
import * as authService from '../services/authService';
import { getUserData, getAccessToken, saveUserData } from '../services/secureStorage';
import { ensureUserInDb } from '../database';

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

  updateVehicle: async (vehicleId, vehiclePlate, vehicleModel) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    const updatedUser = {
      ...user,
      vehicleId: vehicleId || null,
      vehiclePlate: vehiclePlate || null,
      vehicleModel: vehicleModel || null,
    };
    await saveUserData(updatedUser);
    set({ user: updatedUser });
  },

  restoreSession: async () => {
    try {
      const token = await getAccessToken();
      const userData = await getUserData();
      if (token && userData) {
        try {
          userData.id = await ensureUserInDb(userData);
        } catch (e) {
          console.warn('ensureUserInDb failed during restore:', e.message);
        }

        await authService.enrichUserWithVehicle(userData);
        if (userData.vehicleId) {
          await saveUserData(userData);
        }

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
