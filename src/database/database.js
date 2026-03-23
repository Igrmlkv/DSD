import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES } from './schema';
import { DEFAULT_VAT_PERCENT, DEFAULT_CURRENCY } from '../constants/config';
import {
  ORDER_STATUS, ROUTE_STATUS, VISIT_STATUS, DELIVERY_STATUS, RETURN_STATUS,
  LOADING_TRIP_STATUS, ADJUSTMENT_STATUS,
  CASH_COLLECTION_STATUS, PACKAGING_RETURN_STATUS, ON_HAND_INVENTORY_STATUS,
  CHECKIN_STATUS, TOUR_CHECKIN_TYPE,
} from '../constants/statuses';
import { logSyncOperation } from '../services/syncLogger';
import useSettingsStore from '../store/settingsStore';
import {
  buildOrderPayload, buildDeliveryPayload, buildReturnPayload,
  buildPackagingReturnPayload, buildInventoryAdjustmentPayload, buildOnHandInventoryPayload,
  buildCashCollectionPayload, buildLoadingTripPayload, buildTourCheckinPayload,
  buildVisitReportPayload, buildExpensePayload,
  buildRouteStatusPayload, buildRoutePointStatusPayload,
} from '../services/syncPayloadBuilder';

let db = null;

export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('dsd_mini_v9.db');
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');
  return db;
}

