# DSD Mini — Мобильное приложение Direct Store Delivery

**Платформы:** Android / iOS
**Фреймворк:** React Native (Expo SDK 55)
**Режим работы:** Offline-first с последующей синхронизацией
**Версия:** 1.0.0

---

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Архитектура приложения](#2-архитектура-приложения)
3. [Технологический стек](#3-технологический-стек)
4. [Структура проекта](#4-структура-проекта)
5. [Ролевая модель](#5-ролевая-модель)
6. [Навигация и экраны](#6-навигация-и-экраны)
7. [База данных (SQLite)](#7-база-данных-sqlite)
8. [Бизнес-логика и алгоритмы](#8-бизнес-логика-и-алгоритмы)
9. [Взаимосвязи между модулями](#9-взаимосвязи-между-модулями)
10. [Управление состоянием](#10-управление-состоянием)
11. [Безопасность](#11-безопасность)
12. [Карты и геолокация](#12-карты-и-геолокация)
13. [Запуск и разработка](#13-запуск-и-разработка)

---

## 1. Обзор проекта

DSD Mini — мобильное приложение для автоматизации прямой доставки товаров в торговые точки (Direct Store Delivery). Предназначено для экспедиторов, супервайзеров и администраторов дистрибьюторских компаний.

### Решаемые задачи

- Управление маршрутами доставки с навигацией по карте
- Загрузка товаров на ТС (транспортное средство) со сканированием штрихкодов
- Отгрузка товаров в торговые точки с контролем план/факт
- Оформление возвратов (товары и тара)
- Приём оплаты (наличные, карта, QR, перевод)
- Инкассация собранных средств
- Ревизия остатков в ТС
- Мониторинг экспедиторов в реальном времени (супервайзер)
- Управление пользователями и аудит (администратор)

---

## 2. Архитектура приложения

### Общая схема

```
┌─────────────────────────────────────────────────────────┐
│                    React Native (Expo)                   │
├──────────┬──────────┬───────────────┬───────────────────┤
│  Screens │  Навига- │  Components   │   Plugins         │
│  (UI)    │  ция     │  (переисп.)   │   (native)        │
├──────────┴──────────┴───────────────┴───────────────────┤
│              Zustand (State Management)                   │
│         authStore          settingsStore                  │
├──────────────────────────────────────────────────────────┤
│                   Services Layer                          │
│     authService    secureStorage                          │
├──────────────────────────────────────────────────────────┤
│              Database Layer (expo-sqlite)                 │
│     schema.js → database.js → seed.js                    │
│              SQLite WAL mode, 25 таблиц                  │
└──────────────────────────────────────────────────────────┘
```

### Потоки данных

```
Пользователь → Экран → Zustand Store → SQLite (локальная БД)
                                          ↕
                                   Sync Layer → 1С:ERP (будущее)
```

1. **Инициализация:** `App.js` → `initDatabase()` + `loadSettings()` → восстановление сессии → маршрутизация по роли
2. **Аутентификация:** `LoginScreen` → `authStore.login()` → `authService.login()` → токены в `SecureStore`
3. **Работа с данными:** Экран → вызов функции из `database.js` → SQL-запрос → обновление UI
4. **Offline-first:** Все данные хранятся локально в SQLite; синхронизация через `sync_log` (подготовлено)

---

## 3. Технологический стек

| Категория | Технология | Назначение |
|-----------|-----------|------------|
| Платформа | React Native 0.83 + Expo SDK 55 | Кроссплатформенная разработка |
| Навигация | React Navigation 7 | Stack + Bottom Tabs навигация |
| Состояние | Zustand 5 | Минималистичный state management |
| База данных | expo-sqlite | Offline-first SQLite хранилище |
| Безопасность | expo-secure-store | Шифрованное хранение токенов/PIN |
| Камера | expo-camera | Сканирование штрихкодов |
| Карты | react-native-yamap + react-native-maps | Яндекс Карты / OpenStreetMap |
| Иконки | @expo/vector-icons (Ionicons) | UI-иконки |

---

## 4. Структура проекта

```
DSDMini/
├── App.js                          # Точка входа: инициализация БД, навигация
├── app.json                        # Конфигурация Expo
├── package.json                    # Зависимости
├── index.js                        # Регистрация приложения
│
└── src/
    ├── constants/
    │   ├── colors.js               # Палитра бренда (PLAUT)
    │   ├── roles.js                # Конфигурация ролей и вкладок
    │   └── screens.js              # Константы имён экранов
    │
    ├── database/
    │   ├── index.js                # Центральный реэкспорт всех DB-функций
    │   ├── schema.js               # DDL: 25 таблиц + 15 индексов
    │   ├── database.js             # 60+ функций работы с данными
    │   └── seed.js                 # Тестовые данные (4 пользователя, 35 товаров, 20 клиентов)
    │
    ├── store/
    │   ├── authStore.js            # Zustand: аутентификация (login/logout/restore)
    │   └── settingsStore.js        # Zustand: настройки (провайдер карт)
    │
    ├── services/
    │   ├── authService.js          # Сервис аутентификации (mock с тестовыми аккаунтами)
    │   └── secureStorage.js        # Обёртка над SecureStore (токены, PIN, данные)
    │
    ├── navigation/
    │   ├── AppNavigator.js         # Корневой навигатор (Auth ↔ Main)
    │   ├── AuthStack.js            # Стек авторизации
    │   ├── RoleNavigator.js        # Маршрутизатор по роли пользователя
    │   ├── ExpeditorTabs.js        # Вкладки экспедитора (4 таба)
    │   ├── SupervisorTabs.js       # Вкладки супервайзера (5 табов)
    │   ├── AdminTabs.js            # Вкладки администратора (5 табов)
    │   ├── RouteStack.js           # Стек маршрута (9 экранов)
    │   ├── WarehouseOpsStack.js    # Стек складских операций (4 экрана)
    │   ├── OrdersStack.js          # Стек заказов
    │   ├── ProfileStack.js         # Стек профиля (общий)
    │   ├── MonitoringStack.js      # Стек мониторинга (супервайзер)
    │   ├── ReturnApprovalStack.js  # Стек одобрения возвратов
    │   ├── UsersStack.js           # Стек управления пользователями
    │   └── SyncStack.js            # Стек синхронизации (админ)
    │
    ├── screens/
    │   ├── auth/
    │   │   └── LoginScreen.js              # Авторизация
    │   ├── home/
    │   │   ├── ExpeditorHomeScreen.js      # Дашборд экспедитора
    │   │   ├── SupervisorHomeScreen.js     # Дашборд супервайзера
    │   │   └── AdminHomeScreen.js          # Дашборд администратора
    │   ├── expeditor/
    │   │   ├── RouteListScreen.js          # Маршрутный лист
    │   │   ├── RouteMapScreen.js           # Карта маршрута
    │   │   ├── VisitScreen.js              # Визит в торговую точку
    │   │   ├── ShipmentScreen.js           # Отгрузка товаров
    │   │   ├── PaymentScreen.js            # Приём оплаты
    │   │   ├── SignatureScreen.js          # Подпись получателя
    │   │   ├── ReturnsScreen.js            # Возврат товаров
    │   │   ├── PackagingReturnsScreen.js   # Возврат тары
    │   │   ├── ScanningScreen.js           # Сканер штрихкодов
    │   │   ├── LoadingTripScreen.js        # Загрузка рейса
    │   │   ├── InventoryCheckScreen.js     # Ревизия остатков
    │   │   ├── CashCollectionScreen.js     # Инкассация
    │   │   └── VehicleUnloadingScreen.js   # Выгрузка ТС на склад
    │   ├── supervisor/
    │   │   ├── MonitoringMapScreen.js      # Карта мониторинга
    │   │   ├── ExpeditorRouteDetailScreen.js # Детали маршрута
    │   │   ├── ReturnApprovalScreen.js     # Одобрение возвратов
    │   │   └── AnalyticsReportsScreen.js   # Аналитика и отчёты
    │   ├── admin/
    │   │   ├── UserManagementScreen.js     # Управление пользователями
    │   │   ├── UserEditScreen.js           # Редактирование пользователя
    │   │   ├── DeviceManagementScreen.js   # Управление устройствами
    │   │   ├── SyncMonitoringScreen.js     # Мониторинг синхронизации
    │   │   ├── ConflictResolutionScreen.js # Разрешение конфликтов
    │   │   ├── AuditLogScreen.js           # Журнал аудита
    │   │   └── SystemSettingsScreen.js     # Системные настройки
    │   ├── profile/
    │   │   └── ProfileScreen.js            # Профиль пользователя
    │   ├── settings/
    │   │   └── SettingsScreen.js           # Настройки приложения
    │   └── notifications/
    │       └── NotificationsScreen.js      # Уведомления
    │
    ├── components/
    │   ├── AppMapView.js           # Универсальный компонент карты
    │   └── PlaceholderScreen.js    # Заглушка для экранов в разработке
    │
    └── plugins/
        └── withYandexMaps.js       # Expo config plugin для Яндекс Карт
```

---

## 5. Ролевая модель

Приложение поддерживает три роли с разными наборами экранов и прав доступа.

### 5.1. Экспедитор (expeditor)

**Основной пользователь.** Осуществляет физическую доставку товаров по маршруту.

| Функциональный блок | Доступные операции |
|---|---|
| Маршрут | Просмотр маршрутного листа, карта маршрута, навигация к точкам |
| Визит | Открытие/закрытие визита в торговой точке |
| Отгрузка | Оформление накладной, корректировка количеств, добавление товаров из ТС |
| Возвраты | Оформление возврата товаров (качество, срок, невостребованность) |
| Возвратная тара | Приём пустой тары (ящики, поддоны, бутылки) |
| Оплата | Приём оплаты с расчётом сдачи, выбор способа оплаты |
| Загрузка рейса | Приёмка товара на борт ТС со сканированием штрихкодов |
| Ревизия | Инвентаризация остатков в ТС |
| Инкассация | Сдача собранных наличных с контролем расхождений |
| Выгрузка | Перемещение нереализованных остатков и возвратов на склад |

**Ограничения:** не видит данных других экспедиторов, не может изменять справочники, не имеет доступа к аналитике.

### 5.2. Супервайзер (supervisor)

**Руководитель группы экспедиторов.** Контролирует выполнение планов и принимает решения.

| Функциональный блок | Доступные операции |
|---|---|
| Дашборд | KPI: экспедиторы на маршруте, выполненные точки, платежи, возвраты |
| Мониторинг | Карта с маршрутами всех активных экспедиторов в реальном времени |
| Детали маршрута | Просмотр деталей маршрута конкретного экспедитора |
| Возвраты | Одобрение или отклонение возвратов от экспедиторов |
| Аналитика | Отчёты по результатам работы |
| Профиль | Настройки, уведомления |

### 5.3. Администратор (admin)

**Системный администратор.** Управляет пользователями, устройствами и синхронизацией.

| Функциональный блок | Доступные операции |
|---|---|
| Дашборд | Устройства, конфликты синхронизации, журнал аудита |
| Пользователи | CRUD пользователей, назначение ролей, активация/деактивация |
| Устройства | Реестр устройств, статус синхронизации |
| Синхронизация | Мониторинг синхронизации, разрешение конфликтов |
| Аудит | Журнал всех действий пользователей |
| Настройки | Системные настройки приложения |

### Алгоритм определения роли

```
Login → authService.login(username, password)
  → Поиск пользователя в TEST_ACCOUNTS (mock)
  → Возврат { user, tokens }
  → authStore.user.role → RoleNavigator
     ├── role === 'supervisor' → SupervisorTabs
     ├── role === 'admin'      → AdminTabs
     └── default               → ExpeditorTabs
```

---

## 6. Навигация и экраны

### 6.1. Граф навигации

```
App.js
└── NavigationContainer
    └── AppNavigator (Stack)
        ├── AuthStack
        │   └── LoginScreen
        │
        └── RoleNavigator
            │
            ├── [expeditor] ExpeditorTabs (Bottom Tabs)
            │   ├── Главная      → ExpeditorHomeScreen
            │   ├── Маршрут      → RouteStack
            │   │   ├── RouteListScreen        # Список точек маршрута
            │   │   ├── RouteMapScreen         # Карта маршрута
            │   │   ├── VisitScreen            # Визит в точку
            │   │   ├── ShipmentScreen         # Отгрузка
            │   │   ├── ReturnsScreen          # Возврат товаров
            │   │   ├── PackagingReturnsScreen # Возврат тары
            │   │   ├── PaymentScreen          # Оплата
            │   │   ├── SignatureScreen        # Подпись
            │   │   └── ScanningScreen         # Сканер штрихкодов
            │   ├── Склад        → WarehouseOpsStack
            │   │   ├── LoadingTripScreen      # Загрузка рейса
            │   │   ├── InventoryCheckScreen   # Ревизия
            │   │   ├── CashCollectionScreen   # Инкассация
            │   │   └── VehicleUnloadingScreen # Выгрузка на склад
            │   └── Профиль      → ProfileStack
            │       ├── ProfileScreen          # Профиль
            │       ├── SettingsScreen         # Настройки
            │       └── NotificationsScreen    # Уведомления
            │
            ├── [supervisor] SupervisorTabs (Bottom Tabs)
            │   ├── Главная      → SupervisorHomeScreen
            │   ├── Мониторинг   → MonitoringStack
            │   │   ├── MonitoringMapScreen           # Карта всех экспедиторов
            │   │   └── ExpeditorRouteDetailScreen    # Детали маршрута
            │   ├── Возвраты     → ReturnApprovalStack
            │   │   └── ReturnApprovalScreen          # Одобрение возвратов
            │   ├── Аналитика    → AnalyticsReportsScreen
            │   └── Профиль      → ProfileStack
            │
            └── [admin] AdminTabs (Bottom Tabs)
                ├── Главная      → AdminHomeScreen
                ├── Пользователи → UsersStack
                │   ├── UserManagementScreen   # Список пользователей
                │   └── UserEditScreen         # Редактирование
                ├── Устройства   → DeviceManagementScreen
                ├── Синхронизация → SyncStack
                │   ├── SyncMonitoringScreen       # Мониторинг
                │   ├── ConflictResolutionScreen   # Конфликты
                │   └── AuditLogScreen             # Журнал
                └── Настройки    → SystemSettingsScreen
```

### 6.2. Описание ключевых экранов

#### LoginScreen
- Поля ввода логина и пароля
- Кнопки быстрого входа для тестовых аккаунтов (petrov, kozlov, ivanova, admin)
- Восстановление сессии из SecureStore при повторном запуске

#### ExpeditorHomeScreen
- Госномер привязанного ТС
- Прогресс маршрута (выполнено N из M точек)
- Сумма принятых платежей
- Статус маршрута (planned / in_progress / completed)
- Быстрые действия: перейти к маршруту, загрузке, выгрузке

#### RouteListScreen
- Список точек маршрута за текущий день
- Цветовые индикаторы статусов точек (ожидает, в работе, выполнена, пропущена)
- Индикатор задолженности клиента
- Прогресс-бар выполнения маршрута
- Кнопки «Начать маршрут» / «Завершить маршрут»

#### RouteMapScreen
- Интерактивная карта (Яндекс Карты или OpenStreetMap)
- Маркеры торговых точек с нумерацией
- Полилиния маршрута между точками
- Легенда статусов
- Открытие навигации по тапу на маркер (Яндекс.Навигатор / Google Maps)

#### VisitScreen
- Информация о клиенте (название, адрес, контакт, телефон, задолженность)
- Управление визитом: кнопки «Начать визит» / «Завершить визит»
- Карточки действий: Отгрузка, Возвраты, Возврат тары, Оплата
- Блокировка действий до начала визита
- Режим «только просмотр» после завершения

#### ShipmentScreen
- Список позиций заказа с плановым и фактическим количеством
- Корректировка количества ±1 с подсветкой расхождений
- Добавление товаров из наличия в ТС (модальное окно с поиском)
- Проверка доступного стока в ТС
- Итоги: план vs факт в рублях
- Переход к подписи при подтверждении

#### PaymentScreen
- Отображение задолженности клиента
- Ввод суммы с кнопкой «Оплатить всё»
- Выбор способа оплаты (наличные, карта, QR, перевод)
- Расчёт сдачи при оплате наличными
- Поле для примечания

#### LoadingTripScreen
- Заголовок с информацией о ТС и задании на загрузку
- Чек-лист позиций с плановым и фактическим количеством
- Сканирование штрихкодов через камеру устройства
- Автоматическое заполнение количества при сканировании
- Предупреждение о несканированных позициях при подтверждении
- Блокировка интерфейса после подтверждения загрузки

#### MonitoringMapScreen (Супервайзер)
- Карта с маршрутами всех активных экспедиторов
- Цветовые маршруты для каждого экспедитора
- Нумерованные маркеры и галочки для выполненных точек
- Карточки экспедиторов с прогресс-барами
- Фокусировка на маршруте по тапу на карточку

---

## 7. База данных (SQLite)

### 7.1. Конфигурация

- **Файл:** `dsd_mini_v3.db`
- **Режим:** WAL (Write-Ahead Logging) для повышения производительности
- **Foreign Keys:** включены
- **Версионирование:** schema version = 2

### 7.2. Схема таблиц (ER-модель)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │   vehicles   │     │    stock     │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │◄────│ driver_id    │     │ id (PK)      │
│ username     │     │ model        │     │ location_id  │──► vehicles.id
│ password_hash│     │ plate_number │     │              │     или 'main'
│ full_name    │     │ capacity_kg  │     │ product_id   │──► products.id
│ role         │     │ status       │     │ quantity     │
│ phone        │     └──────────────┘     └──────────────┘
│ is_active    │
└──────┬───────┘
       │
       │ driver_id
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    routes    │     │ route_points │     │  customers   │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │◄────│ route_id     │     │ id (PK)      │
│ driver_id    │     │ customer_id  │──►  │ name         │
│ route_date   │     │ sequence_num │     │ address      │
│ status       │     │ status       │     │ city         │
│ started_at   │     │ arrived_at   │     │ customer_type│
│ completed_at │     │ completed_at │     │ contact_name │
└──────────────┘     └──────────────┘     │ phone        │
                                          │ debt         │
                                          └──────────────┘
┌──────────────┐     ┌──────────────┐
│   orders     │     │ order_items  │
│──────────────│     │──────────────│
│ id (PK)      │◄────│ order_id     │
│ customer_id  │     │ product_id   │──► products.id
│ route_point  │     │ quantity     │
│ status       │     │ price        │
│ total_amount │     │ discount     │
│ created_at   │     │ total        │
└──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐
│  deliveries  │     │delivery_items│
│──────────────│     │──────────────│
│ id (PK)      │◄────│ delivery_id  │
│ order_id     │──►  │ product_id   │──► products.id
│ route_point  │     │ planned_qty  │
│ status       │     │ actual_qty   │
│ delivered_at │     └──────────────┘
└──────────────┘

┌──────────────┐     ┌──────────────┐
│   returns    │     │ return_items │
│──────────────│     │──────────────│
│ id (PK)      │◄────│ return_id    │
│ customer_id  │     │ product_id   │──► products.id
│ driver_id    │     │ quantity     │
│ reason       │     │ condition    │
│ status       │     └──────────────┘
│ approved_by  │──► users.id
└──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   payments   │     │loading_trips │     │loading_items │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │     │ id (PK)      │◄────│ trip_id      │
│ order_id     │     │ vehicle_id   │     │ product_id   │
│ customer_id  │     │ driver_id    │     │ planned_qty  │
│ amount       │     │ status       │     │ actual_qty   │
│ payment_type │     │ verified_at  │     │ scanned      │
│ payment_date │     └──────────────┘     └──────────────┘
└──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ cash_collect │     │ pkg_returns  │     │ pkg_ret_items│
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │     │ id (PK)      │◄────│ return_id    │
│ driver_id    │     │ customer_id  │     │ packaging_type│
│ route_id     │     │ driver_id    │     │ expected_qty │
│ expected_amt │     │ route_point  │     │ actual_qty   │
│ actual_amt   │     │ created_at   │     │ condition    │
│ notes        │     └──────────────┘     └──────────────┘
└──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ products     │     │ price_lists  │     │notifications │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │◄────│ product_id   │     │ id (PK)      │
│ name         │     │ customer_type│     │ user_id      │
│ sku          │     │ price_type   │     │ title        │
│ barcode      │     │ price        │     │ message      │
│ category     │     │ valid_from   │     │ type         │
│ unit         │     │ valid_to     │     │ is_read      │
│ volume       │     └──────────────┘     └──────────────┘
│ weight       │
└──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   devices    │     │  audit_log   │     │  sync_log    │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ user_id      │     │ user_id      │     │ entity_type  │
│ device_name  │     │ action       │     │ entity_id    │
│ os           │     │ entity_type  │     │ operation    │
│ app_version  │     │ entity_id    │     │ sync_status  │
│ last_sync    │     │ details      │     │ conflict_data│
└──────────────┘     │ created_at   │     └──────────────┘
                     └──────────────┘
                                          ┌──────────────┐
                                          │  sync_meta   │
                                          │──────────────│
                                          │ entity_type  │
                                          │ last_sync_at │
                                          │ version      │
                                          └──────────────┘
```

### 7.3. Ключевые индексы

| Индекс | Таблица | Столбцы | Назначение |
|--------|---------|---------|------------|
| idx_customers_city | customers | city | Поиск клиентов по городу |
| idx_products_category | products | category | Фильтрация по категории |
| idx_products_barcode | products | barcode | Быстрый поиск при сканировании |
| idx_routes_date_driver | routes | route_date, driver_id | Маршруты экспедитора за дату |
| idx_route_points_route | route_points | route_id | Точки маршрута |
| idx_orders_customer | orders | customer_id | Заказы клиента |
| idx_orders_status | orders | status | Фильтрация по статусу |
| idx_returns_status | returns | status | Поиск по статусу возвратов |
| idx_sync_log_status | sync_log | sync_status | Очередь синхронизации |

### 7.4. Тестовые данные (seed)

При первой инициализации БД заполняется тестовыми данными:

| Сущность | Количество | Описание |
|----------|-----------|----------|
| Пользователи | 4 | 2 экспедитора, 1 супервайзер, 1 админ |
| Товары | 35 | Напитки: газированные, вода, соки, чай, энергетики, квас, молочные |
| Клиенты | 20 | Москва: Пятёрочка, Магнит, Дикси, Перекрёсток, ВкусВилл, Spar, Лента, HoReCa |
| Транспорт | 2 | ГАЗель Next, ГАЗель Business с московскими номерами |
| Маршруты | 2 | Дневные маршруты с 7 и 6 точками |
| Заказы | 5 | Подтверждённые заказы с позициями и скидками |
| Доставки | 2 | Выполненные доставки с платежами |
| Возвраты | 4 | Различные статусы: ожидает, одобрен, отклонён |
| Загрузки | 2 | Задания на загрузку ТС со сканированными позициями |
| Уведомления | 8 | Для всех ролей |
| Устройства | 4 | По одному на пользователя |
| Аудит | 15 | Действия: вход, доставка, оплата, возврат, синхронизация |

---

## 8. Бизнес-логика и алгоритмы

### 8.1. Жизненный цикл рабочего дня экспедитора

```
┌──────────────────────────────────────────────────────────────┐
│  1. НАЧАЛО ДНЯ                                               │
│  ┌──────────┐    ┌────────────────┐    ┌──────────────────┐  │
│  │  Логин   │───►│ Загрузка рейса │───►│ Сканирование     │  │
│  │          │    │ (LoadingTrip)  │    │ штрихкодов       │  │
│  └──────────┘    └────────────────┘    └──────────────────┘  │
│                          │                                    │
│                          ▼ (верификация загрузки)             │
│  2. РАБОТА НА МАРШРУТЕ                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Для каждой точки маршрута:                            │  │
│  │                                                        │  │
│  │  Прибытие → Начало визита → [Действия] → Конец визита │  │
│  │                  │                                      │  │
│  │                  ├── Отгрузка ──► Подпись               │  │
│  │                  ├── Возврат товаров                     │  │
│  │                  ├── Возврат тары                        │  │
│  │                  └── Оплата                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                    │
│                          ▼ (все точки обработаны)             │
│  3. ЗАВЕРШЕНИЕ ДНЯ                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Ревизия     │  │ Инкассация   │  │ Выгрузка на склад  │ │
│  │  остатков    │  │ (CashColl.)  │  │ (Unloading)        │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 8.2. Алгоритм загрузки рейса (LoadingTrip)

```
1. Экспедитор открывает экран загрузки
2. Система загружает задание: getLoadingTrips(userId)
3. Отображается чек-лист товаров (planned_qty для каждого)
4. Цикл сканирования:
   a. Открытие камеры → распознавание штрихкода
   b. searchProductByBarcode(barcode) → поиск товара
   c. Если найден → updateLoadingTripItem(itemId, { scanned: true, actual_qty += 1 })
   d. Если не найден → предупреждение «Товар не в задании»
5. Верификация:
   a. Проверка: все ли позиции отсканированы (scanned === true)
   b. Проверка: совпадение planned_qty и actual_qty
   c. Если есть расхождения → предупреждение с деталями
   d. Подтверждение → updateLoadingTripStatus(tripId, 'verified')
6. Интерфейс блокируется (read-only) после подтверждения
```

### 8.3. Алгоритм отгрузки (Shipment)

```
1. Экспедитор открывает отгрузку из экрана визита
2. Загрузка позиций заказа: getOrderItems(orderId)
3. Загрузка наличия в ТС: getAvailableVehicleStock(vehicleId)
4. Для каждой позиции:
   a. Отображение planned_qty (заказанное) и actual_qty (к отгрузке)
   b. Экспедитор корректирует actual_qty кнопками +/-
   c. Подсветка при расхождении plan ≠ fact
5. Добавление товара из ТС (не в заказе):
   a. Открытие модального окна с поиском
   b. Фильтрация по наименованию или SKU
   c. Отображение доступного количества в ТС
   d. Выбор → добавление в список отгрузки
6. Подтверждение:
   a. Расчёт итоговой суммы (цена × actual_qty - скидка)
   b. shipOrdersByRoutePoint(pointId) → обновление статуса
   c. Переход на экран подписи (SignatureScreen)
7. На экране подписи:
   a. Ввод ФИО получателя
   b. Подтверждение → createDeliveryWithItems(deliveryData)
   c. decreaseStock(vehicleId, deliveredItems) → списание со стока ТС
   d. Возврат на экран визита
```

### 8.4. Алгоритм оплаты (Payment)

```
1. Загрузка текущей задолженности клиента: getCustomerDebt(customerId)
2. Ввод суммы оплаты (с кнопкой «Оплатить всё» = задолженность)
3. Выбор способа оплаты:
   ├── cash (наличные)   → расчёт сдачи = введённая сумма - сумма к оплате
   ├── card (карта)      → без расчёта сдачи
   ├── qr (QR-код)       → без расчёта сдачи
   └── transfer (перевод)→ без расчёта сдачи
4. Подтверждение:
   a. createPayment({ order_id, customer_id, amount, payment_type, notes })
   b. Обновление задолженности клиента
   c. Возврат на экран визита
```

### 8.5. Алгоритм возврата товаров (Returns)

```
1. Выбор причины возврата:
   ├── quality  — ненадлежащее качество
   ├── expired  — истёк срок годности
   ├── unsold   — невостребованный товар
   ├── damaged  — повреждённый товар
   └── other    — другая причина
2. Добавление товаров через модальное окно:
   a. Поиск по наименованию или SKU
   b. Выбор → добавление в список с quantity = 1
   c. Корректировка количества кнопками +/-
3. Подтверждение:
   a. createReturn({ customer_id, driver_id, route_point_id, reason, status: 'pending_approval' })
   b. Сохранение позиций возврата
   c. Уведомление супервайзеру
4. Супервайзер:
   a. Видит список возвратов на экране ReturnApprovalScreen
   b. Раскрывает детали (позиции, количество, сумма)
   c. approveReturn(returnId) → status = 'approved', увеличение стока
   d. rejectReturn(returnId, reason) → status = 'rejected'
```

### 8.6. Алгоритм инкассации (CashCollection)

```
1. Загрузка всех платежей за текущий день: getPayments(userId)
2. Фильтрация по дате → расчёт ожидаемой суммы (sum of amounts)
3. Отображение детализации по точкам (клиент, способ оплаты, сумма)
4. Ввод фактической суммы к сдаче
5. Расчёт расхождения:
   discrepancy = actual_amount - expected_amount
   ├── discrepancy < 0 → недостача (красный индикатор)
   ├── discrepancy > 0 → излишек (зелёный индикатор)
   └── discrepancy = 0 → норма
6. Подтверждение:
   a. Диалог с суммами (ожидалось / факт / расхождение)
   b. createCashCollection({ driver_id, route_id, expected_amount, actual_amount, notes })
   c. Возврат назад
```

### 8.7. Алгоритм выгрузки ТС на склад (VehicleUnloading)

```
1. Загрузка данных: getUnloadingData(vehicleId, userId)
   a. remaining — непроданные остатки в ТС (из таблицы stock)
   b. returnItems — товары, принятые как возврат от клиентов
2. Формирование секций:
   ├── «Не отгруженные остатки» — из стока ТС
   └── «Возвраты от клиентов» — объединённые по product_id
3. Для каждой позиции: ожидаемое количество с возможностью корректировки ±
4. Подтверждение выгрузки:
   a. increaseStock('main', stockItems) → товары на основной склад
   b. decreaseStock(vehicleId, vehicleDecrease) → списание из ТС
   c. Блокировка интерфейса (read-only)
```

### 8.8. Алгоритм ревизии остатков (InventoryCheck)

```
1. Определение ТС: getVehicleByDriver(userId)
2. Загрузка стока ТС: getVehicleStock(vehicleId)
3. Отображение списка товаров с учётным количеством
4. Ввод фактического количества для каждой позиции
5. Автоматический расчёт расхождений:
   discrepancy = fact_qty - expected_qty
6. Подсветка строк с расхождениями
7. Итоговая строка: «Позиций: N, Расхождений: M»
8. Сохранение акта ревизии
```

### 8.9. Статусные модели

#### Маршрут (Route)

```
planned → in_progress → completed
                      → cancelled
```

#### Точка маршрута (RoutePoint)

```
pending → arrived → in_progress → completed
                                → skipped
```

#### Заказ (Order)

```
draft → confirmed → shipped → delivered
                            → cancelled
```

#### Возврат (Return)

```
draft → pending_approval → approved
                         → rejected
```

#### Загрузка рейса (LoadingTrip)

```
pending → in_progress → verified
                      → completed
```

---

## 9. Взаимосвязи между модулями

### 9.1. Диаграмма зависимостей

```
                        App.js
                       /      \
              initDatabase    loadSettings
              /                     \
    database/index.js         store/settingsStore.js
    (schema + seed +              (expo-secure-store)
     database.js)
         │                         │
         │                   store/authStore.js
         │                    /          \
         │        authService.js    secureStorage.js
         │                              (expo-secure-store)
         │
    ┌────┴────────────────────────────────────────────┐
    │                   navigation/                    │
    │  AppNavigator → RoleNavigator                    │
    │       │              │                           │
    │  AuthStack    ┌──────┼──────────┐                │
    │       │       │      │          │                │
    │  LoginScreen  Exp.  Super.    Admin              │
    │              Tabs    Tabs      Tabs               │
    └──────────────┬───────┬──────────┬────────────────┘
                   │       │          │
    ┌──────────────┼───────┼──────────┼────────────────┐
    │              │    screens/      │                 │
    │  expeditor/  │  supervisor/  admin/   shared/     │
    │  (13 экранов)│  (4 экрана)   (7 экр)  (3 экр)    │
    └──────────────┼──────┬──────────┼────────────────-─┘
                   │      │          │
                   ▼      ▼          ▼
              database.js (SQL-запросы)
              authStore (текущий пользователь)
              AppMapView (карты — expeditor + supervisor)
              COLORS, SCREENS (константы)
```

### 9.2. Связи между экранами экспедитора

```
ExpeditorHomeScreen
  │
  ├── «Маршрут» ──► RouteListScreen
  │                     │
  │                     ├── «Карта» ──► RouteMapScreen
  │                     │
  │                     └── Тап на точку ──► VisitScreen
  │                                              │
  │                                              ├── «Отгрузка» ──► ShipmentScreen
  │                                              │                       │
  │                                              │                       └── «Подтвердить» ──► SignatureScreen
  │                                              │                                                  │
  │                                              │                                                  └── goBack → VisitScreen
  │                                              │
  │                                              ├── «Возвраты» ──► ReturnsScreen
  │                                              │
  │                                              ├── «Тара» ──► PackagingReturnsScreen
  │                                              │
  │                                              └── «Оплата» ──► PaymentScreen
  │
  ├── «Загрузка» ──► LoadingTripScreen
  │                      │
  │                      └── «Сканировать» ──► ScanningScreen (камера)
  │
  └── «Выгрузка» ──► VehicleUnloadingScreen

WarehouseOpsStack:
  LoadingTripScreen ──► InventoryCheckScreen ──► CashCollectionScreen ──► VehicleUnloadingScreen
```

### 9.3. Связи данных между экранами

| Экран-источник | Данные | Экран-получатель |
|---|---|---|
| RouteListScreen | pointId, customerId, customerName | VisitScreen |
| VisitScreen | pointId, orderId, customerId, vehicleId | ShipmentScreen |
| ShipmentScreen | deliveryData, items | SignatureScreen |
| VisitScreen | pointId, customerId, customerName | ReturnsScreen |
| VisitScreen | pointId, customerId, customerName | PackagingReturnsScreen |
| VisitScreen | orderId, customerId, debt | PaymentScreen |
| LoadingTripScreen | barcode (через камеру) | ScanningScreen |
| RouteListScreen | routeId, points[] | RouteMapScreen |
| MonitoringMapScreen | routeId, expeditorId | ExpeditorRouteDetailScreen |
| UserManagementScreen | userId | UserEditScreen |

---

## 10. Управление состоянием

### 10.1. authStore (Zustand)

Управляет аутентификацией и сессией пользователя.

```
State:
  user: { id, username, full_name, role, phone, vehicleId, vehiclePlate } | null
  isAuthenticated: boolean
  isLoading: boolean

Actions:
  login(username, password)    → authService.login() → saveTokens + saveUserData
  logout()                     → clearAll() → сброс состояния
  restoreSession()             → getUserData() из SecureStore → восстановление
```

**Используется во всех экранах** для определения текущего пользователя (`user.id`, `user.role`, `user.vehicleId`).

### 10.2. settingsStore (Zustand)

Управляет настройками приложения.

```
State:
  mapProvider: 'yandex' | 'osm'
  isLoaded: boolean

Actions:
  loadSettings()               → чтение из SecureStore
  setMapProvider(provider)     → запись в SecureStore + обновление state
```

**Используется в:** `AppMapView`, `SettingsScreen`, `App.js`.

---

## 11. Безопасность

### 11.1. Хранение данных

| Данные | Способ хранения | Технология |
|--------|----------------|------------|
| Access Token | Шифрованное хранилище | expo-secure-store |
| Refresh Token | Шифрованное хранилище | expo-secure-store |
| Данные пользователя | Шифрованное хранилище | expo-secure-store |
| PIN-код | Шифрованное хранилище | expo-secure-store |
| Бизнес-данные | Локальная БД | SQLite (файловое шифрование ОС) |
| Настройки | Шифрованное хранилище | expo-secure-store |

### 11.2. Аутентификация

- Вход по логину и паролю
- Опциональный PIN-код для быстрого доступа
- Восстановление сессии из SecureStore при запуске
- Mock-токены (access + refresh) с timestamps (подготовка к интеграции с 1С)

### 11.3. Авторизация (RBAC)

- Три роли: `expeditor`, `supervisor`, `admin`
- Каждая роль имеет свой набор вкладок и экранов
- `RoleNavigator` маршрутизирует по `user.role`
- Экспедитор не видит данных других экспедиторов (фильтрация по `driver_id`)

### 11.4. Аудит

- Таблица `audit_log` фиксирует все значимые действия
- Поля: user_id, action, entity_type, entity_id, details, ip_address, created_at
- Доступ к журналу — только администратор (`AuditLogScreen`)

---

## 12. Карты и геолокация

### 12.1. Компонент AppMapView

Универсальный компонент карты, поддерживающий два провайдера:

| Провайдер | Библиотека | Назначение |
|-----------|-----------|------------|
| Яндекс Карты | react-native-yamap | Детализированное покрытие России |
| OpenStreetMap | react-native-maps | Глобальное покрытие, без API-ключа |

Переключение провайдера — через настройки (`SettingsScreen` → `settingsStore.mapProvider`).

### 12.2. Функции карты

- **Маркеры:** Нумерованные маркеры точек маршрута, цветовая кодировка по статусу
- **Полилинии:** Линии маршрута между точками
- **Навигация:** Открытие Яндекс.Навигатора или Google Maps по тапу на маркер
- **Мониторинг:** Карта супервайзера с маршрутами всех активных экспедиторов
- **Ref-методы:** `setCenter(lat, lon, zoom, duration)` для программного управления

### 12.3. Expo Config Plugin

`withYandexMaps.js` — автоматически конфигурирует Yandex MapKit:
- **iOS:** Инъекция инициализации YMKMapKit в AppDelegate с API-ключом и русской локалью
- **Android:** Placeholder для будущей настройки

---

## 13. Запуск и разработка

### Требования

- Node.js 18+
- Expo CLI (`npx expo`)
- iOS: Xcode 15+ (для нативной сборки)
- Android: Android Studio + SDK 34+

### Установка

```bash
git clone <repository-url>
cd DSDMini
npm install
```

### Запуск

```bash
# Development server
npx expo start

# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npx expo start --web
```

### Тестовые аккаунты

| Логин | Пароль | Роль | Описание |
|-------|--------|------|----------|
| petrov | 1 | Экспедитор | ГАЗель Next, маршрут 1 |
| kozlov | 1 | Экспедитор | ГАЗель Business, маршрут 2 |
| ivanova | 1 | Супервайзер | Мониторинг и одобрение возвратов |
| admin | 1 | Администратор | Полный доступ к системе |

---

## Лицензия

Проприетарное ПО. Все права защищены.
