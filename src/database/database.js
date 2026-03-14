import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES } from './schema';

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
  db = await SQLite.openDatabaseAsync('dsd_mini_v3.db');
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');
  return db;
}

export async function initDatabase() {
  const database = await getDatabase();

  for (const sql of CREATE_TABLES) {
    await database.execAsync(sql);
  }

  // Safe migrations for existing databases
  const migrations = [
    "ALTER TABLE deliveries ADD COLUMN signature_data TEXT",
    "ALTER TABLE deliveries ADD COLUMN signature_driver_data TEXT",
  ];
  for (const sql of migrations) {
    try { await database.execAsync(sql); } catch { /* column already exists */ }
  }

  // Check if already seeded
  const result = await database.getFirstAsync('SELECT COUNT(*) as count FROM products');
  if (result.count > 0) {
    console.log('Database already seeded, skipping...');
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
  } = require('./seed');

  await database.execAsync('BEGIN TRANSACTION');

  try {
    // Users
    for (const u of USERS) {
      await database.runAsync(
        `INSERT INTO users (id, username, password_hash, full_name, role, phone, vehicle_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.username, u.password_hash, u.full_name, u.role, u.phone, u.vehicle_id]
      );
    }

    // Products
    for (const p of PRODUCTS) {
      await database.runAsync(
        `INSERT INTO products (id, sku, name, category, subcategory, brand, volume, barcode, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.sku, p.name, p.category, p.subcategory, p.brand, p.volume, p.barcode, p.weight]
      );
    }

    // Customers
    for (const c of CUSTOMERS) {
      await database.runAsync(
        `INSERT INTO customers (id, name, legal_name, inn, kpp, address, city, region, postal_code, latitude, longitude, contact_person, phone, customer_type, payment_terms, credit_limit, debt_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.legal_name, c.inn, c.kpp, c.address, c.city, c.region, c.postal_code, c.latitude, c.longitude, c.contact_person, c.phone, c.customer_type, c.payment_terms, c.credit_limit, c.debt_amount]
      );
    }

    // Prices
    const prices = generatePrices();
    for (const p of prices) {
      await database.runAsync(
        `INSERT INTO price_lists (id, product_id, price_type, price, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)`,
        [p.id, p.product_id, p.price_type, p.price, p.valid_from, p.valid_to]
      );
    }

    // Stock
    const stock = generateStock();
    for (const s of stock) {
      await database.runAsync(
        `INSERT INTO stock (id, product_id, warehouse, quantity, reserved) VALUES (?, ?, ?, ?, ?)`,
        [s.id, s.product_id, s.warehouse, s.quantity, s.reserved]
      );
    }

    // Vehicles
    for (const v of VEHICLES) {
      await database.runAsync(
        `INSERT INTO vehicles (id, plate_number, model, driver_id, capacity_kg) VALUES (?, ?, ?, ?, ?)`,
        [v.id, v.plate_number, v.model, v.driver_id, v.capacity_kg]
      );
    }

    // Vehicle stock
    const vehicleStock = generateVehicleStock();
    for (const s of vehicleStock) {
      await database.runAsync(
        `INSERT INTO stock (id, product_id, warehouse, quantity, reserved) VALUES (?, ?, ?, ?, ?)`,
        [s.id, s.product_id, s.warehouse, s.quantity, s.reserved]
      );
    }

    // Routes & Route Points
    const { routes, routePoints } = generateRoutes();
    for (const r of routes) {
      await database.runAsync(
        `INSERT INTO routes (id, date, driver_id, status, vehicle_number) VALUES (?, ?, ?, ?, ?)`,
        [r.id, r.date, r.driver_id, r.status, r.vehicle_number]
      );
    }
    for (const rp of routePoints) {
      await database.runAsync(
        `INSERT INTO route_points (id, route_id, customer_id, sequence_number, planned_arrival, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [rp.id, rp.route_id, rp.customer_id, rp.sequence_number, rp.planned_arrival, rp.status]
      );
    }

    // Orders & Order Items
    const { orders, orderItems } = generateOrders();
    for (const o of orders) {
      await database.runAsync(
        `INSERT INTO orders (id, customer_id, user_id, route_point_id, order_date, status, total_amount, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.id, o.customer_id, o.user_id, o.route_point_id, o.order_date, o.status, o.total_amount, o.discount_amount]
      );
    }
    for (const oi of orderItems) {
      await database.runAsync(
        `INSERT INTO order_items (id, order_id, product_id, quantity, price, discount_percent, total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.discount_percent, oi.total]
      );
    }

    // Deliveries, Delivery Items & Payments
    const { deliveries, deliveryItems, payments } = generateDeliveriesAndPayments();
    for (const d of deliveries) {
      await database.runAsync(
        `INSERT INTO deliveries (id, order_id, route_point_id, customer_id, driver_id, delivery_date, status, total_amount, signature_name, signature_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.order_id, d.route_point_id, d.customer_id, d.driver_id, d.delivery_date, d.status, d.total_amount, d.signature_name, d.signature_confirmed]
      );
    }
    for (const di of deliveryItems) {
      await database.runAsync(
        `INSERT INTO delivery_items (id, delivery_id, product_id, ordered_quantity, delivered_quantity, price, total, reason_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [di.id, di.delivery_id, di.product_id, di.ordered_quantity, di.delivered_quantity, di.price, di.total, di.reason_code || null]
      );
    }
    for (const p of payments) {
      await database.runAsync(
        `INSERT INTO payments (id, customer_id, user_id, order_id, route_point_id, payment_date, amount, payment_type, status, receipt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.customer_id, p.user_id, p.order_id, p.route_point_id, p.payment_date, p.amount, p.payment_type, p.status, p.receipt_number]
      );
    }

    // Returns & Return Items
    const { returns, returnItems } = generateReturns();
    for (const r of returns) {
      await database.runAsync(
        `INSERT INTO returns (id, customer_id, driver_id, route_point_id, return_date, reason, status, total_amount, approved_by, approved_at, rejection_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.customer_id, r.driver_id, r.route_point_id, r.return_date, r.reason, r.status, r.total_amount, r.approved_by || null, r.approved_at || null, r.rejection_reason || null]
      );
    }
    for (const ri of returnItems) {
      await database.runAsync(
        `INSERT INTO return_items (id, return_id, product_id, quantity, price, total, condition, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ri.id, ri.return_id, ri.product_id, ri.quantity, ri.price, ri.total, ri.condition, ri.reason]
      );
    }

    // Notifications
    const notifications = generateNotifications();
    for (const n of notifications) {
      await database.runAsync(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, related_entity, related_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.user_id, n.title, n.message, n.type, n.is_read, n.related_entity, n.related_id, n.created_at]
      );
    }

    // Devices
    const devices = generateDevices();
    for (const d of devices) {
      await database.runAsync(
        `INSERT INTO devices (id, user_id, device_model, os_version, app_version, last_sync_at, status, storage_used_mb) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.user_id, d.device_model, d.os_version, d.app_version, d.last_sync_at, d.status, d.storage_used_mb]
      );
    }

    // Audit Log
    const auditEntries = generateAuditLog();
    for (const a of auditEntries) {
      await database.runAsync(
        `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details, a.created_at]
      );
    }

    // Loading Trips & Items
    const { trips, tripItems } = generateLoadingTrips();
    for (const t of trips) {
      await database.runAsync(
        `INSERT INTO loading_trips (id, driver_id, vehicle_id, route_id, loading_date, status, total_items, loaded_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.driver_id, t.vehicle_id, t.route_id, t.loading_date, t.status, t.total_items, t.loaded_items]
      );
    }
    for (const ti of tripItems) {
      await database.runAsync(
        `INSERT INTO loading_trip_items (id, loading_trip_id, product_id, planned_quantity, actual_quantity, scanned) VALUES (?, ?, ?, ?, ?, ?)`,
        [ti.id, ti.loading_trip_id, ti.product_id, ti.planned_quantity, ti.actual_quantity, ti.scanned]
      );
    }

    // Cash Collections
    const cashCollections = generateCashCollections();
    for (const cc of cashCollections) {
      await database.runAsync(
        `INSERT INTO cash_collections (id, driver_id, route_id, collection_date, expected_amount, actual_amount, discrepancy, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [cc.id, cc.driver_id, cc.route_id, cc.collection_date, cc.expected_amount, cc.actual_amount, cc.discrepancy, cc.status]
      );
    }

    // Packaging Returns
    const { packagingReturns, packagingReturnItems } = generatePackagingReturns();
    for (const pr of packagingReturns) {
      await database.runAsync(
        `INSERT INTO packaging_returns (id, customer_id, driver_id, route_point_id, return_date, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [pr.id, pr.customer_id, pr.driver_id, pr.route_point_id, pr.return_date, pr.status]
      );
    }
    for (const pri of packagingReturnItems) {
      await database.runAsync(
        `INSERT INTO packaging_return_items (id, packaging_return_id, packaging_type, expected_quantity, actual_quantity, condition) VALUES (?, ?, ?, ?, ?, ?)`,
        [pri.id, pri.packaging_return_id, pri.packaging_type, pri.expected_quantity, pri.actual_quantity, pri.condition]
      );
    }

    // Sync meta
    const entities = ['users', 'customers', 'products', 'price_lists', 'stock', 'routes', 'notifications', 'devices'];
    const now = new Date().toISOString();
    for (const e of entities) {
      await database.runAsync(
        `INSERT INTO sync_meta (entity_type, last_sync_at) VALUES (?, ?)`,
        [e, now]
      );
    }

    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

// =====================================================
// PRODUCTS
// =====================================================

export async function getAllProducts() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT p.*, pl.price as base_price, s.quantity as stock_quantity
    FROM products p
    LEFT JOIN price_lists pl ON pl.product_id = p.id AND pl.price_type = 'base'
    LEFT JOIN stock s ON s.product_id = p.id AND s.warehouse = 'main'
    WHERE p.is_active = 1
    ORDER BY p.category, p.name
  `);
}

export async function getProductsWithPrices() {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT p.id, p.name, p.sku, p.category, p.brand, p.volume, p.barcode,
           pl.price as base_price
    FROM products p
    LEFT JOIN price_lists pl ON pl.product_id = p.id AND pl.price_type = 'base'
    WHERE p.is_active = 1
    ORDER BY p.category, p.name
  `);
}

export async function searchProductByBarcode(barcode) {
  const database = await getDatabase();
  return database.getFirstAsync(`
    SELECT p.*, pl.price as base_price
    FROM products p
    LEFT JOIN price_lists pl ON pl.product_id = p.id AND pl.price_type = 'base'
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
      JOIN users u ON u.id = r.driver_id
      WHERE r.date = ? AND r.driver_id = ?
      ORDER BY r.id
    `, [date, driverId]);
  }
  return database.getAllAsync(`
    SELECT r.*, u.full_name as driver_name
    FROM routes r
    JOIN users u ON u.id = r.driver_id
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
  if (status === 'arrived') fields.actual_arrival = now;
  if (status === 'completed') fields.actual_departure = now;

  await database.runAsync(
    `UPDATE route_points SET status = ?, actual_arrival = COALESCE(?, actual_arrival), actual_departure = COALESCE(?, actual_departure) WHERE id = ?`,
    [status, fields.actual_arrival || null, fields.actual_departure || null, pointId]
  );
}

export async function updateRouteStatus(routeId, status) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE routes SET status = ?, updated_at = ? WHERE id = ?`,
    [status, now, routeId]
  );
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

export async function getOrderById(id) {
  const database = await getDatabase();
  return database.getFirstAsync(`
    SELECT o.*, c.name as customer_name, c.address as customer_address
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `, [id]);
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
    `INSERT INTO orders (id, customer_id, user_id, route_point_id, order_date, status, total_amount, discount_amount, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, 0, ?, ?, ?)`,
    [id, order.customer_id, order.user_id, order.route_point_id || null, now, order.total_amount || 0, order.notes || null, now, now]
  );
  return id;
}

export async function updateOrder(id, fields) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE orders SET customer_id = ?, total_amount = ?, discount_amount = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?`,
    [fields.customer_id, fields.total_amount || 0, fields.discount_amount || 0, fields.notes || null, fields.status || 'draft', now, id]
  );
}

export async function shipOrdersByRoutePoint(routePointId) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE orders SET status = 'shipped', updated_at = ? WHERE route_point_id = ? AND status IN ('draft', 'confirmed')`,
    [now, routePointId]
  );
}

