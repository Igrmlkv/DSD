# План доработки DSD Mini

> На основе анализа дельты ([OpusDelta.md](./OpusDelta.md)) и требований SAP Direct Store Delivery
> (sap_dsd_1.0_application_help_en.pdf, разделы 2–6).

---

## Общая стратегия

Текущее покрытие frontend-функционала SAP DSD for Android — **~55-60%** *(обновлено 2026-03-17 после аудита реализации)*.
План разбит на **5 фаз**, упорядоченных по бизнес-критичности и зависимостям.
Каждая фаза содержит рабочие пакеты (WP) с детализацией требований из PDF SAP.

**Обозначения статуса:**
- ✅ **Реализовано** — функционал полностью реализован
- 🟡 **Частично** — основа есть, часть требований не реализована
- ❌ **Не реализовано** — требует реализации с нуля

---

## Фаза 1 — Фундамент (Foundation)

> Без этих компонентов невозможна работа остальных функций.

### WP-1.1: Графическая подпись (Signature Capture) ✅ Реализовано

**Текущее состояние (актуально):** `react-native-signature-canvas@5.0.2` установлен. `SignaturePad` — переиспользуемый компонент. `SignatureScreen.js` — dual signature (клиент + водитель), валидация наличия подписи, интеграция с `invoiceService`. Используется в SOD/EOD wizard и при delivery confirmation.

**Требования SAP DSD (стр. 69, 73-74, 76-77):**
- ✅ Графический canvas для рукописной подписи пальцем/стилусом
- ✅ Кнопка стирания подписи (X icon) для повторного ввода
- ✅ Контроль размера подписи — FAB появляется только если подпись достаточного размера
- ✅ **Dual signature** — две области подписи на одном экране: клиент + водитель/прессейлер
- ✅ Подпись используется в 5 контекстах (SOD check-out, delivery confirmation, EOD check-in, order confirmation, collection receipt)

**Затрагиваемые экраны:**
- `SignatureScreen.js` — ✅ реализован с canvas и dual signature
- `SignaturePad` — ✅ переиспользуемый компонент создан
- Интеграция в confirmation-экраны — ✅ в StartOfDayScreen, EndOfDayScreen, SignatureScreen

**Использованный пакет:** `react-native-signature-canvas@5.0.2` ✅

---

### WP-1.2: Синхронизация данных (Data Synchronization) 🟡 Частично

**Текущее состояние (актуально):** Таблицы `sync_log`, `sync_meta` существуют. `SyncMonitoringScreen` — реальный UI с данными из `getSyncStats()`, `getSyncConflicts()`. `ConflictResolutionScreen` существует. **Нет HTTP-клиента, нет реального API, нет sync engine.**

**Требования SAP DSD (стр. 67, раздел 4 стр. 18-20, стр. 109-118):**

#### Download (перед туром):
- ❌ Загрузка tour data: master data (клиенты, материалы, цены) + транзакционные данные (visit list, shipment, orders)
- ❌ Индикатор прогресса загрузки
- ❌ Confirmation по завершении ("Tour download is complete")
- ❌ Поддержка полного и дельта-обновления

#### Upload (после тура):
- ❌ Выгрузка: созданные deliveries, invoices, payments, signatures, inventory adjustments, expenses
- ❌ Обработка ошибок выгрузки (retry, application log)

#### OCS — Occasionally Connected Scenario (стр. 112-118):
- ❌ Дельта-загрузка mid-tour: добавление клиентов, материалов, deliveries, orders
- ❌ Дельта-выгрузка: промежуточная выгрузка completed visits
- ❌ Maintenance blocking status — контроль когда delta data можно создавать

**Реализация:**
- ❌ HTTP-клиент (axios / fetch) с offline queue
- ❌ REST API contract (или адаптер для будущего SAP-backend)
- ❌ Sync engine: полная загрузка + дельта + conflict resolution
- ❌ Retry logic с exponential backoff
- 🟡 `SyncMonitoringScreen` — UI есть, реальной логики нет
- 🟡 `ConflictResolutionScreen` — UI есть, реальной логики нет

---

### WP-1.3: Unified Start-of-Day / Check-Out Flow ✅ Реализовано

**Текущее состояние (актуально):** `StartOfDayScreen.js` — полностью реализованный multi-step wizard с 5 шагами. Сохранение в БД через `tour_checkins`. Защита от повторного запуска (read-only после завершения). Навигация на Route после старта.

