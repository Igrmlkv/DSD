# План доработки DSD Mini

> На основе анализа дельты ([OpusDelta.md](./OpusDelta.md)) и требований SAP Direct Store Delivery  
> (sap_dsd_1.0_application_help_en.pdf, разделы 2–6).

---

## Общая стратегия

Текущее покрытие frontend-функционала SAP DSD for Android — **~30-35%**.  
План разбит на **5 фаз**, упорядоченных по бизнес-критичности и зависимостям.  
Каждая фаза содержит рабочие пакеты (WP) с детализацией требований из PDF SAP.

---

## Фаза 1 — Фундамент (Foundation)

> Без этих компонентов невозможна работа остальных функций.

### WP-1.1: Графическая подпись (Signature Capture)

**Текущее состояние:** `SignatureScreen` — текстовое ФИО, зона подписи помечена как `/* Зона подписи (заглушка) */`.

**Требования SAP DSD (стр. 69, 73-74, 76-77):**
- Графический canvas для рукописной подписи пальцем/стилусом
- Кнопка стирания подписи (X icon) для повторного ввода
- Контроль размера подписи — FAB появляется только если подпись достаточного размера
- **Dual signature** — две области подписи на одном экране: клиент + водитель/прессейлер
- Подпись используется в 5 контекстах:
  1. Check-out (подпись супервайзера)
  2. Order confirmation (клиент + прессейлер)
  3. Delivery confirmation (клиент + водитель)
  4. Collection receipt (клиент + водитель)
  5. Check-in (подпись супервайзера)

**Затрагиваемые экраны:**
- `SignatureScreen.js` — переработка (замена текстового поля на canvas)
- Новый переиспользуемый компонент `SignaturePad`
- Интеграция во все confirmation-экраны (WP-2.x, WP-3.x)

**Рекомендуемый пакет:** `react-native-signature-canvas` или `react-native-signature-pad`

---

### WP-1.2: Синхронизация данных (Data Synchronization)

**Текущее состояние:** Таблицы `sync_log`, `sync_meta` существуют в schema; экраны `SyncMonitoringScreen`, `ConflictResolutionScreen` — UI-заглушки. Нет HTTP-клиента, нет API endpoints.

**Требования SAP DSD (стр. 67, раздел 4 стр. 18-20, стр. 109-118):**

#### Download (перед туром):
- Загрузка tour data: master data (клиенты, материалы, цены) + транзакционные данные (visit list, shipment, orders)
- Индикатор прогресса загрузки
- Confirmation по завершении ("Tour download is complete")
- Поддержка полного и дельта-обновления

#### Upload (после тура):
- Выгрузка: созданные deliveries, invoices, payments, signatures, inventory adjustments, expenses
- Обработка ошибок выгрузки (retry, application log)

#### OCS — Occasionally Connected Scenario (стр. 112-118):
- Дельта-загрузка mid-tour: добавление клиентов, материалов, deliveries, orders
- Дельта-выгрузка: промежуточная выгрузка completed visits
- Maintenance blocking status — контроль когда delta data можно создавать

**Реализация:**
- HTTP-клиент (axios / fetch) с offline queue
- REST API contract (или адаптер для будущего SAP-backend)
- Sync engine: полная загрузка + дельта + conflict resolution
- Retry logic с exponential backoff
- Обновление `SyncMonitoringScreen` и `ConflictResolutionScreen` реальной логикой

---

### WP-1.3: Unified Start-of-Day / Check-Out Flow

**Текущее состояние:** `LoadingTripScreen` покрывает только проверку загрузки материалов. Нет единого flow начала дня.

**Требования SAP DSD (стр. 68-69, стр. 13-14):**

Последовательный wizard из 6 шагов (конфигурируемый порядок):