export async function initDatabase() {
  const database = await getDatabase();

  // Drop old packaging_return_items if it has obsolete schema (packaging_type instead of product_id)
  try {
    const cols = await database.getAllAsync("PRAGMA table_info(packaging_return_items)");
    if (cols.length > 0 && (cols.some((c) => c.name === 'packaging_type') || !cols.some((c) => c.name === 'product_id'))) {
      await database.execAsync('PRAGMA foreign_keys = OFF');
      await database.execAsync('DROP TABLE packaging_return_items');
      await database.execAsync('PRAGMA foreign_keys = ON');
    }
  } catch { /* table does not exist yet — will be created below */ }

  for (const sql of CREATE_TABLES) {
    await database.execAsync(sql);
  }

  // Safe migrations for existing databases
  const migrations = [
    "ALTER TABLE deliveries ADD COLUMN signature_data TEXT",
    "ALTER TABLE deliveries ADD COLUMN signature_driver_data TEXT",
    "ALTER TABLE tour_checkins ADD COLUMN current_step INTEGER DEFAULT 0",
    "ALTER TABLE tour_checkins ADD COLUMN material_check_data TEXT",
    "ALTER TABLE customers ADD COLUMN ship_to_name TEXT",
    "ALTER TABLE customers ADD COLUMN visit_time_from TEXT",
    "ALTER TABLE customers ADD COLUMN visit_time_to TEXT",
    "ALTER TABLE customers ADD COLUMN delivery_notes_text TEXT",
    "ALTER TABLE customers ADD COLUMN vat_rate REAL DEFAULT 22",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_warehouse_product ON stock(warehouse, product_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_checkins_daily ON tour_checkins(driver_id, type, date(checkin_date))",
    "ALTER TABLE route_points ADD COLUMN actual_arrival_lat REAL",
    "ALTER TABLE route_points ADD COLUMN actual_arrival_lon REAL",
    "ALTER TABLE route_points ADD COLUMN actual_departure_lat REAL",
    "ALTER TABLE route_points ADD COLUMN actual_departure_lon REAL",
    "ALTER TABLE products ADD COLUMN material_type TEXT DEFAULT 'product'",
    // v5 migrations
    "ALTER TABLE customers ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE customers ADD COLUMN price_list_id TEXT",
    "ALTER TABLE products ADD COLUMN volume_unit TEXT DEFAULT 'LTR'",
    "ALTER TABLE products ADD COLUMN weight_unit TEXT DEFAULT 'KGM'",
    "ALTER TABLE products ADD COLUMN vat_percent REAL DEFAULT 22",
    "ALTER TABLE product_empties ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE product_empties ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE stock ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE routes ADD COLUMN name TEXT",
    "ALTER TABLE orders ADD COLUMN route_id TEXT",
    "ALTER TABLE orders ADD COLUMN vat_amount REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE order_items ADD COLUMN vat_percent REAL",
    "ALTER TABLE order_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE order_items ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE deliveries ADD COLUMN route_id TEXT",
    "ALTER TABLE deliveries ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE delivery_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE delivery_items ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE returns ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE return_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE return_items ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE payments ADD COLUMN delivery_id TEXT",
    "ALTER TABLE payments ADD COLUMN change_amount REAL DEFAULT 0",
    "ALTER TABLE payments ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE loading_trip_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE cash_collections ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE tour_checkins ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE packaging_return_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE invoices ADD COLUMN form_type TEXT",
    "ALTER TABLE invoice_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE invoice_items ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE delivery_notes ADD COLUMN total_amount REAL DEFAULT 0",
    "ALTER TABLE delivery_notes ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE receipts ADD COLUMN currency TEXT DEFAULT 'RUB'",
    "ALTER TABLE visit_report_photos ADD COLUMN photo_type TEXT",
    "ALTER TABLE inventory_adjustment_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "ALTER TABLE on_hand_inventory_items ADD COLUMN unit TEXT DEFAULT 'шт'",
    "CREATE INDEX IF NOT EXISTS idx_customers_price_list ON customers(price_list_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_route ON orders(route_id)",
    "CREATE INDEX IF NOT EXISTS idx_deliveries_route ON deliveries(route_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_delivery ON payments(delivery_id)",
    // v6 migrations
    "CREATE TABLE IF NOT EXISTS price_list_types (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
  ];
  for (const sql of migrations) {
    try { await database.execAsync(sql); } catch { /* column already exists */ }
  }

  // Ensure expense types exist (idempotent)
  try { await ensureExpenseTypes(); } catch { /* table may not exist yet on first run */ }

  // Ensure adjustment reasons exist (idempotent)
  try { await ensureAdjustmentReasons(); } catch { /* ignore */ }

  // Check if already seeded — but skip seeding when server sync is enabled:
  // after clearReferenceData() the DB is empty and should be filled from
  // the middleware, not from local test data.
  const result = await database.getFirstAsync('SELECT COUNT(*) as count FROM products');
  if (result.count > 0) {
    console.log('Database already seeded, skipping...');
    return database;
  }

  const settings = useSettingsStore.getState();
  if (settings.isLoaded && settings.serverSyncEnabled) {
    console.log('Server sync enabled — skipping local seed, data will come from server');
    return database;
  }

  console.log('Seeding database with test data...');
  await seedDatabase(database);
  console.log('Database seeded successfully!');

  return database;
}

async function seedDatabase(database) {
  const {
    USERS,
    PRODUCTS,
    EMPTIES,
    SERVICES,
    PRODUCT_EMPTIES,
    UNITS,
    CUSTOMERS,
    VEHICLES,
    generatePrices,
    generateStock,
    generateVehicleStock,
    generateRoutes,
    generateOrders,
    generateDeliveriesAndPayments,
    generateReturns,
    generateNotifications,
    generateDevices,
    generateAuditLog,
    generateLoadingTrips,
    generateCashCollections,
    generatePackagingReturns,
    generateErrorLog,
  } = require('./seed');

  // Disable FK constraints during seed — after a server sync + clear,
  // the users table may contain server-synced rows with different IDs
  // than the seed data, causing FK violations on vehicles.driver_id,
  // routes.driver_id, etc.
  await database.execAsync('PRAGMA foreign_keys = OFF');
  await database.execAsync('BEGIN TRANSACTION');

  try {
    // Users
    for (const u of USERS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, phone, vehicle_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.username, u.password_hash, u.full_name, u.role, u.phone, u.vehicle_id]
      );
    }

    // Products
    for (const p of PRODUCTS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO products (id, sku, name, category, subcategory, brand, volume, volume_unit, unit, barcode, weight, weight_unit, vat_percent, material_type) VALUES (?, ?, ?, ?, ?, ?, ?, 'LTR', 'шт', ?, ?, 'KGM', ?, 'product')`,
        [p.id, p.sku, p.name, p.category, p.subcategory, p.brand, p.volume, p.barcode, p.weight, DEFAULT_VAT_PERCENT]
      );
    }

    // Services (услуги — no volume/weight)
    for (const s of SERVICES) {
      await database.runAsync(
        `INSERT OR IGNORE INTO products (id, sku, name, category, subcategory, brand, volume, volume_unit, unit, barcode, weight, weight_unit, vat_percent, material_type) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'шт', NULL, NULL, NULL, ?, ?)`,
        [s.id, s.sku, s.name, s.category, s.subcategory, s.brand, DEFAULT_VAT_PERCENT, s.material_type]
      );
    }

    // Empties (возвратная тара как материалы из ERP)
    for (const e of EMPTIES) {
      await database.runAsync(
        `INSERT OR IGNORE INTO products (id, sku, name, category, subcategory, brand, volume, volume_unit, unit, barcode, weight, weight_unit, vat_percent, material_type) VALUES (?, ?, ?, ?, ?, ?, ?, 'LTR', 'шт', ?, ?, 'KGM', ?, ?)`,
        [e.id, e.sku, e.name, e.category, e.subcategory, e.brand, e.volume, e.barcode, e.weight, DEFAULT_VAT_PERCENT, e.material_type]
      );
    }

    // Product-Empties links (tied empties)
    for (const pe of PRODUCT_EMPTIES) {
      await database.runAsync(
        `INSERT OR IGNORE INTO product_empties (id, product_id, empty_product_id, quantity, unit, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        [pe.id, pe.product_id, pe.empty_product_id, pe.quantity, pe.unit || 'шт', pe.is_active ?? 1]
      );
    }

    // Units
    for (const u of UNITS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO units (code, name) VALUES (?, ?)`,
        [u.code, u.name]
      );
    }

    // Customers
    for (const c of CUSTOMERS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO customers (id, name, ship_to_name, legal_name, inn, kpp, address, city, region, postal_code, latitude, longitude, contact_person, phone, visit_time_from, visit_time_to, delivery_notes_text, vat_rate, customer_type, payment_terms, credit_limit, debt_amount, currency, price_list_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.ship_to_name || null, c.legal_name, c.inn, c.kpp, c.address, c.city, c.region, c.postal_code, c.latitude, c.longitude, c.contact_person, c.phone, c.visit_time_from || null, c.visit_time_to || null, c.delivery_notes_text || null, c.vat_rate ?? DEFAULT_VAT_PERCENT, c.customer_type, c.payment_terms, c.credit_limit, c.debt_amount, c.currency || DEFAULT_CURRENCY, c.price_list_id || null]
      );
    }

    // Prices
    const prices = generatePrices();
    for (const p of prices) {
      await database.runAsync(
        `INSERT OR IGNORE INTO price_lists (id, product_id, price_type, price, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)`,
        [p.id, p.product_id, p.price_type, p.price, p.valid_from, p.valid_to]
      );
    }

    // Stock
    const stock = generateStock();
    for (const s of stock) {
      await database.runAsync(
        `INSERT OR IGNORE INTO stock (id, product_id, warehouse, quantity, reserved) VALUES (?, ?, ?, ?, ?)`,
        [s.id, s.product_id, s.warehouse, s.quantity, s.reserved]
      );
    }

    // Vehicles
    for (const v of VEHICLES) {
      await database.runAsync(
        `INSERT OR IGNORE INTO vehicles (id, plate_number, model, driver_id, capacity_kg) VALUES (?, ?, ?, ?, ?)`,
        [v.id, v.plate_number, v.model, v.driver_id, v.capacity_kg]
      );
    }

    // Vehicle stock
    const vehicleStock = generateVehicleStock();
    for (const s of vehicleStock) {
      await database.runAsync(
        `INSERT OR IGNORE INTO stock (id, product_id, warehouse, quantity, reserved) VALUES (?, ?, ?, ?, ?)`,
        [s.id, s.product_id, s.warehouse, s.quantity, s.reserved]
      );
    }

    // Routes & Route Points
    const { routes, routePoints } = generateRoutes();
    for (const r of routes) {
      await database.runAsync(
        `INSERT OR IGNORE INTO routes (id, date, name, driver_id, status, vehicle_number) VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.date, r.name || null, r.driver_id, r.status, r.vehicle_number]
      );
    }
    for (const rp of routePoints) {
      await database.runAsync(
        `INSERT OR IGNORE INTO route_points (id, route_id, customer_id, sequence_number, planned_arrival, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [rp.id, rp.route_id, rp.customer_id, rp.sequence_number, rp.planned_arrival, rp.status]
      );
    }

    // Orders & Order Items
    const { orders, orderItems } = generateOrders();
    for (const o of orders) {
      await database.runAsync(
        `INSERT OR IGNORE INTO orders (id, customer_id, user_id, route_id, route_point_id, order_date, status, total_amount, discount_amount, vat_amount, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.id, o.customer_id, o.user_id, o.route_id || null, o.route_point_id, o.order_date, o.status, o.total_amount, o.discount_amount, o.vat_amount || 0, o.currency || DEFAULT_CURRENCY]
      );
    }
    for (const oi of orderItems) {
      await database.runAsync(
        `INSERT OR IGNORE INTO order_items (id, order_id, product_id, quantity, price, discount_percent, vat_percent, total, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.discount_percent, oi.vat_percent ?? DEFAULT_VAT_PERCENT, oi.total, oi.unit || 'шт', oi.currency || DEFAULT_CURRENCY]
      );
    }

    // Deliveries, Delivery Items & Payments
    const { deliveries, deliveryItems, payments } = generateDeliveriesAndPayments();
    for (const d of deliveries) {
      await database.runAsync(
        `INSERT OR IGNORE INTO deliveries (id, order_id, route_id, route_point_id, customer_id, driver_id, delivery_date, status, total_amount, currency, signature_name, signature_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.order_id, d.route_id || null, d.route_point_id, d.customer_id, d.driver_id, d.delivery_date, d.status, d.total_amount, d.currency || DEFAULT_CURRENCY, d.signature_name, d.signature_confirmed]
      );
    }
    for (const di of deliveryItems) {
      await database.runAsync(
        `INSERT OR IGNORE INTO delivery_items (id, delivery_id, product_id, ordered_quantity, delivered_quantity, price, total, reason_code, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [di.id, di.delivery_id, di.product_id, di.ordered_quantity, di.delivered_quantity, di.price, di.total, di.reason_code || null, di.unit || 'шт', di.currency || DEFAULT_CURRENCY]
      );
    }
    for (const p of payments) {
      await database.runAsync(
        `INSERT OR IGNORE INTO payments (id, customer_id, user_id, order_id, delivery_id, route_point_id, payment_date, amount, change_amount, currency, payment_type, status, receipt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.customer_id, p.user_id, p.order_id, p.delivery_id || null, p.route_point_id, p.payment_date, p.amount, p.change_amount || 0, p.currency || DEFAULT_CURRENCY, p.payment_type, p.status, p.receipt_number]
      );
    }

    // Returns & Return Items
    const { returns, returnItems } = generateReturns();
    for (const r of returns) {
      await database.runAsync(
        `INSERT OR IGNORE INTO returns (id, customer_id, driver_id, route_point_id, return_date, reason, status, total_amount, currency, approved_by, approved_at, rejection_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.customer_id, r.driver_id, r.route_point_id, r.return_date, r.reason, r.status, r.total_amount, r.currency || DEFAULT_CURRENCY, r.approved_by || null, r.approved_at || null, r.rejection_reason || null]
      );
    }
    for (const ri of returnItems) {
      await database.runAsync(
        `INSERT OR IGNORE INTO return_items (id, return_id, product_id, quantity, price, total, condition, reason, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ri.id, ri.return_id, ri.product_id, ri.quantity, ri.price, ri.total, ri.condition, ri.reason, ri.unit || 'шт', ri.currency || DEFAULT_CURRENCY]
      );
    }

    // Notifications
    const notifications = generateNotifications();
    for (const n of notifications) {
      await database.runAsync(
        `INSERT OR IGNORE INTO notifications (id, user_id, title, message, type, is_read, related_entity, related_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.user_id, n.title, n.message, n.type, n.is_read, n.related_entity, n.related_id, n.created_at]
      );
    }

    // Devices
    const devices = generateDevices();
    for (const d of devices) {
      await database.runAsync(
        `INSERT OR IGNORE INTO devices (id, user_id, device_model, os_version, app_version, last_sync_at, status, storage_used_mb) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.user_id, d.device_model, d.os_version, d.app_version, d.last_sync_at, d.status, d.storage_used_mb]
      );
    }

    // Audit Log
    const auditEntries = generateAuditLog();
    for (const a of auditEntries) {
      await database.runAsync(
        `INSERT OR IGNORE INTO audit_log (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details, a.created_at]
      );
    }

    // Loading Trips & Items
    const { trips, tripItems } = generateLoadingTrips();
    for (const t of trips) {
      await database.runAsync(
        `INSERT OR IGNORE INTO loading_trips (id, driver_id, vehicle_id, route_id, loading_date, status, total_items, loaded_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.driver_id, t.vehicle_id, t.route_id, t.loading_date, t.status, t.total_items, t.loaded_items]
      );
    }
    for (const ti of tripItems) {
      await database.runAsync(
        `INSERT OR IGNORE INTO loading_trip_items (id, loading_trip_id, product_id, planned_quantity, actual_quantity, scanned, unit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ti.id, ti.loading_trip_id, ti.product_id, ti.planned_quantity, ti.actual_quantity, ti.scanned, ti.unit || 'шт']
      );
    }

    // Cash Collections
    const cashCollections = generateCashCollections();
    for (const cc of cashCollections) {
      await database.runAsync(
        `INSERT OR IGNORE INTO cash_collections (id, driver_id, route_id, collection_date, expected_amount, actual_amount, discrepancy, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cc.id, cc.driver_id, cc.route_id, cc.collection_date, cc.expected_amount, cc.actual_amount, cc.discrepancy, cc.currency || DEFAULT_CURRENCY, cc.status]
      );
    }

    // Packaging Returns
    const { packagingReturns, packagingReturnItems } = generatePackagingReturns();
    for (const pr of packagingReturns) {
      await database.runAsync(
        `INSERT OR IGNORE INTO packaging_returns (id, customer_id, driver_id, route_point_id, return_date, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [pr.id, pr.customer_id, pr.driver_id, pr.route_point_id, pr.return_date, pr.status]
      );
    }
    for (const pri of packagingReturnItems) {
      await database.runAsync(
        `INSERT OR IGNORE INTO packaging_return_items (id, packaging_return_id, product_id, expected_quantity, actual_quantity, condition, unit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pri.id, pri.packaging_return_id, pri.product_id, pri.expected_quantity, pri.actual_quantity, pri.condition, pri.unit || 'шт']
      );
    }

    // Sync meta
    const entities = ['users', 'customers', 'products', 'price_lists', 'stock', 'routes', 'notifications', 'devices'];
    const now = new Date().toISOString();
    for (const e of entities) {
      await database.runAsync(
        `INSERT OR IGNORE INTO sync_meta (entity_type, last_sync_at) VALUES (?, ?)`,
        [e, now]
      );
    }

    // Adjustment Reasons (seed)
    const adjustmentReasons = [
      { id: 'ar-breakage', code: 'breakage', name_ru: 'Бой / Повреждение', name_en: 'Breakage', sort_order: 1 },
      { id: 'ar-theft', code: 'theft', name_ru: 'Хищение', name_en: 'Theft', sort_order: 2 },
      { id: 'ar-incorrect-freight', code: 'incorrect_freight', name_ru: 'Некорректная накладная', name_en: 'Incorrect freight list', sort_order: 3 },
      { id: 'ar-truck-transfer', code: 'truck_transfer', name_ru: 'Перемещение между машинами', name_en: 'Truck-to-truck transfer', sort_order: 4 },
      { id: 'ar-expired', code: 'expired', name_ru: 'Истёк срок годности', name_en: 'Expired', sort_order: 5 },
      { id: 'ar-recount', code: 'recount', name_ru: 'Пересчёт', name_en: 'Recount', sort_order: 6 },
    ];
    for (const ar of adjustmentReasons) {
      await database.runAsync(
        `INSERT OR IGNORE INTO adjustment_reasons (id, code, name_ru, name_en, is_active, sort_order) VALUES (?, ?, ?, ?, 1, ?)`,
        [ar.id, ar.code, ar.name_ru, ar.name_en, ar.sort_order]
      );
    }

    // Error Log (seed)
    const errorLogEntries = generateErrorLog();
    for (const e of errorLogEntries) {
      await database.runAsync(
        `INSERT OR IGNORE INTO error_log (id, severity, source, message, context, stack_trace, user_id, screen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.severity, e.source, e.message, e.context || null, e.stack_trace || null, e.user_id || null, e.screen || null, e.created_at]
      );
    }

    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  } finally {
    await database.execAsync('PRAGMA foreign_keys = ON');
  }
}

// Clears reference/master data and all dependent transactional data so that
// the database can be cleanly re-populated from the middleware via sync pull.
// Deletes in strict FK dependency order (children → parents) so no PRAGMA
// foreign_keys = OFF is needed. Preserves: users, sync_log, error_log,
// audit_log, notifications, devices.
export async function clearReferenceData() {
  console.log('[DB] clearReferenceData START');
  const database = await getDatabase();

  // Strict FK dependency order: deepest children first, then parents.
  // Every table that directly or transitively references a reference table
  // must be deleted before that reference table.
  const tablesToClear = [
    // Document attachments & photos (leaf nodes)
    'expense_attachments',
    'visit_report_photos',
    'vehicle_check_items',
    // Invoice chain (leaf → parent)
    'receipts',
    'delivery_notes',
    'invoice_items',
    'invoices',
    // Inventory items
    'on_hand_inventory_items',
    'on_hand_inventory',
    'inventory_adjustment_items',
    'inventory_adjustments',
    // Packaging return items
    'packaging_return_items',
    'packaging_returns',
    // Return items
    'return_items',
    'returns',
    // Delivery items
    'delivery_items',
    'deliveries',
    // Order items (references products)
    'order_items',
    'orders',
    // Payments (references customers)
    'payments',
    // Cash collections
    'cash_collections',
    // Visit reports (references route_points, customers)
    'visit_reports',
    // Expenses (references expense_types)
    'expenses',
    // Tour check-ins (references vehicles)
    'tour_checkins',
    // GPS tracks (references routes)
    'gps_tracks',
    // Loading trip items (references products, loading_trips)
    'loading_trip_items',
    'loading_trips',
    // Route points (references routes, customers)
    'route_points',
    'routes',
    // Stock (references products)
    'stock',
    // Price & product hierarchy
    'product_empties',
    'price_lists',
    'price_list_types',
    'products',
    'units',
    // Customers & vehicles (referenced by many tables above)
    'customers',
    'vehicles',
    // Config reference tables
    'expense_types',
    'adjustment_reasons',
    // Sync timestamps (so next pull re-fetches everything)
    'sync_meta',
  ];

  let cleared = 0;
  for (const table of tablesToClear) {
    try {
      const result = await database.runAsync(`DELETE FROM ${table}`);
      if (result.changes > 0) {
        console.log(`[DB] Cleared ${table}: ${result.changes} rows`);
        cleared += result.changes;
      }
    } catch (e) {
      console.error(`[DB] Failed to clear ${table}: ${e.message}`);
    }
  }

  console.log(`[DB] clearReferenceData COMPLETE — ${cleared} total rows deleted`);
}

// Full clear: deletes ALL data from ALL tables (for database reset).
// Use clearReferenceData() instead for re-downloading master data from server.
export async function clearAllData() {
  console.log('[DB] clearAllData START');
  const database = await getDatabase();
  await database.execAsync('PRAGMA foreign_keys = OFF');

  const tables = [
    'sync_meta', 'sync_log',
    'gps_tracks', 'error_log', 'audit_log',
    'notifications', 'devices',
    'expense_attachments', 'expenses',
    'invoice_items', 'invoices',
    'delivery_notes', 'receipts',
    'visit_report_photos', 'visit_reports',
    'vehicle_check_items', 'tour_checkins',
    'on_hand_inventory_items', 'on_hand_inventory',
    'inventory_adjustment_items', 'inventory_adjustments',
    'packaging_return_items', 'packaging_returns',
    'cash_collections',
    'return_items', 'returns',
    'delivery_items', 'deliveries',
    'order_items', 'orders',
    'payments',
    'loading_trip_items', 'loading_trips',
    'route_points', 'routes',
    'stock',
    'units', 'product_empties', 'price_lists', 'price_list_types', 'products',
    'customers', 'vehicles',
    'expense_types', 'adjustment_reasons',
    'users',
  ];

  await database.execAsync('BEGIN TRANSACTION');
  for (const table of tables) {
    await database.execAsync(`DELETE FROM ${table}`);
  }
  await database.execAsync('COMMIT');
  await database.execAsync('PRAGMA foreign_keys = ON');
  console.log('[DB] clearAllData COMPLETE');
}

export async function resetAndSeedDatabase() {
  const database = await getDatabase();

  // Disable FK checks temporarily for clean drop
  await database.execAsync('PRAGMA foreign_keys = OFF');

  const tables = [
    'on_hand_inventory_items', 'on_hand_inventory',
    'inventory_adjustment_items', 'inventory_adjustments', 'adjustment_reasons',
    'visit_report_photos', 'visit_reports',
    'receipts', 'delivery_notes', 'invoice_items', 'invoices',
    'expense_attachments', 'expenses', 'expense_types',
    'sync_meta', 'sync_log',
    'audit_log', 'devices', 'notifications',
    'packaging_return_items', 'packaging_returns',
    'vehicle_check_items', 'tour_checkins',
    'cash_collections',
    'loading_trip_items', 'loading_trips',
    'payments',
    'return_items', 'returns',
    'delivery_items', 'deliveries',
    'order_items', 'orders',
    'route_points', 'routes',
    'stock', 'vehicles',
    'gps_tracks', 'error_log',
    'units', 'product_empties', 'price_lists', 'price_list_types', 'products',
    'customers', 'users',
  ];

  // Drop all tables and recreate with latest schema
  for (const table of tables) {
    await database.execAsync(`DROP TABLE IF EXISTS ${table}`);
  }
  await database.execAsync('PRAGMA foreign_keys = ON');

  for (const sql of CREATE_TABLES) {
    await database.execAsync(sql);
  }

  // Re-seed
  await seedDatabase(database);
  try { await ensureExpenseTypes(); } catch { /* ignore */ }
  try { await ensureAdjustmentReasons(); } catch { /* ignore */ }

  console.log('Database reset and re-seeded successfully!');
}

// =====================================================
// PRODUCTS
// =====================================================

export async function getAllProducts() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT p.*,
           (SELECT pl.price FROM price_lists pl
            WHERE pl.product_id = p.id
              AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
              AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
            ORDER BY pl.valid_from DESC LIMIT 1) as base_price,
           (SELECT s.quantity FROM stock s WHERE s.product_id = p.id AND s.warehouse = 'main' LIMIT 1) as stock_quantity
    FROM products p
    WHERE p.is_active = 1
    ORDER BY p.category, p.name
  `);
}

