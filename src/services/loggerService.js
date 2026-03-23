import { addErrorLog } from '../database';

const LOG_SEVERITIES = ['debug', 'info', 'warning', 'error', 'critical'];

let _currentUserId = null;
let _currentScreen = null;

export function setLoggerUser(userId) {
  _currentUserId = userId;
}

export function setLoggerScreen(screen) {
  _currentScreen = screen;
}

async function log(severity, source, message, extra = {}) {
  // Always echo to console so logs are visible in the terminal / Metro output
  const ts = new Date().toISOString().slice(11, 23);
  const prefix = `[${ts}] [${severity.toUpperCase()}] [${source}]`;
  if (severity === 'error' || severity === 'critical') {
    console.error(prefix, message);
  } else if (severity === 'warning') {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
  try {
    await addErrorLog({
      severity,
      source,
      message: typeof message === 'string' ? message : String(message),
      context: extra.context || null,
      stack_trace: extra.stack || null,
      user_id: extra.user_id || _currentUserId,
      screen: extra.screen || _currentScreen,
    });
  } catch (e) {
    // Fallback to console to avoid infinite loop
    console.error('[loggerService] Failed to write log:', e);
  }
}

export function logDebug(source, message, extra) {
  return log('debug', source, message, extra);
}

export function logInfo(source, message, extra) {
  return log('info', source, message, extra);
}

export function logWarning(source, message, extra) {
  return log('warning', source, message, extra);
}

export function logError(source, message, extra) {
  return log('error', source, message, extra);
}

export function logCritical(source, message, extra) {
  return log('critical', source, message, extra);
}

/**
 * Capture an Error object and log it with stack trace.
 */
export function captureException(source, error, extra = {}) {
  return log('error', source, error.message || String(error), {
    ...extra,
    stack: error.stack || null,
  });
}

export { LOG_SEVERITIES };