| Шаг | Экран | Описание |
| --- | --- | --- |
| 1 | **Vehicle Check** | Чек-лист вопросов безопасности ТС (configurable questionnaire). Ответы: да/нет/текст. Confirm по FAB. |
| 2 | **Check-Out Materials** | Пересчёт материалов на борту. «+» для добавления из каталога (full text search + product hierarchy). Увеличение/уменьшение qty. При расхождениях — **supervisor password** + **reason code** (обязательный если сконфигурирован). |
| 3 | **Odometer Reading** | Ввод показаний одометра (начало дня). |
| 4 | **Check-Out Cash** | Ввод суммы наличных на руках. |
| 5 | **Signature Capture** | Подпись супервайзера (графическая, используя `SignaturePad` из WP-1.1). |
| 6 | **Tour Confirmation** | Финальное подтверждение — переход к Visit List. |

**Новые экраны:**
- `StartOfDayScreen.js` (wizard-container с шагами)
- `VehicleCheckScreen.js`
- `OdometerScreen.js`
- `CheckOutCashScreen.js`

**Модификация:**
- `LoadingTripScreen.js` — адаптировать как шаг 2 wizard'а (check-out materials)

---

### WP-1.4: Unified End-of-Day / Check-In Flow

**Текущее состояние:** `CashCollectionScreen` + `VehicleUnloadingScreen` работают как отдельные экраны.

**Требования SAP DSD (стр. 69, стр. 15, стр. 20):**

Последовательный wizard из 5 шагов:

| Шаг | Экран | Описание |
| --- | --- | --- |
| 1 | **Material Check-In** | Список материалов + expected qty. Валидация returns, damaged goods, empties. «+» для добавления. Reason codes для расхождений. Supervisor password при отклонениях. |
| 2 | **Cash Check-In** | Reconciliation: ожидаемые суммы (deliveries + collections) vs фактические наличные. Учёт expenses. |
| 3 | **Odometer Reading** | Финальные показания одометра. |
| 4 | **Vehicle Check-In** | Проверка ТС (опциональный чек-лист). |
| 5 | **Signature Capture** | Подпись супервайзера. |

**Модификация:**
- `VehicleUnloadingScreen.js` — адаптировать как шаг 1
- `CashCollectionScreen.js` — адаптировать как шаг 2
- Новый wizard-container `EndOfDayScreen.js`

---

## Фаза 2 — Ядро бизнес-процессов (Core Business Processes)

> Ключевые revenue-affecting функции.

### WP-2.1: Pricing Engine (Offline Pricing)

**Текущее состояние:** Цены берутся из таблицы `price_lists` в SQLite. Нет расчёта invoice, taxes, discounts, condition technique.

**Требования SAP DSD (стр. 129-133, раздел 6.7):**

- **Pricing procedure determination** — автоматическое определение процедуры ценообразования для документа
- **Condition technique** — иерархическое определение цен по condition records:
  - Базовая цена (price lists)
  - Скидки (по клиенту, группе, материалу)
  - Надбавки (surcharges)
  - Налоги (VAT, excise)
  - Ручные условия (manual conditions) с лимитами
- **Pricing для разных ролей:**
  - Preseller → расчёт при подтверждении заказа
  - Delivery driver → расчёт при подтверждении delivery (для invoice)
  - Van seller → расчёт при подтверждении delivery из speculative load
- **Pricing в OCS:** при дельта-загрузке pricing data обновляется полностью для всех клиентов тура
- **Application Log:** при ошибке расчёта — детальное сообщение на уровне header и item

**Реализация:**
- Таблицы: `condition_records`, `pricing_procedures`, `condition_types`, `tax_rates`
- Сервис: `pricingEngine.js` — расчёт по condition technique
- Интеграция в `OrderEditScreen`, `ShipmentScreen` (итоговая сумма с разбивкой)
- UI: отображение pricing breakdown (subtotal, discounts, taxes, total) на confirmation-экранах

---

### WP-2.2: Invoice / Receipt Generation

**Текущее состояние:** Нет формирования документов. Delivery confirmation через SignatureScreen создаёт запись в БД без документа.

**Требования SAP DSD (стр. 75-77, стр. 15, стр. 20):**

- **Invoice** — формируется при delivery confirmation:
  - Header: номер, дата, клиент, водитель, vehicle, tour
  - Items: материалы, qty, unit price, subtotal
  - Pricing: discounts, taxes (VAT), total
  - Signature (customer)
  - Статус: draft → confirmed
