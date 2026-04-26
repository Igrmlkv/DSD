import { AppState } from 'react-native';
import { getDatabase, getVehicleByDriver } from '../database/database';
import { apiRequest, AuthError } from './apiClient';
import { getDeviceId, getUserData, saveUserData } from './secureStorage';
import useSettingsStore from '../store/settingsStore';
import { API_CONFIG, getBaseUrl } from '../constants/api';
import { logInfo, logWarning, logError } from './loggerService';
import useAuthStore from '../store/authStore';

const TAG = 'SyncService';

// Entity types to pull from dsdMW middleware.
// 'users' is excluded — user data comes from the auth/JWT flow (login endpoint).
const DEFAULT_ENTITY_TYPES = [
  'customers', 'products', 'price_list_types', 'prices',
  'vehicles', 'stock', 'routes', 'route_points',
  'loading_trips', 'loading_trip_items',
  'product_empties', 'expense_types', 'adjustment_reasons', 'units',
];

const MERCH_PULL_ENTITY_TYPES = ['audit_templates', 'kpi_results'];

function getDefaultPullEntityTypes() {
  const merchOn = useSettingsStore.getState().merchandisingEnabled;
  return merchOn ? [...DEFAULT_ENTITY_TYPES, ...MERCH_PULL_ENTITY_TYPES] : DEFAULT_ENTITY_TYPES;
}

// Whitelist of allowed table names — prevents SQL injection if ENTITY_TABLE_MAP
// is ever extended with external input.
const ALLOWED_TABLES = new Set([
  'users', 'customers', 'products', 'price_list_types', 'price_lists', 'vehicles', 'stock',
  'routes', 'route_points', 'loading_trips', 'loading_trip_items',
  'product_empties', 'expense_types', 'adjustment_reasons', 'units',
  // Transactional tables (used by status check for external_id assignment)
  'orders', 'deliveries', 'returns', 'payments',
  'packaging_returns', 'cash_collections',
  'tour_checkins', 'expenses', 'visit_reports',
  'inventory_adjustments', 'on_hand_inventory',
  // Merchandising Audit (spec §5.3)
  'audit_templates', 'audit_answers', 'audit_photos', 'kpi_results',
]);

// Maps entity types (as used in API requests) to local SQLite table names.
// Used by PULL (server → app) for upserting master data, and by STATUS CHECK
// for updating external_id on delivered entities.
const ENTITY_TABLE_MAP = {
  // Master data (pulled from server)
  users: 'users',
  customers: 'customers',
  products: 'products',
  price_list_types: 'price_list_types',
  prices: 'price_lists',
  vehicles: 'vehicles',
  stock: 'stock',
  routes: 'routes',
  route_points: 'route_points',
  loading_trips: 'loading_trips',
  loading_trip_items: 'loading_trip_items',
  product_empties: 'product_empties',
  expense_types: 'expense_types',
  adjustment_reasons: 'adjustment_reasons',
  units: 'units',
  // Transactional data (pushed to server, mapped here for status check external_id)
  order: 'orders',
  delivery: 'deliveries',
  return: 'returns',
  payment: 'payments',
  packaging_return: 'packaging_returns',
  cash_collection: 'cash_collections',
  tour_checkin: 'tour_checkins',
  expense: 'expenses',
  visit_report: 'visit_reports',
  inventory_adjustment: 'inventory_adjustments',
  on_hand_inventory: 'on_hand_inventory',
  gps_track: 'gps_tracks',
  route_point: 'route_points',
  route: 'routes',
  // Merchandising Audit (spec §5.3)
  audit_templates: 'audit_templates',  // PULL from middleware
  audit_visit: 'visit_reports',        // PUSH (filter report_kind='merch_audit')
  audit_answers: 'audit_answers',      // PUSH (sent inline with audit_visit payload)
  audit_photos: 'audit_photos',        // PUSH metadata (binary via uploader)
  kpi_results: 'kpi_results',          // PULL from middleware (KPI Engine output)
};

