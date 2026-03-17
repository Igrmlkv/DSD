# DSD Mini Inventory System - Quick Reference Guide

## File Locations at a Glance

```
PROJECT ROOT: /Users/igormalkov/Python/DSDMini

SCREENS (Inventory-Related):
├── src/screens/expeditor/InventoryCheckScreen.js        ← Physical count screen
├── src/screens/expeditor/VehicleUnloadingScreen.js      ← Unload remaining stock
├── src/screens/expeditor/LoadingTripScreen.js           ← Load from warehouse
├── src/screens/expeditor/StartOfDayScreen.js            ← Day start checklist
├── src/screens/expeditor/EndOfDayScreen.js              ← Day end procedures

DATABASE:
├── src/database/schema.js                                ← Table definitions
├── src/database/database.js (59.7 KB)                    ← SQL functions
├── src/database/index.js                                 ← Function exports
└── src/database/seed.js (49.5 KB)                        ← Test data (35+ products)

STATE MANAGEMENT:
├── src/store/authStore.js                                ← Auth + user.vehicleId
└── src/store/settingsStore.js                            ← App preferences

CONFIGURATION:
├── src/constants/screens.js                              ← Screen name constants
└── src/navigation/WarehouseOpsStack.js                   ← Stack navigator

TRANSLATIONS:
├── src/i18n/index.js                                     ← i18next config
├── src/i18n/locales/en.json (31.1 KB)                    ← English
└── src/i18n/locales/ru.json (43.1 KB)                    ← Russian (959 keys)

SERVICES:
├── src/services/documentService.js                       ← PDF generation
├── src/services/documentTemplates.js                     ← Print templates
├── src/services/invoiceService.js                        ← Invoice logic
└── src/services/authService.js                           ← Auth service
```

## Key Database Functions - Inventory

```javascript
// STOCK QUERIES
getStockWithProducts(warehouse = null)          // Get stock + product details
getVehicleByDriver(driverId)                    // Get assigned vehicle
getVehicleStock(vehicleId)                      // Get items in vehicle
getAvailableVehicleStock(vehicleId, driverId)   // Stock - reserved (orders)
getUnloadingData(vehicleId, driverId)           // remaining + returns for unload

// STOCK OPERATIONS
increaseStock(warehouse, items)                 // Add to warehouse/vehicle
decreaseStock(warehouse, items)                 // Remove from warehouse/vehicle

// LOADING/DELIVERY
getLoadingTrips(driverId)                       // Get assigned loading tasks
hasVerifiedLoadingTrip(driverId)                // Check if loaded + verified
createDelivery(delivery)                        // Create delivery record
shipOrdersByRoutePoint(routePointId)            // Mark orders as shipped

// RETURNS
getReturns()                                    // Get return records
createReturn(return)                            // Create return with reason
approveReturn(returnId)                         // Approve return by supervisor
```

## Key Translation Keys - Inventory

**English Keys** (in `en.json`):
```
inventoryScreen.completeInventory
inventoryScreen.discrepanciesFound
inventoryScreen.calculated              // "Calc"
vehicleUnloading.confirmUnloading
vehicleUnloading.remainingStock
vehicleUnloading.customerReturns
vehicleUnloading.conditionDamaged
vehicleUnloading.conditionExpired
warehouseScreen.available
warehouseScreen.reserved
returnsScreen.reasons.quality
returnsScreen.reasons.expired
returnsScreen.reasons.damaged
```

**Russian Keys** (in `ru.json`):
```
inventoryScreen: "Ревизия"
vehicleUnloading: "Выгрузка на склад"
warehouseScreen: "Остатки"
returnsScreen.reasons: 
  - "Качество"
  - "Срок годности" (expired)
  - "Повреждение" (damaged)
```

## Core Workflows