- **Collection Receipt** — при оплате:
  - Payment method, amount, change
  - Open items list with applied payments
  - Signature
- **Order Confirmation** — для preseller:
  - List of ordered materials with pricing
  - Signature

**Новые таблицы:** `invoices`, `invoice_items`, `delivery_notes`, `receipts`

**Новые экраны:**
- `InvoiceSummaryScreen.js` — предпросмотр invoice перед подтверждением (Invoice preview)
- `DocumentViewScreen.js` — просмотр сформированного документа

---

### WP-2.3: PDF Generation и Printing

**Текущее состояние:** Нет библиотек для печати в `package.json`. Нет генерации PDF.

**Требования SAP DSD (стр. 15, стр. 74, стр. 77, стр. 83):**

- **PDF generation** для: invoices, delivery notes, orders, collection receipts, reports
- **Mobile printing** через Bluetooth/USB принтер:
  - Print invoice на месте у клиента
  - Print receipt при оплате
  - Print reports (presettlement, route performance)
- **Email PDF** — отправка PDF с устройства (configurable per sales area)
- **Custom report layouts** — поддержка шаблонов отчётов (XML-based в SAP; в DSD Mini — JSON/HTML templates)

**Рекомендуемые пакеты:**
- `react-native-html-to-pdf` — генерация PDF
- `react-native-print` — печать
- `react-native-share` — sharing PDF (email, мессенджеры)
- `react-native-ble-manager` — работа с Bluetooth-принтерами

**Реализация:**
- HTML-шаблоны для каждого типа документа
- Service: `documentService.js` — генерация, хранение, отправка
- Print preview screen
- Настройки принтера в `SystemSettingsScreen`

---

### WP-2.4: Роль Мерчендайзер (Pre-Sales Scenario)

**Текущее состояние:** Нет роли Мерчендайзер. `OrderEditScreen` поддерживает создание заказов, но без presale workflow.

**Требования SAP DSD (стр. 9-10, стр. 21-22, стр. 72-74):**

**Сценарий Preseller:**
1. Sync download (visit list, customers, materials, pricing)
2. Start-of-day (odometer, vehicle check)
3. Visit customers → Take order:
   - Выбор материалов (full text search + product hierarchy filter)
   - Ввод qty, UoM
   - Return items в рамках заказа
   - Order references (payment terms)
4. **Order confirmation:**
   - Pricing calculation (WP-2.1)
   - Dual signature (customer + preseller)
   - Print order (WP-2.3)
5. CRM Activities (WP-3.2) — surveys, photos
6. End-of-day (odometer)
7. Sync upload

**Реализация:**
- Новая роль в `roles.js` и `authService.js`
- Новый `PreselerNavigator` (или расширение `ExpeditorNavigator`)
- Модификация `OrderEditScreen` — добавить: deal conditions, return items, order references
- Новый `OrderConfirmationScreen.js` — pricing summary + signature + print

---

### WP-2.5: Visit List — расширенный функционал

**Текущее состояние:** `RouteListScreen` — список точек маршрута со статусами. `VisitScreen` — hub с 4 фиксированными действиями. Нет поиска, нет добавления визитов.

**Требования SAP DSD (стр. 70-72, стр. 14):**

- **Full text search** по списку визитов (имя клиента, номер, адрес)
- **Изменение порядка визитов** (drag & reorder)
- **Добавление визитов:**
  - Из customer master (существующий клиент не в visit list)
  - One-time customer (ввод имени, адреса, телефона без сохранения в master data)
  - Дополнительный визит к существующему клиенту
- **Cancel visit** с обязательным reason code
- **Per-customer Activities tab** — динамический список actions:
  - Delivery (Deliver presold)
  - Take order
  - Collection (open items)
  - Return delivery / Return order
  - CRM activities
  - Capture on hand inventory
  - Free goods
- **Per-customer Attachments tab** — фото, документы
- **Status icons** (5 статусов): not processed, optional, partially processed, processed, cancelled

**Модификация:**
- `RouteListScreen.js` — добавить search bar, drag-to-reorder, «+» для добавления
- `VisitScreen.js` — переработать в dynamic activity list вместо 4 фиксированных кнопок
- Новый `AddVisitScreen.js` — выбор из customer master или создание one-time customer
- Новый `CancelVisitScreen.js` — ввод reason code

