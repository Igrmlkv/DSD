# DSD Mini React Native Project - Inventory System Analysis

## Executive Summary

This React Native project (DSD Mini) is a logistics/distribution management app with inventory operations for expeditors (delivery drivers) and supervisors. The inventory system manages stock across a main warehouse and vehicles, with operations including loading, unloading, inventory checks, and return management.

---

## 1. SCREEN FILES

### 1.1 InventoryCheckScreen.js
**Location:** `/Users/igormalkov/Python/DSDMini/src/screens/expeditor/InventoryCheckScreen.js`
**Purpose:** Allows drivers to perform physical inventory checks on their vehicle stock

**Key Features:**
- Displays all items currently in a driver's vehicle
- Shows expected quantities (from system) vs. actual quantities (from count)
- Highlights discrepancies in red
- Search capability to filter items by product name or SKU
- Summary footer showing:
  - Total items count
  - Number of discrepancies found
- Submit button to complete inventory check with confirmation dialog

**Data Flow:**
1. Loads vehicle by driver ID: `getVehicleByDriver(user.id)`
2. Fetches vehicle stock: `getVehicleStock(v.id)`
3. User manually enters actual quantities for each item
4. System compares actual vs. calculated quantities
5. On submit: Shows discrepancy count (if any) and allows saving

**State Management:**
- Vehicle data (vehicle ID, model, plate number)
- Items array (product details from stock)
- factQty object (actual quantities entered by user)
- Search filter for products

**UI Components:**
- Vehicle header with icon (car) showing model & plate
- Search input field
- FlatList of items with product info, SKU, expected quantity, and text input for actual qty
- Footer with summary and submit button
- Color coding: red border/text for discrepancies

---

### 1.2 VehicleUnloadingScreen.js
**Location:** `/Users/igormalkov/Python/DSDMini/src/screens/expeditor/VehicleUnloadingScreen.js`
**Purpose:** Allows drivers to unload remaining stock and customer returns from vehicles back to the warehouse

**Key Features:**
- Displays two sections:
  1. **Remaining Stock** - Items not yet delivered to customers
  2. **Customer Returns** - Items returned by customers (damaged, expired, etc.)
- Qty adjust controls: +/- buttons to modify quantities before unloading
- Shows expected vs. actual quantities
- Displays item condition (normal/damaged/expired) for returns
- Confirmation workflow before finalizing
- Green confirmation banner after successful unloading

**Data Flow:**
1. Loads unloading data: `getUnloadingData(vehicleId, user.id)`
   - Returns: remaining stock + today's return items
2. User adjusts quantities using +/- buttons
3. On confirm:
   - Increases main warehouse stock: `increaseStock('main', stockItems)`
   - Decreases vehicle stock: `decreaseStock(vehicleId, vehicleDecrease)`
4. Sets confirmed flag (prevents further edits)

**State Management:**
- Sections array (remaining + returns grouped)
- Quantities object (tracks adjusted qty for each item)
- Loading state (initial data fetch)
- Confirmed state (true after successful unload)

**UI Components:**
- SectionList with two sections (remaining & returns)
- Item rows with product info, volume, condition tags
- Quantity controls (-, number, +) - disabled when confirmed
- Read-only qty display when confirmed
- Summary bar showing total items & qty
- Footer button to confirm unloading
- Green confirmation banner at top after success

---

## 2. DATABASE SCHEMA

### 2.1 Stock Table (Core Inventory)
```sql
CREATE TABLE stock (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  warehouse TEXT DEFAULT 'main',  -- 'main' for warehouse, vehicle_id for vehicles
  quantity REAL NOT NULL DEFAULT 0,
  reserved REAL DEFAULT 0,  -- qty reserved by unshipped orders
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id)
)
```

**Key Concepts:**
- **warehouse field**: Identifies location - 'main' for main warehouse or vehicle_id for vehicles
- **quantity**: Current stock level
- **reserved**: Items allocated to draft/confirmed orders but not yet shipped
- **available = quantity - reserved**: What can actually be used

### 2.2 Related Tables for Inventory Operations

**Products Table:**
- Stores product master data: SKU, name, category, volume, barcode, etc.

**Price Lists Table:**
- Links product IDs to prices (base, promo, etc.)

**Order Items Table:**
- Tracks items in orders (qty, price) - determines stock reservation

**Deliveries & Delivery Items Tables:**
- Records actual deliveries to customers with quantities delivered

**Returns & Return Items Tables:**
- Tracks returned products with reason (quality, expired, damaged, unsold, other)
- Condition field: 'normal', 'damaged', 'expired'