**Требования SAP DSD (стр. 68-69, стр. 13-14):**

| Шаг | Экран | Статус |
| --- | --- | --- |
| 1 | **Vehicle Check** | ✅ `VehicleCheckStep.js` — чек-лист ТС |
| 2 | **Check-Out Materials** | ✅ `LoadingTripScreen.js` — с barcode сканированием |
| 3 | **Odometer Reading** | ✅ `OdometerStep.js` — ввод одометра с валидацией |
| 4 | **Check-Out Cash** | ✅ `CheckOutCashStep.js` — наличные на руках |
| 5 | **Signature Capture** | ✅ `SignaturePad` — подпись супервайзера |
| 6 | **Tour Confirmation** | ✅ Финальное подтверждение + переход к Visit List |

**Нереализованные детали:**
- 🟡 Supervisor password + reason code при расхождениях материалов
- 🟡 Full text search + product hierarchy для добавления материалов из каталога

**Экраны:** `StartOfDayScreen.js`, `VehicleCheckStep.js`, `OdometerStep.js`, `CheckOutCashStep.js` ✅

---

### WP-1.4: Unified End-of-Day / Check-In Flow ✅ Реализовано

**Текущее состояние (актуально):** `EndOfDayScreen.js` — полностью реализованный wizard из 5 шагов. Зеркало SOD. Сохранение в БД. Валидация одометра относительно начала дня.

**Требования SAP DSD (стр. 69, стр. 15, стр. 20):**

| Шаг | Экран | Статус |
| --- | --- | --- |
| 1 | **Material Check-In** | ✅ `MaterialCheckInStep.js` |
| 2 | **Cash Check-In** | ✅ `CashCheckInStep.js` — reconciliation |
| 3 | **Odometer Reading** | ✅ `OdometerStep.js` — с валидацией vs SOD |
| 4 | **Vehicle Check-In** | ✅ `VehicleCheckStep.js` |
| 5 | **Signature Capture** | ✅ `SignaturePad` — подпись супервайзера |

**Нереализованные детали:**
- 🟡 Supervisor password при отклонениях материалов
- 🟡 Reason codes для расхождений

**Экраны:** `EndOfDayScreen.js`, `MaterialCheckInStep.js`, `CashCheckInStep.js` ✅

---

## Фаза 2 — Ядро бизнес-процессов (Core Business Processes)

> Ключевые revenue-affecting функции.

### WP-2.1: Pricing Engine (Offline Pricing) ❌ Не реализовано

**Текущее состояние (актуально):** Цены берутся из таблицы `price_lists` в SQLite — только базовая цена без расчёта. Нет condition technique, нет налогов, нет скидок движком.

**Требования SAP DSD (стр. 129-133, раздел 6.7):**

- ❌ **Pricing procedure determination** — автоматическое определение процедуры ценообразования для документа
- ❌ **Condition technique** — иерархическое определение цен по condition records:
  - ❌ Базовая цена (price lists) ← есть таблица, нет движка
  - ❌ Скидки (по клиенту, группе, материалу)
  - ❌ Надбавки (surcharges)
  - ❌ Налоги (VAT, excise)
  - ❌ Ручные условия (manual conditions) с лимитами
- ❌ **Pricing для разных ролей** (Preseller / Delivery driver / Van seller)
- ❌ **Pricing в OCS:** обновление pricing data при дельта-загрузке
- ❌ **Application Log:** при ошибке расчёта

**Реализация:**
- ❌ Таблицы: `condition_records`, `pricing_procedures`, `condition_types`, `tax_rates`
- ❌ Сервис: `pricingEngine.js` — расчёт по condition technique
- ❌ Интеграция в `OrderEditScreen`, `ShipmentScreen` (итоговая сумма с разбивкой)
- ❌ UI: отображение pricing breakdown (subtotal, discounts, taxes, total) на confirmation-экранах

---

### WP-2.2: Invoice / Receipt Generation ✅ Реализовано (базовый уровень)

**Текущее состояние (актуально):** Таблицы `invoices`, `invoice_items`, `delivery_notes`, `receipts` созданы. `invoiceService.js` — создание invoice из delivery, подтверждение, номерация (INV-YYYYMMDD-XXXX). `InvoiceSummaryScreen.js` — предпросмотр, confirm, print/share. `DocumentViewScreen.js` — просмотр.