/**
 * Decrease stock in a warehouse (vehicle) after shipment.
 * items: [{ product_id, quantity }]
 */
export async function decreaseStock(warehouse, items) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  for (const item of items) {
    if (item.quantity > 0) {
      await database.runAsync(
        `UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE warehouse = ? AND product_id = ?`,
        [item.quantity, now, warehouse, item.product_id]
      );
    }
  }
}

/**
 * Increase stock in a warehouse (vehicle) after return.
 * items: [{ product_id, quantity }]
 */
export async function increaseStock(warehouse, items) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  for (const item of items) {
    if (item.quantity > 0) {
      // Try update existing row
      const result = await database.runAsync(
        `UPDATE stock SET quantity = quantity + ?, updated_at = ? WHERE warehouse = ? AND product_id = ?`,
        [item.quantity, now, warehouse, item.product_id]
      );
      if (result.changes === 0) {
        // Insert new row if product not yet in stock
        const id = generateId();
        await database.runAsync(
          `INSERT INTO stock (id, product_id, warehouse, quantity, reserved, updated_at) VALUES (?, ?, ?, ?, 0, ?)`,
          [id, item.product_id, warehouse, item.quantity, now]
        );
      }
    }
  }
}

export async function deleteOrder(id) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [id]);
  await database.runAsync(`DELETE FROM orders WHERE id = ?`, [id]);
}