**Loading Trips & Loading Trip Items Tables:**
- Tracks loading of vehicles from warehouse
- Used before routes to verify stock loaded matches expected

**Vehicles Table:**
- Links drivers to vehicles via driver_id
- Has capacity_kg for weight limits

---

## 3. DATABASE FUNCTIONS - INVENTORY OPERATIONS

### Core Stock Functions

**3.1 getStockWithProducts(warehouse = null)**
- Fetches stock with joined product details, SKU, category, brand, volume, base price
- Optional warehouse filter
- Ordered by category and product name

**3.2 getVehicleByDriver(driverId)**
- Returns the vehicle assigned to a driver
- Used to find which vehicle the current user is associated with

**3.3 getVehicleStock(vehicleId)**
- Gets all items currently in a vehicle
- Returns product details: name, SKU, category, brand, volume, base price
- **Used by:** InventoryCheckScreen, LoadingTripScreen

**3.4 getAvailableVehicleStock(vehicleId, driverId, excludeOrderId, excludeRoutePointId)**
- **Complex query** that returns vehicle stock WITH RESERVATION LOGIC
- Calculates: `available_quantity = stock_quantity - reserved_quantity`
- Reserved qty = items in draft/confirmed orders for this driver
- Excludes specific orders or route points to avoid double-counting
- **Used by:** Order creation/editing screens to prevent overselling
- Returns: stock_quantity, reserved_quantity, available_quantity for each product

**3.5 getUnloadingData(vehicleId, driverId)**
- Gets two datasets:
  1. **remaining**: Vehicle stock with quantity > 0 (undelivered items)
  2. **returnItems**: Today's returns for this driver (filtered by return_date >= today)
- **Used by:** VehicleUnloadingScreen
- Return items include: product_id, quantity, condition (normal/damaged/expired), product details

### Stock Modification Functions

**3.6 increaseStock(warehouse, items)**
- Adds items to warehouse stock
- `items = [{ product_id, quantity }]`
- Updates existing stock or inserts new row if product not in warehouse yet
- Updates timestamp
- **Used by:** VehicleUnloadingScreen (when unloading to main warehouse)

**3.7 decreaseStock(warehouse, items)**
- Removes items from warehouse stock
- `items = [{ product_id, quantity }]`
- Uses MAX(0, quantity - delta) to prevent negative stock
- Updates timestamp
- **Used by:** Shipment/Delivery operations

### Stock Status Functions

**3.8 hasVerifiedLoadingTrip(driverId)**
- Checks if driver has a verified loading trip for the day
- Used to ensure stock is "loaded and verified" before operations

---

## 4. STORE (STATE MANAGEMENT)

### authStore.js (Zustand)
**Location:** `/Users/igormalkov/Python/DSDMini/src/store/authStore.js`

**State:**
- `user`: Current logged-in user object (includes vehicleId if driver)
- `isAuthenticated`: Boolean login state
- `isLoading`: True while checking session

**Functions:**
- `login(username, password)`: Authenticate user
- `logout()`: Clear session
- `restoreSession()`: Resume previous session from secure storage

**User Object Fields:**
- `id`: User ID
- `username`: Login name
- `fullName`: Display name
- `role`: 'expeditor', 'supervisor', 'preseller', 'admin'
- `phone`: Phone number
- `vehicleId`: Assigned vehicle (drivers only)

### settingsStore.js (Zustand)
**Location:** `/Users/igormalkov/Python/DSDMini/src/store/settingsStore.js`

**State:**
- `mapProvider`: 'yandex' or 'osm'
- `language`: 'ru' or 'en'
- `printFormType`: 'upd' or 'invoice'
- `isLoaded`: Settings loaded flag

**Functions:**
- `setMapProvider(provider)`: Change map provider
- `setLanguage(lang)`: Change app language
- `setPrintFormType(type)`: Change invoice form type
- `_persist()`: Save to secure storage

---

## 5. SCREEN CONSTANTS

### SCREEN_NAMES
**Location:** `/Users/igormalkov/Python/DSDMini/src/constants/screens.js`

**Inventory-Related Screens:**
```javascript
WAREHOUSE_OPS_TAB: 'WarehouseOpsTab'
INVENTORY_CHECK: 'InventoryCheck'
LOADING_TRIP: 'LoadingTrip'
CASH_COLLECTION: 'CashCollection'
VEHICLE_UNLOADING: 'VehicleUnloading'
START_OF_DAY: 'StartOfDay'
END_OF_DAY: 'EndOfDay'
EXPENSES: 'Expenses'
```

---

## 6. NAVIGATION

