# DSD Mini - Inventory System Documentation

This folder contains comprehensive documentation about the inventory management system in the DSD Mini React Native application.

## 📄 Documentation Files

### 1. **INVENTORY_ANALYSIS.md** (21 KB, 653 lines)
The **most comprehensive guide** with detailed analysis of all inventory-related code.

**Contents:**
- Executive summary
- Complete screen file analysis (InventoryCheckScreen, VehicleUnloadingScreen)
- Database schema with all 28+ tables explained
- All 100+ database functions documented
- Store and state management
- Screen constants and navigation
- Complete translation key mappings (English & Russian)
- Data flow diagrams
- Key workflows and logic
- Test data specifications
- Architecture patterns and best practices

**Best for:** Understanding the system in depth, architecture review, onboarding new developers

### 2. **INVENTORY_QUICK_REFERENCE.md** (11 KB, 400+ lines)
The **quick lookup guide** for developers actively working on inventory features.

**Contents:**
- File locations and directory structure
- Quick lookup of all database functions
- Translation keys grouped by screen
- Core workflow summaries
- Database schema essentials
- Test user accounts and sample data
- Component import patterns
- Critical logic explanations
- Database indexes
- Development suggestions

**Best for:** Day-to-day development, quick lookups, reference while coding

## 🎯 Quick Start

### Understanding the System
1. Start with **"Executive Summary"** in INVENTORY_ANALYSIS.md
2. Review **"2. Screen Files"** for UI/UX perspective
3. Read **"Core Workflows"** in QUICK_REFERENCE.md to see how everything works together

### Finding Specific Information
- **Looking for a database function?** → QUICK_REFERENCE.md → "Key Database Functions"
- **Need translation keys?** → QUICK_REFERENCE.md → "Key Translation Keys"
- **Understanding stock reservation?** → INVENTORY_ANALYSIS.md → "Critical Inventory Logic" (Section 13)
- **How does unloading work?** → INVENTORY_ANALYSIS.md → "VehicleUnloadingScreen" (Section 1.2)

## 📋 Key Files in Project

```
src/
├── screens/expeditor/
│   ├── InventoryCheckScreen.js          ← Physical inventory counting
│   ├── VehicleUnloadingScreen.js        ← Return stock to warehouse
│   └── LoadingTripScreen.js             ← Load stock from warehouse
│
├── database/
│   ├── schema.js                        ← Table definitions (28+ tables)
│   ├── database.js                      ← All SQL functions (100+ functions)
│   ├── index.js                         ← Organized function exports
│   └── seed.js                          ← Test data (35+ products)
│
├── store/
│   ├── authStore.js                     ← User state (includes vehicleId)
│   └── settingsStore.js                 ← App settings
│
├── constants/
│   └── screens.js                       ← Screen name constants
│
├── navigation/
│   └── WarehouseOpsStack.js             ← Stack navigator
│
├── services/
│   ├── documentService.js               ← PDF generation
│   ├── documentTemplates.js             ← Print templates
│   ├── invoiceService.js                ← Invoice logic
│   └── authService.js                   ← Authentication
│
└── i18n/
    └── locales/
        ├── en.json                      ← English (975 keys)
        └── ru.json                      ← Russian (975 keys)
```

## 🔑 Key Concepts

### Stock Management
- **warehouse field** in stock table identifies location: `'main'` (warehouse) or `vehicleId` (vehicle)
- **quantity** = actual count of items
- **reserved** = items allocated to draft/confirmed orders
- **available** = quantity - reserved (prevents overselling)

### Inventory Workflows
1. **Load Vehicle** → Stock moves from warehouse to vehicle
2. **Deliver** → Stock decreases in vehicle as orders ship
3. **Return** → Items come back with reason (expired, damaged, etc.)
4. **Unload** → Remaining stock returns to warehouse at end of day

### User Types
- **Expeditor** (Driver) - Loads vehicle, delivers, checks inventory
- **Supervisor** - Approves returns, monitors drivers
- **Admin** - Manages users, system settings
- **Preseller** - Takes orders during route

## 🗂️ Database Tables (Inventory-Related)

| Table | Purpose |
|-------|---------|
| `stock` | Inventory quantities (warehouse or vehicle) |
| `products` | Product master data |
| `vehicles` | Vehicle information and driver assignment |
| `orders` | Customer orders (reserves stock) |
| `order_items` | Items in orders |
| `deliveries` | Delivery confirmations |
| `delivery_items` | Items delivered per delivery |
| `returns` | Product returns with reason |
| `return_items` | Items in returns |
| `loading_trips` | Vehicle loading tasks |
| `loading_trip_items` | Items to load per trip |