---

## Фаза 3 — Расширенные бизнес-функции (Extended Features)

### WP-3.1: Deal Conditions (Условия сделки)

**Текущее состояние:** Нет реализации. `OrderEditScreen` поддерживает простую скидку (discount).

**Требования SAP DSD (стр. 120-128, раздел 6.6):**

- **Deal Condition Types** — configurable типы условий
- **Assignments** — какие клиенты имеют право на условие (inclusive/exclusive):
  - По атрибутам клиента (1-10)
  - По группе клиента (1-5)
- **Deal Condition Scales** — шкалы количества для fine-tuning:
  - Пример: 0-9 шт → скидка 5%, 10-19 → 10%, 20-29 → 15%
  - Monetary rebates (% и сумма) и free goods
- **Precondition Fields** — какие материалы нужно купить:
  - Material Number, Material Group, Material Pricing Group
  - Product Hierarchy (levels 1-9)
  - Product Attribute (levels 1-10)
- **Exclusion List** — исключение конкретных материалов из precondition
- **Free Goods** — бесплатные товары как результат условия (включая tied empties)
- **Discounts** — header/item level, percentage/amount
- **Out of Stock** — recalculation если товар отсутствует

**Реализация:**
- Таблицы: `deal_conditions`, `deal_condition_scales`, `deal_condition_assignments`, `deal_condition_preconditions`, `deal_condition_exclusions`
- Service: `dealConditionEngine.js` — determination + calculation
- UI: индикация applied deal conditions на экранах заказа/доставки
- Расширение `OrderEditScreen`, `ShipmentScreen` — пункт меню "Deal conditions"

---

### WP-3.2: CRM Activities (Surveys, Audits, Photos)

**Текущее состояние:** Нет реализации. Камера используется только в `LoadingTripScreen` для barcode.

**Требования SAP DSD (стр. 98-107, раздел 6.4):**

- **CRM Activity Types** (configurable):
  - Surveys — структурированные вопросники (open/mandatory/completed)
  - Activity Journals — запись данных о товарах (audit shelf check, facings count)
  - Notes — многострочный текст (подготовка, отчёт)
  - Attachments — фото с камеры устройства (с ограничением размера)
  - Partners — контактные лица
- **Per-activity items:** activity может содержать survey + 2 notes + attachment
- **Barcode scanning** в activity journals для добавления товаров
- **Status:** Open optional / Open mandatory / Completed
- **Authorization:** read/edit/create CRM activities, delete attachments
- **360-Degree Activity View** (стр. 108) — timeline всех CRM-активностей по клиенту

**Новые экраны:**
- `CRMActivityListScreen.js` — список CRM-активностей клиента
- `SurveyScreen.js` — заполнение опросника
- `ActivityJournalScreen.js` — запись данных о товарах (с barcode)
- `ActivityAttachmentScreen.js` — фото-захват
- `ActivityTimelineScreen.js` — 360° view

**Новые таблицы:** `crm_activities`, `crm_activity_items`, `surveys`, `survey_answers`, `activity_journals`, `activity_attachments`

---

### WP-3.3: Customer Master Data Screen

**Текущее состояние:** Информация о клиенте внутри `VisitScreen` и `OrderEditScreen` — минимальный набор (имя, адрес, телефон, долг).

**Требования SAP DSD (стр. 77-79, раздел 5.3.5):**

Отдельный экран с табами:

| Tab | Содержимое |
| --- | --- |
| **GENERAL INFO** | Наименование Юридического лица, ИНН, КПП, Телефон, Констактное лицо, адрес, GPS-координаты, Разрешенное время для визита, особенности доставки | 
| **SALES AREA** | customer group, payment method, payment terms |
| **CREDIT INFO** | Credit limit, risk category, available credit (значение + progress bar) |

- **Full text search** по списку клиентов (имя + номер, multi-line)

**Новый экран:** `CustomerDetailScreen.js` (tabbed)
**Новый экран:** `CustomerListScreen.js` (searchable list)