**Требования SAP DSD (стр. 75-77, стр. 15, стр. 20):**

- ✅ **Invoice** — формируется при delivery confirmation
  - ✅ Header: номер, дата, клиент, водитель, vehicle, tour
  - ✅ Items: материалы, qty, unit price, subtotal
  - 🟡 Pricing: discounts, taxes (VAT) — VAT % из конфига, нет полного breakdown
  - ✅ Signature (customer) — через `SignatureScreen`
  - ✅ Статус: draft → confirmed
- ✅ **Collection Receipt** — структура есть, таблица `receipts`
- ✅ **Order Confirmation** — `OrderConfirmationScreen.js` для preseller
- ✅ `InvoiceSummaryScreen.js` — предпросмотр invoice перед подтверждением
- ✅ `DocumentViewScreen.js` — просмотр сформированного документа

---

### WP-2.3: PDF Generation и Printing 🟡 Частично

**Текущее состояние (актуально):** `expo-print@55.0.8` и `expo-sharing@55.0.11` установлены. `documentService.js` — генерация HTML→PDF, print, share. `documentTemplates.js` — HTML-шаблоны invoice/receipt/delivery note. `PrintPreviewScreen.js` — preview с кнопками print/share/PDF. **Bluetooth-печать не реализована.**

**Требования SAP DSD (стр. 15, стр. 74, стр. 77, стр. 83):**

- ✅ **PDF generation** для: invoices, delivery notes, collection receipts
- ✅ **Print** через системный диалог (`expo-print`)
- ✅ **Share PDF** — через `expo-sharing` (email, мессенджеры)
- ✅ **HTML-шаблоны** для каждого типа документа
- 🟡 **PDF для reports** — нет presettlement/route performance отчётов
- ❌ **Mobile printing** через Bluetooth принтер
- ❌ **Custom report layouts** с JSON/HTML шаблонами

**Использованные пакеты:** `expo-print`, `expo-sharing` ✅
**Отсутствующие:** `react-native-ble-manager` (Bluetooth-печать)

---

### WP-2.4: Роль Мерчендайзер (Pre-Sales Scenario) 🟡 Частично

**Текущее состояние (актуально):** Роль `preseller` реализована в `roles.js`. `PresellerTabs.js`, `PresellerRouteStack.js` — навигация. `PresellerHomeScreen.js`, `PresellerVisitScreen.js` — экраны. `OrderConfirmationScreen.js` — подтверждение заказа с подписью. **Нет интеграции с pricing engine и deal conditions.**

**Требования SAP DSD (стр. 9-10, стр. 21-22, стр. 72-74):**

**Сценарий Preseller:**
1. ❌ Sync download (visit list, customers, materials, pricing)
2. 🟡 Start-of-day (odometer, vehicle check) — общий wizard есть
3. ✅ Visit customers → Take order (`PresellerVisitScreen`, `OrderEditScreen`)
   - ✅ Выбор материалов, ввод qty
   - 🟡 Return items в рамках заказа — частично
   - ❌ Order references (payment terms)
4. 🟡 **Order confirmation:**
   - ❌ Pricing calculation (WP-2.1)
   - ✅ Dual signature (customer + preseller)
   - ✅ Print order (WP-2.3)
5. ❌ CRM Activities (WP-3.2) — surveys, photos
6. 🟡 End-of-day (odometer)
7. ❌ Sync upload

---

### WP-2.5: Visit List — расширенный функционал 🟡 Частично

**Текущее состояние (актуально):** `RouteListScreen.js` — список точек маршрута со статусами. `VisitScreen.js` — hub с действиями (delivery, order, payment, returns). **Нет поиска, нет drag-to-reorder, нет добавления визитов.**

**Требования SAP DSD (стр. 70-72, стр. 14):**

- ❌ **Full text search** по списку визитов (имя клиента, номер, адрес)
- ❌ **Изменение порядка визитов** (drag & reorder)
- ❌ **Добавление визитов** (из customer master / one-time customer / дополнительный визит)
- ❌ **Cancel visit** с обязательным reason code
- 🟡 **Per-customer Activities tab** — фиксированный набор действий (не динамический)
- ❌ **Per-customer Attachments tab** — фото, документы
- 🟡 **Status icons** — базовые статусы есть, 5 статусов SAP частично покрыты

