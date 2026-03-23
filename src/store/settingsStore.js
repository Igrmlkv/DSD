import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import i18n from '../i18n';
import { MAP_PROVIDER, PRINT_FORM_TYPE } from '../constants/config';

const STORAGE_KEY = 'app_settings';

const useSettingsStore = create((set, get) => ({
  mapProvider: MAP_PROVIDER.YANDEX, // 'yandex' | 'osm'
  language: 'ru', // 'ru' | 'en'
  printFormType: PRINT_FORM_TYPE.UPD, // 'upd' | 'invoice'
  hideEmptyProducts: true,        // feature flag — скрывать тару в заказах
  gpsTrackingEnabled: false,     // feature flag — GPS-трекинг
  gpsTrackingInterval: 30,       // секунды
  gpsTrackingDistance: 50,        // метры
  companyInfo: {
    legalName: 'ООО "МСП Напитки"',
    address: '127040, Российская Федерация, г. Москва, ул. Скаковая, д. 32, стр. 2',
    inn: '7714487086',
    kpp: '7714000000',
    directorName: '',
    accountantName: '',
  },
  serverSyncEnabled: false,
  apiBaseUrl: '',
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

  _persist: async () => {
    try {
      const { mapProvider, language, printFormType, companyInfo, hideEmptyProducts, gpsTrackingEnabled, gpsTrackingInterval, gpsTrackingDistance, serverSyncEnabled, apiBaseUrl } = get();
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ mapProvider, language, printFormType, companyInfo, hideEmptyProducts, gpsTrackingEnabled, gpsTrackingInterval, gpsTrackingDistance, serverSyncEnabled, apiBaseUrl }));
    } catch (e) {
      console.error('Settings save error:', e);
    }
  },

  setMapProvider: async (provider) => {
    set({ mapProvider: provider });
    await get()._persist();
  },

  setLanguage: async (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
    await get()._persist();
  },

  setPrintFormType: async (type) => {
    set({ printFormType: type });
    await get()._persist();
  },

  setCompanyInfo: async (info) => {
    set({ companyInfo: { ...get().companyInfo, ...info } });
    await get()._persist();
  },

  setHideEmptyProducts: async (val) => {
    set({ hideEmptyProducts: val });
    await get()._persist();
  },

  setGpsTrackingEnabled: async (enabled) => {
    set({ gpsTrackingEnabled: enabled });
    await get()._persist();
  },

  setGpsTrackingInterval: async (sec) => {
    set({ gpsTrackingInterval: sec });
    await get()._persist();
  },

  setGpsTrackingDistance: async (m) => {
    set({ gpsTrackingDistance: m });
    await get()._persist();
  },

  setServerSyncEnabled: async (val) => {
    set({ serverSyncEnabled: val });
    await get()._persist();
  },

  setApiBaseUrl: async (url) => {
    set({ apiBaseUrl: url });
    await get()._persist();
  },
}));

export default useSettingsStore;
