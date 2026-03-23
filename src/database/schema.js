const SCHEMA_VERSION = 6;

const CREATE_TABLES = [
  // --- Справочники ---

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('expeditor','preseller','supervisor','admin')),
    phone TEXT,
    vehicle_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    name TEXT NOT NULL,
    legal_name TEXT,
    ship_to_name TEXT,
    inn TEXT,
    kpp TEXT,
    address TEXT NOT NULL,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    latitude REAL,
    longitude REAL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    visit_time_from TEXT,
    visit_time_to TEXT,
    delivery_notes_text TEXT,
    vat_rate REAL DEFAULT 22,
    customer_type TEXT CHECK(customer_type IN ('retail','wholesale','horeca')),
    payment_terms TEXT DEFAULT 'cash',
    credit_limit REAL DEFAULT 0,
    debt_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    price_list_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    volume TEXT,
    volume_unit TEXT DEFAULT 'LTR',
    unit TEXT DEFAULT 'шт',
    barcode TEXT,
    weight REAL,
    weight_unit TEXT DEFAULT 'KGM',
    vat_percent REAL DEFAULT 22,
    image_url TEXT,
    material_type TEXT DEFAULT 'product',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // --- Привязка возвратной тары к товарам (tied empties) ---

  `CREATE TABLE IF NOT EXISTS product_empties (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    empty_product_id TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit TEXT DEFAULT 'шт',
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (empty_product_id) REFERENCES products(id)
  )`,

  `CREATE TABLE IF NOT EXISTS price_list_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    price_type TEXT DEFAULT 'base',
    price REAL NOT NULL,
    currency TEXT DEFAULT 'RUB',
    valid_from TEXT,
    valid_to TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  `CREATE TABLE IF NOT EXISTS units (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    plate_number TEXT NOT NULL UNIQUE,
    model TEXT,
    driver_id TEXT,
    capacity_kg REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    warehouse TEXT DEFAULT 'main',
    quantity REAL NOT NULL DEFAULT 0,
    reserved REAL DEFAULT 0,
    unit TEXT DEFAULT 'шт',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(warehouse, product_id)
  )`,

  // --- Маршруты ---

  `CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    name TEXT,
    driver_id TEXT NOT NULL,
    status TEXT DEFAULT 'planned' CHECK(status IN ('planned','in_progress','completed','cancelled')),
    vehicle_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS route_points (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    planned_arrival TEXT,
    actual_arrival TEXT,
    actual_departure TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','arrived','in_progress','completed','skipped')),
    latitude REAL,
    longitude REAL,
    actual_arrival_lat REAL,
    actual_arrival_lon REAL,
    actual_departure_lat REAL,
    actual_departure_lon REAL,
    notes TEXT,
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`,

  // --- Документы ---

  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    customer_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    route_id TEXT,
    route_point_id TEXT,
    order_date TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','shipped','delivered','cancelled')),
    total_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    vat_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    notes TEXT,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    vat_percent REAL,
    total REAL NOT NULL,
    unit TEXT DEFAULT 'шт',
    currency TEXT DEFAULT 'RUB',
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  `CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    route_id TEXT,
    route_point_id TEXT,
    customer_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    delivery_date TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_transit','delivered','partial','rejected')),
    total_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    signature_name TEXT,
    signature_data TEXT,
    signature_driver_data TEXT,
    signature_confirmed INTEGER DEFAULT 0,
    notes TEXT,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS delivery_items (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    ordered_quantity REAL NOT NULL,
    delivered_quantity REAL NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    reason_code TEXT,
    unit TEXT DEFAULT 'шт',
    currency TEXT DEFAULT 'RUB',
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  `CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    route_point_id TEXT,
    return_date TEXT DEFAULT (datetime('now')),
    reason TEXT CHECK(reason IN ('quality','expired','unsold','damaged','other')),
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending_approval','approved','rejected','processed')),
    total_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    notes TEXT,
    approved_by TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS return_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    condition TEXT DEFAULT 'normal' CHECK(condition IN ('normal','damaged','expired')),
    reason TEXT,
    unit TEXT DEFAULT 'шт',
    currency TEXT DEFAULT 'RUB',
    FOREIGN KEY (return_id) REFERENCES returns(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  // --- Финансы ---

  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    order_id TEXT,
    delivery_id TEXT,
    route_point_id TEXT,
    payment_date TEXT DEFAULT (datetime('now')),
    amount REAL NOT NULL,
    change_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    payment_type TEXT CHECK(payment_type IN ('cash','card','qr','transfer')),
    status TEXT DEFAULT 'completed',
    receipt_number TEXT,
    notes TEXT,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // --- Загрузка рейса ---

  `CREATE TABLE IF NOT EXISTS loading_trips (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    route_id TEXT,
    loading_date TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'planned' CHECK(status IN ('planned','loading','loaded','verified')),
    total_items INTEGER DEFAULT 0,
    loaded_items INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
  )`,

  `CREATE TABLE IF NOT EXISTS loading_trip_items (
    id TEXT PRIMARY KEY,
    loading_trip_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    planned_quantity REAL NOT NULL,
    actual_quantity REAL DEFAULT 0,
    scanned INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'шт',
    FOREIGN KEY (loading_trip_id) REFERENCES loading_trips(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  // --- Инкассация ---

  `CREATE TABLE IF NOT EXISTS cash_collections (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    route_id TEXT,
    collection_date TEXT DEFAULT (datetime('now')),
    expected_amount REAL DEFAULT 0,
    actual_amount REAL DEFAULT 0,
    discrepancy REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','collected','verified','discrepancy')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  // --- Start/End of Day (Tour Check-in/Check-out) ---

  `CREATE TABLE IF NOT EXISTS tour_checkins (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    vehicle_id TEXT,
    route_id TEXT,
    type TEXT NOT NULL CHECK(type IN ('start','end')),
    checkin_date TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed')),
    current_step INTEGER DEFAULT 0,
    material_check_data TEXT,
    vehicle_check TEXT,
    odometer_reading REAL,
    cash_amount REAL,
    currency TEXT DEFAULT 'RUB',
    signature_data TEXT,
    supervisor_name TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
  )`,

  `CREATE TABLE IF NOT EXISTS vehicle_check_items (
    id TEXT PRIMARY KEY,
    checkin_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    is_ok INTEGER DEFAULT 1,
    notes TEXT,
    FOREIGN KEY (checkin_id) REFERENCES tour_checkins(id)
  )`,

  // --- Возвраты тары ---

  `CREATE TABLE IF NOT EXISTS packaging_returns (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    route_point_id TEXT,
    return_date TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','processed')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS packaging_return_items (
    id TEXT PRIMARY KEY,
    packaging_return_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    expected_quantity REAL DEFAULT 0,
    actual_quantity REAL DEFAULT 0,
    condition TEXT DEFAULT 'good' CHECK(condition IN ('good','damaged','missing')),
    unit TEXT DEFAULT 'шт',
    FOREIGN KEY (packaging_return_id) REFERENCES packaging_returns(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  // --- Уведомления ---

  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info','warning','error','success')),
    is_read INTEGER DEFAULT 0,
    related_entity TEXT,
    related_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // --- Устройства ---

  `CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    last_sync_at TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','blocked')),
    storage_used_mb REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // --- Аудит-лог ---

  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // --- Синхронизация ---

  `CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
    payload TEXT,
    synced INTEGER DEFAULT 0,
    sync_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    synced_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS sync_meta (
    entity_type TEXT PRIMARY KEY,
    last_sync_at TEXT,
    last_server_version TEXT
  )`,

  // --- Expenses ---

  `CREATE TABLE IF NOT EXISTS expense_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'cash-outline',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    tour_checkin_id TEXT,
    driver_id TEXT NOT NULL,
    expense_type_id TEXT NOT NULL,
    expense_type_name TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'RUB',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (expense_type_id) REFERENCES expense_types(id)
  )`,

  `CREATE TABLE IF NOT EXISTS expense_attachments (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK(file_type IN ('image','pdf')),
    local_uri TEXT NOT NULL,
    file_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
  )`,

  // --- Invoices / Receipts / Delivery Notes ---

  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    delivery_id TEXT,
    order_id TEXT,
    customer_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    route_point_id TEXT,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','cancelled')),
    subtotal REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    form_type TEXT,
    signature_customer TEXT,
    signature_driver TEXT,
    notes TEXT,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_percent REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    unit TEXT DEFAULT 'шт',
    currency TEXT DEFAULT 'RUB',
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  `CREATE TABLE IF NOT EXISTS delivery_notes (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    invoice_id TEXT,
    note_number TEXT NOT NULL UNIQUE,
    note_date TEXT DEFAULT (datetime('now')),
    customer_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed')),
    total_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    total_items INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    payment_id TEXT,
    invoice_id TEXT,
    customer_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    receipt_date TEXT DEFAULT (datetime('now')),
    payment_method TEXT CHECK(payment_method IN ('cash','card','qr','transfer')),
    amount_due REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    change_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    status TEXT DEFAULT 'completed',
    signature_customer TEXT,
    notes TEXT,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )`,

  // --- Индексы ---

  `CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
  `CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(date)`,
  `CREATE INDEX IF NOT EXISTS idx_routes_driver ON routes(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced)`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock(warehouse)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status)`,
  `CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_loading_trips_driver ON loading_trips(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cash_collections_driver ON cash_collections(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tour_checkins_driver ON tour_checkins(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tour_checkins_type ON tour_checkins(type)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_delivery ON invoices(delivery_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)`,
  `CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts(invoice_id)`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery ON delivery_notes(delivery_id)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_driver ON expenses(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_checkin ON expenses(tour_checkin_id)`,
  `CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense ON expense_attachments(expense_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_route_point ON orders(route_point_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_route_point ON payments(route_point_id)`,
  `CREATE INDEX IF NOT EXISTS idx_deliveries_route_point ON deliveries(route_point_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tour_checkins_driver_type ON tour_checkins(driver_id, type)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_checkins_daily ON tour_checkins(driver_id, type, date(checkin_date))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_warehouse_product ON stock(warehouse, product_id)`,

  // --- Отчёты о визитах ---

  `CREATE TABLE IF NOT EXISTS visit_reports (
    id TEXT PRIMARY KEY,
    route_point_id TEXT NOT NULL,
    route_id TEXT,
    customer_id TEXT,
    user_id TEXT NOT NULL,
    checklist TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted')),
    visit_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (route_point_id) REFERENCES route_points(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS visit_report_photos (
    id TEXT PRIMARY KEY,
    visit_report_id TEXT NOT NULL,
    uri TEXT NOT NULL,
    photo_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (visit_report_id) REFERENCES visit_reports(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_visit_reports_point ON visit_reports(route_point_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visit_reports_route ON visit_reports(route_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visit_report_photos_report ON visit_report_photos(visit_report_id)`,

  // --- Adjustment Reasons (configurable) ---

  `CREATE TABLE IF NOT EXISTS adjustment_reasons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )`,

  // --- Inventory Adjustments ---

  `CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT,
    warehouse TEXT DEFAULT 'main',
    user_id TEXT NOT NULL,
    supervisor_user_id TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','cancelled')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (supervisor_user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
    id TEXT PRIMARY KEY,
    adjustment_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    reason_id TEXT NOT NULL,
    previous_qty REAL NOT NULL DEFAULT 0,
    adjusted_qty REAL NOT NULL DEFAULT 0,
    difference REAL NOT NULL DEFAULT 0,
    notes TEXT,
    unit TEXT DEFAULT 'шт',
    FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (reason_id) REFERENCES adjustment_reasons(id)
  )`,

  // --- On Hand Inventory (customer shelf stock) ---

  `CREATE TABLE IF NOT EXISTS on_hand_inventory (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    route_point_id TEXT,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','captured','discarded','cancelled')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS on_hand_inventory_items (
    id TEXT PRIMARY KEY,
    on_hand_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    notes TEXT,
    unit TEXT DEFAULT 'шт',
    FOREIGN KEY (on_hand_id) REFERENCES on_hand_inventory(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_user ON inventory_adjustments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_vehicle ON inventory_adjustments(vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_adjustment_items_adj ON inventory_adjustment_items(adjustment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_on_hand_customer ON on_hand_inventory(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_on_hand_items_oh ON on_hand_inventory_items(on_hand_id)`,

  // --- GPS-трекинг ---

  `CREATE TABLE IF NOT EXISTS gps_tracks (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    route_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    speed REAL,
    heading REAL,
    event_type TEXT DEFAULT 'track' CHECK(event_type IN ('track','visit_start','visit_end','route_start','route_end')),
    route_point_id TEXT,
    recorded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (route_id) REFERENCES routes(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gps_tracks_driver ON gps_tracks(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gps_tracks_route ON gps_tracks(route_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gps_tracks_recorded ON gps_tracks(recorded_at)`,

  // --- Structured Error Log ---

  `CREATE TABLE IF NOT EXISTS error_log (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL DEFAULT 'error' CHECK(severity IN ('debug','info','warning','error','critical')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT,
    stack_trace TEXT,
    user_id TEXT,
    screen TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_error_log_severity ON error_log(severity)`,
  `CREATE INDEX IF NOT EXISTS idx_error_log_source ON error_log(source)`,
  `CREATE INDEX IF NOT EXISTS idx_error_log_date ON error_log(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_error_log_user ON error_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_price_lists_product_type ON price_lists(product_id, price_type)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id, warehouse)`,
];

export { SCHEMA_VERSION, CREATE_TABLES };