const ENTITY_COLUMNS = {
  users: ['id', 'username', 'password_hash', 'full_name', 'role', 'phone', 'vehicle_id', 'is_active'],
  customers: ['id', 'external_id', 'name', 'legal_name', 'ship_to_name', 'inn', 'kpp', 'address', 'city', 'region', 'postal_code', 'latitude', 'longitude', 'contact_person', 'phone', 'email', 'visit_time_from', 'visit_time_to', 'delivery_notes_text', 'vat_rate', 'customer_type', 'payment_terms', 'credit_limit', 'debt_amount', 'currency', 'price_list_id', 'is_active'],
  products: ['id', 'external_id', 'sku', 'name', 'category', 'subcategory', 'brand', 'volume', 'volume_unit', 'unit', 'barcode', 'weight', 'weight_unit', 'vat_percent', 'image_url', 'material_type', 'is_active', 'is_mml', 'mml_priority'],
  price_list_types: ['id', 'name'],
  prices: ['id', 'product_id', 'price_type', 'price', 'currency', 'valid_from', 'valid_to'],
  vehicles: ['id', 'plate_number', 'model', 'driver_id', 'is_active'],
  stock: ['id', 'product_id', 'warehouse', 'quantity', 'reserved', 'unit'],
  routes: ['id', 'name', 'driver_id', 'date', 'status', 'vehicle_number', 'notes'],
  route_points: ['id', 'route_id', 'customer_id', 'sequence_number', 'planned_arrival', 'status', 'latitude', 'longitude', 'notes'],
  loading_trips: ['id', 'vehicle_id', 'driver_id', 'route_id', 'loading_date', 'status', 'notes'],
  loading_trip_items: ['id', 'loading_trip_id', 'product_id', 'planned_quantity', 'unit'],
  product_empties: ['id', 'product_id', 'empty_product_id', 'quantity', 'unit', 'is_active'],
  expense_types: ['id', 'name', 'icon', 'is_active', 'sort_order'],
  adjustment_reasons: ['id', 'code', 'name_ru', 'name_en', 'is_active', 'sort_order'],
  units: ['code', 'name'],
  // Merchandising Audit (spec §5.3) — pull-only entities are upserted via these column lists.
  audit_templates: ['id', 'outlet_type', 'version', 'name', 'questions', 'scoring', 'active', 'effective_from', 'effective_to', 'external_id'],
  kpi_results: ['id', 'visit_report_id', 'kpi_code', 'value', 'status', 'formula_version', 'source', 'details_json'],
};

// Entity types where pull must not overwrite locally modified data.
// updateCols: columns updated on conflict (local-only cols like actual_quantity are excluded).
// whereClause: optional guard — update only when condition is true on the existing row.
const PROTECTED_UPSERT_CONFIG = {
  loading_trips: {
    updateCols: ['vehicle_id', 'driver_id', 'route_id', 'loading_date', 'status', 'notes'],
    whereClause: "loading_trips.status = 'planned'",
  },
  loading_trip_items: {
    updateCols: ['loading_trip_id', 'product_id', 'planned_quantity', 'unit'],
    whereClause: null,
  },
};

const BATCH_SIZE = 100;
const PUSH_BATCH_SIZE = 50;
const MAX_PUSH_ATTEMPTS = 10;
const PENDING_PUSH_INTERVAL_MS = 30 * 1000;
const MIN_BACKGROUND_SYNC_GAP_MS = 5 * 60 * 1000;

let autoSyncTimeoutId = null;
let pendingPushIntervalId = null;
let appStateSubscription = null;
let lastSyncTimestamp = 0;
let syncInProgress = false;

// =====================================================
// PULL (F.2)
// =====================================================

