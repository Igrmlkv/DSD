import { API_CONFIG, getBaseUrl } from '../constants/api';
import { getAccessToken, getRefreshToken, saveTokens, getDeviceId } from './secureStorage';
import { logInfo, logWarning, logError } from './loggerService';

const TAG = 'ApiClient';

export class AuthError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}

let refreshPromise = null;

export async function refreshTokens() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new AuthError('No refresh token');
  }

  const deviceId = await getDeviceId();
  const url = getBaseUrl() + API_CONFIG.ENDPOINTS.REFRESH;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, device_id: deviceId }),
  });

  if (!response.ok) {
    logError(TAG, `Token refresh failed, status: ${response.status}`);
    throw new AuthError('Refresh failed');
  }

  const data = await response.json();
  await saveTokens(data.access_token, data.refresh_token);
  return data;
}

async function safeRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function isRetryable(status) {
  return status >= 500 || status === 0;
}

export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = API_CONFIG.TIMEOUTS.DEFAULT,
    skipAuth = false,
  } = options;

  const { MAX_RETRY_ATTEMPTS, RETRY_DELAY_MS, RETRY_MULTIPLIER } = API_CONFIG.SYNC;

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = getBaseUrl() + endpoint;
      const reqHeaders = { 'Content-Type': 'application/json', ...headers };

      if (!skipAuth) {
        const token = await getAccessToken();
        if (token) {
          reqHeaders['Authorization'] = `Bearer ${token}`;
        } else {
          logWarning(TAG, 'No access token available — request will be sent without auth');
        }
      }

      if (attempt > 0) {
        logInfo(TAG, `Retry ${attempt}/${MAX_RETRY_ATTEMPTS}: ${method} ${endpoint.substring(0, 60)}`);
      }

      const fetchStart = Date.now();
      const response = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const fetchMs = Date.now() - fetchStart;
      if (fetchMs > 3000) {
        logWarning(TAG, `SLOW ${method} ${endpoint.substring(0, 60)} — ${fetchMs}ms, status=${response.status}`);
      }

      if (response.status === 401 && !skipAuth) {
        logWarning(TAG, '401 Unauthorized — attempting token refresh');
        try {
          await safeRefresh();
        } catch {
          throw new AuthError('Session expired');
        }
        // Retry the original request once with new token
        const newToken = await getAccessToken();
        const retryHeaders = { ...reqHeaders, Authorization: `Bearer ${newToken}` };
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);
        try {
          const retryResponse = await fetch(url, {
            method,
            headers: retryHeaders,
            body: body ? JSON.stringify(body) : undefined,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
          if (retryResponse.status === 401) {
            throw new AuthError('Session expired');
          }
          if (!retryResponse.ok) {
            const errData = await retryResponse.json().catch(() => ({}));
            const rawDetail = errData.detail;
            const errMsg = typeof rawDetail === 'string'
              ? rawDetail
              : rawDetail ? JSON.stringify(rawDetail) : `HTTP ${retryResponse.status}`;
            const err = new Error(errMsg);
            err.status = retryResponse.status;
            throw err;
          }
          return retryResponse.json().catch(() => null);
        } finally {
          clearTimeout(retryTimeoutId);
        }
      }

      if (isRetryable(response.status) && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = RETRY_DELAY_MS * Math.pow(RETRY_MULTIPLIER, attempt);
        logWarning(TAG, `${response.status} — retryable, waiting ${delayMs}ms`);
        lastError = new Error(`HTTP ${response.status}`);
        lastError.status = response.status;
        await delay(delayMs);
        continue;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const rawDetail = errData.detail;
        const errMsg = typeof rawDetail === 'string'
          ? rawDetail
          : rawDetail ? JSON.stringify(rawDetail) : `HTTP ${response.status}`;
        logError(TAG, `Request failed: ${method} ${endpoint.substring(0, 60)} — ${response.status} ${errMsg}`);
        const err = new Error(errMsg);
        err.status = response.status;
        throw err;
      }

      return response.json().catch(() => null);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AuthError) throw error;

      if (error.name === 'AbortError') {
        logError(TAG, `Request timed out after ${timeout}ms: ${method} ${endpoint.substring(0, 60)}`);
        lastError = new Error('Request timed out');
        lastError.status = 0;
      } else if (isNetworkError(error)) {
        logError(TAG, `Network error: ${error.message} — ${method} ${endpoint.substring(0, 60)}`);
        lastError = error;
        lastError.status = 0;
      } else {
        throw error;
      }

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = RETRY_DELAY_MS * Math.pow(RETRY_MULTIPLIER, attempt);
        await delay(delayMs);
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed');
}

function isNetworkError(error) {
  return (
    error.message === 'Network request failed' ||
    error.message === 'Failed to fetch' ||
    error.name === 'TypeError'
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