### WarehouseOpsStack.js
**Location:** `/Users/igormalkov/Python/DSDMini/src/navigation/WarehouseOpsStack.js`

**Purpose:** Stack navigator for warehouse operations screens
**Screens (in order):**
1. **INVENTORY_CHECK** → InventoryCheckScreen
2. **START_OF_DAY** → StartOfDayScreen
3. **LOADING_TRIP** → LoadingTripScreen
4. **CASH_COLLECTION** → CashCollectionScreen
5. **VEHICLE_UNLOADING** → VehicleUnloadingScreen
6. **END_OF_DAY** → EndOfDayScreen
7. **EXPENSES** → ExpensesScreen

**Header Styling:**
- Primary color background
- White text and tint
- Bold headers

**i18n Navigation Labels:**
- `nav.inventoryCheck` → "Inventory Check"
- `nav.vehicleUnloading` → "Vehicle Unloading"
- `nav.loadingTrip` → "Trip Loading"
- etc.

---

## 7. TRANSLATIONS (i18n)

### English Translation Keys

**Inventory Check Screen:**
```javascript
"inventoryScreen": {
  "completeInventory": "Complete inventory check?",
  "discrepanciesFound": "Discrepancies found: {{count}} items",
  "noDiscrepancies": "No discrepancies",
  "saveButton": "Save",
  "actSaved": "Inventory check act saved",
  "searchPlaceholder": "Search product...",
  "calculated": "Calc",  // Abbr for calculated/expected
  "noItems": "No items for inventory",
  "itemsCount": "Items: {{count}}",
  "discrepancyCount": "Discrepancies: {{count}}",
  "completeInventoryBtn": "Complete inventory"
}
```

**Vehicle Unloading Screen:**
```javascript
"vehicleUnloading": {
  "remainingStock": "Remaining stock",
  "customerReturns": "Customer returns",
  "noItemsToUnload": "No items to unload",
  "confirmUnloading": "Confirm unloading?",
  "unloadingConfirmed": "Unloading confirmed. Stock transferred to warehouse.",
  "conditionDamaged": "Damaged",
  "conditionExpired": "Expired",
  "willUnload": "{{qty}} units will be unloaded to warehouse",
  "expectedQty": "Expected qty: {{qty}}",
  "accepted": "Accepted",
  "positions": "items",
  "confirmedBanner": "Unloading confirmed",
  "summary": "{{items}} items | {{qty}} units to unload",
  "allShipped": "All items were shipped to customers",
  "confirmToWarehouse": "Confirm unloading to warehouse"
}
```

**Stock-Related Keys (across screens):**
```javascript
"warehouseScreen": {
  "inTruck": "In Truck",
  "inWarehouse": "In Warehouse",
  "reserved": "Reserved",
  "available": "Available",
  "completeLoading": "Complete trip loading to confirm vehicle stock",
  "stockNotAccepted": "Stock not accepted to vehicle"
}

"shipmentScreen": {
  "vehicleStock": "Vehicle stock",
  "inVehicle": "In vehicle: {{qty}} pcs",
  "exceedsStock": "Exceeds stock by {{qty}} pcs",
  "vehicleRemaining": "Vehicle has {{qty}} pcs remaining",
  "available": "Available: {{qty}} pcs",
  "stockExceeded": "Quantity exceeds vehicle stock:\n\n{{names}}"
}

"reasons": {
  "quality": "Quality",
  "expired": "Expired",
  "unsold": "Unsold",
  "damaged": "Damaged",
  "other": "Other"
}
```

### Russian Translation Keys (selected)
```javascript
"inventoryScreen": {
  "completeInventory": "Завершить ревизию?",
  "calculated": "Расч",  // Abbreviated
  "itemsCount": "Позиций: {{count}}",
  "discrepancyCount": "Расхождений: {{count}}"
}

"vehicleUnloading": {
  "remainingStock": "Не отгруженные остатки",
  "conditionDamaged": "Повреждён",
  "conditionExpired": "Просрочен",
  "confirmToWarehouse": "Подтвердить выгрузку на склад"
}

"reasons": {
  "expired": "Срок годности",
  "damaged": "Повреждение",
  "unsold": "Нереализовано"
}
```

---

## 8. SERVICE LAYER

### documentService.js
Handles PDF generation and document operations:
- `generatePdf(html, fileName)`: Create PDF from HTML
- `generateInvoicePdf(invoice, printFormType)`: Invoice PDF
- `generateReceiptPdf(receipt)`: Receipt PDF
- `generateDeliveryNotePdf(note, items)`: Delivery note PDF
- `printDocument(html)`: Send to printer
- `shareDocument(fileUri)`: Share PDF via email/messenger