**Нереализованные экраны:**
- ❌ `AddVisitScreen.js` — выбор из customer master или создание one-time customer
- ❌ `CancelVisitScreen.js` — ввод reason code

---

## Фаза 3 — Расширенные бизнес-функции (Extended Features)

### WP-3.1: Deal Conditions (Условия сделки) ❌ Не реализовано

**Текущее состояние (актуально):** Нет реализации. `OrderEditScreen` поддерживает простое поле discount, без движка условий.

**Требования SAP DSD (стр. 120-128, раздел 6.6):**

- ❌ **Deal Condition Types** — configurable типы условий
- ❌ **Assignments** — какие клиенты имеют право на условие (inclusive/exclusive)
- ❌ **Deal Condition Scales** — шкалы количества (0-9 шт → 5%, 10-19 → 10%...)
- ❌ **Precondition Fields** — какие материалы нужно купить
- ❌ **Exclusion List** — исключение материалов из precondition
- ❌ **Free Goods** — бесплатные товары как результат условия
- ❌ **Discounts** — header/item level, percentage/amount (движком)
- ❌ **Out of Stock** — recalculation если товар отсутствует

**Реализация:**
- ❌ Таблицы: `deal_conditions`, `deal_condition_scales`, `deal_condition_assignments`, `deal_condition_preconditions`, `deal_condition_exclusions`
- ❌ Service: `dealConditionEngine.js`
- ❌ UI: индикация applied deal conditions на экранах заказа/доставки

---

### WP-3.2: CRM Activities (Surveys, Audits, Photos) ❌ Не реализовано

**Текущее состояние (актуально):** Нет реализации CRM-активностей. `VisitReportScreen.js` у preseller — базовый визит-отчёт с фото (не полноценный CRM). Камера работает в `LoadingTripScreen` для barcode.

**Требования SAP DSD (стр. 98-107, раздел 6.4):**

- ❌ **CRM Activity Types** (Surveys, Activity Journals, Notes, Attachments, Partners)
- ❌ **Per-activity items:** activity может содержать survey + 2 notes + attachment
- ❌ **Barcode scanning** в activity journals
- ❌ **Status:** Open optional / Open mandatory / Completed
- ❌ **Authorization:** read/edit/create CRM activities, delete attachments
- ❌ **360-Degree Activity View** — timeline всех CRM-активностей по клиенту

**Нереализованные экраны:**
- ❌ `CRMActivityListScreen.js`
- ❌ `SurveyScreen.js`
- ❌ `ActivityJournalScreen.js`
- ❌ `ActivityAttachmentScreen.js`
- ❌ `ActivityTimelineScreen.js`

**Нереализованные таблицы:** `crm_activities`, `crm_activity_items`, `surveys`, `survey_answers`, `activity_journals`, `activity_attachments`

---

### WP-3.3: Customer Master Data Screen 🟡 Частично

**Текущее состояние (актуально):** `CustomerDetailScreen.js` реализован — 3 таба (general, sales, credit), интеграция с картой (`AppMapView`), загрузка заказов и платежей. **Нет поискового списка клиентов.**

**Требования SAP DSD (стр. 77-79, раздел 5.3.5):**

| Tab | Статус |
| --- | --- |
| **GENERAL INFO** | ✅ Реализован (имя, ИНН, КПП, телефон, адрес, GPS, карта) |
| **SALES AREA** | ✅ Реализован (группа, метод оплаты, условия) |
| **CREDIT INFO** | ✅ Реализован (лимит, риск, доступный кредит с progress bar) |

- ✅ `CustomerDetailScreen.js` (tabbed) — реализован
- ❌ **Full text search** по списку клиентов — нет
- ❌ `CustomerListScreen.js` (searchable list) — не создан

---

### WP-3.4: Material Master Data Screen ❌ Не реализовано

**Текущее состояние (актуально):** Товары отображаются внутри `WarehouseScreen`, `ShipmentScreen`, `OrderEditScreen`. Нет отдельного экрана материала с табами.

**Требования SAP DSD (стр. 79-80, раздел 5.3.6):**

| Tab | Статус |
| --- | --- |
| **GENERAL INFO** | ❌ Не реализован |
| **SALES AREA** | ❌ Не реализован |
| **UNITS OF MEASURE** | ❌ Не реализован |
| **TIED EMPTIES** | ❌ Не реализован |