export async function getProductsWithPrices(excludeEmpties = false, customerId = null, includeServices = true) {
  const database = await getDatabase();
  const types = includeServices ? "'product', 'service'" : "'product'";
  const where = excludeEmpties
    ? `WHERE p.is_active = 1 AND COALESCE(p.material_type, 'product') IN (${types})`
    : !includeServices
      ? `WHERE p.is_active = 1 AND COALESCE(p.material_type, 'product') != 'service'`
      : "WHERE p.is_active = 1";

  if (customerId) {
    return database.getAllAsync(`
      SELECT p.id, p.name, p.sku, p.category, p.brand, p.volume, p.barcode, p.vat_percent, p.material_type,
             COALESCE(
               (SELECT pl.price FROM price_lists pl
                WHERE pl.product_id = p.id
                  AND pl.price_type = (
                    SELECT plt.name FROM price_list_types plt
                    JOIN customers c ON c.price_list_id = plt.id
                    WHERE c.id = ?
                  )
                  AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
                  AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
                ORDER BY pl.valid_from DESC LIMIT 1),
               (SELECT pl.price FROM price_lists pl
                WHERE pl.product_id = p.id
                  AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
                  AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
                ORDER BY pl.valid_from DESC LIMIT 1)
             ) as base_price
      FROM products p
      ${where}
      ORDER BY p.category, p.name
    `, [customerId]);
  }

  return database.getAllAsync(`
    SELECT p.id, p.name, p.sku, p.category, p.brand, p.volume, p.barcode, p.vat_percent, p.material_type,
           (SELECT pl.price FROM price_lists pl
            WHERE pl.product_id = p.id
              AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
              AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
            ORDER BY pl.valid_from DESC LIMIT 1) as base_price
    FROM products p
    ${where}
    ORDER BY p.category, p.name
  `);
}

export async function searchProductByBarcode(barcode) {
  const database = await getDatabase();
  return database.getFirstAsync(`
    SELECT p.*,
           (SELECT pl.price FROM price_lists pl
            WHERE pl.product_id = p.id
              AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
              AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
            ORDER BY pl.valid_from DESC LIMIT 1) as base_price
    FROM products p
    WHERE p.barcode = ? AND p.is_active = 1
  `, [barcode]);
}

// =====================================================
// CUSTOMERS
// =====================================================

export async function getAllCustomers() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT * FROM customers WHERE is_active = 1 ORDER BY city, name
  `);
}

export async function getCustomerById(customerId) {
  const database = await getDatabase();
  return database.getFirstAsync(`SELECT * FROM customers WHERE id = ?`, [customerId]);
}

export async function getCustomerDebt() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT id, name, city, debt_amount, credit_limit, payment_terms
    FROM customers
    WHERE is_active = 1 AND debt_amount > 0
    ORDER BY debt_amount DESC
  `);
}

// =====================================================
// ROUTES
// =====================================================

export async function getRoutesByDate(date, driverId = null) {
  const database = await getDatabase();
  if (driverId) {
    return database.getAllAsync(`
      SELECT r.*, u.full_name as driver_name
      FROM routes r
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(r.driver_id AS TEXT)
      WHERE r.date = ? AND CAST(r.driver_id AS TEXT) = CAST(? AS TEXT)
      ORDER BY r.id
    `, [date, driverId]);
  }
  return database.getAllAsync(`
    SELECT r.*, u.full_name as driver_name
    FROM routes r
    LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(r.driver_id AS TEXT)
    WHERE r.date = ?
    ORDER BY r.id
  `, [date]);
}

export async function getRoutePoints(routeId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT rp.*, c.name as customer_name, c.address as customer_address,
           c.phone as customer_phone, c.contact_person, c.debt_amount,
           c.latitude, c.longitude
    FROM route_points rp
    JOIN customers c ON c.id = rp.customer_id
    WHERE rp.route_id = ?
    ORDER BY rp.sequence_number
  `, [routeId]);
}

export async function updateRoutePointStatus(pointId, status) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const fields = { status };
  if (status === VISIT_STATUS.ARRIVED) fields.actual_arrival = now;
  if (status === VISIT_STATUS.COMPLETED) fields.actual_departure = now;

  await database.runAsync(
    `UPDATE route_points SET status = ?, actual_arrival = COALESCE(?, actual_arrival), actual_departure = COALESCE(?, actual_departure) WHERE id = ?`,
    [status, fields.actual_arrival || null, fields.actual_departure || null, pointId]
  );
  const opId = generateId();
  await logSyncOperation('route_point', opId, 'update',
    buildRoutePointStatusPayload(pointId, status, fields.actual_arrival, fields.actual_departure));
}

export async function updateRouteStatus(routeId, status) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE routes SET status = ?, updated_at = ? WHERE id = ?`,
    [status, now, routeId]
  );
  const opId = generateId();
  await logSyncOperation('route', opId, 'update',
    buildRouteStatusPayload(routeId, status));
}

export async function getActiveVisitCustomer(driverId) {
  const database = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const row = await database.getFirstAsync(`
    SELECT rp.id as point_id, rp.customer_id, c.name as customer_name, r.id as route_id
    FROM route_points rp
    JOIN routes r ON r.id = rp.route_id
    JOIN customers c ON c.id = rp.customer_id
    WHERE CAST(r.driver_id AS TEXT) = CAST(? AS TEXT) AND r.date = ? AND rp.status = '${VISIT_STATUS.IN_PROGRESS}'
    LIMIT 1
  `, [driverId, today]);
  return row || null;
}

// =====================================================
// ORDERS
// =====================================================

export async function getAllOrders() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT o.*, c.name as customer_name, c.address as customer_address, u.full_name as user_name
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN users u ON u.id = o.user_id
    ORDER BY o.order_date DESC, o.id
  `);
}

export async function getTodayOrdersByUser(userId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return database.getAllAsync(`
    SELECT o.*, c.name as customer_name, c.address as customer_address, u.full_name as user_name
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN users u ON u.id = o.user_id
    WHERE o.user_id = ? AND date(o.order_date) = ?
    ORDER BY o.order_date DESC, o.id
  `, [userId, today]);
}

export async function getOrdersByCustomer(customerId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT o.*, u.full_name as user_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.customer_id = ?
    ORDER BY o.order_date DESC
  `, [customerId]);
}

export async function getOrdersByRoutePoint(routePointId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT o.*, c.name as customer_name
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.route_point_id = ?
    ORDER BY o.id
  `, [routePointId]);
}

export async function getOrdersByRoutes(routeIds) {
  if (!routeIds || routeIds.length === 0) return [];
  const database = await getDatabase();
  const placeholders = routeIds.map(() => '?').join(',');
  return database.getAllAsync(`
    SELECT o.*, c.name as customer_name, c.address as customer_address, u.full_name as user_name
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN users u ON u.id = o.user_id
    JOIN route_points rp ON rp.id = o.route_point_id
    WHERE rp.route_id IN (${placeholders})
    ORDER BY o.order_date DESC, o.id
  `, routeIds);
}

export async function getOrderById(id) {
  const database = await getDatabase();
  return database.getFirstAsync(`
    SELECT o.*, c.name as customer_name, c.address as customer_address
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `, [id]);
}

export async function searchOrderByCode(code) {
  const database = await getDatabase();
  // Try exact match by order ID first
  let order = await database.getFirstAsync(`
    SELECT o.*, c.name as customer_name, c.address as customer_address
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `, [code]);
  if (order) return order;
  // Try match by last 6 chars of order ID (short code from QR)
  order = await database.getFirstAsync(`
    SELECT o.*, c.name as customer_name, c.address as customer_address
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id LIKE ?
  `, [`%${code}`]);
  if (order) return order;
  // Try match by delivery ID
  const delivery = await database.getFirstAsync(`
    SELECT d.order_id
    FROM deliveries d
    WHERE d.id = ? OR d.id LIKE ?
  `, [code, `%${code}`]);
  if (delivery) {
    return database.getFirstAsync(`
      SELECT o.*, c.name as customer_name, c.address as customer_address
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `, [delivery.order_id]);
  }
  return null;
}

export async function getOrderItems(orderId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT oi.*, p.name as product_name, p.sku, p.volume
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `, [orderId]);
}