export async function pullEntities(entityTypes = null) {
  const syncEnabled = useSettingsStore.getState().serverSyncEnabled;

  if (!syncEnabled) {
    return { skipped: true };
  }

  const database = await getDatabase();
  const deviceId = await getDeviceId();
  const baseUrl = getBaseUrl();
  const types = entityTypes || getDefaultPullEntityTypes();
  let totalUpserted = 0;

  logInfo(TAG, `PULL START — device: ${deviceId}, baseUrl: ${baseUrl}, entities: ${types.join(', ')}`);

  const entitiesParam = types.join(',');
  const pullStart = Date.now();

  let cursor = null;
  let hasMore = true;
  let pageNum = 0;

  while (hasMore) {
    pageNum++;
    // Note: entities is a comma-separated list — do NOT encodeURIComponent
    // because %2C-encoded commas may not be decoded back by some servers/proxies.
    let endpoint = `${API_CONFIG.ENDPOINTS.SYNC_PULL}?device_id=${encodeURIComponent(deviceId)}&entities=${entitiesParam}`;
    if (cursor) {
      endpoint += `&cursor=${encodeURIComponent(cursor)}`;
    }

    let response;
    const fetchStart = Date.now();
    try {
      response = await apiRequest(endpoint, {
        timeout: API_CONFIG.TIMEOUTS.SYNC_PULL,
      });
    } catch (err) {
      logError(TAG, `PULL page ${pageNum} FETCH FAILED after ${Date.now() - fetchStart}ms: ${err.message}`);
      throw err;
    }
    logInfo(TAG, `PULL page ${pageNum} fetched in ${Date.now() - fetchStart}ms`);

    if (!response) {
      logWarning(TAG, 'PULL response is null/undefined — stopping');
      break;
    }
    if (!response.entities) {
      logWarning(TAG, `PULL response has no .entities field — response keys: ${Object.keys(response).join(', ')}`);
      break;
    }

    // Disable FK constraints once for all entities in this page.
    // Safe because expo-sqlite serializes all operations on a single connection.
    await database.execAsync('PRAGMA foreign_keys = OFF');
    try {
      for (const [entityType, entityData] of Object.entries(response.entities)) {
        const rowCount = entityData?.data?.length || 0;
        if (rowCount === 0) continue;

        const upsertStart = Date.now();
        try {
          const count = await upsertEntities(database, entityType, entityData);
          totalUpserted += count;
          logInfo(TAG, `  ${entityType}: ${count} rows upserted in ${Date.now() - upsertStart}ms`);
        } catch (err) {
          logError(TAG, `  ${entityType}: UPSERT FAILED after ${Date.now() - upsertStart}ms — ${err.message}`);
          // Continue with other entities — one failure should not block the rest
        }
      }
    } finally {
      await database.execAsync('PRAGMA foreign_keys = ON');
    }

    cursor = response.next_cursor || null;
    hasMore = !!cursor;
  }

  // Update sync_meta timestamps
  const now = new Date().toISOString();
  for (const type of types) {
    await database.runAsync(
      `INSERT INTO sync_meta (entity_type, last_sync_at) VALUES (?, ?)
       ON CONFLICT(entity_type) DO UPDATE SET last_sync_at = ?`,
      [type, now, now]
    );
  }

  const pullMs = Date.now() - pullStart;
  logInfo(TAG, `PULL COMPLETE — ${totalUpserted} rows upserted across ${pageNum} page(s) in ${pullMs}ms`);
  return { upserted: totalUpserted, pages: pageNum, durationMs: pullMs };
}