- ❌ **Full text search** (описание + номер материала)
- ❌ **Product hierarchy filter** — pyramid icon, slide-in панель
- ❌ **Multiple sales areas** — pop-up selector
- ❌ **Item Proposal** — предложенные товары на основе истории

**Нереализованные экраны:** `MaterialDetailScreen.js`, `MaterialListScreen.js`
**Нереализованные таблицы:** `material_uoms`, `material_tied_empties`, `product_hierarchy`

---

### WP-3.5: Expenses (Расходы на маршруте) ✅ Реализовано

**Текущее состояние (актуально):** `ExpensesScreen.js` — полностью реализован. CRUD расходов, configurable expense types (6 типов в seed), блокировка до старта тура, модальный ввод суммы и типа, swipe-to-delete. Таблицы `expenses`, `expense_types` в схеме.

**Требования SAP DSD (стр. 82-83, раздел 5.3.8, стр. 15):**

- ✅ **Expense Types** (configurable): gas, highway tolls, parking, meals и др.
- ✅ **Запись расходов** — «+» → выбрать тип → ввести сумму → сохранить
- ✅ **Редактирование** — нажать на расход → изменить → сохранить
- ✅ **Удаление** — кнопка удаления (swipe-to-delete реализован через кнопку)
- ✅ **Доступность** — только после Start-of-Day (tour started)
- 🟡 **Integration** — расходы учитываются в EOD cash reconciliation частично

**Реализованные экраны и таблицы:**
- ✅ `ExpensesScreen.js` — список + inline edit
- ✅ Таблицы `expenses`, `expense_types` — в схеме

---

### WP-3.6: Empties Management (Управление возвратной тарой) 🟡 Частично

**Текущее состояние (актуально):** `PackagingReturnsScreen.js` — экран существует, **4 hardcoded типа тары** (plastic box, wooden pallet, cardboard box, bottles). Работает per-customer на визите. Сохранение в БД. **Не интегрирован с материалами, типы не configurable.**

**Требования SAP DSD (стр. 79-81, стр. 73-76):**

- ❌ **Tied empties** — привязка тары к конкретным материалам
- ❌ **Tab TIED EMPTIES** в Material master (WP-3.4)
- ❌ **Tab EMPTIES** на экране Inventory
- ❌ **Add non-tied empties** — в рамках delivery или order
- 🟡 **Empties в check-out** — пересчёт при SOD — не реализован полностью
- 🟡 **Empties в check-in** — reconciliation при EOD — частично
- ❌ **Configurable** типы тары — пока hardcoded 4 типа

---

## Фаза 4 — Enterprise Features

### WP-4.1: Reports (Presettlement, Route Performance, Custom) 🟡 Частично

**Текущее состояние (актуально):** `AnalyticsReportsScreen.js` — KPI-дашборд с progress bars, статистика по маршрутам (visits/revenue), top debtors. Фильтр по периоду (день/неделя/месяц). **Не SAP-style отчёты.**

**Требования SAP DSD (стр. 83, стр. 15):**

- ❌ **Presettlement Report** — overview платежей по клиентам с breakdown по методам
- ❌ **Route Performance Report** — planned vs executed visits, revenue per visit, odometer
- ❌ **Custom Reports** — JSON/HTML-шаблоны + печать + PDF export + email
- ❌ **Фильтры** по дате, клиенту, типу документа (в текущем дашборде — только период)
- 🟡 **KPI-дашборд** — базовая аналитика реализована

**Нереализованные компоненты:**
- ❌ `ReportViewScreen.js` — отображение с print/share
- ❌ `reportService.js` — генерация данных + форматирование

---

### WP-4.2: Inventory — расширенный функционал ✅ Реализовано

**Текущее состояние (актуально):** `InventoryCheckScreen.js` — сверка stock. `AdjustInventoryScreen.js` — корректировка с reason codes. `CaptureOnHandScreen.js` — запись остатков на полках клиента. Таблицы `inventory_adjustments`, `on_hand_inventory`, `adjustment_reasons` в схеме.

**Требования SAP DSD (стр. 81, стр. 14):**

- ✅ **Adjust Inventory** — изменение qty с reason codes
- 🟡 **Авторизация** — supervisor password при корректировке — частично реализовано
- ✅ **Reason codes** — configurable через `adjustment_reasons`
- ✅ **Capture on Hand Inventory** — `CaptureOnHandScreen.js`
- ❌ **Empties tab** на Inventory screen