### 1. INVENTORY CHECK (Count physical stock)
```
InventoryCheckScreen
├─ getVehicleByDriver(user.id)
├─ getVehicleStock(vehicle.id)
├─ User enters actual quantities
├─ System calculates discrepancies
└─ Submit → Save inventory check act
```

### 2. VEHICLE UNLOAD (Return to warehouse at end of day)
```
VehicleUnloadingScreen
├─ getUnloadingData(vehicleId, driverId)  ← Gets: remaining + returns
├─ User adjusts quantities (if needed)
├─ Confirms unload
├─ increaseStock('main', items)           ← Add to warehouse
└─ decreaseStock(vehicleId, items)        ← Remove from vehicle
```

### 3. VEHICLE LOAD (Load from warehouse at start of day)
```
LoadingTripScreen
├─ getLoadingTrips(driverId)              ← Get assigned tasks
├─ Scan products or enter quantities
├─ System verifies qty matches task
├─ Driver confirms loading complete
└─ Stock moved: warehouse → vehicle
```

## Database Schema - Stock Table

```sql
CREATE TABLE stock (
  id TEXT PRIMARY KEY,
  product_id TEXT,           -- Links to products
  warehouse TEXT,            -- 'main' or vehicle_id
  quantity REAL,             -- Physical count
  reserved REAL,             -- Allocated to orders
  updated_at TEXT
)

-- KEY FIELDS --
warehouse = 'main'          → Main warehouse stock
warehouse = vehicleId       → Stock in vehicle
available = quantity - reserved
```

## Key Screen Constants

```javascript
SCREEN_NAMES = {
  INVENTORY_CHECK: 'InventoryCheck'
  LOADING_TRIP: 'LoadingTrip'
  VEHICLE_UNLOADING: 'VehicleUnloading'
  START_OF_DAY: 'StartOfDay'
  END_OF_DAY: 'EndOfDay'
  WAREHOUSE_OPS_TAB: 'WarehouseOpsTab'
  // ... 20+ other screens
}
```

## Navigation Stack - WarehouseOpsStack.js

```
WarehouseOpsStack
├─ INVENTORY_CHECK → InventoryCheckScreen
├─ START_OF_DAY → StartOfDayScreen
├─ LOADING_TRIP → LoadingTripScreen
├─ CASH_COLLECTION → CashCollectionScreen
├─ VEHICLE_UNLOADING → VehicleUnloadingScreen
├─ END_OF_DAY → EndOfDayScreen
└─ EXPENSES → ExpensesScreen
```

## Return Reasons & Conditions

**Return Reasons** (returnsScreen.reasons):
- `'quality'` → Quality issue
- `'expired'` → Product expired (Срок годности)
- `'unsold'` → Didn't sell (Нереализовано)
- `'damaged'` → Damaged (Повреждение)
- `'other'` → Other reason

**Return Conditions** (return_items.condition):
- `'normal'` → Good condition (Норма)
- `'damaged'` → Damaged return (Повреждён)
- `'expired'` → Expired (Просрочен)

## Test User Accounts

```
All passwords: '1'

Expeditors (drivers):
├─ petrov        → Vehicle veh-001 (А123БВ77, ГАЗель Next)
└─ kozlov        → Vehicle veh-002 (К456МН77, ГАЗель Business)

Supervisor:
└─ ivanova       → No vehicle assigned

Preseller:
└─ sokolov       → Vehicle veh-003 (Е789ОР77, Lada Largus)

Administrator:
└─ admin         → System access
```

## Sample Products (Test Data)

**35+ products in seed.js:**
- Coca-Cola, Fanta, Sprite, Pepsi, 7UP (carbonated)
- BonAqua, Святой Источник (water)
- Добрый, Rich, Любимый (juices)
- Lipton, FuzeTea (cold tea)
- Adrenaline Rush, Burn (energy)
- Очаковский, Никола (kvass)
- Домик в деревне, Простоквашино, Агуша (dairy)