---

### WP-3.4: Material Master Data Screen

**Текущее состояние:** Товары отображаются внутри `WarehouseScreen`, `ShipmentScreen`, `OrderEditScreen`. Нет отдельного экрана.

**Требования SAP DSD (стр. 79-80, раздел 5.3.6):**

Отдельный экран с табами:

| Tab | Содержимое |
| --- | --- |
| **GENERAL INFO** | EAN/UPC, base UoM, material type, division, group, counting group, product hierarchy |
| **SALES AREA** | Sales org, channel, division, sales UoM, minimum order, pricing group, importance |
| **UNITS OF MEASURE** | Base UoM + альтернативные UoM с conversion factors |
| **TIED EMPTIES** | Привязанная тара по каждому материалу |

- **Full text search** (описание + номер материала)
- **Product hierarchy filter** — pyramid icon, slide-in панель фильтрации
- **Multiple sales areas** — pop-up selector
- **Item Proposal** — предложенные товары на основе истории (preseller/van seller)

**Новый экран:** `MaterialDetailScreen.js` (tabbed)
**Новый экран:** `MaterialListScreen.js` (searchable, filterable)
**Расширение схемы:** `material_uoms`, `material_tied_empties`, `product_hierarchy`

---

### WP-3.5: Expenses (Расходы на маршруте)

**Текущее состояние:** Нет реализации.

**Требования SAP DSD (стр. 82-83, раздел 5.3.8, стр. 15):**

- **Expense Types** (configurable): gas, highway tolls, parking, meals и др.
- **Запись расходов:**
  1. Нажать «+» → выбрать тип расхода
  2. Ввести сумму (валюта из настроек)
  3. Сохранить → появляется как отдельная запись в списке
  4. Повторить для дополнительных расходов
- **Редактирование:** нажать на расход → изменить сумму → сохранить
- **Удаление:** swipe-to-delete
- **Доступность:** только после Start-of-Day (tour started)
- **Integration:** расходы учитываются в End-of-Day discrepancy calculation (cash reconciliation)

**Новый экран:** `ExpensesScreen.js`
**Новый экран:** `ExpenseEditScreen.js`
**Новая таблица:** `expenses (id, tour_id, expense_type_id, amount, currency, created_at, updated_at)`
**Новая таблица:** `expense_types (id, name, is_active)`
**Добавление в навигацию:** пункт меню Expenses (после tour start)

---

### WP-3.6: Empties Management (Управление возвратной тарой)

**Текущее состояние:** `PackagingReturnsScreen` — отдельный экран с 4 hardcoded типами тары. Не интегрирован с товарами и deliveries.

**Требования SAP DSD (стр. 79-81, стр. 73-76):**

- **Tied empties** — привязка тары к конкретным материалам (1 material → N empties)
- **Tab TIED EMPTIES** в Material master (WP-3.4)
- **Tab EMPTIES** на экране Inventory — отдельный учёт тары на борту
- **Add non-tied empties** — в рамках delivery или order
- **Empties в check-out** — пересчёт при Start-of-Day
- **Empties в check-in** — reconciliation при End-of-Day
- **Configurable** типы тары (не hardcoded)

**Модификация:**
- `PackagingReturnsScreen.js` — configurable типы, привязка к материалам
- `ShipmentScreen.js` — кнопка "Add empties" при delivery
- `OrderEditScreen.js` — кнопка "Add non-tied empties" при заказе
- `InventoryCheckScreen.js` — tab EMPTIES
- Start-of-Day wizard (WP-1.3) — empties в check-out
- End-of-Day wizard (WP-1.4) — empties в check-in

**Расширение схемы:** `material_tied_empties`, `empties_inventory`, `delivery_empties`

---

## Фаза 4 — Enterprise Features

### WP-4.1: Reports (Presettlement, Route Performance, Custom)

**Текущее состояние:** `AnalyticsReportsScreen` — KPI-дашборд с progress bars и top debtors. Не SAP-style reports.

**Требования SAP DSD (стр. 83, стр. 15):**

