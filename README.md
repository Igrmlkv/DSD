# DSD Mini — Мобильное приложение Direct Store Delivery

**Платформы:** Android / iOS
**Фреймворк:** React Native (Expo SDK 55)
**Режим работы:** Offline-first с последующей синхронизацией
**Версия:** 1.2.0

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
11. [Интернационализация (i18n)](#11-интернационализация-i18n)
12. [Безопасность](#12-безопасность)
13. [Карты и геолокация](#13-карты-и-геолокация)
14. [Документооборот](#14-документооборот)
15. [Запуск и разработка](#15-запуск-и-разработка)

---

## 1. Обзор проекта

DSD Mini — мобильное приложение для автоматизации прямой доставки товаров в торговые точки (Direct Store Delivery). Предназначено для экспедиторов, мерчендайзеров (preseller), супервайзеров и администраторов дистрибьюторских компаний.

### Решаемые задачи

- Начало/завершение рабочей смены с осмотром ТС, одометром, подписью
- Управление маршрутами доставки с навигацией по карте (поддержка нескольких маршрутов в день)
- Сканирование QR-кодов камерой для быстрого поиска заказов и накладных (с валидацией точки)
- Загрузка товаров на ТС со сканированием штрихкодов
- Отгрузка товаров в торговые точки с контролем план/факт
- Формирование инвойсов, УПД, накладных и чеков
- Оформление возвратов (товары и тара) с одобрением супервайзером
- Приём оплаты (наличные, карта, QR, перевод)
- Инкассация собранных средств
- Ревизия и корректировка остатков в ТС
- Учёт остатков на полке клиента (on-hand inventory)
- Учёт расходов (ГСМ, парковка, питание и др.)
- Мониторинг экспедиторов в реальном времени (супервайзер)
- Предварительные заказы мерчендайзером (preseller)
- Управление пользователями и аудит (администратор)
- Мультиязычность (русский / английский)

---

## 2. Архитектура приложения

### Общая схема

```
┌─────────────────────────────────────────────────────────┐
│                    React Native (Expo)                   │
├──────────┬──────────┬───────────────┬───────────────────┤
│  Screens │  Навига- │  Components   │   Plugins         │
│  (55 UI) │  ция     │  (переисп.)   │   (native)        │
├──────────┴──────────┴───────────────┴───────────────────┤
│              Zustand (State Management)                   │
│         authStore          settingsStore                  │
├──────────────────────────────────────────────────────────┤
│                   Services Layer                          │
│  authService  invoiceService  documentService             │
│  secureStorage  documentTemplates                         │
├──────────────────────────────────────────────────────────┤
│              Database Layer (expo-sqlite)                 │
│     schema.js → database.js → seed.js                    │
│     SQLite WAL mode, 40 таблиц, 43 индекса               │
├──────────────────────────────────────────────────────────┤
│              i18n (i18next)                               │
│     ru.json / en.json — мультиязычность                   │
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
4. **Документы:** Экран → `invoiceService` / `documentService` → HTML-шаблон → печать / PDF / share
5. **Offline-first:** Все данные хранятся локально в SQLite; синхронизация через `sync_log` (подготовлено)

---

## 3. Технологический стек

| Категория | Технология | Назначение |
|-----------|-----------|------------|
| Платформа | React Native 0.83 + Expo SDK 55 | Кроссплатформенная разработка |
| Навигация | React Navigation 7 | Stack + Bottom Tabs навигация |
| Состояние | Zustand 5 | Минималистичный state management |
| База данных | expo-sqlite | Offline-first SQLite хранилище |
| Безопасность | expo-secure-store | Шифрованное хранение токенов/PIN |
| Камера | expo-camera | Сканирование штрихкодов и QR-кодов (CameraView + onBarcodeScanned) |
| Карты | react-native-yamap + react-native-maps | Яндекс Карты / OpenStreetMap |
| Печать | expo-print | Печать и генерация PDF |
| Подпись | react-native-signature-canvas | Захват подписи получателя/водителя |
| i18n | i18next + react-i18next | Мультиязычность (ru/en) |
| Иконки | @expo/vector-icons (Ionicons) | UI-иконки |

---

## 4. Структура проекта

```
DSDMini/
├── App.js                          # Точка входа: инициализация БД, i18n, навигация
├── app.json                        # Конфигурация Expo
├── package.json                    # Зависимости
├── index.js                        # Регистрация приложения
│
└── src/
    ├── constants/
    │   ├── colors.js               # Палитра бренда (PLAUT) + success
    │   ├── config.js               # Бизнес-константы (НДС, валюта, карта, документы)
    │   ├── roles.js                # Конфигурация ролей и вкладок
    │   ├── screens.js              # Константы имён экранов (~75 имён)
    │   └── statuses.js             # Перечисления статусов (15 enum-ов)
    │
    ├── database/
    │   ├── index.js                # Центральный реэкспорт всех DB-функций
    │   ├── schema.js               # DDL: 40 таблиц + 43 индекса (version 3)
    │   ├── database.js             # 75+ функций работы с данными
    │   └── seed.js                 # Тестовые данные (5 пользователей, 35 товаров, 20 клиентов)
    │
    ├── i18n/
    │   ├── index.js                # Конфигурация i18next
    │   └── locales/
    │       ├── ru.json             # Русский (~400 ключей)
    │       └── en.json             # Английский (~400 ключей)
    │
    ├── store/
    │   ├── authStore.js            # Zustand: аутентификация (login/logout/restore)
    │   └── settingsStore.js        # Zustand: настройки (карта, язык, форма печати, реквизиты)
    │
    ├── services/
    │   ├── authService.js          # Сервис аутентификации (mock, 5 аккаунтов)
    │   ├── secureStorage.js        # Обёртка над SecureStore (токены, PIN, данные)
    │   ├── invoiceService.js       # Создание инвойсов, чеков, накладных
    │   ├── documentService.js      # Генерация PDF, печать, share
    │   └── documentTemplates.js    # HTML-шаблоны (инвойс, УПД, чек, накладная)
    │
    ├── navigation/
    │   ├── AppNavigator.js         # Корневой навигатор (Auth ↔ Main)
    │   ├── AuthStack.js            # Стек авторизации
    │   ├── RoleNavigator.js        # Маршрутизатор по роли (4 роли)
    │   ├── ExpeditorTabs.js        # Вкладки экспедитора (4 таба)
    │   ├── PresellerTabs.js        # Вкладки мерчендайзера (3 таба)
    │   ├── SupervisorTabs.js       # Вкладки супервайзера (5 табов)
    │   ├── AdminTabs.js            # Вкладки администратора (5 табов)
    │   ├── RouteStack.js           # Стек маршрута экспедитора (14 экранов)
    │   ├── PresellerRouteStack.js  # Стек маршрута мерчендайзера (14 экранов)
    │   ├── WarehouseOpsStack.js    # Стек складских операций (9 экранов)
    │   ├── OrdersStack.js          # Стек заказов
    │   ├── ProfileStack.js         # Стек профиля (общий)
    │   ├── MonitoringStack.js      # Стек мониторинга (супервайзер)
    │   ├── ReturnApprovalStack.js  # Стек одобрения возвратов
    │   ├── UsersStack.js           # Стек управления пользователями
    │   └── SyncStack.js            # Стек синхронизации (админ)
    │
    ├── screens/
    │   ├── auth/
    │   │   └── LoginScreen.js
    │   ├── home/
    │   │   ├── ExpeditorHomeScreen.js
    │   │   ├── PresellerHomeScreen.js
    │   │   ├── SupervisorHomeScreen.js
    │   │   └── AdminHomeScreen.js
    │   ├── expeditor/                    # 26 файлов
    │   │   ├── StartOfDayScreen.js       # Начало смены (wizard 5-6 шагов)
    │   │   ├── EndOfDayScreen.js         # Конец смены
    │   │   ├── RouteListScreen.js        # Маршрутный лист (поддержка нескольких маршрутов)
    │   │   ├── RouteMapScreen.js         # Карта маршрута
    │   │   ├── VisitScreen.js            # Визит в торговую точку
    │   │   ├── ShipmentScreen.js         # Отгрузка товаров
    │   │   ├── SignatureScreen.js        # Подпись получателя + водителя
    │   │   ├── ReturnsScreen.js          # Возврат товаров
    │   │   ├── PackagingReturnsScreen.js # Возврат тары
    │   │   ├── PaymentScreen.js          # Приём оплаты
    │   │   ├── ScanningScreen.js         # Сканер штрихкодов
    │   │   ├── LoadingTripScreen.js      # Загрузка рейса
    │   │   ├── InventoryCheckScreen.js   # Ревизия остатков (3 вкладки)
    │   │   ├── AdjustInventoryScreen.js  # Корректировка остатков
    │   │   ├── CaptureOnHandScreen.js    # Учёт остатков на полке
    │   │   ├── CashCollectionScreen.js   # Инкассация
    │   │   ├── VehicleUnloadingScreen.js # Выгрузка ТС на склад
    │   │   ├── ExpensesScreen.js         # Учёт расходов
    │   │   ├── InvoiceSummaryScreen.js   # Просмотр инвойса
    │   │   ├── DocumentViewScreen.js     # Просмотр документа
    │   │   ├── PrintPreviewScreen.js     # Предпросмотр печати
    │   │   ├── VehicleCheckStep.js       # Шаг: осмотр ТС
    │   │   ├── OdometerStep.js           # Шаг: одометр
    │   │   ├── CheckOutCashStep.js       # Шаг: наличные
    │   │   ├── CashCheckInStep.js        # Шаг: приём наличных
    │   │   └── MaterialCheckInStep.js    # Шаг: проверка материалов
    │   ├── preseller/
    │   │   ├── PresellerVisitScreen.js   # Визит мерчендайзера
    │   │   ├── OrderConfirmationScreen.js# Подтверждение заказа
    │   │   └── VisitReportScreen.js      # Отчёт о визите
    │   ├── supervisor/
    │   │   ├── MonitoringMapScreen.js    # Карта мониторинга
    │   │   ├── ExpeditorRouteDetailScreen.js # Детали маршрута
    │   │   ├── ReturnApprovalScreen.js   # Одобрение возвратов
    │   │   └── AnalyticsReportsScreen.js # Аналитика и отчёты
    │   ├── admin/
    │   │   ├── UserManagementScreen.js
    │   │   ├── UserEditScreen.js
    │   │   ├── DeviceManagementScreen.js
    │   │   ├── SyncMonitoringScreen.js
    │   │   ├── ConflictResolutionScreen.js
    │   │   ├── AuditLogScreen.js
    │   │   └── SystemSettingsScreen.js
    │   ├── orders/
    │   │   ├── OrdersScreen.js           # Список заказов
    │   │   └── OrderEditScreen.js        # Создание/редактирование заказа
    │   ├── shared/
    │   │   └── CustomerDetailScreen.js   # Карточка клиента
    │   ├── profile/
    │   │   └── ProfileScreen.js
    │   ├── settings/
    │   │   └── SettingsScreen.js
    │   └── notifications/
    │       └── NotificationsScreen.js
    │
    ├── components/
    │   ├── AppMapView.js           # Универсальный компонент карты (Yandex / OSM)
    │   ├── SignaturePad.js         # Компонент захвата подписи
    │   └── PlaceholderScreen.js    # Заглушка для экранов в разработке
    │
    └── plugins/
        └── withYandexMaps.js       # Expo config plugin для Яндекс Карт
```

---

## 5. Ролевая модель

Приложение поддерживает **четыре роли** с разными наборами экранов и прав доступа.

### 5.1. Экспедитор (expeditor)

**Основной пользователь.** Осуществляет физическую доставку товаров по маршруту.

| Функциональный блок | Доступные операции |
|---|---|
| Начало/конец смены | Осмотр ТС, одометр, наличные, приёмка запаса, подпись |
| Маршрут | Маршрутный лист (несколько маршрутов/день), карта, навигация |
| Визит | Открытие/закрытие визита, проверка открытых визитов, сканирование QR-кода камерой с валидацией точки |
| Отгрузка | Несколько заказов на точку (сворачиваемые секции), корректировка количеств, добавление из ТС |
| Документы | Формирование инвойса, УПД, накладной, чека; печать и share |
| Возвраты | Оформление возврата товаров (качество, срок, невостребованность) |
| Возвратная тара | Приём пустой тары (ящики, поддоны, бутылки) |
| Оплата | Приём оплаты с расчётом сдачи, выбор способа оплаты |
| Загрузка рейса | Приёмка товара на борт ТС со сканированием штрихкодов |
| Ревизия | Инвентаризация остатков в ТС с автокорректировкой |
| Корректировка | Ручная корректировка остатков (с авторизацией супервайзера) |
| Инкассация | Сдача собранных наличных с контролем расхождений |
| Выгрузка | Перемещение нереализованных остатков и возвратов на склад |
| Расходы | Учёт расходов: ГСМ, парковка, питание, ТО |

### 5.2. Мерчендайзер (preseller)

**Торговый представитель.** Посещает точки, оформляет предварительные заказы, фиксирует остатки на полках.

| Функциональный блок | Доступные операции |
|---|---|
| Начало/конец смены | Осмотр ТС, одометр, наличные, подпись (без приёмки запаса) |
| Маршрут | Маршрутный лист (несколько маршрутов/день), карта |
| Визит | Визит с оформлением заказов и отчётов |
| Заказы | Создание, редактирование, подтверждение заказов |
| Отчёт о визите | Чек-лист визита, фотоотчёт |
| Остатки на полке | Фиксация on-hand inventory у клиента |
| Расходы | Учёт расходов |
| Ревизия | Проверка остатков в ТС |

### 5.3. Супервайзер (supervisor)

**Руководитель группы.** Контролирует выполнение планов и принимает решения.

| Функциональный блок | Доступные операции |
|---|---|
| Дашборд | KPI: экспедиторы на маршруте, выполненные точки, платежи, возвраты |
| Мониторинг | Карта с маршрутами всех активных экспедиторов в реальном времени |
| Детали маршрута | Просмотр деталей маршрута конкретного экспедитора |
| Возвраты | Одобрение или отклонение возвратов от экспедиторов |
| Аналитика | Отчёты по результатам работы |

### 5.4. Администратор (admin)

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
  → Поиск пользователя в MOCK_USERS
  → Возврат { user, tokens }
  → authStore.user.role → RoleNavigator
     ├── role === 'preseller'   → PresellerTabs
     ├── role === 'supervisor'  → SupervisorTabs
     ├── role === 'admin'       → AdminTabs
     └── default (expeditor)    → ExpeditorTabs
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
            ├── [expeditor] ExpeditorTabs (Bottom Tabs × 4)
            │   ├── Главная      → ExpeditorHomeScreen
            │   ├── Маршрут      → RouteStack (14 экранов)
            │   │   ├── RouteListScreen (поддержка нескольких маршрутов/день)
            │   │   ├── RouteMapScreen
            │   │   ├── VisitScreen (QR-сканирование камерой с валидацией точки, проверка открытых визитов)
            │   │   ├── ShipmentScreen (группировка по заказам, сворачиваемые секции)
            │   │   ├── SignatureScreen
            │   │   ├── ReturnsScreen
            │   │   ├── PackagingReturnsScreen
            │   │   ├── PaymentScreen
            │   │   ├── ScanningScreen
            │   │   ├── InvoiceSummaryScreen
            │   │   ├── DocumentViewScreen
            │   │   ├── PrintPreviewScreen
            │   │   └── CustomerDetailScreen
            │   ├── Склад        → WarehouseOpsStack (9 экранов)
            │   │   ├── InventoryCheckScreen (вкладки: остатки, корректировки, тара)
            │   │   ├── AdjustInventoryScreen
            │   │   ├── CaptureOnHandScreen
            │   │   ├── StartOfDayScreen (6 шагов)
            │   │   ├── EndOfDayScreen
            │   │   ├── LoadingTripScreen
            │   │   ├── CashCollectionScreen
            │   │   ├── VehicleUnloadingScreen
            │   │   └── ExpensesScreen
            │   └── Профиль      → ProfileStack
            │       ├── ProfileScreen
            │       ├── SettingsScreen
            │       └── NotificationsScreen
            │
            ├── [preseller] PresellerTabs (Bottom Tabs × 3)
            │   ├── Главная      → PresellerHomeScreen
            │   ├── Маршрут      → PresellerRouteStack (14 экранов)
            │   │   ├── RouteListScreen
            │   │   ├── RouteMapScreen
            │   │   ├── PresellerVisitScreen
            │   │   ├── OrderEditScreen
            │   │   ├── OrderConfirmationScreen
            │   │   ├── SignatureScreen
            │   │   ├── InvoiceSummaryScreen
            │   │   ├── DocumentViewScreen
            │   │   ├── PrintPreviewScreen
            │   │   ├── CustomerDetailScreen
            │   │   ├── VisitReportScreen
            │   │   ├── StartOfDayScreen (5 шагов, без приёмки запаса)
            │   │   ├── EndOfDayScreen
            │   │   └── ExpensesScreen
            │   └── Профиль      → ProfileStack
            │
            ├── [supervisor] SupervisorTabs (Bottom Tabs × 5)
            │   ├── Главная      → SupervisorHomeScreen
            │   ├── Мониторинг   → MonitoringStack
            │   │   ├── MonitoringMapScreen
            │   │   └── ExpeditorRouteDetailScreen
            │   ├── Возвраты     → ReturnApprovalStack
            │   │   └── ReturnApprovalScreen
            │   ├── Аналитика    → AnalyticsReportsScreen
            │   └── Профиль      → ProfileStack
            │
            └── [admin] AdminTabs (Bottom Tabs × 5)
                ├── Главная      → AdminHomeScreen
                ├── Пользователи → UsersStack
                │   ├── UserManagementScreen
                │   └── UserEditScreen
                ├── Устройства   → DeviceManagementScreen
                ├── Синхронизация → SyncStack
                │   ├── SyncMonitoringScreen
                │   ├── ConflictResolutionScreen
                │   └── AuditLogScreen
                └── Настройки    → SystemSettingsScreen
```

### 6.2. Ключевые экраны

#### StartOfDayScreen (Начало смены)
Wizard из 5-6 шагов (зависит от роли):
1. Осмотр ТС (чек-лист)
2. Приёмка запаса — только для экспедитора (переход к LoadingTrip)
3. Одометр
4. Наличные на руках
5. Подпись
6. Подтверждение

Данные сохраняются пошагово; при возврате на экран восстанавливается прогресс.

#### RouteListScreen (Маршрутный лист)
- Поддержка **нескольких маршрутов** за день (переключатель вверху)
- Список точек с цветовыми индикаторами статусов
- Индикатор задолженности клиента
- Прогресс-бар выполнения
- Кнопки «Начать» / «Завершить» маршрут

#### InventoryCheckScreen (Ревизия)
Три вкладки:
- **Остатки** — ввод фактического количества, подсветка расхождений, автокорректировка стока
- **Корректировка** — история всех корректировок с детализацией + кнопка ручной корректировки
- **Тара** — учёт возвратной тары по клиентам

#### VisitScreen (Визит)
- Информация о клиенте, контакт, задолженность
- **Проверка открытых визитов** — при старте визита проверяется нет ли незакрытого визита на другой точке
- **QR-сканирование камерой** — открывает камеру (`CameraView` из expo-camera) для сканирования QR-кода заказа или накладной. Поддерживает поиск по полному ID заказа, короткому коду (последние 6 символов) и ID доставки. Выполняет **валидацию точки**: если отсканированный заказ принадлежит другой точке маршрута, отображается предупреждение. Доступен также режим ручного ввода номера (переключение по иконке клавиатуры).
- Карточки действий: Отгрузка, Возвраты, Тара, Оплата, QR-сканирование, Счета

#### ShipmentScreen (Отгрузка)
- **Группировка по заказам** — позиции сгруппированы в сворачиваемые секции с заголовком заказа
- Каждая секция показывает номер заказа, сумму факт, количество позиций
- Корректировка количеств ±1, контроль остатков в ТС
- Добавление товаров из наличия в ТС (модальное окно с поиском)

#### SignatureScreen (Подпись)
- Ввод ФИО получателя
- Подпись клиента (обязательная) и водителя (опциональная)
- Все операции (отгрузка + списание стока) выполняются в одной транзакции

---

## 7. База данных (SQLite)

### 7.1. Конфигурация

- **Файл:** `dsd_mini_v8.db`
- **Режим:** WAL (Write-Ahead Logging)
- **Foreign Keys:** включены
- **Schema version:** 3

### 7.2. Таблицы (40 шт.)

| Группа | Таблицы |
|--------|---------|
| Справочники | users, customers, products, price_lists, vehicles |
| Маршруты | routes, route_points |
| Заказы | orders, order_items |
| Доставки | deliveries, delivery_items |
| Возвраты | returns, return_items |
| Платежи | payments |
| Загрузка | loading_trips, loading_trip_items |
| Склад | stock, cash_collections |
| Тара | packaging_returns, packaging_return_items |
| Смена | tour_checkins, vehicle_check_items |
| Расходы | expense_types, expenses |
| Документы | invoices, invoice_items, delivery_notes, receipts |
| Визиты | visit_reports, visit_report_photos |
| Инвентаризация | adjustment_reasons, inventory_adjustments, inventory_adjustment_items, on_hand_inventory, on_hand_inventory_items |
| Уведомления | notifications |
| Устройства | devices |
| Аудит | audit_log |
| Синхронизация | sync_log, sync_meta |

### 7.3. Индексы (43 шт.)

Включают уникальные индексы для предотвращения дублирования:
- `idx_stock_warehouse_product` — уникальный на (warehouse, product_id)
- `idx_tour_checkins_daily` — уникальный на (driver_id, type, date) для защиты от race condition

### 7.4. Транзакции

Критические операции обёрнуты в транзакции (BEGIN/COMMIT/ROLLBACK):
- `processShipmentDelivery` — отгрузка + создание доставки + списание стока (единая транзакция)
- `createInvoiceFromDelivery` — инвойс + позиции
- `saveOrderWithItems` — заказ + позиции
- `saveVehicleCheckItems` — удаление + пересоздание чек-листа ТС
- `savePackagingReturnItems` — удаление + пересоздание позиций тары
- `createInventoryAdjustment` — корректировка + обновление стока
- `createOnHandInventory` — остатки на полке + позиции

### 7.5. Тестовые данные (seed)

| Сущность | Количество | Описание |
|----------|-----------|----------|
| Пользователи | 5 | 2 экспедитора, 1 мерчендайзер, 1 супервайзер, 1 админ |
| Товары | 35 | Напитки: газированные, вода, соки, чай, энергетики, квас, молочные |
| Клиенты | 20 | Москва: Пятёрочка, Магнит, Дикси, Перекрёсток, ВкусВилл, Spar, Лента, HoReCa |
| Транспорт | 3 | ГАЗель Next, ГАЗель Business, Lada Largus |
| Маршруты | 8 | Сегодня: Петров ×2, Козлов ×1, Соколов ×2; Завтра: по одному на каждого |
| Заказы | 7 | 29 позиций, несколько заказов на одну точку, подтверждённые и черновики |
| Доставки | 2 | Выполненные доставки с подписями |
| Возвраты | 4 | Различные статусы: ожидает, одобрен, отклонён |
| Загрузки | 2 | Задания на загрузку ТС |
| Инкассации | 1 | Выполненная инкассация |
| Возврат тары | 1 | С тремя позициями |
| Уведомления | 8 | Для всех ролей |
| Устройства | 4 | По одному на пользователя |
| Аудит | 15 | Действия: вход, доставка, оплата, возврат, синхронизация |

---

## 8. Бизнес-логика и алгоритмы

### 8.1. Жизненный цикл рабочего дня

```
┌──────────────────────────────────────────────────────────────┐
│  1. НАЧАЛО СМЕНЫ (StartOfDayScreen)                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Осмотр   │─►│ Загрузка   │─►│ Одометр  │─►│ Наличные  │  │
│  │ ТС       │  │ рейса *    │  │          │  │           │  │
│  └──────────┘  └────────────┘  └──────────┘  └───────────┘  │
│       │              │               │              │        │
│       └──────────────┴───────────────┴──────────────┘        │
│                          │ Подпись → Подтверждение            │
│  * только для экспедитора                                    │
│                                                              │
│  2. РАБОТА НА МАРШРУТЕ                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Для каждой точки маршрута:                            │  │
│  │  Прибытие → Начало визита → [Действия] → Конец визита │  │
│  │                  │                                      │  │
│  │  Экспедитор:     │  Мерчендайзер:                       │  │
│  │  ├── Отгрузка     │  ├── Заказ                           │  │
│  │  ├── Подпись       │  ├── Подтверждение заказа            │  │
│  │  ├── Инвойс        │  ├── Отчёт о визите                 │  │
│  │  ├── Возвраты      │  └── Остатки на полке                │  │
│  │  ├── Тара          │                                      │  │
│  │  └── Оплата        │                                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  3. ЗАВЕРШЕНИЕ СМЕНЫ (EndOfDayScreen)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Ревизия     │  │ Инкассация   │  │ Выгрузка на склад  │ │
│  │  остатков    │  │              │  │                    │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 8.2. Статусные модели

#### Маршрут (Route)
```
planned → in_progress → completed / cancelled
```

#### Точка маршрута (RoutePoint)
```
pending → arrived → in_progress → completed / skipped
```

#### Заказ (Order)
```
draft → confirmed → shipped → delivered / cancelled
```

#### Возврат (Return)
```
draft → pending_approval → approved / rejected → processed
```

#### Загрузка рейса (LoadingTrip)
```
planned → loading → loaded → verified
```

#### Инвойс (Invoice)
```
draft → confirmed / cancelled
```

#### Смена (TourCheckin)
```
in_progress → completed
```

---

## 9. Взаимосвязи между модулями

### 9.1. Связи между экранами экспедитора

```
ExpeditorHomeScreen
  ├── Сводка дня: Точки, Оплаты, Заказы, Расходы (→ ExpensesScreen)
  ├── «Начало смены»   → StartOfDayScreen (wizard)
  ├── «Остатки»         → InventoryCheckScreen
  ├── «Расходы»         → ExpensesScreen
  └── «Конец смены»     → EndOfDayScreen

RouteListScreen (переключатель маршрутов)
  ├── «Карта»           → RouteMapScreen
  └── Тап на точку      → VisitScreen
                            ├── «Отгрузка»  → ShipmentScreen → SignatureScreen
                            │                                      ↓
                            │                               InvoiceSummaryScreen
                            │                                      ↓
                            │                               DocumentViewScreen
                            ├── «Возвраты»  → ReturnsScreen
                            ├── «Тара»      → PackagingReturnsScreen
                            └── «Оплата»    → PaymentScreen
```

---

## 10. Управление состоянием

### authStore (Zustand)

```
State:
  user: { id, username, fullName, role, phone, vehicleId, vehiclePlate, vehicleModel } | null
  isAuthenticated: boolean
  isLoading: boolean

Actions:
  login(username, password)    → authService.login() → saveTokens + saveUserData
  logout()                     → clearAll() → сброс состояния
  restoreSession()             → getUserData() из SecureStore → восстановление
```

### settingsStore (Zustand)

```
State:
  mapProvider: MAP_PROVIDER.YANDEX | MAP_PROVIDER.OSM
  language: 'ru' | 'en'
  printFormType: PRINT_FORM_TYPE.UPD | PRINT_FORM_TYPE.INVOICE
  companyInfo: { legalName, address, inn, kpp, directorName, accountantName }
  isLoaded: boolean

Actions:
  loadSettings()               → чтение из SecureStore
  setMapProvider(provider)     → запись + обновление state
  setLanguage(lang)            → i18n.changeLanguage + запись
  setPrintFormType(type)       → запись
  setCompanyInfo(info)         → запись
```

---

## 11. Интернационализация (i18n)

- **Библиотека:** i18next + react-i18next
- **Языки:** русский (ru) — по умолчанию, английский (en)
- **Переключение:** SettingsScreen → settingsStore.setLanguage()
- **Охват:** ~400 ключей перевода (все экраны, навигация, статусы, ошибки)

---

## 12. Безопасность

### Хранение данных

| Данные | Способ хранения | Технология |
|--------|----------------|------------|
| Access Token | Шифрованное хранилище | expo-secure-store |
| Refresh Token | Шифрованное хранилище | expo-secure-store |
| Данные пользователя | Шифрованное хранилище | expo-secure-store |
| Настройки | Шифрованное хранилище | expo-secure-store |
| Бизнес-данные | Локальная БД | SQLite (файловое шифрование ОС) |

### Авторизация (RBAC)

- 4 роли: `expeditor`, `preseller`, `supervisor`, `admin`
- `RoleNavigator` маршрутизирует по `user.role`
- Экспедитор/мерчендайзер видит только свои данные (фильтрация по `driver_id`)
- Корректировка остатков требует авторизации супервайзера

---

## 13. Карты и геолокация

### Компонент AppMapView

| Провайдер | Библиотека | Назначение |
|-----------|-----------|------------|
| Яндекс Карты | react-native-yamap | Детализированное покрытие России |
| OpenStreetMap | react-native-maps | Глобальное покрытие, без API-ключа |

### Функции

- **setCenter(lat, lon, zoom)** — программное перемещение камеры
- **fitToPoints(coords, padding)** — автоматическое масштабирование для отображения всех точек (90% области карты)
- **Маркеры** с нумерацией и цветовой кодировкой по статусу
- **Полилинии** маршрута
- **Навигация** через Яндекс.Навигатор / Google Maps по тапу на маркер

---

## 14. Документооборот

### Типы документов

| Документ | Шаблон | Описание |
|----------|--------|----------|
| Инвойс | `invoiceTemplate` | Стандартный инвойс с НДС |
| УПД | `updTemplate` | Универсальный передаточный документ (форма по Постановлению №1137) |
| Чек | `receiptTemplate` | Кассовый чек на оплату |
| Накладная | `deliveryNoteTemplate` | Товарная накладная |
| Подтверждение заказа | `orderConfirmationTemplate` | Подтверждение заказа для мерчендайзера |

### Процесс

1. Автоматическое создание инвойса после подтверждения доставки
2. Просмотр документа (InvoiceSummaryScreen → DocumentViewScreen)
3. Печать через системный диалог (`expo-print`)
4. Экспорт в PDF и share (`expo-sharing`)
5. Тип формы (УПД / Инвойс) настраивается в settingsStore

---

## 15. Запуск и разработка

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
```

### Тестовые аккаунты

| Логин | Пароль | Роль | Описание |
|-------|--------|------|----------|
| petrov | 1 | Экспедитор | ГАЗель Next, 2 маршрута сегодня + 1 завтра, 5 заказов (19 позиций в авто) |
| kozlov | 1 | Экспедитор | ГАЗель Business, 1 маршрут сегодня + 1 завтра, 2 заказа (12 позиций в авто) |
| sokolov | 1 | Мерчендайзер | Lada Largus, 2 маршрута сегодня + 1 завтра (Tab Bar: Главная, Маршрут, Профиль) |
| ivanova | 1 | Супервайзер | Мониторинг и одобрение возвратов |
| admin | 1 | Администратор | Полный доступ к системе |

### Сброс базы данных

Для применения обновлённых seed-данных используйте кнопку «Сбросить базу» в экране SystemSettings (роль admin).

---

## Константы и перечисления

### Бизнес-константы (`config.js`)

| Константа | Значение | Описание |
|-----------|----------|----------|
| DEFAULT_VAT_PERCENT | 22 | НДС по умолчанию |
| PROMO_PRICE_MULTIPLIER | 0.85 | Множитель промо-цены |
| DEFAULT_CURRENCY | 'RUB' | Валюта |
| DOC_PREFIX | INV/RCP/DN | Префиксы номеров документов |
| PRINT_FORM_TYPE | upd/invoice | Типы печатных форм |
| MAP_PROVIDER | yandex/osm | Провайдеры карт |
| DEFAULT_MAP_CENTER | 55.75, 37.62 | Москва по умолчанию |

### Статусы (`statuses.js`)

15 перечислений: ORDER_STATUS, ROUTE_STATUS, VISIT_STATUS, DELIVERY_STATUS, RETURN_STATUS, LOADING_TRIP_STATUS, PAYMENT_TYPE, TOUR_CHECKIN_TYPE, INVOICE_STATUS, DELIVERY_NOTE_STATUS, CASH_COLLECTION_STATUS, PACKAGING_RETURN_STATUS, ON_HAND_INVENTORY_STATUS, ADJUSTMENT_STATUS, CHECKIN_STATUS.

---

## Лицензия

Проприетарное ПО. Все права защищены.
