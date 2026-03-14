import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import i18n from '../i18n';

const STORAGE_KEY = 'app_settings';

const useSettingsStore = create((set, get) => ({
  mapProvider: 'yandex', // 'yandex' | 'osm'
  language: 'ru', // 'ru' | 'en'
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.language) {
          i18n.changeLanguage(parsed.language);
        }
        set({ ...parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setMapProvider: async (provider) => {
    set({ mapProvider: provider });
    try {
      const state = get();
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({
        mapProvider: state.mapProvider,
        language: state.language,
      }));
    } catch (e) {
      console.error('Settings save error:', e);
    }
  },

  setLanguage: async (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
    try {
      const state = get();
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({
        mapProvider: state.mapProvider,
        language: lang,
      }));
    } catch (e) {
      console.error('Settings save error:', e);
    }
  },
}));

export default useSettingsStore;