export async function createOrder(order) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO orders (id, customer_id, user_id, route_id, route_point_id, order_date, status, total_amount, discount_amount, vat_amount, currency, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '${ORDER_STATUS.DRAFT}', ?, 0, 0, ?, ?, ?, ?)`,
    [id, order.customer_id, order.user_id, order.route_id || null, order.route_point_id || null, now, order.total_amount || 0, order.currency || DEFAULT_CURRENCY, order.notes || null, now, now]
  );
  return id;
}

export async function updateOrder(id, fields) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const setClauses = ['updated_at = ?'];
  const params = [now];
  if (fields.customer_id !== undefined) { setClauses.push('customer_id = ?'); params.push(fields.customer_id); }
  if (fields.total_amount !== undefined) { setClauses.push('total_amount = ?'); params.push(fields.total_amount); }
  if (fields.discount_amount !== undefined) { setClauses.push('discount_amount = ?'); params.push(fields.discount_amount); }
  if (fields.notes !== undefined) { setClauses.push('notes = ?'); params.push(fields.notes); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); params.push(fields.status); }
  params.push(id);
  await database.runAsync(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, params);
  await logSyncOperation('order', id, 'update', { id, ...fields });
}

export async function shipOrdersByRoutePoint(routePointId) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const affected = await database.getAllAsync(
    `SELECT id FROM orders WHERE route_point_id = ? AND status IN ('${ORDER_STATUS.DRAFT}', '${ORDER_STATUS.CONFIRMED}')`,
    [routePointId]
  );
  await database.runAsync(
    `UPDATE orders SET status = '${ORDER_STATUS.SHIPPED}', updated_at = ? WHERE route_point_id = ? AND status IN ('${ORDER_STATUS.DRAFT}', '${ORDER_STATUS.CONFIRMED}')`,
    [now, routePointId]
  );
  for (const row of affected) {
    await logSyncOperation('order', row.id, 'update', { id: row.id, status: ORDER_STATUS.SHIPPED });
  }
}

/**
 * Decrease stock in a warehouse (vehicle) after shipment.
 * items: [{ product_id, quantity }]
 */
export async function decreaseStock(warehouse, items) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  try {
    await database.execAsync('BEGIN TRANSACTION');
    for (const item of items) {
      if (item.quantity > 0) {
        await database.runAsync(
          `UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE warehouse = ? AND product_id = ?`,
          [item.quantity, now, warehouse, item.product_id]
        );
      }
    }
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

/**
 * Increase stock in a warehouse (vehicle) after return.
 * items: [{ product_id, quantity }]
 */
export async function increaseStock(warehouse, items) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  try {
    await database.execAsync('BEGIN TRANSACTION');
    for (const item of items) {
      if (item.quantity > 0) {
        await database.runAsync(
          `INSERT INTO stock (id, product_id, warehouse, quantity, reserved, updated_at)
           VALUES (?, ?, ?, ?, 0, ?)
           ON CONFLICT(warehouse, product_id) DO UPDATE SET
             quantity = quantity + excluded.quantity,
             updated_at = excluded.updated_at`,
          [generateId(), item.product_id, warehouse, item.quantity, now]
        );
      }
    }
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function deleteOrder(id) {
  const database = await getDatabase();
  try {
    await database.execAsync('BEGIN TRANSACTION');
    await database.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [id]);
    await database.runAsync(`DELETE FROM orders WHERE id = ?`, [id]);
    await logSyncOperation('order', id, 'delete', { id });
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function saveOrderItems(orderId, items) {
  const database = await getDatabase();
  try {
    await database.execAsync('BEGIN TRANSACTION');
    await database.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
    for (const item of items) {
      const itemId = generateId();
      await database.runAsync(
        `INSERT INTO order_items (id, order_id, product_id, quantity, price, discount_percent, vat_percent, total, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, item.product_id, item.quantity, item.price, item.discount_percent || 0, item.vat_percent ?? null, item.total, item.unit || 'шт', item.currency || DEFAULT_CURRENCY]
      );
    }
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function saveOrderWithItems(orderData, items, isEdit = false) {
  const database = await getDatabase();
  await database.execAsync('BEGIN TRANSACTION');
  try {
    let orderId;
    const now = new Date().toISOString();
    if (isEdit) {
      orderId = orderData.id;
      await database.runAsync(
        `UPDATE orders SET customer_id=?, total_amount=?, discount_amount=?, vat_amount=?, notes=?, status=?, updated_at=? WHERE id=?`,
        [orderData.customer_id, orderData.total_amount, orderData.discount_amount || 0, orderData.vat_amount || 0, orderData.notes || null, orderData.status || ORDER_STATUS.DRAFT, now, orderId]
      );
    } else {
      orderId = generateId();
      await database.runAsync(
        `INSERT INTO orders (id, customer_id, user_id, route_id, route_point_id, order_date, status, total_amount, discount_amount, vat_amount, currency, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, '${ORDER_STATUS.DRAFT}', ?, 0, ?, ?, ?, ?, ?)`,
        [orderId, orderData.customer_id, orderData.user_id, orderData.route_id || null, orderData.route_point_id || null, now, orderData.total_amount || 0, orderData.vat_amount || 0, orderData.currency || DEFAULT_CURRENCY, orderData.notes || null, now, now]
      );
    }

    await database.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
    const savedItems = [];
    for (const item of items) {
      const itemId = generateId();
      await database.runAsync(
        `INSERT INTO order_items (id, order_id, product_id, quantity, price, discount_percent, vat_percent, total, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, item.product_id, item.quantity, item.price, item.discount_percent || 0, item.vat_percent ?? null, item.total, item.unit || 'шт', item.currency || DEFAULT_CURRENCY]
      );
      savedItems.push({ id: itemId, order_id: orderId, ...item });
    }

    await logSyncOperation('order', orderId, isEdit ? 'update' : 'create',
      buildOrderPayload({
        id: orderId,
        ...orderData,
        order_date: now,
        status: isEdit ? (orderData.status || ORDER_STATUS.DRAFT) : ORDER_STATUS.DRAFT,
        created_at: now,
        updated_at: now,
      }, savedItems));

    await database.execAsync('COMMIT');
    return orderId;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

// =====================================================
// DELIVERIES
// =====================================================

export async function getDeliveries(driverId = null) {
  const database = await getDatabase();
  if (driverId) {
    return database.getAllAsync(`
      SELECT d.*, c.name as customer_name, c.address as customer_address
      FROM deliveries d
      JOIN customers c ON c.id = d.customer_id
      WHERE d.driver_id = ?
      ORDER BY d.delivery_date DESC
    `, [driverId]);
  }
  return database.getAllAsync(`
    SELECT d.*, c.name as customer_name, c.address as customer_address,
           u.full_name as driver_name
    FROM deliveries d
    JOIN customers c ON c.id = d.customer_id
    JOIN users u ON u.id = d.driver_id
    ORDER BY d.delivery_date DESC
  `);
}

export async function createDelivery(delivery) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO deliveries (id, order_id, route_id, route_point_id, customer_id, driver_id, delivery_date, status, total_amount, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '${DELIVERY_STATUS.PENDING}', ?, ?, ?, ?)`,
    [id, delivery.order_id || null, delivery.route_id || null, delivery.route_point_id || null, delivery.customer_id, delivery.driver_id, now, delivery.total_amount || 0, delivery.currency || DEFAULT_CURRENCY, now, now]
  );
  await logSyncOperation('delivery', id, 'create',
    buildDeliveryPayload({ id, ...delivery, status: DELIVERY_STATUS.PENDING }, []));
  return id;
}

export async function getDeliveryByRoutePoint(routePointId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT * FROM deliveries WHERE route_point_id = ? ORDER BY created_at DESC LIMIT 1`,
    [routePointId]
  );
}

export async function getDeliveryItems(deliveryId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT di.*, p.name as product_name, p.sku, p.volume, p.category, p.brand
    FROM delivery_items di
    JOIN products p ON p.id = di.product_id
    WHERE di.delivery_id = ?
    ORDER BY p.name
  `, [deliveryId]);
}

export async function createDeliveryWithItems(delivery, items) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  try {
    await database.execAsync('BEGIN TRANSACTION');
    await database.runAsync(
      `INSERT INTO deliveries (id, order_id, route_id, route_point_id, customer_id, driver_id, delivery_date, status, total_amount, currency, signature_name, signature_data, signature_driver_data, signature_confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, delivery.order_id || null, delivery.route_id || null, delivery.route_point_id || null, delivery.customer_id, delivery.driver_id, now, DELIVERY_STATUS.DELIVERED, delivery.total_amount || 0, delivery.currency || DEFAULT_CURRENCY, delivery.signature_name || null, delivery.signature_data || null, delivery.signature_driver_data || null, now, now]
    );
    const savedItems = [];
    for (const item of items) {
      const diId = generateId();
      await database.runAsync(
        `INSERT INTO delivery_items (id, delivery_id, product_id, ordered_quantity, delivered_quantity, price, total, reason_code, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [diId, id, item.product_id, item.ordered_quantity || 0, item.delivered_quantity, item.price, item.delivered_quantity * item.price, item.reason_code || null, item.unit || 'шт', item.currency || DEFAULT_CURRENCY]
      );
      savedItems.push({ id: diId, delivery_id: id, ...item });
    }

    await logSyncOperation('delivery', id, 'create',
      buildDeliveryPayload({
        id, ...delivery,
        delivery_date: now,
        status: DELIVERY_STATUS.DELIVERED,
        created_at: now,
        updated_at: now,
      }, savedItems));

    await database.execAsync('COMMIT');
    return id;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function updateDeliveryStatus(id, status, signatureName = null) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE deliveries SET status = ?, signature_name = COALESCE(?, signature_name), signature_confirmed = CASE WHEN ? IS NOT NULL THEN 1 ELSE signature_confirmed END, updated_at = ? WHERE id = ?`,
    [status, signatureName, signatureName, now, id]
  );
  await logSyncOperation('delivery', id, 'update', { id, status, signature_name: signatureName });
}

export async function processShipmentDelivery({ pointId, customerId, driverId, totalAmount, signatureName, signatureData, signatureDriverData, shipmentItems, vehicleId, routeId, currency }) {
  const database = await getDatabase();
  await database.execAsync('BEGIN TRANSACTION');
  try {
    const now = new Date().toISOString();

    // 1. Update order statuses to 'shipped'
    await database.runAsync(
      `UPDATE orders SET status = '${ORDER_STATUS.SHIPPED}', updated_at = ? WHERE route_point_id = ? AND status IN ('${ORDER_STATUS.DRAFT}', '${ORDER_STATUS.CONFIRMED}')`,
      [now, pointId]
    );

    // 2. Create delivery + items
    const deliveryId = generateId();
    await database.runAsync(
      `INSERT INTO deliveries (id, order_id, route_id, route_point_id, customer_id, driver_id, delivery_date, status, total_amount, currency, signature_name, signature_data, signature_driver_data, signature_confirmed, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, '${DELIVERY_STATUS.DELIVERED}', ?, ?, ?, ?, ?, 1, ?, ?)`,
      [deliveryId, routeId || null, pointId, customerId, driverId, now, totalAmount, currency || DEFAULT_CURRENCY, signatureName, signatureData, signatureDriverData, now, now]
    );

    const savedItems = [];
    for (const item of shipmentItems) {
      const itemId = generateId();
      await database.runAsync(
        `INSERT INTO delivery_items (id, delivery_id, product_id, ordered_quantity, delivered_quantity, price, total, reason_code, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, deliveryId, item.product_id, item.ordered_quantity || 0, item.delivered_quantity, item.price, item.delivered_quantity * item.price, item.reason_code || null, item.unit || 'шт', item.currency || DEFAULT_CURRENCY]
      );
      savedItems.push({ id: itemId, delivery_id: deliveryId, ...item });
    }

    // 3. Decrease vehicle stock
    if (vehicleId) {
      for (const item of shipmentItems) {
        if (item.delivered_quantity > 0) {
          await database.runAsync(
            `UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE product_id = ? AND warehouse = ?`,
            [item.delivered_quantity, now, item.product_id, vehicleId]
          );
        }
      }
    }

    await logSyncOperation('delivery', deliveryId, 'create',
      buildDeliveryPayload(
        {
          id: deliveryId, route_point_id: pointId, customer_id: customerId,
          driver_id: driverId, total_amount: totalAmount, route_id: routeId,
          currency: currency || DEFAULT_CURRENCY,
          delivery_date: now, status: DELIVERY_STATUS.DELIVERED,
          signature_name: signatureName,
          created_at: now, updated_at: now,
        },
        savedItems
      ));

    await database.execAsync('COMMIT');
    return deliveryId;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

// =====================================================
// RETURNS (с утверждением супервайзером)
// =====================================================

export async function getReturns(driverId = null) {
  const database = await getDatabase();
  if (driverId) {
    return database.getAllAsync(`
      SELECT r.*, c.name as customer_name
      FROM returns r
      JOIN customers c ON c.id = r.customer_id
      WHERE r.driver_id = ?
      ORDER BY r.return_date DESC
    `, [driverId]);
  }
  return database.getAllAsync(`
    SELECT r.*, c.name as customer_name, u.full_name as driver_name
    FROM returns r
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.driver_id
    ORDER BY r.return_date DESC
  `);
}

export async function getReturnsPendingApproval() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT r.*, c.name as customer_name, c.address as customer_address,
           u.full_name as driver_name
    FROM returns r
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.driver_id
    WHERE r.status = '${RETURN_STATUS.PENDING_APPROVAL}'
    ORDER BY r.return_date DESC
  `);
}

export async function getReturnById(id) {
  const database = await getDatabase();
  return database.getFirstAsync(`
    SELECT r.*, c.name as customer_name, c.address as customer_address,
           u.full_name as driver_name, a.full_name as approver_name
    FROM returns r
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.driver_id
    LEFT JOIN users a ON a.id = r.approved_by
    WHERE r.id = ?
  `, [id]);
}

export async function getReturnItems(returnId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT ri.*, p.name as product_name, p.sku, p.volume
    FROM return_items ri
    JOIN products p ON p.id = ri.product_id
    WHERE ri.return_id = ?
  `, [returnId]);
}

export async function createReturn(ret) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(
      `INSERT INTO returns (id, customer_id, driver_id, route_point_id, return_date, reason, status, total_amount, currency, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '${RETURN_STATUS.PENDING_APPROVAL}', ?, ?, ?, ?)`,
      [id, ret.customer_id, ret.driver_id, ret.route_point_id || null, now, ret.reason, ret.total_amount || 0, ret.currency || DEFAULT_CURRENCY, ret.notes || null, now]
    );

    // Insert return items if provided
    const returnItems = ret.items || [];
    for (const item of returnItems) {
      const itemId = generateId();
      await database.runAsync(
        `INSERT INTO return_items (id, return_id, product_id, quantity, price, total, condition, reason, unit, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, id, item.product_id, item.quantity, item.price || 0, item.total || 0, item.condition || 'unsold', item.reason || null, item.unit || 'шт', item.currency || DEFAULT_CURRENCY]
      );
    }

    await logSyncOperation('return', id, 'create',
      buildReturnPayload({ id, ...ret, status: RETURN_STATUS.PENDING_APPROVAL }, returnItems));

    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
  return id;
}

export async function approveReturn(returnId, supervisorId) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE returns SET status = '${RETURN_STATUS.APPROVED}', approved_by = ?, approved_at = ? WHERE id = ?`,
    [supervisorId, now, returnId]
  );
  await logSyncOperation('return', returnId, 'update', { id: returnId, status: RETURN_STATUS.APPROVED, approved_by: supervisorId });
}