### documentTemplates.js
Contains HTML templates for printing:
- UPD (Russian standard invoice)
- Invoice (International)
- Receipt
- Delivery Note
- Order Confirmation

### invoiceService.js
Invoice-specific operations (pricing, calculations)

### authService.js
Authentication with mock user accounts:
- petrov (expeditor)
- kozlov (expeditor)
- ivanova (supervisor)
- sokolov (preseller)
- admin (administrator)

---

## 9. KEY INVENTORY WORKFLOWS

### Workflow 1: Load Vehicle (Start of Day)
1. Driver starts route (StartOfDayScreen)
2. System verifies vehicle is assigned
3. Loading trip created with tasks
4. Driver scans products from warehouse into vehicle
5. Loading trip marked as verified
6. Stock moved from 'main' warehouse to vehicle warehouse (vehicleId)

### Workflow 2: Deliver and Reduce Stock
1. Driver visits customer
2. Shipment created with order items
3. Items physically delivered (unshipped → shipped status)
4. Delivery confirmed
5. Stock decreases in vehicle warehouse
6. If order was partial, shows discrepancy

### Workflow 3: Handle Returns
1. Customer returns product
2. Return created with reason (expired, damaged, etc.)
3. Return marked with condition (normal/damaged/expired)
4. Return sent for supervisor approval
5. Once approved, quantity added back to vehicle stock

### Workflow 4: End of Day - Unload Remaining
1. Day completed (EndOfDayScreen)
2. Material check-in phase shows all undelivered stock + returns
3. Driver unloads to warehouse (VehicleUnloadingScreen)
4. Calls `getUnloadingData()` to show:
   - Remaining stock (undelivered orders)
   - Today's customer returns
5. Driver adjusts quantities (if damaged/shortage)
6. Confirms unload:
   - Vehicle stock decreases
   - Main warehouse stock increases
   - Inventory reconciliation complete

### Workflow 5: Inventory Check (Periodic)
1. Supervisor assigns inventory check task
2. Driver opens InventoryCheckScreen
3. System loads current vehicle stock
4. Driver physically counts items
5. Enters actual quantities
6. System highlights discrepancies
7. On submit, discrepancy report saved

---

## 10. DATA FLOW DIAGRAM - INVENTORY CHECK

```
InventoryCheckScreen
├─ Load Vehicle Data
│  └─ getVehicleByDriver(user.id) → vehicle object
├─ Load Vehicle Stock
│  └─ getVehicleStock(vehicle.id) → [stock items with product details]
├─ Initialize Qty
│  └─ factQty = { itemId: itemQuantity, ... }
├─ User Input
│  └─ updateFact(itemId, userInput) → set factQty[itemId]
├─ Calculate Discrepancies
│  └─ items.filter(i => factQty[i.id] !== i.quantity)
└─ Submit
   └─ Alert with discrepancy count
      └─ onPress: save inventory check act
```

---

## 11. DATA FLOW DIAGRAM - VEHICLE UNLOADING

```
VehicleUnloadingScreen
├─ Load Unloading Data
│  └─ getUnloadingData(vehicleId, driverId)
│     ├─ remaining: vehicle stock > 0
│     └─ returnItems: today's returns for driver
├─ Organize into Sections
│  ├─ Section 1: Remaining Stock
│  └─ Section 2: Customer Returns
├─ Initialize Quantities
│  └─ quantities = { itemKey: itemQuantity, ... }
├─ User Adjusts Qty
│  └─ adjustQty(key, delta) → +=/-= 1
├─ User Confirms Unload
│  └─ handleConfirm()
│     ├─ increaseStock('main', stockItems)  ← Add to warehouse
│     └─ decreaseStock(vehicleId, vehicleDecrease)  ← Remove from vehicle
└─ Success
   └─ confirmed = true
      └─ Show green banner
      └─ Disable qty controls
```

---

## 12. KEY INVENTORY FIELDS & STATUS VALUES

### Stock Status
- **quantity**: Current physical count
- **reserved**: Qty allocated to draft/confirmed orders
- **available**: quantity - reserved (what can be used)
- **warehouse**: 'main' or vehicleId (location identifier)

### Return Reasons (CHECK_REASONS)
- `'quality'`: Quality issue
- `'expired'`: Product expired
- `'unsold'`: Didn't sell / couldn't sell
- `'damaged'`: Damage during transport/storage
- `'other'`: Other reason

### Return Conditions
- `'normal'`: Good condition
- `'damaged'`: Damaged return
- `'expired'`: Expired product

