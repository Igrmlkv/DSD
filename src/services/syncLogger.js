import useSettingsStore from '../store/settingsStore';

export async function logSyncOperation(entityType, entityId, action, data) {
  try {
    if (!useSettingsStore.getState().serverSyncEnabled) return;

    const { getDatabase } = require('../database/database');
    const database = await getDatabase();
    await database.runAsync(
      `INSERT INTO sync_log (entity_type, entity_id, action, payload, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [entityType, String(entityId), action, data ? JSON.stringify(data) : null]
    );
  } catch (e) {
    console.warn('[SyncLogger] Failed to log operation:', e.message);
  }
}