export async function rejectReturn(returnId, supervisorId, reason) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE returns SET status = '${RETURN_STATUS.REJECTED}', approved_by = ?, approved_at = ?, rejection_reason = ? WHERE id = ?`,
    [supervisorId, now, reason, returnId]
  );
  await logSyncOperation('return', returnId, 'update', { id: returnId, status: RETURN_STATUS.REJECTED, approved_by: supervisorId, rejection_reason: reason });
}

// =====================================================
// PAYMENTS
// =====================================================

export async function getPayments(userId = null) {
  const database = await getDatabase();
  if (userId) {
    return database.getAllAsync(`
      SELECT p.*, c.name as customer_name
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.user_id = ?
      ORDER BY p.payment_date DESC
    `, [userId]);
  }
  return database.getAllAsync(`
    SELECT p.*, c.name as customer_name, u.full_name as user_name
    FROM payments p
    JOIN customers c ON c.id = p.customer_id
    JOIN users u ON u.id = p.user_id
    ORDER BY p.payment_date DESC
  `);
}

export async function createPayment(payment) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO payments (id, customer_id, user_id, order_id, delivery_id, route_point_id, payment_date, amount, change_amount, currency, payment_type, status, receipt_number, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [id, payment.customer_id, payment.user_id, payment.order_id || null, payment.delivery_id || null, payment.route_point_id || null, now, payment.amount, payment.change_amount || 0, payment.currency || DEFAULT_CURRENCY, payment.payment_type, payment.receipt_number || null, payment.notes || null, now]
    );
    // Subtract payment amount from customer's debt (never below 0)
    await database.runAsync(
      `UPDATE customers SET debt_amount = MAX(0, debt_amount - ?) WHERE id = ?`,
      [payment.amount, payment.customer_id]
    );
    await logSyncOperation('payment', id, 'create', { id, ...payment });
  });
  return id;
}

export async function getPaymentsByRoute(routeId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT p.*, c.name as customer_name
    FROM payments p
    JOIN customers c ON c.id = p.customer_id
    JOIN route_points rp ON rp.id = p.route_point_id
    WHERE rp.route_id = ?
    ORDER BY p.payment_date
  `, [routeId]);
}

// =====================================================
// STOCK & WAREHOUSE
// =====================================================

export async function getStockWithProducts(warehouse = null) {
  const database = await getDatabase();
  const where = warehouse ? `AND s.warehouse = ?` : '';
  const params = warehouse ? [warehouse] : [];
  return database.getAllAsync(`
    SELECT s.*, p.name as product_name, p.sku, p.category, p.brand, p.volume,
           (SELECT pl.price FROM price_lists pl
            WHERE pl.product_id = p.id
              AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
              AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
            ORDER BY pl.valid_from DESC LIMIT 1) as base_price
    FROM stock s
    JOIN products p ON p.id = s.product_id
    WHERE p.is_active = 1 ${where}
    ORDER BY p.category, p.name
  `, params);
}

export async function getVehicleByDriver(driverId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT * FROM vehicles WHERE CAST(driver_id AS TEXT) = CAST(? AS TEXT) AND is_active = 1`,
    [driverId]
  );
}

export async function getActiveVehicles() {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT v.*, u.full_name as driver_name
     FROM vehicles v
     LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(v.driver_id AS TEXT)
     WHERE v.is_active = 1
     ORDER BY v.plate_number`
  );
}

export async function assignVehicleToDriver(vehicleId, driverId) {
  const database = await getDatabase();
  const now = new Date().toISOString();

  // Clear driver from any currently assigned vehicle
  await database.runAsync(
    `UPDATE vehicles SET driver_id = NULL WHERE CAST(driver_id AS TEXT) = CAST(? AS TEXT)`,
    [driverId]
  );

  // Assign new vehicle to driver
  if (vehicleId) {
    await database.runAsync(
      `UPDATE vehicles SET driver_id = ? WHERE id = ?`,
      [driverId, vehicleId]
    );
  }

  // Update users.vehicle_id
  await database.runAsync(
    `UPDATE users SET vehicle_id = ?, updated_at = ? WHERE id = ?`,
    [vehicleId || null, now, driverId]
  );

  // Log for sync
  await logSyncOperation('vehicle', vehicleId, 'update', { id: vehicleId, driver_id: driverId });
  await logSyncOperation('user', driverId, 'update', { id: driverId, vehicle_id: vehicleId });
}

export async function getVehicleStock(vehicleId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT s.*, p.name as product_name, p.sku, p.category, p.brand, p.volume,
           (SELECT pl.price FROM price_lists pl
            WHERE pl.product_id = p.id
              AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
              AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
            ORDER BY pl.valid_from DESC LIMIT 1) as base_price
    FROM stock s
    JOIN products p ON p.id = s.product_id
    WHERE s.warehouse = ? AND p.is_active = 1
    ORDER BY p.category, p.name
  `, [vehicleId]);
}

export async function hasNonZeroVehicleStock(vehicleId) {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM stock WHERE warehouse = ? AND quantity > 0`,
    [vehicleId]
  );
  return result.count > 0;
}

// Available stock = vehicle stock - quantities reserved by unshipped orders
// excludeOrderId: exclude current order being edited (to avoid double-counting)
// excludeRoutePointId: exclude all orders at this route point (for shipment screen)
// customerId: when provided, uses customer's price_list_id for pricing (falls back to 'base')
export async function getAvailableVehicleStock(vehicleId, driverId, excludeOrderId = null, excludeRoutePointId = null, customerId = null) {
  const database = await getDatabase();

  const priceSubquery = customerId
    ? `COALESCE(
         (SELECT pl.price FROM price_lists pl
          WHERE pl.product_id = p.id
            AND pl.price_type = (
              SELECT plt.name FROM price_list_types plt
              JOIN customers c ON c.price_list_id = plt.id
              WHERE c.id = ?
            )
            AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
            AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
          ORDER BY pl.valid_from DESC LIMIT 1),
         (SELECT pl.price FROM price_lists pl
          WHERE pl.product_id = p.id
            AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
            AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
          ORDER BY pl.valid_from DESC LIMIT 1)
       )`
    : `(SELECT pl.price FROM price_lists pl
        WHERE pl.product_id = p.id
          AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
          AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
        ORDER BY pl.valid_from DESC LIMIT 1)`;

  const params = customerId
    ? [customerId, driverId, excludeOrderId, excludeOrderId, excludeRoutePointId, excludeRoutePointId, vehicleId]
    : [driverId, excludeOrderId, excludeOrderId, excludeRoutePointId, excludeRoutePointId, vehicleId];

  return database.getAllAsync(`
    SELECT s.id, s.product_id, s.quantity as stock_quantity,
           p.name as product_name, p.sku, p.category, p.brand, p.volume, p.weight,
           ${priceSubquery} as base_price,
           COALESCE(reserved.total_reserved, 0) as reserved_quantity,
           s.quantity - COALESCE(reserved.total_reserved, 0) as available_quantity
    FROM stock s
    JOIN products p ON p.id = s.product_id
    LEFT JOIN (
      SELECT oi.product_id, SUM(oi.quantity) as total_reserved
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = ?
        AND o.status IN ('${ORDER_STATUS.DRAFT}', '${ORDER_STATUS.CONFIRMED}')
        AND (? IS NULL OR o.id != ?)
        AND (? IS NULL OR o.route_point_id IS NULL OR o.route_point_id != ?)
      GROUP BY oi.product_id
    ) reserved ON reserved.product_id = s.product_id
    WHERE s.warehouse = ? AND p.is_active = 1
    ORDER BY p.category, p.name
  `, params);
}

// Get data for vehicle unloading: remaining stock + today's returns
export async function getUnloadingData(vehicleId, driverId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];

  // Remaining vehicle stock (not delivered)
  const remaining = await database.getAllAsync(`
    SELECT s.product_id, s.quantity, p.name as product_name, p.sku, p.category, p.brand, p.volume, p.weight,
           (SELECT pl.price FROM price_lists pl
            WHERE pl.product_id = p.id
              AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
              AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
            ORDER BY pl.valid_from DESC LIMIT 1) as base_price
    FROM stock s
    JOIN products p ON p.id = s.product_id
    WHERE s.warehouse = ? AND s.quantity > 0 AND p.is_active = 1
    ORDER BY p.category, p.name
  `, [vehicleId]);

  // Today's return items for this driver
  const returnItems = await database.getAllAsync(`
    SELECT ri.product_id, ri.quantity, ri.condition, p.name as product_name, p.sku, p.category, p.volume,
           ri.price, r.id as return_id
    FROM return_items ri
    JOIN returns r ON r.id = ri.return_id
    JOIN products p ON p.id = ri.product_id
    WHERE r.driver_id = ? AND r.return_date >= ?
    ORDER BY p.name
  `, [driverId, today]);

  return { remaining, returnItems };
}

// =====================================================
// LOADING TRIPS
// =====================================================

export async function hasVerifiedLoadingTrip(driverId) {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM loading_trips WHERE CAST(driver_id AS TEXT) = CAST(? AS TEXT) AND status = '${LOADING_TRIP_STATUS.VERIFIED}'`,
    [driverId]
  );
  return result.count > 0;
}

export async function getLoadingTrips(driverId = null) {
  const database = await getDatabase();
  if (driverId) {
    return database.getAllAsync(`
      SELECT lt.*, v.plate_number, v.model as vehicle_model
      FROM loading_trips lt
      JOIN vehicles v ON v.id = lt.vehicle_id
      WHERE CAST(lt.driver_id AS TEXT) = CAST(? AS TEXT)
      ORDER BY lt.loading_date DESC
    `, [driverId]);
  }
  return database.getAllAsync(`
    SELECT lt.*, v.plate_number, v.model as vehicle_model, u.full_name as driver_name
    FROM loading_trips lt
    JOIN vehicles v ON v.id = lt.vehicle_id
    LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(lt.driver_id AS TEXT)
    ORDER BY lt.loading_date DESC
  `);
}

export async function getLoadingTripItems(tripId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT lti.*, p.name as product_name, p.sku, p.volume, p.barcode
    FROM loading_trip_items lti
    JOIN products p ON p.id = lti.product_id
    WHERE lti.loading_trip_id = ?
    ORDER BY p.category, p.name
  `, [tripId]);
}

export async function updateLoadingTripItem(itemId, actualQuantity, scanned) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE loading_trip_items SET actual_quantity = ?, scanned = ? WHERE id = ?`,
    [actualQuantity, scanned ? 1 : 0, itemId]
  );
  // No logSyncOperation here — individual item scans are local-only.
  // The full trip payload (with all items) is pushed on verification
  // via updateLoadingTripStatus().
}

export async function updateLoadingTripStatus(tripId, status) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  // Also update loaded_items count
  const loaded = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM loading_trip_items WHERE loading_trip_id = ? AND actual_quantity > 0`,
    [tripId]
  );
  await database.runAsync(
    `UPDATE loading_trips SET status = ?, loaded_items = ?, updated_at = ? WHERE id = ?`,
    [status, loaded.count, now, tripId]
  );

  // When verified, sync vehicle stock to actual loaded quantities
  if (status === LOADING_TRIP_STATUS.VERIFIED) {
    const trip = await database.getFirstAsync(
      `SELECT vehicle_id FROM loading_trips WHERE id = ?`, [tripId]
    );
    if (trip?.vehicle_id) {
      const tripItems = await database.getAllAsync(
        `SELECT product_id, actual_quantity FROM loading_trip_items WHERE loading_trip_id = ?`, [tripId]
      );
      // Reset vehicle stock to actual loaded quantities
      for (const item of tripItems) {
        const qty = item.actual_quantity ?? 0;
        const existing = await database.getFirstAsync(
          `SELECT id FROM stock WHERE warehouse = ? AND product_id = ?`,
          [trip.vehicle_id, item.product_id]
        );
        if (existing) {
          await database.runAsync(
            `UPDATE stock SET quantity = ?, updated_at = ? WHERE warehouse = ? AND product_id = ?`,
            [qty, now, trip.vehicle_id, item.product_id]
          );
        } else if (qty > 0) {
          const id = generateId();
          await database.runAsync(
            `INSERT INTO stock (id, product_id, warehouse, quantity, reserved, updated_at) VALUES (?, ?, ?, ?, 0, ?)`,
            [id, item.product_id, trip.vehicle_id, qty, now]
          );
        }
      }
    }
  }

  // Sync the loading trip with all its items — include full trip data for middleware
  const fullTrip = await database.getFirstAsync(
    `SELECT * FROM loading_trips WHERE id = ?`, [tripId]
  );
  const allItems = await database.getAllAsync(
    `SELECT * FROM loading_trip_items WHERE loading_trip_id = ?`, [tripId]
  );
  await logSyncOperation('loading_trip', tripId, 'update',
    buildLoadingTripPayload({ ...fullTrip, status, loaded_items: loaded.count }, allItems));
}

// =====================================================
// CASH COLLECTIONS (Инкассация)
// =====================================================

export async function getCashCollections(driverId = null) {
  const database = await getDatabase();
  if (driverId) {
    return database.getAllAsync(`
      SELECT cc.*, r.vehicle_number
      FROM cash_collections cc
      LEFT JOIN routes r ON r.id = cc.route_id
      WHERE cc.driver_id = ?
      ORDER BY cc.collection_date DESC
    `, [driverId]);
  }
  return database.getAllAsync(`
    SELECT cc.*, u.full_name as driver_name, r.vehicle_number
    FROM cash_collections cc
    JOIN users u ON u.id = cc.driver_id
    LEFT JOIN routes r ON r.id = cc.route_id
    ORDER BY cc.collection_date DESC
  `);
}