---

### WP-4.3: Van Seller Role ❌ Не реализовано

**Текущее состояние (актуально):** Роль van seller отсутствует. Экспедитор частично покрывает сценарий, но без speculative load и прямых продаж с борта.

**Требования SAP DSD (стр. 10-11, стр. 20):**

- ❌ **Speculative load** — товары на борту без предварительных заказов
- ❌ **Sell & deliver from vehicle** — создание delivery без presold order
- ❌ **Stock validation** — нельзя продать больше чем есть на борту
- ❌ **Mixed role** — presale + delivery + van sale в одном туре

**Нереализованные компоненты:**
- ❌ Роль `van_seller` в `roles.js` / `authService.js`
- ❌ `VanSaleScreen.js`
- ❌ Van sale mode в `ShipmentScreen.js`

---

### WP-4.4: Tour Monitor — расширение 🟡 Частично

**Текущее состояние (актуально):** `MonitoringMapScreen.js` — supervisor мониторинг, multi-route отображение с цветовым кодированием, фильтрация по маршрутам. `ExpeditorRouteDetailScreen.js` — детали маршрута с KPI. **Нет GPS tracking, нет planned vs actual.**

**Требования SAP DSD (стр. 16-17, раздел 3.2):**

- ✅ Карта с маршрутами + color coding
- ✅ Selection filtering по экспедиторам
- ✅ Visit list с KPI
- ❌ GPS tracking configuration (interval, consent screen)
- ❌ Planned vs actual route comparison
- ❌ Visit details (время прибытия/убытия, координаты)
- ❌ Web-dashboard (React/Next.js) для dispatchers

---

### WP-4.5: Barcode Scanning — расширение 🟡 Частично

**Текущее состояние (актуально):** Camera barcode scanning — полностью реализовано в `LoadingTripScreen` (expo-camera). `ScanningScreen.js` — **только ручной ввод, камера — заглушка** (Камера-заглушка текст в коде).

**Требования SAP DSD:**

- ✅ Barcode scanning в Check-out materials (`LoadingTripScreen`)
- ❌ Camera scanning в `ScanningScreen`
- ❌ Barcode scanning для delivery verification
- ❌ Barcode scanning для activity journals (CRM)
- ❌ Barcode scanning для inventory adjustment
- ❌ Мульти-формат: EAN-13, EAN-8, UPC-A, Code128, QR
- ❌ Звуковой feedback при сканировании
- ❌ Переиспользуемый компонент `BarcodeScanner`

---

## Фаза 5 — Production Readiness

### WP-5.1: Аутентификация и авторизация 🟡 Частично

**Текущее состояние (актуально):** Mock auth с 5 hardcoded accounts (`petrov`, `kozlov`, `ivanova`, `sokolov`, `admin`, пароль "1"). Role-based navigation (4 роли: expeditor, supervisor, admin, preseller). `expo-secure-store` для токенов.

**Доработка:**
- ❌ Замена mock auth на реальную OAuth2/JWT аутентификацию
- ✅ Role-based access control (RBAC) — навигационный уровень реализован
- ❌ Supervisor password prompt для авторизованных операций (inventory adjust, check-out discrepancy)
- ❌ Session management (token refresh, timeout)

---

### WP-5.2: Offline-first Architecture 🟡 Частично

**Текущее состояние (актуально):** Все данные хранятся локально в SQLite (offline by default). `sync_log` таблица как offline queue. Нет реального sync engine.

**Доработка:**
- 🟡 Offline queue для мутаций — таблица `sync_log` есть, логики нет
- ❌ Sync conflict resolution strategy (last-write-wins / merge)
- ❌ Data versioning (optimistic locking)
- ❌ Background sync при появлении сети
- ❌ Индикатор online/offline статуса в header

---

### WP-5.3: Error Handling и Application Log 🟡 Частично

**Текущее состояние (актуально):** `AuditLogScreen.js` — просмотр лога активностей из таблицы `audit_log`. Нет structured error handling framework.

**Требования SAP DSD (стр. 136, раздел 6.9):**

- 🟡 **Application Log Monitoring** — `AuditLogScreen` с базовым логом
- ❌ Pricing errors (header + item level)
- ❌ Sync errors (upload/download failures)
- ❌ Document creation errors в логе
- ❌ **Structured logging:** timestamp, severity, source, message, context
- ❌ **Log export** — отправка логов в backend для анализа

