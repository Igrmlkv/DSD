import { saveTokens, saveUserData, clearAll, getDeviceId } from './secureStorage';
import { apiRequest } from './apiClient';
import { API_CONFIG, getBaseUrl } from '../constants/api';
import useSettingsStore from '../store/settingsStore';
import { LOGIN_MOCK_DELAY_MS } from '../constants/config';
import { ensureUserInDb, getVehicleByDriver } from '../database';

// 4 тестовых аккаунта согласно DSD_Mobile_App.md v1.1
// 3 роли: expeditor, supervisor, admin
const MOCK_USERS = {
  volkov: {
    password: '1',
    user: {
      id: 'usr-001',
      username: 'volkov',
      fullName: 'Волков Сергей Михайлович',
      role: 'expeditor',
      phone: '+79161234567',
    },
  },
  morozov: {
    password: '1',
    user: {
      id: 'usr-003',
      username: 'morozov',
      fullName: 'Морозов Андрей Павлович',
      role: 'expeditor',
      phone: '+79031112233',
    },
  },
  kuznetsova: {
    password: '1',
    user: {
      id: 'usr-004',
      username: 'kuznetsova',
      fullName: 'Кузнецова Марина Олеговна',
      role: 'supervisor',
      phone: '+79057778899',
    },
  },
  lebedev: {
    password: '1',
    user: {
      id: 'usr-005',
      username: 'lebedev',
      fullName: 'Лебедев Денис Игоревич',
      role: 'preseller',
      phone: '+79261234500',
    },
  },
  admin: {
    password: '1',
    user: {
      id: 'usr-006',
      username: 'admin',
      fullName: 'Администратор Системы',
      role: 'admin',
      phone: '+79990001122',
    },
  },
};

export const TEST_ACCOUNTS = Object.values(MOCK_USERS).map((m) => ({
  username: m.user.username,
  role: m.user.role,
  fullName: m.user.fullName,
}));

function base64Decode(str) {
  // Use atob where available (Hermes >=0.73), fallback to manual decode
  if (typeof atob === 'function') {
    return atob(str);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 4) {
    const a = chars.indexOf(str[i]);
    const b = chars.indexOf(str[i + 1]);
    const c = chars.indexOf(str[i + 2]);
    const d = chars.indexOf(str[i + 3]);
    output += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== 64) output += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d !== 64) output += String.fromCharCode(((c & 3) << 6) | d);
  }
  return output;
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (payload.length % 4) payload += '=';
  const json = base64Decode(payload);
  return JSON.parse(json);
}

// Look up vehicle from DB and enrich user object if not already set.
export async function enrichUserWithVehicle(user) {
  if (user.vehicleId) return;
  try {
    const vehicle = await getVehicleByDriver(user.id);
    if (vehicle) {
      user.vehicleId = vehicle.id;
      user.vehiclePlate = vehicle.plate_number;
      user.vehicleModel = vehicle.model;
    }
  } catch { /* vehicles may not be synced yet */ }
}

export async function login(username, password) {
  const { serverSyncEnabled } = useSettingsStore.getState();

  if (!serverSyncEnabled) {
    // Mock mode
    await new Promise((resolve) => setTimeout(resolve, LOGIN_MOCK_DELAY_MS));

    const mockUser = MOCK_USERS[username];
    if (!mockUser || mockUser.password !== password) {
      throw new Error('errorInvalid');
    }

    const user = { ...mockUser.user };
    const accessToken = 'mock_access_' + Date.now();
    const refreshToken = 'mock_refresh_' + Date.now();

    await saveTokens(accessToken, refreshToken);
    // ensureUserInDb resolves ID conflicts (mock id vs seed id) and returns the correct id
    user.id = await ensureUserInDb(user);
    await enrichUserWithVehicle(user);
    await saveUserData(user);

    return { user, accessToken, refreshToken };
  }

  // Server mode
  const deviceId = await getDeviceId();
  const url = getBaseUrl() + API_CONFIG.ENDPOINTS.LOGIN;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, device_id: deviceId }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('errorInvalid');
    }
    throw new Error('errorServer');
  }

  const data = await response.json();
  await saveTokens(data.access_token, data.refresh_token);

  const payload = decodeJwtPayload(data.access_token);
  const user = {
    id: String(payload.sub || payload.user_id),
    username: payload.username || username,
    fullName: payload.full_name || payload.name || username,
    role: payload.role || 'expeditor',
    phone: payload.phone || '',
    vehicleId: payload.vehicle_id ? String(payload.vehicle_id) : null,
    vehiclePlate: payload.vehicle_plate || null,
  };

  // ensureUserInDb resolves ID conflicts (JWT id vs synced id) and returns the correct id
  user.id = await ensureUserInDb(user);
  await enrichUserWithVehicle(user);
  await saveUserData(user);

  return {
    user,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export async function logout() {
  const { serverSyncEnabled } = useSettingsStore.getState();

  if (serverSyncEnabled) {
    try {
      await apiRequest(API_CONFIG.ENDPOINTS.LOGOUT, { method: 'POST' });
    } catch {
      // Ignore logout errors — always clear local state
    }
  }

  await clearAll();
}
