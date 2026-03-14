import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  PIN_CODE: 'pin_code',
};

export async function saveTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function saveUserData(userData) {
  await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(userData));
}

export async function getUserData() {
  const data = await SecureStore.getItemAsync(KEYS.USER_DATA);
  return data ? JSON.parse(data) : null;
}

// --- PIN-код для быстрого входа ---

export async function savePIN(pin) {
  await SecureStore.setItemAsync(KEYS.PIN_CODE, pin);
}

export async function getPIN() {
  return SecureStore.getItemAsync(KEYS.PIN_CODE);
}

export async function validatePIN(pin) {
  const stored = await SecureStore.getItemAsync(KEYS.PIN_CODE);
  return stored !== null && stored === pin;
}

export async function clearPIN() {
  await SecureStore.deleteItemAsync(KEYS.PIN_CODE);
}

export async function hasPIN() {
  const pin = await SecureStore.getItemAsync(KEYS.PIN_CODE);
  return pin !== null;
}

// --- Очистка ---

export async function clearAll() {
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.USER_DATA);
  await SecureStore.deleteItemAsync(KEYS.PIN_CODE);
}
