# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npx expo start          # Dev server (Metro bundler)
npx expo run:ios        # Run on iOS simulator
npx expo run:android    # Run on Android emulator
```

No test framework is configured. No linter is configured.

## Architecture Overview

**DSD Mini** is an offline-first React Native/Expo app for Direct Store Delivery (DSD) workflows. It manages routes, orders, deliveries, returns, payments, inventory, and GPS tracking for distribution teams.

### Tech Stack
- **React Native 0.83 + Expo SDK 55** (managed workflow with custom native plugin for Yandex Maps)
- **State**: Zustand stores (`authStore`, `settingsStore`, `locationStore`)
- **Database**: expo-sqlite with WAL mode, foreign keys enabled, 41 tables
- **Navigation**: @react-navigation (bottom-tabs + native-stack)
- **i18n**: i18next with ru/en locales, language persisted in SecureStore
- **Maps**: Yandex Maps (primary) via custom plugin `withYandexMaps`, react-native-maps (fallback)
- **Security**: JWT tokens + expo-secure-store for tokens, PIN, device ID

### Dual-Mode Auth (Mock vs Server)

The app operates in two modes controlled by `settingsStore.serverSyncEnabled`:
- **Mock mode** (`false`): Uses hardcoded test accounts in `authService.js` (volkov, morozov, kuznetsova, lebedev, admin — all password `1`). No network calls.
- **Server mode** (`true`): JWT auth against `apiBaseUrl`, automatic token refresh, sync pull/push to middleware.

### Role-Based Navigation

`RoleNavigator` switches the entire tab structure based on `user.role`:
- **expeditor**: Routes, orders, deliveries, payments, loading trips, start/end of day, GPS tracking
- **preseller**: Routes, orders, visit reports (CRM)
- **supervisor**: GPS monitoring map, return approvals, analytics
- **admin**: User/device management, sync monitoring, system settings, audit/error logs

### Offline-First Sync Architecture

All transactions write to local SQLite first. The sync system has three phases:
1. **PUSH**: Reads `sync_log` (where `synced=0`), sends pending operations to server
2. **PULL**: Fetches master data (customers, products, prices, vehicles, stock, routes, etc.) using cursor-based pagination
3. **STATUS CHECK**: Gets `external_id` assignments for synced entities

Key files: `syncService.js` (orchestrator), `syncPayloadBuilder.js` (formats each entity type), `syncLogger.js` (tracks attempts).

Entity-to-table mapping is in `ENTITY_TABLE_MAP` and `ENTITY_COLUMNS` in `syncService.js`. New sync entities require entries in both maps plus `ALLOWED_TABLES` whitelist.

### User ID Reconciliation

Server JWT and sync pull may assign different IDs to the same user. `ensureUserInDb()` resolves this by matching on `username` — if a synced user exists with a different ID, it updates that row in-place and returns the existing ID, preserving FK references from routes, vehicles, orders, etc. Both mock and server login paths use the returned ID.

### Database

- Schema in `src/database/schema.js` (41 tables, 47 indexes, version 5)
- All queries in `src/database/database.js`, exported via `src/database/index.js`
- `generateId()` produces UUID v4 strings
- Seed data in `src/database/seed.js` — only inserted when `serverSyncEnabled=false` and tables are empty
- `clearReferenceData()` deletes master data + `sync_meta` but preserves users, logs, devices
- Tables use `synced` flag (0/1) to track what needs pushing to server

### Key Patterns

- **`logSyncOperation()`** must be called after any create/update/delete on synced tables to record in `sync_log`
- **Product material_type**: `'product'` vs `'empty'` distinguishes sellables from returnable bottles. `product_empties` maps products to their empty containers.
- **Status enums** are defined in `src/constants/statuses.js` and enforced by CHECK constraints in schema
- **Screen names** are centralized in `src/constants/screens.js` (`SCREEN_NAMES`)
- **Colors** use PLAUT brand palette from `src/constants/colors.js` (primary: `#003766`, accent: `#FFC400`)
- **All UI text** must use `t('key')` from `useTranslation()` — never hardcode Russian/English strings
- **`getBaseUrl()`** in `constants/api.js` reads `settingsStore.apiBaseUrl`, allowing runtime environment switching
- **GPS tracking** uses `expo-location` foreground + `expo-task-manager` background task, writing to `gps_tracks` table
- **Signature capture** via `react-native-signature-canvas`, stored as base64 in TEXT columns

### File Organization

```
src/
├── constants/     # Enums, config, colors, screen names, API endpoints
├── database/      # Schema, queries, seed data, exports index
├── i18n/          # i18next setup + ru.json, en.json
├── navigation/    # AppNavigator → AuthStack | RoleNavigator → {Role}Tabs → Stacks
├── screens/       # Grouped by: auth, home, expeditor, preseller, supervisor, admin, orders, shared
├── services/      # Auth, API client, sync, location, documents, logging
├── store/         # Zustand stores (auth, settings, location)
└── plugins/       # Custom Expo plugin (Yandex Maps)
```
# Project CLAUDE.md — секция для SQLite
 
## SQLite Database
- Основная БД: `~/Library/Developer/CoreSimulator/Devices/A0B2534B-F941-441D-AC3A-B40578BF2234/data/Containers/Data/Application/F16BDE9D-7DDA-40F7-80A4-EF245A6A92E0/Documents/ExponentExperienceData/@igormlkv/DSDMini/SQLite/dsd_mini_v8.db`
- Для исследования БД используй команду `/project:db-explore dsdmini`
- Все запросы к БД — только на чтение (SELECT)
- Для вывода используй `sqlite3 -header -column`
 
## Команды
- `/project:db-explore dsdmini` — интерактивный обзор SQLite-базы