## 🚀 Development Workflow

### Adding a New Inventory Feature

1. **Create/Update Screen** (if needed)
   ```javascript
   import { useTranslation } from 'react-i18next';
   import { getVehicleStock, increaseStock } from '../../database';
   import useAuthStore from '../../store/authStore';
   
   export default function MyScreen() {
     const { t } = useTranslation();
     const user = useAuthStore(s => s.user);
     // ... use database functions
   }
   ```

2. **Add Database Function** (if needed)
   - Edit `src/database/database.js`
   - Export from `src/database/index.js`
   - Use async/await pattern

3. **Add Translations**
   - Edit `src/i18n/locales/en.json` (English)
   - Edit `src/i18n/locales/ru.json` (Russian)
   - Use same key structure in both files

4. **Add Navigation** (if needed)
   - Edit relevant stack (e.g., WarehouseOpsStack.js)
   - Add screen to SCREEN_NAMES constant

## 📊 Important Queries

```javascript
// Get vehicle stock
const stock = await getVehicleStock(vehicleId);

// Get stock available for orders (accounts for reservations)
const available = await getAvailableVehicleStock(vehicleId, driverId);

// Get data for unloading (remaining + returns)
const { remaining, returnItems } = await getUnloadingData(vehicleId, driverId);

// Move stock to warehouse
await increaseStock('main', [{ product_id, quantity }]);

// Remove stock from vehicle
await decreaseStock(vehicleId, [{ product_id, quantity }]);
```

## 🧪 Test Accounts

All passwords are **'1'**

| Username | Role | Vehicle | Notes |
|----------|------|---------|-------|
| petrov | Expeditor | veh-001 | ГАЗель Next (А123БВ77) |
| kozlov | Expeditor | veh-002 | ГАЗель Business (К456МН77) |
| sokolov | Preseller | veh-003 | Lada Largus (Е789ОР77) |
| ivanova | Supervisor | — | No vehicle |
| admin | Admin | — | System access |

## 🌍 Languages

- **Russian (RU)** - Primary language
- **English (EN)** - Secondary language
- **i18next** - Manages all translations (975 keys per language)

## 📞 Translation Key Categories

| Category | Examples |
|----------|----------|
| Inventory | `inventoryScreen.*`, `warehouseScreen.*` |
| Unloading | `vehicleUnloading.*` |
| Loading | `loadingTrip.*` |
| Returns | `returnsScreen.reasons.*` |
| Common | `common.confirm`, `common.cancel` |
| Status | `status.pending`, `status.completed` |

## ❓ Common Questions

**Q: How does the system prevent overselling?**
A: The `getAvailableVehicleStock()` function calculates `available = quantity - reserved`, where reserved = items in draft/confirmed orders. This ensures orders can't exceed actual stock.

**Q: What happens when a driver unloads at end of day?**
A: Two operations occur atomically:
1. `increaseStock('main', items)` - Add to warehouse
2. `decreaseStock(vehicleId, items)` - Remove from vehicle

**Q: How are returns tracked?**
A: Returns are created with a reason (quality, expired, damaged, unsold, other) and condition (normal, damaged, expired). Supervisors approve/reject them before restocking.

**Q: What's the difference between "quantity" and "reserved"?**
A: 
- `quantity` = Physical items in stock
- `reserved` = Items allocated to orders not yet shipped
- `available` = quantity - reserved (what can actually be used)

**Q: How does vehicle assignment work?**
A: Users (expeditors/drivers) have a `vehicleId` field. Stock in a vehicle uses that `vehicleId` as the warehouse identifier.

## 🔗 Related Resources

- **Full Analysis**: See INVENTORY_ANALYSIS.md for 16 detailed sections
- **Quick Lookup**: See INVENTORY_QUICK_REFERENCE.md for function reference
- **Code**: All source files in `/src/` directory
- **Schema**: `/src/database/schema.js` for complete database structure
- **Seed Data**: `/src/database/seed.js` for test data generation

## 📈 Next Steps

1. **Read** INVENTORY_ANALYSIS.md (10-15 min) for complete understanding
2. **Bookmark** INVENTORY_QUICK_REFERENCE.md for daily reference
3. **Explore** the code in `src/screens/expeditor/` and `src/database/`
4. **Run** test user login to see inventory features in action
5. **Extend** with custom features using patterns documented above

---

Last Updated: March 15, 2024
Project: DSD Mini v1.0.0
