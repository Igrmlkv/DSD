import useSettingsStore from '../store/settingsStore';

export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:8000' : 'https://dsd-mw.example.com',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    SYNC_PULL: '/api/sync/pull',
    SYNC_PUSH: '/api/sync/push',
    SYNC_STATUS: '/api/sync/status',
    SYNC_RESET_WATERMARKS: '/api/sync/watermarks',
    HEALTH: '/api/health',
  },
  TIMEOUTS: { DEFAULT: 30000, SYNC_PULL: 60000, SYNC_PUSH: 60000 },
  SYNC: {
    PAGE_SIZE: 500,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 2000,
    RETRY_MULTIPLIER: 2,
    AUTO_SYNC_INTERVAL_MS: 15 * 60 * 1000,
  },
};

export function getBaseUrl() {
  const { apiBaseUrl } = useSettingsStore.getState();
  return apiBaseUrl || API_CONFIG.BASE_URL;
}