// Caller must disable FK constraints before calling this function.
async function upsertEntities(database, entityType, entityData) {
  const { data } = entityData;
  if (!data || data.length === 0) return 0;

  const tableName = ENTITY_TABLE_MAP[entityType];
  if (!tableName) {
    logWarning(TAG, `UPSERT SKIP: no table mapping for entity "${entityType}"`);
    return 0;
  }

  // Validate table name against whitelist to prevent SQL injection
  if (!ALLOWED_TABLES.has(tableName)) {
    logError(TAG, `UPSERT REJECTED: table "${tableName}" not in whitelist`);
    return 0;
  }

  const columns = ENTITY_COLUMNS[entityType];
  if (!columns) {
    logWarning(TAG, `UPSERT SKIP: no column config for entity "${entityType}"`);
    return 0;
  }

  // Build SQL template once per entity type, not per row.
  // tableName and columns come from hardcoded ENTITY_TABLE_MAP/ENTITY_COLUMNS
  // and are validated against ALLOWED_TABLES — safe for interpolation.
  const colNames = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');

  const protectedConfig = PROTECTED_UPSERT_CONFIG[entityType];
  let sql;
  if (protectedConfig) {
    // Conditional upsert: insert new rows, update only server-owned columns
    // on existing rows. Local-only fields (actual_quantity, scanned, loaded_items)
    // are never overwritten. Optional WHERE guard prevents overwriting rows
    // that the driver has already modified (e.g. status != 'planned').
    const setClauses = protectedConfig.updateCols.map(c => `${c} = excluded.${c}`).join(', ');
    sql = `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${setClauses}`;
    if (protectedConfig.whereClause) {
      sql += ` WHERE ${protectedConfig.whereClause}`;
    }
  } else {
    sql = `INSERT OR REPLACE INTO ${tableName} (${colNames}) VALUES (${placeholders})`;
  }

  let count = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);

    await database.execAsync('BEGIN TRANSACTION');
    try {
      for (const row of batch) {
        const values = columns.map((col) => {
          const val = row[col];
          if (val === undefined) return null;
          if (val !== null && typeof val === 'object') return JSON.stringify(val);
          // Ensure id/FK columns are stored as TEXT to match schema declarations
          // and be consistent with locally-generated UUID strings.
          if (val !== null && (col === 'id' || col.endsWith('_id')) && typeof val === 'number') {
            return String(val);
          }
          return val;
        });
        await database.runAsync(sql, values);
        count++;
      }
      await database.execAsync('COMMIT');
    } catch (error) {
      logError(TAG, `UPSERT batch ROLLBACK for ${entityType}/${tableName}: ${error.message}`);
      await database.execAsync('ROLLBACK');
      throw error;
    }
  }

  return count;
}

// =====================================================
// PUSH (F.3)
// =====================================================

export async function pushPendingOperations() {
  const syncEnabled = useSettingsStore.getState().serverSyncEnabled;
  if (!syncEnabled) {
    return { skipped: true };
  }

  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT * FROM sync_log WHERE synced = 0 AND sync_attempts < ? ORDER BY created_at LIMIT ?`,
    [MAX_PUSH_ATTEMPTS, PUSH_BATCH_SIZE]
  );

  // Log stuck (exhausted) entries so they're visible in the terminal
  const exhausted = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM sync_log WHERE synced = 0 AND sync_attempts >= ?`,
    [MAX_PUSH_ATTEMPTS]
  );
  if (exhausted && exhausted.count > 0) {
    logWarning(TAG, `PUSH: ${exhausted.count} sync_log entries exhausted all ${MAX_PUSH_ATTEMPTS} retries (permanently stuck)`);
  }

  if (rows.length === 0) {
    return { sent: 0, accepted: 0 };
  }

  const typeBreakdown = {};
  for (const r of rows) { typeBreakdown[r.entity_type] = (typeBreakdown[r.entity_type] || 0) + 1; }
  logInfo(TAG, `PUSH START — ${rows.length} pending: ${JSON.stringify(typeBreakdown)}`);

  const deviceId = await getDeviceId();
  const userData = await getUserData();
  const userId = userData?.id || null;

  const operations = rows.map((row) => ({
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    action: row.action,
    timestamp: row.created_at,
    data: row.payload ? JSON.parse(row.payload) : null,
  }));

  const pushStart = Date.now();
  try {
    const result = await apiRequest(API_CONFIG.ENDPOINTS.SYNC_PUSH, {
      method: 'POST',
      body: { device_id: deviceId, user_id: userId, operations },
      timeout: API_CONFIG.TIMEOUTS.SYNC_PUSH,
    });
    const netMs = Date.now() - pushStart;

    let accepted = 0;
    let alreadyAccepted = 0;
    let rejected = 0;
    const now = new Date().toISOString();

    if (result && result.results) {
      for (let i = 0; i < result.results.length; i++) {
        const opResult = result.results[i];
        const syncLogRow = rows[i];
        if (!syncLogRow) continue;

        if (opResult.status === 'accepted' || opResult.status === 'already_accepted') {
          await database.runAsync(
            `UPDATE sync_log SET synced = 1, synced_at = ? WHERE id = ?`,
            [now, syncLogRow.id]
          );
          if (opResult.status === 'already_accepted') alreadyAccepted++;
          else accepted++;
        } else {
          rejected++;
          logWarning(TAG, `PUSH rejected: ${opResult.entity_type}/${opResult.entity_id} — status=${opResult.status}, error=${opResult.error}`);
          await database.runAsync(
            `UPDATE sync_log SET sync_attempts = sync_attempts + 1, last_error = ? WHERE id = ?`,
            [opResult.error || 'Unknown error', syncLogRow.id]
          );
        }
      }
    }

    logInfo(TAG, `PUSH COMPLETE — sent: ${rows.length}, accepted: ${accepted}, already: ${alreadyAccepted}, rejected: ${rejected}, network: ${netMs}ms`);
    return { sent: rows.length, accepted, alreadyAccepted, rejected };
  } catch (error) {
    const netMs = Date.now() - pushStart;
    logError(TAG, `PUSH FAILED after ${netMs}ms: ${error.message}`);
    for (const row of rows) {
      await database.runAsync(
        `UPDATE sync_log SET sync_attempts = sync_attempts + 1, last_error = ? WHERE id = ?`,
        [error.message, row.id]
      );
    }
    throw error;
  }
}