- **Presettlement Report:**
  - Overview собранных платежей по клиентам на маршруте
  - Breakdown: cash, check, credit card, QR
  - Итоги: total collected, total outstanding
- **Route Performance Report:**
  - Число визитов (planned vs executed vs cancelled)
  - Revenue per visit
  - Delivery efficiency (ordered vs delivered qty)
  - Time per visit
  - Distance covered (odometer)
- **Custom Reports:**
  - Поддержка JSON/HTML-шаблонов (аналог XML в SAP)
  - Отображение + печать + PDF export + email
- **Фильтры:** по дате, по клиенту, по типу документа

**Модификация:**
- `AnalyticsReportsScreen.js` — полная переработка: список отчётов → детализация
- Новый `ReportViewScreen.js` — отображение с print/share
- Service: `reportService.js` — генерация данных + форматирование

---

### WP-4.2: Inventory — расширенный функционал

**Текущее состояние:** `InventoryCheckScreen` — сверка stock. `VehicleUnloadingScreen` — разгрузка.

**Требования SAP DSD (стр. 81, стр. 14):**

- **Adjust Inventory:**
  - Авторизация (supervisor password)
  - Изменение qty конкретных материалов
  - Reason codes для каждого расхождения (configurable: breakage, theft, incorrect freight list, truck-to-truck transfer)
  - Adjusted qty отображается в реальном времени
- **Capture on Hand Inventory:**
  - Запись stock на полках клиента (фактический остаток в магазине)
  - Возможность discard quantities или cancel capture
  - Данные используются для item proposal в заказах
- **Empties tab** на Inventory screen

**Модификация:**
- `InventoryCheckScreen.js` — добавить adjust с auth, reason codes, capture on hand
- Новый `CaptureOnHandScreen.js`
- Расширение схемы: `inventory_adjustments`, `on_hand_inventory`, `adjustment_reasons`

---

### WP-4.3: Van Seller Role

**Текущее состояние:** Экспедитор частично покрывает van seller, но без speculative load и прямых продаж.

**Требования SAP DSD (стр. 10-11, стр. 20):**

- **Speculative load** — товары на борту без предварительных заказов
- **Sell & deliver from vehicle** — создание delivery без presold order:
  1. На визите → проверка existing inventory у клиента
  2. Подготовка delivery из stock на борту
  3. Store receiver верифицирует товар
  4. Invoice с pricing (WP-2.1)
  5. Signature + payment
- **Stock validation** — нельзя продать больше чем есть на борту
- **Mixed role** — возможность presale + delivery + van sale в одном туре

**Реализация:**
- Расширение role system: `van_seller` role + `mixed` role
- Новый `VanSaleScreen.js` — создание delivery без presold order
- Расширение `ShipmentScreen.js` — поддержка van sale mode
- Stock validation на борту в реальном времени

---

### WP-4.4: Tour Monitor — расширение

**Текущее состояние:** `MonitoringMapScreen` — мобильный мониторинг экспедиторов. Нет web-app.

**Требования SAP DSD (стр. 16-17, раздел 3.2):**

SAP Tour Monitor — **web-приложение** для tour dispatchers:
- Выбор туров по критериям (дата, driver, vehicle, route, shipment type)
- Карта + visit list в split-view
- GPS tracking: маршрут на карте, numbered visit dots
- Visit details: sequence, customer, address, date/time, coordinates
- Planned vs actual comparison

**Текущий мобильный MonitoringMapScreen:**
- Multi-route отображение — хорошо реализовано
- Color-coded маршруты — хорошо
- Selection filtering — хорошо

**Доработка:**
- GPS tracking configuration (interval, consent screen)
- Planned vs actual route comparison
- Visit details (время прибытия/убытия, координаты)
- Опционально: web-dashboard (React/Next.js) для dispatchers

---

### WP-4.5: Barcode Scanning — расширение

**Текущее состояние:** Camera barcode scanning в `LoadingTripScreen` (FULL). `ScanningScreen` — shell (manual only).

**Требования SAP DSD:**

- Barcode scanning для:
  - Check-out materials (WP-1.3)
  - Delivery verification
  - Activity journals (CRM — WP-3.2)
  - Inventory adjustment
  - Capture on hand inventory