### Order Status (affects stock reservation)
- `'draft'`: Order created, items reserved
- `'confirmed'`: Order confirmed, items still reserved
- `'shipped'`: Delivered to customer, stock decreased
- `'delivered'`: Final state
- `'cancelled'`: Cancelled, reservation released

---

## 13. CRITICAL INVENTORY LOGIC

### Stock Reservation Algorithm (getAvailableVehicleStock)
```
For each product in vehicle stock:
  base_stock = stock.quantity
  
  reserved_qty = SUM(order_items.quantity)
  WHERE order.user_id = driver_id
    AND order.status IN ('draft', 'confirmed')
    AND order.id NOT IN (excludeOrderId)
    AND order.route_point_id NOT IN (excludeRoutePointId)
  
  available = base_stock - reserved_qty
```

**Purpose**: Prevent overselling by accounting for orders that haven't shipped yet

### Unloading Stock Update
```
On unload confirm:
  1. Get all items with qty > 0
  2. increaseStock('main', items)  ← warehouse gets stock
  3. decreaseStock(vehicleId, items)  ← vehicle loses stock
```

**Important**: Two-step atomic operation (should ideally be in transaction for data consistency)

---

## 14. TESTING DATA

### Sample Products
- Coca-Cola, Fanta, Sprite, Pepsi, 7UP
- BonAqua, Святой Источник (mineral water)
- Juices (Добрый, Rich, Любимый)
- Cold tea (Lipton, FuzeTea)
- Energy drinks (Adrenaline Rush, Burn)
- Kvass (Очаковский, Никола)
- Dairy (Домик в деревне, Простоквашино, Агуша)

**SKU Pattern**: `[BRAND_ABBR]-[SIZE]`
Example: `CC-500` (Coca-Cola 500ml), `BON-1500` (BonAqua 1.5L)

### Sample Users
- **petrov** (expeditor) → Vehicle А123БВ77 (ГАЗель Next) → veh-001
- **kozlov** (expeditor) → Vehicle К456МН77 (ГАЗель Business) → veh-002
- **ivanova** (supervisor) → No vehicle
- **sokolov** (preseller) → Vehicle Е789ОР77 (Lada Largus) → veh-003
- **admin** (administrator) → No vehicle

All test accounts: password = '1'

---

## 15. ARCHITECTURE PATTERNS

### Inventory Data Access
- **SQLite local DB**: All inventory data stored locally
- **Zustand stores**: Auth state (user.vehicleId used for vehicle identification)
- **Database functions**: Exported from `/src/database/index.js`
- **Direct async calls**: No Redux, actions called directly in components

### Component State Management
```javascript
// In component (InventoryCheckScreen)
const [vehicle, setVehicle] = useState(null);
const [items, setItems] = useState([]);
const [factQty, setFactQty] = useState({});

// In useEffect/useFocusEffect
useFocusEffect(useCallback(() => {
  (async () => {
    const v = await getVehicleByDriver(user.id);
    const stock = await getVehicleStock(v.id);
    setItems(stock);
  })();
}, [user.id]));
```

### Translation Pattern
```javascript
const { t } = useTranslation();
// Usage:
t('inventoryScreen.calculated')  // Returns "Calc" (EN) or "Расч" (RU)
t('vehicleUnloading.willUnload', { qty: 50 })  // Interpolation
```

---

## 16. IMPORTANT FILES SUMMARY

| File | Purpose |
|------|---------|
| `InventoryCheckScreen.js` | Physical inventory counting UI |
| `VehicleUnloadingScreen.js` | Return remaining stock to warehouse |
| `database/schema.js` | SQLite table definitions |
| `database/database.js` | SQL query functions for inventory |
| `database/index.js` | Function exports |
| `database/seed.js` | Test data generation |
| `constants/screens.js` | Screen name constants |
| `navigation/WarehouseOpsStack.js` | Stack navigator for warehouse ops |
| `i18n/locales/en.json` | English translations |
| `i18n/locales/ru.json` | Russian translations |
| `store/authStore.js` | Authentication & user state |

---

## CONCLUSION

The inventory system in DSD Mini is built on a **local SQLite database** with **vehicle-based stock management**. Key operations are:

1. **Stock Movement**: From warehouse → vehicle → customer (delivery) → warehouse (unload)
2. **Reservation Tracking**: Orders reserve stock until shipped
3. **Return Handling**: Failed deliveries tracked with reason/condition
4. **Inventory Reconciliation**: Physical count vs. system count at day end
5. **Multilingual Support**: Russian/English UI with consistent terminology

The architecture is simple and effective: direct DB access from components with Zustand for auth state, enabling efficient offline-first operations for field teams.