export async function saveOrderItems(orderId, items) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
  for (const item of items) {
    const itemId = generateId();
    await database.runAsync(
      `INSERT INTO order_items (id, order_id, product_id, quantity, price, discount_percent, total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [itemId, orderId, item.product_id, item.quantity, item.price, item.discount_percent || 0, item.total]
    );
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
    `INSERT INTO deliveries (id, order_id, route_point_id, customer_id, driver_id, delivery_date, status, total_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [id, delivery.order_id || null, delivery.route_point_id || null, delivery.customer_id, delivery.driver_id, now, delivery.total_amount || 0, now, now]
  );
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
  await database.runAsync(
    `INSERT INTO deliveries (id, order_id, route_point_id, customer_id, driver_id, delivery_date, status, total_amount, signature_name, signature_data, signature_driver_data, signature_confirmed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, delivery.order_id || null, delivery.route_point_id || null, delivery.customer_id, delivery.driver_id, now, 'delivered', delivery.total_amount || 0, delivery.signature_name || null, delivery.signature_data || null, delivery.signature_driver_data || null, now, now]
  );
  for (const item of items) {
    const diId = generateId();
    await database.runAsync(
      `INSERT INTO delivery_items (id, delivery_id, product_id, ordered_quantity, delivered_quantity, price, total, reason_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [diId, id, item.product_id, item.ordered_quantity || 0, item.delivered_quantity, item.price, item.delivered_quantity * item.price, item.reason_code || null]
    );
  }
  return id;
}

export async function updateDeliveryStatus(id, status, signatureName = null) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE deliveries SET status = ?, signature_name = COALESCE(?, signature_name), signature_confirmed = CASE WHEN ? IS NOT NULL THEN 1 ELSE signature_confirmed END, updated_at = ? WHERE id = ?`,
    [status, signatureName, signatureName, now, id]
  );
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
    WHERE r.status = 'pending_approval'
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
  await database.runAsync(
    `INSERT INTO returns (id, customer_id, driver_id, route_point_id, return_date, reason, status, total_amount, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?)`,
    [id, ret.customer_id, ret.driver_id, ret.route_point_id || null, now, ret.reason, ret.total_amount || 0, ret.notes || null, now]
  );
  return id;
}

export async function approveReturn(returnId, supervisorId) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE returns SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`,
    [supervisorId, now, returnId]
  );
}