---

## Матрица зависимостей

```
WP-1.1 (Signature) ──────┐
                          ├─→ WP-1.3 (Start-of-Day) ─→ WP-3.5 (Expenses, после tour start)
WP-1.2 (Sync) ───────────┤
                          ├─→ WP-1.4 (End-of-Day) ──→ WP-4.1 (Reports)
                          │
                          ├─→ WP-2.1 (Pricing) ─────→ WP-2.2 (Documents) ─→ WP-2.3 (PDF/Print)
                          │
                          ├─→ WP-2.4 (Preseller) ───→ WP-3.1 (Deal Conditions)
                          │
                          └─→ WP-2.5 (Visit List) ──→ WP-3.2 (CRM Activities)
                                                     → WP-3.3 (Customer Master)
                                                     → WP-3.4 (Material Master)
                                                     → WP-3.6 (Empties)

WP-4.2 (Inventory+) ← WP-3.4 (Material Master)
WP-4.3 (Van Seller) ← WP-2.1 (Pricing) + WP-2.2 (Documents)
WP-4.4 (Tour Monitor+) — независимый
WP-4.5 (Barcode+) — независимый

WP-5.x (Production) — параллельно с фазами 2-4
```

---

## Приоритеты реализации

| Приоритет | Work Package | Статус | Обоснование |
| --- | --- | --- | --- |
| 🔴 **P0** | WP-1.1 Signature | ✅ Реализовано | Блокирует все confirmation flows |
| 🔴 **P0** | WP-1.2 Sync | 🟡 Частично | Блокирует реальное использование |
| 🔴 **P0** | WP-1.3 Start-of-Day | ✅ Реализовано | Обязательный SAP-процесс |
| 🔴 **P0** | WP-1.4 End-of-Day | ✅ Реализовано | Обязательный SAP-процесс |
| 🟠 **P1** | WP-2.1 Pricing Engine | ❌ Не реализовано | Revenue-critical |
| 🟠 **P1** | WP-2.2 Documents | ✅ Реализовано (базово) | Revenue-critical (invoicing) |
| 🟠 **P1** | WP-2.5 Visit List+ | 🟡 Частично | Core UX улучшение |
| 🟡 **P2** | WP-2.3 PDF/Print | 🟡 Частично | Нужен для customer-facing документов |
| 🟡 **P2** | WP-2.4 Preseller | 🟡 Частично | Новый бизнес-сценарий |
| 🟡 **P2** | WP-3.3 Customer Master | 🟡 Частично | Master data completeness |
| 🟡 **P2** | WP-3.4 Material Master | ❌ Не реализовано | Master data completeness |
| 🟡 **P2** | WP-3.5 Expenses | ✅ Реализовано | Простая реализация, нужен для settlement |
| 🟢 **P3** | WP-3.1 Deal Conditions | ❌ Не реализовано | Complex, зависит от pricing |
| 🟢 **P3** | WP-3.2 CRM Activities | ❌ Не реализовано | Зависит от CRM backend |
| 🟢 **P3** | WP-3.6 Empties | 🟡 Частично | Углубление существующей функции |
| 🟢 **P3** | WP-4.1 Reports | 🟡 Частично | Зависит от data completeness |
| 🔵 **P4** | WP-4.2 Inventory+ | ✅ Реализовано | Extension |
| 🔵 **P4** | WP-4.3 Van Seller | ❌ Не реализовано | Новый сценарий |
| 🔵 **P4** | WP-4.4 Tour Monitor+ | 🟡 Частично | Enhancement |
| 🔵 **P4** | WP-4.5 Barcode+ | 🟡 Частично | Enhancement |
| ⚪ **P5** | WP-5.1-5.3 Production | 🟡 Частично | Параллельно с основной разработкой |

---

## Ожидаемое покрытие после доработки

| Фаза | Покрытие SAP DSD |
| --- | --- |
| Текущее состояние | ~55-60% *(обновлено 2026-03-17)* |
| После Фазы 1 | ~65-70% |
| После Фазы 2 | ~75-80% |
| После Фазы 3 | ~88-92% |
| После Фазы 4 | ~93-96% |
| После Фазы 5 | Production-ready |

---

## Итоговый обзор реализации (аудит 2026-03-17)

### ✅ Реализовано (6 WP)