**SKU Pattern**: `[BRAND_CODE]-[SIZE]`
Example: `CC-500` (Coca-Cola 500ml), `BON-1500` (BonAqua 1.5L)

## Component Import Pattern

```javascript
// In any screen component
import { 
  getVehicleByDriver, 
  getVehicleStock,
  increaseStock,
  decreaseStock 
} from '../../database';

import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { SCREEN_NAMES } from '../../constants/screens';

export default function MyScreen() {
  const { t } = useTranslation();           // t('key')
  const user = useAuthStore(s => s.user);   // user.id, user.vehicleId
  const vehicleId = user?.vehicleId;
  
  // ... use database functions directly
}
```

## Critical Logic

### Stock Reservation (prevents overselling)
```
available_qty = stock_qty - reserved_qty

Where reserved_qty = items in draft/confirmed orders
                     for this driver
```

### Unload Atomic Operation
```
1. increaseStock('main', items)
2. decreaseStock(vehicleId, items)

Should be in transaction for data consistency!
```

### Condition Tags (Returns)
```javascript
return_items.condition IN ('normal', 'damaged', 'expired')

Translation mappings:
EN: "Damaged", "Expired"
RU: "Повреждён", "Просрочен"
```

## Translation Usage Example

```javascript
// In InventoryCheckScreen
<Text>{t('inventoryScreen.calculated')}</Text>  
// → "Calc" (EN) or "Расч" (RU)

// With interpolation
{t('inventoryScreen.discrepancyCount', { count: 3 })}
// → "Discrepancies: 3" or "Расхождений: 3"

// Conditional
{discrepancies.length > 0 && styles.discrepancy && 
  t('inventoryScreen.discrepanciesFound', { count: discrepancies.length })
}
```

## Useful Database Indexes

```sql
idx_stock_warehouse          -- Fast warehouse lookups
idx_products_barcode         -- Barcode scanning
idx_orders_status           -- Order status filtering
idx_vehicles_driver         -- Find vehicle by driver
idx_returns_status          -- Return approval workflow
idx_loading_trips_driver    -- Driver's loading tasks
```

## Common Queries

### Get all stock in a vehicle
```javascript
const stock = await getVehicleStock(vehicleId);
// Returns: [{ product_id, quantity, product_name, sku, category, volume, base_price, ... }]
```

### Get unloading data
```javascript
const { remaining, returnItems } = await getUnloadingData(vehicleId, driverId);
// remaining = stock not yet delivered
// returnItems = today's returns for driver
```

### Update vehicle stock after unload
```javascript
await increaseStock('main', [
  { product_id: 'prd-001', quantity: 10 },
  { product_id: 'prd-002', quantity: 5 }
]);

await decreaseStock(vehicleId, [
  { product_id: 'prd-001', quantity: 10 },
  { product_id: 'prd-002', quantity: 5 }
]);
```

## File Sizes & Complexity

| File | Size | Lines | Complexity |
|------|------|-------|-----------|
| database.js | 59.7 KB | ~1200+ | High (100+ functions) |
| seed.js | 49.5 KB | ~1000+ | High (test data generation) |
| en.json | 31.1 KB | 975 | Medium (975 keys) |
| ru.json | 43.1 KB | 975 | Medium (975 keys) |
| InventoryCheckScreen.js | ~4 KB | 145 | Low |
| VehicleUnloadingScreen.js | ~9 KB | 313 | Medium |

## Next Steps for Development

1. **Add warehouse management screen** - View main warehouse stock levels
2. **Implement stock adjustments** - Manual inventory corrections by admin
3. **Add stock transfer** - Move stock between vehicles or warehouse locations
4. **Create reports** - Stock movement history, discrepancy reports
5. **Add barcode scanning** - Quick stock verification via barcodes
6. **Implement sync** - Upload local changes to backend server
7. **Add notifications** - Low stock alerts, expiry warnings
8. **Create audit trail** - Track who made what changes when