export async function createCashCollection(collection) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  const discrepancy = (collection.actual_amount || 0) - (collection.expected_amount || 0);
  const status = discrepancy === 0 ? CASH_COLLECTION_STATUS.COLLECTED : CASH_COLLECTION_STATUS.DISCREPANCY;
  await database.runAsync(
    `INSERT INTO cash_collections (id, driver_id, route_id, collection_date, expected_amount, actual_amount, discrepancy, currency, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, collection.driver_id, collection.route_id || null, now, collection.expected_amount || 0, collection.actual_amount || 0, discrepancy, collection.currency || DEFAULT_CURRENCY, status, collection.notes || null, now]
  );
  await logSyncOperation('cash_collection', id, 'create',
    buildCashCollectionPayload({ id, ...collection, discrepancy, status, collection_date: now }));
  return id;
}

// =====================================================
// PACKAGING RETURNS (Возвраты тары)
// =====================================================

export async function getPackagingReturns(driverId = null) {
  const database = await getDatabase();
  if (driverId) {
    return database.getAllAsync(`
      SELECT pr.*, c.name as customer_name
      FROM packaging_returns pr
      JOIN customers c ON c.id = pr.customer_id
      WHERE pr.driver_id = ?
      ORDER BY pr.return_date DESC
    `, [driverId]);
  }
  return database.getAllAsync(`
    SELECT pr.*, c.name as customer_name, u.full_name as driver_name
    FROM packaging_returns pr
    JOIN customers c ON c.id = pr.customer_id
    JOIN users u ON u.id = pr.driver_id
    ORDER BY pr.return_date DESC
  `);
}

export async function getPackagingReturnItems(packagingReturnId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT pri.*, p.name as product_name, p.sku as product_sku
    FROM packaging_return_items pri
    JOIN products p ON p.id = pri.product_id
    WHERE pri.packaging_return_id = ?
  `, [packagingReturnId]);
}

export async function createPackagingReturn(pr) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO packaging_returns (id, customer_id, driver_id, route_point_id, return_date, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, '${PACKAGING_RETURN_STATUS.DRAFT}', ?, ?)`,
    [id, pr.customer_id, pr.driver_id, pr.route_point_id || null, now, pr.notes || null, now]
  );
  return id;
}

export async function savePackagingReturnItems(packagingReturnId, items) {
  const database = await getDatabase();
  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(`DELETE FROM packaging_return_items WHERE packaging_return_id = ?`, [packagingReturnId]);
    for (const item of items) {
      const itemId = generateId();
      await database.runAsync(
        `INSERT OR IGNORE INTO packaging_return_items (id, packaging_return_id, product_id, expected_quantity, actual_quantity, condition, unit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, packagingReturnId, item.product_id, item.expected_quantity || 0, item.actual_quantity || 0, item.condition || 'good', item.unit || 'шт']
      );
    }
    await logSyncOperation('packaging_return', packagingReturnId, 'create',
      buildPackagingReturnPayload({ id: packagingReturnId }, items));
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

// =====================================================
// NOTIFICATIONS
// =====================================================

export async function getNotifications(userId, unreadOnly = false) {
  const database = await getDatabase();
  const where = unreadOnly ? 'AND n.is_read = 0' : '';
  return database.getAllAsync(`
    SELECT n.* FROM notifications n
    WHERE n.user_id = ? ${where}
    ORDER BY n.created_at DESC
  `, [userId]);
}

export async function getUnreadNotificationCount(userId) {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return result.count;
}

export async function markNotificationRead(notificationId) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE notifications SET is_read = 1 WHERE id = ?`,
    [notificationId]
  );
}

export async function markAllNotificationsRead(userId) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
}

// =====================================================
// DEVICES (Admin)
// =====================================================

export async function getDevices() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT d.*, u.full_name as user_name, u.role as user_role
    FROM devices d
    LEFT JOIN users u ON u.id = d.user_id
    ORDER BY d.updated_at DESC
  `);
}

export async function getDeviceById(deviceId) {
  const database = await getDatabase();
  return database.getFirstAsync(`
    SELECT d.*, u.full_name as user_name, u.role as user_role
    FROM devices d
    LEFT JOIN users u ON u.id = d.user_id
    WHERE d.id = ?
  `, [deviceId]);
}

// =====================================================
// AUDIT LOG (Admin)
// =====================================================

export async function getAuditLog(filters = {}) {
  const database = await getDatabase();
  let where = '1=1';
  const params = [];

  if (filters.userId) {
    where += ' AND a.user_id = ?';
    params.push(filters.userId);
  }
  if (filters.action) {
    where += ' AND a.action = ?';
    params.push(filters.action);
  }
  if (filters.dateFrom) {
    where += ' AND a.created_at >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where += ' AND a.created_at <= ?';
    params.push(filters.dateTo);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  params.push(limit, offset);

  return database.getAllAsync(`
    SELECT a.*, u.full_name as user_name, u.role as user_role
    FROM audit_log a
    JOIN users u ON u.id = a.user_id
    WHERE ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `, params);
}

export async function addAuditEntry(entry) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, entry.user_id, entry.action, entry.entity_type || null, entry.entity_id || null, entry.details || null, now]
  );
  return id;
}

// =====================================================
// ERROR LOG (Structured Logging)
// =====================================================

export async function getErrorLogs(filters = {}) {
  const database = await getDatabase();
  let where = '1=1';
  const params = [];

  if (filters.severity) {
    where += ' AND e.severity = ?';
    params.push(filters.severity);
  }
  if (filters.source) {
    where += ' AND e.source = ?';
    params.push(filters.source);
  }
  if (filters.dateFrom) {
    where += ' AND e.created_at >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where += ' AND e.created_at <= ?';
    params.push(filters.dateTo);
  }
  if (filters.search) {
    where += ' AND (e.message LIKE ? OR e.source LIKE ? OR e.context LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  params.push(limit, offset);

  return database.getAllAsync(`
    SELECT e.*, u.full_name as user_name
    FROM error_log e
    LEFT JOIN users u ON u.id = e.user_id
    WHERE ${where}
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `, params);
}

export async function addErrorLog(entry) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO error_log (id, severity, source, message, context, stack_trace, user_id, screen, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.severity || 'error',
      entry.source,
      entry.message,
      entry.context ? (typeof entry.context === 'string' ? entry.context : JSON.stringify(entry.context)) : null,
      entry.stack_trace || null,
      entry.user_id || null,
      entry.screen || null,
      now,
    ]
  );
  return id;
}

export async function getErrorLogStats() {
  const database = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const [total, todayCount, bySeverity] = await Promise.all([
    database.getFirstAsync('SELECT COUNT(*) as count FROM error_log'),
    database.getFirstAsync('SELECT COUNT(*) as count FROM error_log WHERE date(created_at) = ?', [today]),
    database.getAllAsync('SELECT severity, COUNT(*) as count FROM error_log GROUP BY severity ORDER BY count DESC'),
  ]);
  return {
    total: total?.count || 0,
    today: todayCount?.count || 0,
    bySeverity: bySeverity || [],
  };
}

export async function getErrorLogSources() {
  const database = await getDatabase();
  return database.getAllAsync('SELECT DISTINCT source FROM error_log ORDER BY source');
}

export async function clearErrorLogs(olderThanDays = 30) {
  const database = await getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const result = await database.runAsync(
    'DELETE FROM error_log WHERE created_at < ?',
    [cutoff.toISOString()]
  );
  return result.changes;
}

// =====================================================
// USERS (Admin)
// =====================================================

export async function getAllUsers() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT u.*, v.plate_number, v.model as vehicle_model,
           d.device_model, d.last_sync_at as device_last_sync
    FROM users u
    LEFT JOIN vehicles v ON v.driver_id = u.id AND v.is_active = 1
    LEFT JOIN devices d ON d.user_id = u.id AND d.status = 'active'
    ORDER BY u.role, u.full_name
  `);
}

export async function getUserById(userId) {
  const database = await getDatabase();
  return database.getFirstAsync(`
    SELECT u.*, v.id as vehicle_id, v.plate_number, v.model as vehicle_model
    FROM users u
    LEFT JOIN vehicles v ON v.driver_id = u.id AND v.is_active = 1
    WHERE u.id = ?
  `, [userId]);
}

export async function createUser(user) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO users (id, username, password_hash, full_name, role, phone, vehicle_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, user.username, 'hash_' + user.username, user.full_name, user.role, user.phone || null, user.vehicle_id || null, now, now]
  );
  return id;
}

// Upsert logged-in user into SQLite users table so FK constraints are satisfied.
// Called after successful login (both mock and server modes).
// If a synced user with the same username already exists under a different id,
// we update that row in-place instead of deleting it, so that FK references
// from routes, vehicles, etc. remain intact.
// Returns the resolved user id (which may differ from user.id if an existing
// row was found by username).
export async function ensureUserInDb(user) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const uid = user.id;
  const uname = user.username || '';
  const fullName = user.fullName || user.full_name || '';
  const role = user.role || 'expeditor';
  const phone = user.phone || null;
  const vehicleId = user.vehicleId || user.vehicle_id || null;

  // Check if a user with the same username but different id already exists.
  // If so, update that row in-place to preserve FK references from routes, vehicles, etc.
  const existing = await database.getFirstAsync(
    `SELECT id FROM users WHERE username = ? AND id != ?`,
    [uname, uid]
  );

  if (existing) {
    await database.runAsync(
      `UPDATE users SET username = ?, full_name = ?, role = ?, phone = ?, vehicle_id = ?, is_active = 1, updated_at = ? WHERE id = ?`,
      [uname, fullName, role, phone, vehicleId, now, existing.id]
    );
    return existing.id;
  }

  await database.runAsync(
    `INSERT INTO users (id, username, password_hash, full_name, role, phone, vehicle_id, is_active, created_at, updated_at)
     VALUES (?, ?, '', ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       full_name = excluded.full_name,
       role = excluded.role,
       phone = excluded.phone,
       vehicle_id = excluded.vehicle_id,
       is_active = 1,
       updated_at = excluded.updated_at`,
    [uid, uname, fullName, role, phone, vehicleId, now, now]
  );
  return uid;
}

export async function updateUser(userId, fields) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE users SET full_name = ?, phone = ?, role = ?, vehicle_id = ?, is_active = ?, updated_at = ? WHERE id = ?`,
    [fields.full_name, fields.phone || null, fields.role, fields.vehicle_id || null, fields.is_active !== undefined ? fields.is_active : 1, now, userId]
  );
}

// =====================================================
// SUPERVISOR ANALYTICS
// =====================================================

export async function getSupervisorStats(date = null) {
  const database = await getDatabase();
  const targetDate = date || new Date().toISOString().split('T')[0];

  const expeditorsOnRoute = await database.getFirstAsync(`
    SELECT COUNT(DISTINCT r.driver_id) as count FROM routes r WHERE r.date = ? AND r.status IN ('${ROUTE_STATUS.PLANNED}','${ROUTE_STATUS.IN_PROGRESS}')
  `, [targetDate]);

  const totalPoints = await database.getFirstAsync(`
    SELECT COUNT(*) as total, SUM(CASE WHEN rp.status = '${VISIT_STATUS.COMPLETED}' THEN 1 ELSE 0 END) as completed
    FROM route_points rp
    JOIN routes r ON r.id = rp.route_id
    WHERE r.date = ?
  `, [targetDate]);

  const payments = await database.getFirstAsync(`
    SELECT COALESCE(SUM(p.amount), 0) as total_amount, COUNT(*) as count
    FROM payments p WHERE date(p.payment_date) = ?
  `, [targetDate]);

  const pendingReturns = await database.getFirstAsync(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount
    FROM returns WHERE status = '${RETURN_STATUS.PENDING_APPROVAL}'
  `);

  return {
    expeditorsOnRoute: expeditorsOnRoute.count,
    totalPoints: totalPoints.total,
    completedPoints: totalPoints.completed || 0,
    totalPayments: payments.total_amount,
    paymentCount: payments.count,
    pendingReturns: pendingReturns.count,
    pendingReturnsAmount: pendingReturns.total_amount,
  };
}

export async function getExpeditorProgress(date = null) {
  const database = await getDatabase();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return database.getAllAsync(`
    SELECT
      u.id, u.full_name,
      r.id as route_id, r.status as route_status, r.vehicle_number,
      COUNT(rp.id) as total_points,
      SUM(CASE WHEN rp.status = '${VISIT_STATUS.COMPLETED}' THEN 1 ELSE 0 END) as completed_points,
      SUM(CASE WHEN rp.status = '${VISIT_STATUS.IN_PROGRESS}' THEN 1 ELSE 0 END) as in_progress_points,
      MAX(rp.actual_arrival) as last_activity
    FROM users u
    JOIN routes r ON r.driver_id = u.id AND r.date = ?
    LEFT JOIN route_points rp ON rp.route_id = r.id
    WHERE u.role = 'expeditor'
    GROUP BY u.id, r.id
    ORDER BY u.full_name
  `, [targetDate]);
}

// =====================================================
// ADMIN SYNC STATS
// =====================================================

export async function getSyncStats() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT entity_type, last_sync_at FROM sync_meta ORDER BY entity_type
  `);
}

