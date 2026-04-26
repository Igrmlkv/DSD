// Shared JSON helpers — used by sync payload builders, audit services, and DB CRUD
// to keep parse/serialise behaviour consistent (drift between callers caused subtle
// bugs when a JSON column was read by one path and written by another).

export function safeParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

// Returns a string suitable for storing in a TEXT column: stringifies objects,
// passes through existing strings, and turns null/undefined into the supplied default.
export function serializeJson(value, defaultValue = null) {
  if (value == null) return defaultValue;
  return typeof value === 'string' ? value : JSON.stringify(value);
}