| WP | Название | Ключевые файлы | Примечания |
| --- | --- | --- | --- |
| WP-1.1 | Signature Capture | `SignatureScreen.js`, `SignaturePad` (component), `react-native-signature-canvas` | Dual signature, валидация размера, используется в SOD/EOD/delivery |
| WP-1.3 | Start-of-Day Flow | `StartOfDayScreen.js`, `VehicleCheckStep.js`, `OdometerStep.js`, `CheckOutCashStep.js` | 5-шаговый wizard, DB persistence, read-only после завершения |
| WP-1.4 | End-of-Day Flow | `EndOfDayScreen.js`, `MaterialCheckInStep.js`, `CashCheckInStep.js` | Зеркало SOD, валидация одометра vs SOD |
| WP-2.2 | Invoice / Receipt | `invoiceService.js`, `InvoiceSummaryScreen.js`, `DocumentViewScreen.js` | Таблицы invoices/receipts/delivery_notes, номерация, confirm flow |
| WP-3.5 | Expenses | `ExpensesScreen.js`, таблицы `expenses`, `expense_types` | CRUD, configurable types, блокировка до tour start |
| WP-4.2 | Inventory+ | `AdjustInventoryScreen.js`, `CaptureOnHandScreen.js`, `InventoryCheckScreen.js` | Reason codes, on_hand_inventory |

### 🟡 Частично реализовано (9 WP)

| WP | Название | Что реализовано | Что отсутствует |
| --- | --- | --- | --- |
| WP-1.2 | Data Sync | Таблицы `sync_log`/`sync_meta`, UI мониторинга, `ConflictResolutionScreen` | HTTP-клиент, реальный sync engine, retry logic, OCS |
| WP-2.3 | PDF/Print | `expo-print`, `expo-sharing`, `documentService.js`, `PrintPreviewScreen.js`, HTML-шаблоны | Bluetooth-печать, кастомные шаблоны отчётов |
| WP-2.4 | Preseller Role | Роль, навигация, `PresellerVisitScreen`, `OrderConfirmationScreen` | Интеграция с pricing engine, deal conditions, sync |
| WP-2.5 | Visit List+ | Список с статусами, `VisitScreen` с action hub | Поиск, drag-to-reorder, AddVisit, CancelVisit |
| WP-3.3 | Customer Master | `CustomerDetailScreen.js` с 3 табами, карта | `CustomerListScreen` с поиском |
| WP-3.6 | Empties Mgmt | `PackagingReturnsScreen.js`, сохранение в БД | Hardcoded типы, нет привязки к материалам |
| WP-4.1 | Reports | `AnalyticsReportsScreen.js` — KPI дашборд, фильтры по периоду | SAP-style отчёты, presettlement, route performance |
| WP-4.4 | Tour Monitor | `MonitoringMapScreen.js` — multi-route карта, color coding | GPS tracking, planned vs actual, web dashboard |
| WP-4.5 | Barcode+ | Реальная камера в `LoadingTripScreen` | `ScanningScreen` — заглушка, нет `BarcodeScanner` компонента |
| WP-5.1 | Auth & RBAC | Role-based navigation, `expo-secure-store` | OAuth2/JWT, supervisor password prompt, session management |
| WP-5.2 | Offline-first | SQLite локально, таблица `sync_log` | Реальный sync engine, conflict resolution, online/offline индикатор |
| WP-5.3 | Error Handling | `AuditLogScreen`, таблица `audit_log` | Structured logging, pricing/sync error reporting, log export |

### ❌ Не реализовано (5 WP)

| WP | Название | Что нужно сделать | Зависит от |
| --- | --- | --- | --- |
| WP-2.1 | Pricing Engine | `pricingEngine.js`, таблицы condition records, UI pricing breakdown | — (блокирует WP-2.4, WP-3.1, WP-4.3) |
| WP-3.1 | Deal Conditions | `dealConditionEngine.js`, 5 новых таблиц, UI индикации | WP-2.1 |
| WP-3.2 | CRM Activities | 5 новых экранов, 6 новых таблиц, surveys/journals/photos | — |
| WP-3.4 | Material Master | `MaterialDetailScreen.js`, `MaterialListScreen.js`, 3 новые таблицы | — (блокирует WP-3.6, WP-4.2 Empties tab) |
| WP-4.3 | Van Seller Role | `VanSaleScreen.js`, van_seller роль, stock validation | WP-2.1, WP-2.2 |