export async function getSyncConflicts() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT * FROM sync_log
    WHERE synced = 0 AND sync_attempts > 0
    ORDER BY created_at DESC
  `);
}

export async function getSyncDashboardData() {
  const database = await getDatabase();
  const pending = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM sync_log WHERE synced = 0`
  );
  const failed = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM sync_log WHERE synced = 0 AND sync_attempts > 0`
  );
  const synced = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM sync_log WHERE synced = 1`
  );
  const lastSync = await database.getFirstAsync(
    `SELECT MAX(last_sync_at) as last_sync_at FROM sync_meta`
  );
  const entities = await database.getAllAsync(
    `SELECT sm.entity_type, sm.last_sync_at,
            (SELECT COUNT(*) FROM sync_log sl WHERE sl.entity_type = sm.entity_type AND sl.synced = 0) as pending_count
     FROM sync_meta sm ORDER BY sm.entity_type`
  );
  return {
    pendingDocs: pending?.count || 0,
    failedDocs: failed?.count || 0,
    syncedDocs: synced?.count || 0,
    lastSyncAt: lastSync?.last_sync_at,
    entities,
  };
}

// =====================================================
// DB STATS
// =====================================================

export async function getDbStats() {
  const database = await getDatabase();
  const stats = {};
  const tables = [
    'users', 'vehicles', 'customers', 'products', 'price_list_types', 'price_lists', 'stock',
    'routes', 'route_points', 'orders', 'order_items', 'deliveries', 'delivery_items',
    'returns', 'return_items', 'payments',
    'loading_trips', 'loading_trip_items', 'cash_collections',
    'packaging_returns', 'packaging_return_items', 'product_empties',
    'notifications', 'devices', 'audit_log', 'tour_checkins',
  ];
  for (const table of tables) {
    const result = await database.getFirstAsync(`SELECT COUNT(*) as count FROM ${table}`);
    stats[table] = result.count;
  }
  return stats;
}

// =====================================================
// TOUR CHECK-IN / CHECK-OUT (Start/End of Day)
// =====================================================

export async function createTourCheckin(checkin) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.execAsync('PRAGMA foreign_keys = OFF');
  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(
      `INSERT INTO tour_checkins (id, driver_id, vehicle_id, route_id, type, status, vehicle_check, odometer_reading, cash_amount, currency, signature_data, supervisor_name, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, checkin.driver_id, checkin.vehicle_id || null, checkin.route_id || null, checkin.type, checkin.status || CHECKIN_STATUS.IN_PROGRESS, checkin.vehicle_check || null, checkin.odometer_reading || null, checkin.cash_amount || null, checkin.currency || DEFAULT_CURRENCY, checkin.signature_data || null, checkin.supervisor_name || null, checkin.notes || null, now, now]
    );
    await logSyncOperation('tour_checkin', id, 'create',
      buildTourCheckinPayload({ id, ...checkin, checkin_date: now }, []));
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  } finally {
    await database.execAsync('PRAGMA foreign_keys = ON');
  }
  return id;
}

export async function updateTourCheckin(id, updates) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  await database.runAsync(
    `UPDATE tour_checkins SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getTodayTourCheckin(driverId, type) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return database.getFirstAsync(
    `SELECT * FROM tour_checkins WHERE driver_id = ? AND type = ? AND date(checkin_date) = ? ORDER BY created_at DESC LIMIT 1`,
    [driverId, type, today]
  );
}

export async function getLastOdometerReading(driverId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT odometer_reading FROM tour_checkins WHERE driver_id = ? AND odometer_reading IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
    [driverId]
  );
}

export async function saveVehicleCheckItems(checkinId, items) {
  if (!checkinId) throw new Error('saveVehicleCheckItems: checkinId is required');
  const database = await getDatabase();
  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(`DELETE FROM vehicle_check_items WHERE checkin_id = ?`, [checkinId]);
    for (const item of items) {
      const id = generateId();
      await database.runAsync(
        `INSERT INTO vehicle_check_items (id, checkin_id, question, answer, is_ok, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, checkinId, item.question, item.answer || null, item.is_ok ? 1 : 0, item.notes || null]
      );
    }
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function getVehicleCheckItems(checkinId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM vehicle_check_items WHERE checkin_id = ? ORDER BY rowid`,
    [checkinId]
  );
}

/**
 * Read the full tour checkin record + vehicle check items from DB
 * and log a single sync operation with a complete MW-compatible payload.
 * Call this once when the checkin is completed.
 */
export async function syncTourCheckin(checkinId) {
  const database = await getDatabase();
  const checkin = await database.getFirstAsync(
    'SELECT * FROM tour_checkins WHERE id = ?', [checkinId]
  );
  if (!checkin) return;

  const items = await database.getAllAsync(
    'SELECT * FROM vehicle_check_items WHERE checkin_id = ? ORDER BY rowid', [checkinId]
  );

  // Convert vehicle check items to dict format for MW JSONB field
  let vehicleCheck = null;
  if (items.length > 0) {
    vehicleCheck = {};
    for (const item of items) {
      vehicleCheck[item.question] = item.is_ok ? 'ok' : 'not_ok';
    }
  }

  const opId = generateId();
  await logSyncOperation('tour_checkin', opId, 'create',
    buildTourCheckinPayload({
      type: checkin.type,
      checkin_date: checkin.checkin_date,
      vehicle_id: checkin.vehicle_id || null,
      route_id: checkin.route_id || null,
      status: checkin.status,
      odometer_reading: checkin.odometer_reading || null,
      cash_amount: checkin.cash_amount || null,
      currency: checkin.currency || 'RUB',
      signature_data: checkin.signature_data || null,
      supervisor_name: checkin.supervisor_name || null,
      vehicle_check: vehicleCheck,
      material_check_data: checkin.material_check_data || null,
      notes: checkin.notes || null,
    }, []));
}

export async function getOrCreateTodayCheckin(driverId, vehicleId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const id = generateId();
  const now = new Date().toISOString();

  // INSERT OR IGNORE — if a record already exists for today, do nothing
  // Disable FK temporarily: vehicle_id may reference an MW-synced vehicle
  // whose driver_id doesn't match the local user, or vehicle may be null.
  await database.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await database.runAsync(
      `INSERT OR IGNORE INTO tour_checkins (id, driver_id, vehicle_id, type, status, current_step, checkin_date, created_at, updated_at)
       VALUES (?, ?, ?, '${TOUR_CHECKIN_TYPE.START}', '${CHECKIN_STATUS.IN_PROGRESS}', 0, ?, ?, ?)`,
      [id, driverId, vehicleId || null, now, now, now]
    );
  } finally {
    await database.execAsync('PRAGMA foreign_keys = ON');
  }

  return database.getFirstAsync(
    `SELECT * FROM tour_checkins WHERE driver_id = ? AND type = '${TOUR_CHECKIN_TYPE.START}' AND date(checkin_date) = ? ORDER BY created_at DESC LIMIT 1`,
    [driverId, today]
  );
}

export async function getOrCreateTodayEndCheckin(driverId, vehicleId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const id = generateId();
  const now = new Date().toISOString();

  await database.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await database.runAsync(
      `INSERT OR IGNORE INTO tour_checkins (id, driver_id, vehicle_id, type, status, current_step, checkin_date, created_at, updated_at)
       VALUES (?, ?, ?, '${TOUR_CHECKIN_TYPE.END}', '${CHECKIN_STATUS.IN_PROGRESS}', 0, ?, ?, ?)`,
      [id, driverId, vehicleId || null, now, now, now]
    );
  } finally {
    await database.execAsync('PRAGMA foreign_keys = ON');
  }

  return database.getFirstAsync(
    `SELECT * FROM tour_checkins WHERE driver_id = ? AND type = '${TOUR_CHECKIN_TYPE.END}' AND date(checkin_date) = ? ORDER BY created_at DESC LIMIT 1`,
    [driverId, today]
  );
}

export async function getTodayPaymentsTotal(driverId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const result = await database.getFirstAsync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE user_id = ? AND date(payment_date) = ?`,
    [driverId, today]
  );
  return result?.total || 0;
}

export async function getTodayCashPaymentsTotal(driverId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const result = await database.getFirstAsync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE user_id = ? AND date(payment_date) = ? AND payment_type = 'cash'`,
    [driverId, today]
  );
  return result?.total || 0;
}

// =====================================================
// EXPENSES
// =====================================================

export async function getExpenseTypes() {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM expense_types WHERE is_active = 1 ORDER BY sort_order, name`
  );
}

export async function ensureExpenseTypes() {
  const database = await getDatabase();
  const count = await database.getFirstAsync('SELECT COUNT(*) as cnt FROM expense_types');
  if (count?.cnt > 0) return;
  const types = [
    { id: 'et-gas', name: 'Gas / Fuel', icon: 'flame-outline', sort_order: 1 },
    { id: 'et-tolls', name: 'Highway Tolls', icon: 'car-outline', sort_order: 2 },
    { id: 'et-parking', name: 'Parking', icon: 'navigate-outline', sort_order: 3 },
    { id: 'et-meals', name: 'Meals', icon: 'restaurant-outline', sort_order: 4 },
    { id: 'et-maintenance', name: 'Vehicle Maintenance', icon: 'build-outline', sort_order: 5 },
    { id: 'et-other', name: 'Other', icon: 'ellipsis-horizontal-outline', sort_order: 99 },
  ];
  for (const t of types) {
    await database.runAsync(
      `INSERT OR IGNORE INTO expense_types (id, name, icon, sort_order) VALUES (?, ?, ?, ?)`,
      [t.id, t.name, t.icon, t.sort_order]
    );
  }
}

export async function getTodayExpenses(driverId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return database.getAllAsync(
    `SELECT e.*, et.name as type_name, et.icon as type_icon,
            (SELECT COUNT(*) FROM expense_attachments WHERE expense_id = e.id) as attachment_count
     FROM expenses e
     LEFT JOIN expense_types et ON et.id = e.expense_type_id
     WHERE e.driver_id = ? AND date(e.created_at) = ?
     ORDER BY e.created_at DESC`,
    [driverId, today]
  );
}

export async function getTodayExpensesTotal(driverId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const result = await database.getFirstAsync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE driver_id = ? AND date(created_at) = ?`,
    [driverId, today]
  );
  return result?.total || 0;
}

export async function createExpense(expense, attachments = []) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(
      `INSERT INTO expenses (id, tour_checkin_id, driver_id, expense_type_id, expense_type_name, amount, currency, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'RUB', ?, ?, ?)`,
      [id, expense.tour_checkin_id || null, expense.driver_id, expense.expense_type_id,
       expense.expense_type_name || null, expense.amount, expense.notes || null, now, now]
    );
    const savedAttachments = [];
    for (const att of attachments) {
      const attId = generateId();
      await database.runAsync(
        `INSERT INTO expense_attachments (id, expense_id, file_type, local_uri, file_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [attId, id, att.fileType, att.localUri, att.fileName || null, now]
      );
      savedAttachments.push({ id: attId, local_uri: att.localUri, file_type: att.fileType, file_name: att.fileName });
    }
    await logSyncOperation('expense', id, 'create',
      buildExpensePayload({ id, ...expense, created_at: now }, savedAttachments));
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
  return id;
}

export async function updateExpense(id, { amount, notes }) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE expenses SET amount = ?, notes = ?, updated_at = ? WHERE id = ?`,
    [amount, notes || null, now, id]
  );
  await logSyncOperation('expense', id, 'update', { id, amount, notes });
}

export async function deleteExpense(id) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
  await logSyncOperation('expense', id, 'delete', { id });
}

// ==================== Expense Attachments ====================

export async function createExpenseAttachment({ expenseId, fileType, localUri, fileName }) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO expense_attachments (id, expense_id, file_type, local_uri, file_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, expenseId, fileType, localUri, fileName || null, now]
  );
  return id;
}

export async function getExpenseAttachments(expenseId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM expense_attachments WHERE expense_id = ? ORDER BY created_at ASC`,
    [expenseId]
  );
}

export async function deleteExpenseAttachment(id) {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    `SELECT local_uri FROM expense_attachments WHERE id = ?`, [id]
  );
  await database.runAsync(`DELETE FROM expense_attachments WHERE id = ?`, [id]);
  return row?.local_uri || null;
}

export async function deleteAllExpenseAttachments(expenseId) {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT local_uri FROM expense_attachments WHERE expense_id = ?`, [expenseId]
  );
  await database.runAsync(`DELETE FROM expense_attachments WHERE expense_id = ?`, [expenseId]);
  return rows.map((r) => r.local_uri);
}

// ==================== Visit Reports ====================

export async function createVisitReport({ routePointId, routeId, customerId, userId, checklist, notes, photos }) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO visit_reports (id, route_point_id, route_id, customer_id, user_id, checklist, notes, status, visit_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
    [id, routePointId, routeId || null, customerId || null, userId, JSON.stringify(checklist), notes || null, now, now, now]
  );
  const photoObjects = [];
  if (photos && photos.length > 0) {
    for (const uri of photos) {
      const photoId = generateId();
      await database.runAsync(
        `INSERT INTO visit_report_photos (id, visit_report_id, uri, created_at) VALUES (?, ?, ?, ?)`,
        [photoId, id, uri, now]
      );
      photoObjects.push({ id: photoId, uri });
    }
  }
  await logSyncOperation('visit_report', id, 'create',
    buildVisitReportPayload({
      customer_id: customerId,
      route_point_id: routePointId,
      route_id: routeId,
      visit_date: now,
      status: 'submitted',
      checklist,
      notes,
    }, photoObjects));
  return id;
}