// =====================================================
// STATUS CHECK (F.4)
// =====================================================

export async function checkSyncStatus() {
  const syncEnabled = useSettingsStore.getState().serverSyncEnabled;
  if (!syncEnabled) {
    return { skipped: true };
  }

  const database = await getDatabase();
  const deviceId = await getDeviceId();

  let result;
  const statusStart = Date.now();
  try {
    result = await apiRequest(
      `${API_CONFIG.ENDPOINTS.SYNC_STATUS}?device_id=${encodeURIComponent(deviceId)}`
    );
  } catch (err) {
    logError(TAG, `STATUS CHECK FAILED after ${Date.now() - statusStart}ms: ${err.message}`);
    throw err;
  }
  logInfo(TAG, `STATUS CHECK fetched in ${Date.now() - statusStart}ms`);

  if (result && result.delivered) {
    logInfo(TAG, `STATUS CHECK — ${result.delivered.length} delivered, ${result.failed?.length || 0} failed`);
    for (const item of result.delivered) {
      if (item.external_id && item.entity_type && item.entity_id) {
        const tableName = ENTITY_TABLE_MAP[item.entity_type];
        if (tableName && ALLOWED_TABLES.has(tableName)) {
          try {
            await database.runAsync(
              `UPDATE ${tableName} SET external_id = ? WHERE id = ?`,
              [item.external_id, item.entity_id]
            );
          } catch {
            // Table may not have external_id column — skip silently
          }
        }
      }
    }
  }

  if (result && result.failed) {
    for (const item of result.failed) {
      logWarning(TAG, `STATUS: failed ${item.entity_type}/${item.entity_id}: ${item.error}`);
    }
  }

  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO sync_meta (entity_type, last_sync_at) VALUES ('_status_check', ?)
     ON CONFLICT(entity_type) DO UPDATE SET last_sync_at = ?`,
    [now, now]
  );

  return { delivered: result?.delivered?.length || 0, failed: result?.failed?.length || 0 };
}

export async function resetServerWatermarks() {
  const syncEnabled = useSettingsStore.getState().serverSyncEnabled;
  if (!syncEnabled) {
    return { skipped: true };
  }

  const deviceId = await getDeviceId();

  const result = await apiRequest(
    `${API_CONFIG.ENDPOINTS.SYNC_RESET_WATERMARKS}?device_id=${encodeURIComponent(deviceId)}`,
    { method: 'DELETE' }
  );
  logInfo(TAG, `WATERMARK RESET OK — deleted: ${result?.deleted}`);
  return result;
}

// =====================================================
// REPAIR: Re-queue status updates for entities whose
// status changed locally but the update was lost during sync
// (e.g., confirmed orders still showing as 'draft' in MW).
// =====================================================

export async function repairSyncStatuses() {
  const database = await getDatabase();
  let requeued = 0;

  // Orders: find confirmed/shipped/delivered orders that were synced as 'create'
  // but never had a successful 'update' sync
  const orders = await database.getAllAsync(
    `SELECT o.id, o.status FROM orders o
     WHERE o.status != 'draft'
       AND EXISTS (SELECT 1 FROM sync_log sl WHERE sl.entity_type = 'order' AND sl.entity_id = o.id AND sl.action = 'create' AND sl.synced = 1)
       AND NOT EXISTS (SELECT 1 FROM sync_log sl2 WHERE sl2.entity_type = 'order' AND sl2.entity_id = o.id AND sl2.action = 'update' AND sl2.synced = 0)`
  );
  for (const o of orders) {
    await database.runAsync(
      `INSERT INTO sync_log (entity_type, entity_id, action, payload, created_at) VALUES (?, ?, 'update', ?, datetime('now'))`,
      ['order', o.id, JSON.stringify({ id: o.id, status: o.status })]
    );
    requeued++;
  }

  // Deliveries, returns, on_hand_inventory — same pattern
  const deliveries = await database.getAllAsync(
    `SELECT d.id, d.status FROM deliveries d
     WHERE EXISTS (SELECT 1 FROM sync_log sl WHERE sl.entity_type = 'delivery' AND sl.entity_id = d.id AND sl.action = 'create' AND sl.synced = 1)
       AND NOT EXISTS (SELECT 1 FROM sync_log sl2 WHERE sl2.entity_type = 'delivery' AND sl2.entity_id = d.id AND sl2.action = 'update' AND sl2.synced = 0)
       AND d.status != (SELECT json_extract(sl3.payload, '$.status') FROM sync_log sl3 WHERE sl3.entity_type = 'delivery' AND sl3.entity_id = d.id AND sl3.action = 'create' AND sl3.synced = 1 LIMIT 1)`
  );
  for (const d of deliveries) {
    await database.runAsync(
      `INSERT INTO sync_log (entity_type, entity_id, action, payload, created_at) VALUES (?, ?, 'update', ?, datetime('now'))`,
      ['delivery', d.id, JSON.stringify({ id: d.id, status: d.status })]
    );
    requeued++;
  }

  // Loading trips: find verified trips that were never successfully pushed
  const trips = await database.getAllAsync(
    `SELECT lt.id, lt.status, lt.vehicle_id, lt.driver_id, lt.route_id,
            lt.loading_date, lt.loaded_items, lt.notes
     FROM loading_trips lt
     WHERE lt.status = 'verified'
       AND NOT EXISTS (
         SELECT 1 FROM sync_log sl
         WHERE sl.entity_type = 'loading_trip' AND sl.entity_id = lt.id AND sl.synced = 1
       )
       AND NOT EXISTS (
         SELECT 1 FROM sync_log sl2
         WHERE sl2.entity_type = 'loading_trip' AND sl2.entity_id = lt.id AND sl2.synced = 0
       )`
  );
  for (const trip of trips) {
    const items = await database.getAllAsync(
      `SELECT * FROM loading_trip_items WHERE loading_trip_id = ?`, [trip.id]
    );
    const payload = JSON.stringify({ ...trip, items });
    await database.runAsync(
      `INSERT INTO sync_log (entity_type, entity_id, action, payload, created_at) VALUES (?, ?, 'update', ?, datetime('now'))`,
      ['loading_trip', trip.id, payload]
    );
    requeued++;
  }

  logInfo(TAG, `REPAIR SYNC — requeued ${requeued} status updates`);
  return { requeued };
}

// =====================================================
// ORCHESTRATOR (F.5)
// =====================================================

export async function performFullSync({ force = false } = {}) {
  const syncEnabled = useSettingsStore.getState().serverSyncEnabled;

  if (!syncEnabled) {
    return { skipped: true, reason: 'sync_disabled' };
  }

  if (syncInProgress) {
    if (force) {
      // Wait for current sync to finish before starting a new one
      logInfo(TAG, 'FULL SYNC forced — waiting for current sync to finish');
      const waitStart = Date.now();
      while (syncInProgress && Date.now() - waitStart < 60000) {
        await new Promise((r) => setTimeout(r, 500));
      }
      if (syncInProgress) {
        logWarning(TAG, 'FULL SYNC forced — timed out waiting, proceeding anyway');
        syncInProgress = false;
      }
    } else {
      logWarning(TAG, 'FULL SYNC already in progress — skipping');
      return { skipped: true, reason: 'already_in_progress' };
    }
  }

  syncInProgress = true;
  const errors = [];
  let pushResult = null;
  let pullResult = null;
  let statusResult = null;
  const syncStart = Date.now();
  const _t = (label) => `${label} (${Date.now() - syncStart}ms)`;

  try {
    // Phase 0: One-time repair — re-queue lost status updates
    try {
      const t0 = Date.now();
      await repairSyncStatuses();
      logInfo(TAG, _t(`REPAIR done in ${Date.now() - t0}ms`));
    } catch (err) {
      logWarning(TAG, _t(`Repair phase error: ${err.message}`));
    }

    // Phase 1: Push
    try {
      const t0 = Date.now();
      pushResult = await pushPendingOperations();
      logInfo(TAG, _t(`PUSH done in ${Date.now() - t0}ms — ${JSON.stringify(pushResult)}`));
    } catch (error) {
      logError(TAG, _t(`PUSH phase error: ${error.message}`));
      errors.push({ phase: 'push', error: error.message });
      if (error instanceof AuthError) {
        logWarning(TAG, _t('Session expired — aborting sync'));
        return { push: pushResult, pull: pullResult, status: statusResult, errors, hasErrors: true, authExpired: true };
      }
    }

    // Phase 2: Pull
    try {
      const t0 = Date.now();
      pullResult = await pullEntities();
      logInfo(TAG, _t(`PULL done in ${Date.now() - t0}ms — ${JSON.stringify(pullResult)}`));
    } catch (error) {
      logError(TAG, _t(`PULL phase error: ${error.message}`));
      errors.push({ phase: 'pull', error: error.message });
      if (error instanceof AuthError) {
        logWarning(TAG, _t('Session expired — aborting sync'));
        return { push: pushResult, pull: pullResult, status: statusResult, errors, hasErrors: true, authExpired: true };
      }
    }

    // Phase 3: Status
    try {
      const t0 = Date.now();
      statusResult = await checkSyncStatus();
      logInfo(TAG, _t(`STATUS done in ${Date.now() - t0}ms — ${JSON.stringify(statusResult)}`));
    } catch (error) {
      logError(TAG, _t(`STATUS phase error: ${error.message}`));
      errors.push({ phase: 'status', error: error.message });
    }

    // After pull, refresh user's vehicle assignment from synced data
    try {
      await refreshUserVehicle();
    } catch (err) {
      logWarning(TAG, `Vehicle refresh failed: ${err.message}`);
    }

    lastSyncTimestamp = Date.now();
    const totalMs = Date.now() - syncStart;

    logInfo(TAG, `FULL SYNC COMPLETE — ${totalMs}ms total, errors: ${errors.length}`);

    return { push: pushResult, pull: pullResult, status: statusResult, errors, hasErrors: errors.length > 0 };
  } finally {
    syncInProgress = false;
  }
}

// After sync, look up the user's vehicle from the freshly synced vehicles table
// and update the auth store + secure storage so the app sees the assignment.
async function refreshUserVehicle() {
  const userData = await getUserData();
  if (!userData?.id) return;

  const vehicle = await getVehicleByDriver(userData.id);
  const newVehicleId = vehicle?.id || null;

  if (newVehicleId !== (userData.vehicleId || null)) {
    userData.vehicleId = newVehicleId;
    userData.vehiclePlate = vehicle?.plate_number || null;
    userData.vehicleModel = vehicle?.model || null;
    await saveUserData(userData);

    // Update in-memory auth store
    useAuthStore.setState((state) => ({
      user: state.user ? { ...state.user, vehicleId: newVehicleId, vehiclePlate: vehicle?.plate_number || null, vehicleModel: vehicle?.model || null } : null,
    }));

    logInfo(TAG, `User vehicle updated: ${newVehicleId} (${vehicle?.plate_number || 'none'})`);
  }
}

// =====================================================
// AUTO-SYNC (F.6)
// =====================================================

async function handleAuthExpired() {
  logWarning(TAG, 'Auth expired — stopping auto-sync and logging out');
  stopAutoSync();
  try {
    await useAuthStore.getState().logout();
  } catch (e) {
    logWarning(TAG, `Logout after auth expiry failed: ${e.message}`);
  }
}

function scheduleNextSync() {
  if (autoSyncTimeoutId) {
    clearTimeout(autoSyncTimeoutId);
    autoSyncTimeoutId = null;
  }

  if (!useSettingsStore.getState().serverSyncEnabled) return;

  autoSyncTimeoutId = setTimeout(async () => {
    try {
      const result = await performFullSync();
      if (result?.authExpired) {
        await handleAuthExpired();
        return;
      }
    } catch (err) {
      logWarning(TAG, `Auto-sync error: ${err.message}`);
    }
    // Schedule next sync after completion (avoids overlapping syncs)
    scheduleNextSync();
  }, API_CONFIG.SYNC.AUTO_SYNC_INTERVAL_MS);
}

export function startAutoSync() {
  if (!useSettingsStore.getState().serverSyncEnabled) {
    return;
  }

  stopAutoSync();

  logInfo(TAG, `Auto-sync STARTED — interval: ${API_CONFIG.SYNC.AUTO_SYNC_INTERVAL_MS / 1000}sec`);

  // Schedule full sync with setTimeout (avoids overlapping via scheduleNextSync)
  scheduleNextSync();

  // Push pending operations more frequently
  pendingPushIntervalId = setInterval(async () => {
    try {
      if (!useSettingsStore.getState().serverSyncEnabled) return;
      const database = await getDatabase();
      const pending = await database.getFirstAsync(
        `SELECT COUNT(*) as count FROM sync_log WHERE synced = 0`
      );
      if (pending && pending.count > 0) {
        await pushPendingOperations();
      }
    } catch (err) {
      if (err instanceof AuthError) {
        await handleAuthExpired();
        return;
      }
      logWarning(TAG, `Pending push error: ${err.message}`);
    }
  }, PENDING_PUSH_INTERVAL_MS);

  // Sync when app returns from background
  appStateSubscription = AppState.addEventListener('change', async (nextState) => {
    if (nextState === 'active' && useSettingsStore.getState().serverSyncEnabled) {
      const elapsed = Date.now() - lastSyncTimestamp;
      if (elapsed >= MIN_BACKGROUND_SYNC_GAP_MS) {
        try {
          const result = await performFullSync();
          if (result?.authExpired) await handleAuthExpired();
        } catch (err) {
          logWarning(TAG, `Background return sync error: ${err.message}`);
        }
      }
    }
  });

  // Trigger immediate sync
  performFullSync()
    .then(async (result) => { if (result?.authExpired) await handleAuthExpired(); })
    .catch((err) => logWarning(TAG, `Initial sync error: ${err.message}`));
}

export function stopAutoSync() {
  if (autoSyncTimeoutId) {
    clearTimeout(autoSyncTimeoutId);
    autoSyncTimeoutId = null;
  }
  if (pendingPushIntervalId) {
    clearInterval(pendingPushIntervalId);
    pendingPushIntervalId = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}
