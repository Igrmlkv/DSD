import { create } from 'zustand';

const useLocationStore = create((set, get) => ({
  isTracking: false,
  currentPosition: null,       // { latitude, longitude, accuracy, speed, heading }
  permissionStatus: null,      // 'granted' | 'denied' | 'undetermined'
  routeId: null,
  driverId: null,
  trackPointsCount: 0,

  setTracking: (bool) => set({ isTracking: bool }),
  setPosition: (pos) => set({ currentPosition: pos }),
  setPermission: (status) => set({ permissionStatus: status }),
  setRoute: (routeId, driverId) => set({ routeId, driverId }),
  incrementTrackPoints: () => set((s) => ({ trackPointsCount: s.trackPointsCount + 1 })),
  reset: () => set({
    isTracking: false,
    currentPosition: null,
    routeId: null,
    driverId: null,
    trackPointsCount: 0,
  }),
}));

export default useLocationStore;