export async function rejectReturn(returnId, supervisorId, reason) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE returns SET status = 'rejected', approved_by = ?, approved_at = ?, rejection_reason = ? WHERE id = ?`,
    [supervisorId, now, reason, returnId]
  );
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
  await database.runAsync(
    `INSERT INTO payments (id, customer_id, user_id, order_id, route_point_id, payment_date, amount, payment_type, status, receipt_number, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
    [id, payment.customer_id, payment.user_id, payment.order_id || null, payment.route_point_id || null, now, payment.amount, payment.payment_type, payment.receipt_number || null, payment.notes || null, now]
  );
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
           pl.price as base_price
    FROM stock s
    JOIN products p ON p.id = s.product_id
    LEFT JOIN price_lists pl ON pl.product_id = p.id AND pl.price_type = 'base'
    WHERE p.is_active = 1 ${where}
    ORDER BY p.category, p.name
  `, params);
}

export async function getVehicleByDriver(driverId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT * FROM vehicles WHERE driver_id = ? AND is_active = 1`,
    [driverId]
  );
}

export async function getVehicleStock(vehicleId) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT s.*, p.name as product_name, p.sku, p.category, p.brand, p.volume,
           pl.price as base_price
    FROM stock s
    JOIN products p ON p.id = s.product_id
    LEFT JOIN price_lists pl ON pl.product_id = p.id AND pl.price_type = 'base'
    WHERE s.warehouse = ? AND p.is_active = 1
    ORDER BY p.category, p.name
  `, [vehicleId]);
}

// Available stock = vehicle stock - quantities reserved by unshipped orders
// excludeOrderId: exclude current order being edited (to avoid double-counting)
// excludeRoutePointId: exclude all orders at this route point (for shipment screen)
export async function getAvailableVehicleStock(vehicleId, driverId, excludeOrderId = null, excludeRoutePointId = null) {
  const database = await getDatabase();
  return database.getAllAsync(`
    SELECT s.id, s.product_id, s.quantity as stock_quantity,
           p.name as product_name, p.sku, p.category, p.brand, p.volume, p.weight,
           pl.price as base_price,
           COALESCE(reserved.total_reserved, 0) as reserved_quantity,
           s.quantity - COALESCE(reserved.total_reserved, 0) as available_quantity
    FROM stock s
    JOIN products p ON p.id = s.product_id
    LEFT JOIN price_lists pl ON pl.product_id = p.id AND pl.price_type = 'base'
    LEFT JOIN (
      SELECT oi.product_id, SUM(oi.quantity) as total_reserved
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = ?
        AND o.status IN ('draft', 'confirmed')
        AND (? IS NULL OR o.id != ?)
        AND (? IS NULL OR o.route_point_id IS NULL OR o.route_point_id != ?)
      GROUP BY oi.product_id
    ) reserved ON reserved.product_id = s.product_id
    WHERE s.warehouse = ? AND p.is_active = 1
    ORDER BY p.category, p.name
  `, [driverId, excludeOrderId, excludeOrderId, excludeRoutePointId, excludeRoutePointId, vehicleId]);
}

// Get data for vehicle unloading: remaining stock + today's returns
export async function getUnloadingData(vehicleId, driverId) {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];

  // Remaining vehicle stock (not delivered)
  const remaining = await database.getAllAsync(`
    SELECT s.product_id, s.quantity, p.name as product_name, p.sku, p.category, p.brand, p.volume, p.weight,
           pl.price as base_price
    FROM stock s
    JOIN products p ON p.id = s.product_id
    LEFT JOIN price_lists pl ON pl.product_id = p.id AND pl.price_type = 'base'
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
    `SELECT COUNT(*) as count FROM loading_trips WHERE driver_id = ? AND status = 'verified'`,
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
      WHERE lt.driver_id = ?
      ORDER BY lt.loading_date DESC
    `, [driverId]);
  }
  return database.getAllAsync(`
    SELECT lt.*, v.plate_number, v.model as vehicle_model, u.full_name as driver_name
    FROM loading_trips lt
    JOIN vehicles v ON v.id = lt.vehicle_id
    JOIN users u ON u.id = lt.driver_id
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
  if (status === 'verified') {
    const trip = await database.getFirstAsync(
      `SELECT vehicle_id FROM loading_trips WHERE id = ?`, [tripId]
    );
    if (trip?.vehicle_id) {
      const tripItems = await database.getAllAsync(
        `SELECT product_id, actual_quantity FROM loading_trip_items WHERE loading_trip_id = ?`, [tripId]
      );
      // Reset vehicle stock to actual loaded quantities
      for (const item of tripItems) {
        const existing = await database.getFirstAsync(
          `SELECT id FROM stock WHERE warehouse = ? AND product_id = ?`,
          [trip.vehicle_id, item.product_id]
        );
        if (existing) {
          await database.runAsync(
            `UPDATE stock SET quantity = ?, updated_at = ? WHERE warehouse = ? AND product_id = ?`,
            [item.actual_quantity, now, trip.vehicle_id, item.product_id]
          );
        } else if (item.actual_quantity > 0) {
          const id = generateId();
          await database.runAsync(
            `INSERT INTO stock (id, product_id, warehouse, quantity, reserved, updated_at) VALUES (?, ?, ?, ?, 0, ?)`,
            [id, item.product_id, trip.vehicle_id, item.actual_quantity, now]
          );
        }
      }
    }
  }
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
  const status = discrepancy === 0 ? 'collected' : 'discrepancy';
  await database.runAsync(
    `INSERT INTO cash_collections (id, driver_id, route_id, collection_date, expected_amount, actual_amount, discrepancy, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, collection.driver_id, collection.route_id || null, now, collection.expected_amount || 0, collection.actual_amount || 0, discrepancy, status, collection.notes || null, now]
  );
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
    SELECT * FROM packaging_return_items WHERE packaging_return_id = ?
  `, [packagingReturnId]);
}

