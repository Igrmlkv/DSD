import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import i18n from '../i18n';
import { MAP_PROVIDER, PRINT_FORM_TYPE } from '../constants/config';
import {
  ML_MODES, KPI_ENGINE_MODES,
  DEFAULT_QG_THRESHOLDS, DEFAULT_GEOFENCE_RADIUS_M, DEFAULT_PHOTO_MAX_LONG_EDGE,
} from '../constants/merchAudit';

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
  // Merchandising Audit (spec §11) — feature flags + module config.
  merchandisingEnabled: false,
  merchandisingMlMode: ML_MODES.SURVEY,
  kpiEngineMode: KPI_ENGINE_MODES.SERVER_ONLY,
  geofenceRadiusM: DEFAULT_GEOFENCE_RADIUS_M,
  qgThresholds: { ...DEFAULT_QG_THRESHOLDS },
  photoMaxLongEdgeUpload: DEFAULT_PHOTO_MAX_LONG_EDGE,
  // Dev/simulator-only: bypass geofence + camera checks; allow gallery-pick instead of camera capture.
  // Must never be enabled on real merchandiser devices in production.
  merchTestBypass: false,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.language) {
          i18n.changeLanguage(parsed.language);
        }
        // Reset server connection settings
        parsed.serverSyncEnabled = false;
        parsed.apiBaseUrl = '';
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
      const {
        mapProvider, language, printFormType, companyInfo,
        hideEmptyProducts, gpsTrackingEnabled, gpsTrackingInterval, gpsTrackingDistance,
        serverSyncEnabled, apiBaseUrl,
        merchandisingEnabled, merchandisingMlMode, kpiEngineMode,
        geofenceRadiusM, qgThresholds, photoMaxLongEdgeUpload, merchTestBypass,
      } = get();
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({
        mapProvider, language, printFormType, companyInfo,
        hideEmptyProducts, gpsTrackingEnabled, gpsTrackingInterval, gpsTrackingDistance,
        serverSyncEnabled, apiBaseUrl,
        merchandisingEnabled, merchandisingMlMode, kpiEngineMode,
        geofenceRadiusM, qgThresholds, photoMaxLongEdgeUpload, merchTestBypass,
      }));
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

  // --- Merchandising Audit setters (spec §11) ---

  setMerchandisingEnabled: async (enabled) => {
    set({ merchandisingEnabled: !!enabled });
    await get()._persist();
  },

  setMerchandisingMlMode: async (mode) => {
    if (![ML_MODES.SURVEY, ML_MODES.TRAX, ML_MODES.CV].includes(mode)) return;
    set({ merchandisingMlMode: mode });
    await get()._persist();
  },

  setKpiEngineMode: async (mode) => {
    if (![KPI_ENGINE_MODES.SERVER_ONLY, KPI_ENGINE_MODES.DUAL].includes(mode)) return;
    set({ kpiEngineMode: mode });
    await get()._persist();
  },

  setGeofenceRadiusM: async (m) => {
    const v = Number(m);
    if (!Number.isFinite(v) || v <= 0) return;
    set({ geofenceRadiusM: Math.round(v) });
    await get()._persist();
  },

  setQgThresholds: async (patch) => {
    const merged = { ...get().qgThresholds, ...(patch || {}) };
    set({ qgThresholds: merged });
    await get()._persist();
  },

  setPhotoMaxLongEdgeUpload: async (px) => {
    const v = Number(px);
    if (!Number.isFinite(v) || v < 512) return;
    set({ photoMaxLongEdgeUpload: Math.round(v) });
    await get()._persist();
  },

  setMerchTestBypass: async (val) => {
    set({ merchTestBypass: !!val });
    await get()._persist();
  },
}));

export default useSettingsStore;