- **ScanningScreen** — переработать из shell в production:
  - Real camera scanning (как в LoadingTripScreen)
  - Мульти-формат: EAN-13, EAN-8, UPC-A, Code128, QR
  - Звуковой feedback при сканировании
  - Rapid multi-scan mode

**Модификация:**
- `ScanningScreen.js` — полная переработка
- Создать переиспользуемый компонент `BarcodeScanner`
- Интеграция во все экраны, требующие scanning

---

## Фаза 5 — Production Readiness

### WP-5.1: Аутентификация и авторизация

**Текущее состояние:** Mock auth с 4 hardcoded accounts в `authService.js`. `expo-secure-store` для токенов.

**Доработка:**
- Замена mock auth на реальную OAuth2/JWT аутентификацию
- Role-based access control (RBAC) для 5+ ролей
- Supervisor password prompt для авторизованных операций (inventory adjust, check-out discrepancy)
- Session management (token refresh, timeout)

---

### WP-5.2: Offline-first Architecture

**Текущее состояние:** Все данные локальные (SQLite). Нет sync.

**Доработка:**
- Offline queue для всех мутаций
- Sync conflict resolution strategy (last-write-wins / merge)
- Data versioning (optimistic locking)
- Background sync при появлении сети
- Индикатор online/offline статуса в header

---

### WP-5.3: Error Handling и Application Log

**Текущее состояние:** `AuditLogScreen` существует. Нет structured error handling.

**Требования SAP DSD (стр. 136, раздел 6.9):**

- **Application Log Monitoring:**
  - Pricing errors (header + item level)
  - Sync errors (upload/download failures)
  - Document creation errors
- **Structured logging:** timestamp, severity, source, message, context
- **Log export** — отправка логов в backend для анализа

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

| Приоритет | Work Package | Обоснование |
| --- | --- | --- |
| 🔴 **P0** | WP-1.1 Signature | Блокирует все confirmation flows |
| 🔴 **P0** | WP-1.2 Sync | Блокирует реальное использование |
| 🔴 **P0** | WP-1.3 Start-of-Day | Обязательный SAP-процесс |
| 🔴 **P0** | WP-1.4 End-of-Day | Обязательный SAP-процесс |
| 🟠 **P1** | WP-2.1 Pricing Engine | Revenue-critical |
| 🟠 **P1** | WP-2.2 Documents | Revenue-critical (invoicing) |
| 🟠 **P1** | WP-2.5 Visit List+ | Core UX улучшение |
| 🟡 **P2** | WP-2.3 PDF/Print | Нужен для customer-facing документов |
| 🟡 **P2** | WP-2.4 Preseller | Новый бизнес-сценарий |
| 🟡 **P2** | WP-3.3 Customer Master | Master data completeness |
| 🟡 **P2** | WP-3.4 Material Master | Master data completeness |
| 🟡 **P2** | WP-3.5 Expenses | Простая реализация, нужен для settlement |
| 🟢 **P3** | WP-3.1 Deal Conditions | Complex, зависит от pricing |
| 🟢 **P3** | WP-3.2 CRM Activities | Зависит от CRM backend |
| 🟢 **P3** | WP-3.6 Empties | Углубление существующей функции |
| 🟢 **P3** | WP-4.1 Reports | Зависит от data completeness |
| 🔵 **P4** | WP-4.2 Inventory+ | Extension |
| 🔵 **P4** | WP-4.3 Van Seller | Новый сценарий |
| 🔵 **P4** | WP-4.4 Tour Monitor+ | Enhancement |
| 🔵 **P4** | WP-4.5 Barcode+ | Enhancement |
| ⚪ **P5** | WP-5.1-5.3 Production | Параллельно с основной разработкой |

---

## Ожидаемое покрытие после доработки

| Фаза | Покрытие SAP DSD |
| --- | --- |
| Текущее состояние | ~30-35% |
| После Фазы 1 | ~45-50% |
| После Фазы 2 | ~65-70% |
| После Фазы 3 | ~80-85% |
| После Фазы 4 | ~90-95% |
| После Фазы 5 | Production-ready |