export async function createPackagingReturn(pr) {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO packaging_returns (id, customer_id, driver_id, route_point_id, return_date, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [id, pr.customer_id, pr.driver_id, pr.route_point_id || null, now, pr.notes || null, now]
  );
  return id;
}

export async function savePackagingReturnItems(packagingReturnId, items) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM packaging_return_items WHERE packaging_return_id = ?`, [packagingReturnId]);
  for (const item of items) {
    const itemId = generateId();
    await database.runAsync(
      `INSERT INTO packaging_return_items (id, packaging_return_id, packaging_type, expected_quantity, actual_quantity, condition) VALUES (?, ?, ?, ?, ?, ?)`,
      [itemId, packagingReturnId, item.packaging_type, item.expected_quantity || 0, item.actual_quantity || 0, item.condition || 'good']
    );
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
    SELECT COUNT(DISTINCT r.driver_id) as count FROM routes r WHERE r.date = ? AND r.status IN ('planned','in_progress')
  `, [targetDate]);

  const totalPoints = await database.getFirstAsync(`
    SELECT COUNT(*) as total, SUM(CASE WHEN rp.status = 'completed' THEN 1 ELSE 0 END) as completed
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
    FROM returns WHERE status = 'pending_approval'
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
      SUM(CASE WHEN rp.status = 'completed' THEN 1 ELSE 0 END) as completed_points,
      SUM(CASE WHEN rp.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_points,
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

// =====================================================
// DB STATS
// =====================================================

export async function getDbStats() {
  const database = await getDatabase();
  const stats = {};
  const tables = [
    'users', 'vehicles', 'customers', 'products', 'price_lists', 'stock',
    'routes', 'route_points', 'orders', 'order_items', 'deliveries', 'delivery_items',
    'returns', 'return_items', 'payments',
    'loading_trips', 'loading_trip_items', 'cash_collections',
    'packaging_returns', 'packaging_return_items',
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
  await database.runAsync(
    `INSERT INTO tour_checkins (id, driver_id, vehicle_id, route_id, type, status, vehicle_check, odometer_reading, cash_amount, signature_data, supervisor_name, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, checkin.driver_id, checkin.vehicle_id, checkin.route_id || null, checkin.type, checkin.status || 'in_progress', checkin.vehicle_check || null, checkin.odometer_reading || null, checkin.cash_amount || null, checkin.signature_data || null, checkin.supervisor_name || null, checkin.notes || null, now, now]
  );
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
  const database = await getDatabase();
  for (const item of items) {
    const id = generateId();
    await database.runAsync(
      `INSERT INTO vehicle_check_items (id, checkin_id, question, answer, is_ok, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, checkinId, item.question, item.answer || null, item.is_ok ? 1 : 0, item.notes || null]
    );
  }
}