export async function getVisitReportByPoint(routePointId) {
  const database = await getDatabase();
  const report = await database.getFirstAsync(
    `SELECT * FROM visit_reports WHERE route_point_id = ? ORDER BY created_at DESC LIMIT 1`,
    [routePointId]
  );
  if (!report) return null;
  report.checklist = JSON.parse(report.checklist || '{}');
  const photos = await database.getAllAsync(
    `SELECT * FROM visit_report_photos WHERE visit_report_id = ? ORDER BY created_at`,
    [report.id]
  );
  report.photos = photos.map((p) => p.uri);
  return report;
}

export async function getVisitReportsByRoute(routeId) {
  const database = await getDatabase();
  const reports = await database.getAllAsync(
    `SELECT vr.*, c.name as customer_name FROM visit_reports vr
     LEFT JOIN customers c ON vr.customer_id = c.id
     WHERE vr.route_id = ? ORDER BY vr.created_at DESC`,
    [routeId]
  );
  return reports.map((r) => ({ ...r, checklist: JSON.parse(r.checklist || '{}') }));
}

// =====================================================
// ADJUSTMENT REASONS
// =====================================================

export async function ensureAdjustmentReasons() {
  const database = await getDatabase();
  const existing = await database.getFirstAsync('SELECT COUNT(*) as count FROM adjustment_reasons');
  if (existing.count > 0) return;

  const reasons = [
    { id: 'ar-breakage', code: 'breakage', name_ru: 'Бой / Повреждение', name_en: 'Breakage', sort_order: 1 },
    { id: 'ar-theft', code: 'theft', name_ru: 'Хищение', name_en: 'Theft', sort_order: 2 },
    { id: 'ar-incorrect-freight', code: 'incorrect_freight', name_ru: 'Некорректная накладная', name_en: 'Incorrect freight list', sort_order: 3 },
    { id: 'ar-truck-transfer', code: 'truck_transfer', name_ru: 'Перемещение между машинами', name_en: 'Truck-to-truck transfer', sort_order: 4 },
    { id: 'ar-expired', code: 'expired', name_ru: 'Истёк срок годности', name_en: 'Expired', sort_order: 5 },
    { id: 'ar-recount', code: 'recount', name_ru: 'Пересчёт', name_en: 'Recount', sort_order: 6 },
  ];
  for (const r of reasons) {
    await database.runAsync(
      `INSERT OR IGNORE INTO adjustment_reasons (id, code, name_ru, name_en, is_active, sort_order) VALUES (?, ?, ?, ?, 1, ?)`,
      [r.id, r.code, r.name_ru, r.name_en, r.sort_order]
    );
  }
}

export async function getAdjustmentReasons() {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM adjustment_reasons WHERE is_active = 1 ORDER BY sort_order`
  );
}

// =====================================================
// INVENTORY ADJUSTMENTS
// =====================================================

export async function createInventoryAdjustment({ vehicleId, warehouse, userId, supervisorUserId, notes, items }) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(
      `INSERT INTO inventory_adjustments (id, vehicle_id, warehouse, user_id, supervisor_user_id, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '${ADJUSTMENT_STATUS.CONFIRMED}', ?, ?, ?)`,
      [id, vehicleId || null, warehouse || 'main', userId, supervisorUserId || null, notes || null, now, now]
    );

    for (const item of items) {
      const itemId = generateId();
      const difference = item.adjusted_qty - item.previous_qty;
      await database.runAsync(
        `INSERT INTO inventory_adjustment_items (id, adjustment_id, product_id, reason_id, previous_qty, adjusted_qty, difference, notes, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, id, item.product_id, item.reason_id, item.previous_qty, item.adjusted_qty, difference, item.notes || null, item.unit || 'шт']
      );

      // Apply the stock change
      const wh = vehicleId || warehouse || 'main';
      if (difference > 0) {
        await database.runAsync(
          `UPDATE stock SET quantity = quantity + ?, updated_at = ? WHERE product_id = ? AND warehouse = ?`,
          [difference, now, item.product_id, wh]
        );
      } else if (difference < 0) {
        await database.runAsync(
          `UPDATE stock SET quantity = MAX(0, quantity + ?), updated_at = ? WHERE product_id = ? AND warehouse = ?`,
          [difference, now, item.product_id, wh]
        );
      }
    }

    await logSyncOperation('inventory_adjustment', id, 'create',
      buildInventoryAdjustmentPayload({ id, vehicleId, warehouse, userId, supervisorUserId, notes }, items));

    await database.execAsync('COMMIT');
    return id;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function getInventoryAdjustments(vehicleId) {
  const database = await getDatabase();
  const where = vehicleId ? 'WHERE ia.vehicle_id = ?' : '';
  const params = vehicleId ? [vehicleId] : [];
  return database.getAllAsync(
    `SELECT ia.*, u.full_name as user_name, su.full_name as supervisor_name
     FROM inventory_adjustments ia
     LEFT JOIN users u ON ia.user_id = u.id
     LEFT JOIN users su ON ia.supervisor_user_id = su.id
     ${where}
     ORDER BY ia.created_at DESC`,
    params
  );
}

export async function getInventoryAdjustmentItems(adjustmentId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT iai.*, p.name as product_name, p.sku, ar.code as reason_code,
            ar.name_ru as reason_name_ru, ar.name_en as reason_name_en
     FROM inventory_adjustment_items iai
     JOIN products p ON iai.product_id = p.id
     JOIN adjustment_reasons ar ON iai.reason_id = ar.id
     WHERE iai.adjustment_id = ?`,
    [adjustmentId]
  );
}

// =====================================================
// ON HAND INVENTORY (customer shelf stock)
// =====================================================

export async function createOnHandInventory({ customerId, routePointId, userId, notes, items }) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(
      `INSERT INTO on_hand_inventory (id, customer_id, route_point_id, user_id, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, '${ON_HAND_INVENTORY_STATUS.CAPTURED}', ?, ?, ?)`,
      [id, customerId, routePointId || null, userId, notes || null, now, now]
    );

    for (const item of items) {
      const itemId = generateId();
      await database.runAsync(
        `INSERT INTO on_hand_inventory_items (id, on_hand_id, product_id, quantity, notes, unit)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, id, item.product_id, item.quantity, item.notes || null, item.unit || 'шт']
      );
    }

    await logSyncOperation('on_hand_inventory', id, 'create',
      buildOnHandInventoryPayload({ id, customerId, routePointId, userId, notes }, items));

    await database.execAsync('COMMIT');
    return id;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function getOnHandInventory(customerId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT ohi.*, u.full_name as user_name
     FROM on_hand_inventory ohi
     LEFT JOIN users u ON ohi.user_id = u.id
     WHERE ohi.customer_id = ? AND ohi.status = '${ON_HAND_INVENTORY_STATUS.CAPTURED}'
     ORDER BY ohi.created_at DESC`,
    [customerId]
  );
}

export async function getOnHandInventoryItems(onHandId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT ohii.*, p.name as product_name, p.sku
     FROM on_hand_inventory_items ohii
     JOIN products p ON ohii.product_id = p.id
     WHERE ohii.on_hand_id = ?
     ORDER BY p.name`,
    [onHandId]
  );
}

export async function getLatestOnHandForCustomer(customerId) {
  const database = await getDatabase();
  const record = await database.getFirstAsync(
    `SELECT * FROM on_hand_inventory WHERE customer_id = ? AND status = '${ON_HAND_INVENTORY_STATUS.CAPTURED}' ORDER BY created_at DESC LIMIT 1`,
    [customerId]
  );
  if (!record) return null;
  const items = await getOnHandInventoryItems(record.id);
  return { ...record, items };
}

export async function discardOnHandInventory(onHandId) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE on_hand_inventory SET status = '${ON_HAND_INVENTORY_STATUS.DISCARDED}', updated_at = datetime('now') WHERE id = ?`,
    [onHandId]
  );
  await logSyncOperation('on_hand_inventory', onHandId, 'update', { id: onHandId, status: ON_HAND_INVENTORY_STATUS.DISCARDED });
}

export async function cancelOnHandInventory(onHandId) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE on_hand_inventory SET status = '${ON_HAND_INVENTORY_STATUS.CANCELLED}', updated_at = datetime('now') WHERE id = ?`,
    [onHandId]
  );
  await logSyncOperation('on_hand_inventory', onHandId, 'update', { id: onHandId, status: ON_HAND_INVENTORY_STATUS.CANCELLED });
}

// =====================================================
// SUPERVISOR AUTH HELPER
// =====================================================

export async function verifySupervisorPassword(password) {
  const database = await getDatabase();
  const supervisor = await database.getFirstAsync(
    `SELECT * FROM users WHERE role = 'supervisor' AND password_hash = ? AND is_active = 1`,
    [password]
  );
  return supervisor || null;
}

// =====================================================
// EMPTIES (packaging stock on vehicle)
// =====================================================

export async function getEmptiesStock(vehicleId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT pr.id, pr.customer_id, c.name as customer_name, pr.return_date, pr.status,
            p.name as product_name,
            COALESCE(p.sku, '') as product_sku, pri.product_id,
            pri.expected_quantity, pri.actual_quantity, pri.condition
     FROM packaging_returns pr
     JOIN packaging_return_items pri ON pri.packaging_return_id = pr.id
     LEFT JOIN products p ON p.id = pri.product_id
     LEFT JOIN customers c ON pr.customer_id = c.id
     WHERE pr.driver_id IN (SELECT driver_id FROM vehicles WHERE id = ?)
     ORDER BY pr.return_date DESC`,
    [vehicleId]
  );
}

export async function getEmptyProducts() {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM products WHERE material_type = 'empty' AND is_active = 1 ORDER BY name`
  );
}

export async function getProductEmpties(productId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT pe.*, p.name as empty_name, p.sku as empty_sku
     FROM product_empties pe
     JOIN products p ON p.id = pe.empty_product_id
     WHERE pe.product_id = ?`,
    [productId]
  );
}

// =====================================================
// GPS TRACKING
// =====================================================

export async function insertGpsTrack({ driverId, routeId, latitude, longitude, accuracy, speed, heading, eventType, routePointId }) {
  const database = await getDatabase();
  const id = generateId();
  await database.runAsync(
    `INSERT INTO gps_tracks (id, driver_id, route_id, latitude, longitude, accuracy, speed, heading, event_type, route_point_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, driverId, routeId || null, latitude, longitude, accuracy || null, speed || null, heading || null, eventType || 'track', routePointId || null]
  );
  await logSyncOperation('gps_track', id, 'create',
    { id, driver_id: driverId, route_id: routeId, latitude, longitude, accuracy, speed, heading, event_type: eventType || 'track', route_point_id: routePointId });
  return id;
}

export async function getGpsTracksByRoute(routeId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT * FROM gps_tracks WHERE route_id = ? ORDER BY recorded_at ASC`,
    [routeId]
  );
}

export async function getLatestDriverPosition(driverId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT * FROM gps_tracks WHERE driver_id = ? ORDER BY recorded_at DESC LIMIT 1`,
    [driverId]
  );
}

export async function getAllDriverPositions() {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return database.getAllAsync(
    `SELECT g.*, u.full_name as driver_name
     FROM gps_tracks g
     JOIN users u ON u.id = g.driver_id
     WHERE g.recorded_at >= ? AND g.recorded_at = (
       SELECT MAX(g2.recorded_at) FROM gps_tracks g2 WHERE g2.driver_id = g.driver_id AND g2.recorded_at >= ?
     )
     ORDER BY g.recorded_at DESC`,
    [today, today]
  );
}

export async function updateRoutePointCoords(pointId, fields) {
  const database = await getDatabase();
  const sets = [];
  const values = [];
  if (fields.actual_arrival_lat != null) { sets.push('actual_arrival_lat = ?'); values.push(fields.actual_arrival_lat); }
  if (fields.actual_arrival_lon != null) { sets.push('actual_arrival_lon = ?'); values.push(fields.actual_arrival_lon); }
  if (fields.actual_departure_lat != null) { sets.push('actual_departure_lat = ?'); values.push(fields.actual_departure_lat); }
  if (fields.actual_departure_lon != null) { sets.push('actual_departure_lon = ?'); values.push(fields.actual_departure_lon); }
  if (sets.length === 0) return;
  values.push(pointId);
  await database.runAsync(`UPDATE route_points SET ${sets.join(', ')} WHERE id = ?`, values);
  await logSyncOperation('route_point', pointId, 'update',
    buildRoutePointStatusPayload(pointId, null, null, null, fields));
}

export async function getGpsTrackStats(routeId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT COUNT(*) as total_points,
            MIN(recorded_at) as first_recorded,
            MAX(recorded_at) as last_recorded
     FROM gps_tracks WHERE route_id = ?`,
    [routeId]
  );
}
