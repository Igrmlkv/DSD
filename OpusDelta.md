# Дельта: DSD Mini (Frontend) vs SAP Direct Store Delivery for Android

> Анализ на основе исходного кода приложения и официальной документации  
> *SAP Direct Store Delivery — Application Help (sap_dsd_1.0_application_help_en.pdf), раздел 5.3 «SAP Direct Store Delivery for Android».*

---

## 1. Краткое резюме

Приложение DSD Mini реализует **офлайн-first мобильный клиент** для процесса прямой доставки в торговые точки на стеке React Native / Expo / SQLite с тремя пользовательскими ролями.

SAP DSD for Android — **enterprise-grade** решение с 4 мобильными ролями, глубокой интеграцией с SAP ERP / S/4HANA / CRM, полным offline pricing engine, системой документооборота (invoices, receipts, delivery notes), печатью, ЭП, CRM-активностями и production-grade синхронизацией.

По результатам сопоставления:

- **5 экранов DSD Mini** достигают уровня **FULL** (production-quality frontend): ShipmentScreen, PaymentScreen, LoadingTripScreen, VehicleUnloadingScreen, MonitoringMapScreen.
- **~20 экранов** на уровне **FUNCTIONAL** — работают, но без глубины SAP-процессов.
- **1 экран** — **SHELL** (ScanningScreen — камера как заглушка).
- Критические SAP-процессы **отсутствуют целиком**: van sales, presales, invoice issuing, offline pricing engine, CRM activities, settlement, check-in/check-out, Tour Monitor (backend web-app), custom reports, empties management, deal conditions.

---

## 2. Роли пользователей

### SAP DSD for Android (из документации, раздел 2 «Mobile User Roles»)

| Роль | Описание |
| --- | --- |
| **Preseller** | Принимает заказы у клиентов на маршруте без доставки товара. Заказ затем обрабатывается на складе и доставляется delivery driver. |
| **Delivery Driver** | Доставляет предзаказанный товар (presold), выставляет invoice, собирает оплату, получает подпись. |
| **Van Seller** | Продаёт и доставляет товар непосредственно с борта из спекулятивной загрузки (speculative load). |
| **Mixed Role** | Комбинация всех трёх: presale + delivery + van sales в одном туре. |

### DSD Mini (из кода: `RoleNavigator.js`, `authService.js`, `roles.js`)

| Роль | Описание |
| --- | --- |
| **Экспедитор** | Объединяет функции delivery driver и частично van seller: маршрут → загрузка → отгрузка → оплата → возвраты → инкассация. |
| **Супервайзер** | Мониторинг экспедиторов на карте, согласование возвратов, аналитика. |
| **Администратор** | Управление пользователями, устройствами, sync monitoring, аудит. |

### Дельта по ролям

| SAP DSD | DSD Mini | Статус |
| --- | --- | --- |
| Preseller | Нет аналога | ❌ **Отсутствует** |
| Delivery Driver | Экспедитор (частичное покрытие) | ⚠️ Частично |
| Van Seller | Экспедитор (элементы van sales не выделены) | ⚠️ Частично |
| Mixed Role | Экспедитор (по факту ближе всего к mixed, но без presale) | ⚠️ Частично |
| Tour Dispatcher (Tour Monitor web-app) | Супервайзер (мониторинг на мобильном устройстве) | ⚠️ Иной подход |
| Backend Operator (SAP ERP) | Администратор (только локальные настройки) | ⚠️ Иной подход |

---

## 3. Пошаговый процесс тура: SAP DSD vs DSD Mini

В SAP DSD for Android (раздел 4 «Tour Execution», раздел 5.3.3 «Tour») процесс включает **10 шагов** (таблица на стр. 63):

| # | SAP DSD Step | SAP DSD Menu | DSD Mini Frontend | Покрытие |
| --- | --- | --- | --- | --- |
| 1 | **Download data** (Synchronize) | Synchronize | Нет (mock-данные seed.js) | ❌ Отсутствует |
| 2 | **Start-of-Day** (check-out: vehicle check, materials, odometer, cash, signature) | Tour | Нет единого экрана. Частично: LoadingTripScreen | ⚠️ Частично |
| 3 | **Tour processing** — visit list with activities | Visit List | RouteListScreen → VisitScreen → действия | ✅ Покрыто |
| 4 | **Recording inventory changes** | Inventory | InventoryCheckScreen, VehicleUnloadingScreen | ⚠️ Частично |
| 5 | **Customer master data** | Customers | Информация о клиенте внутри VisitScreen | ⚠️ Упрощено |
| 6 | **Material master data** | Materials | Каталог товаров внутри WarehouseScreen, ShipmentScreen | ⚠️ Упрощено |
| 7 | **Expenses** (highway tolls, gas, parking) | Expenses | Нет | ❌ Отсутствует |
| 8 | **Reports** (presettlement, route performance, custom) | Reports | AnalyticsReportsScreen (статистика, не SAP reports) | ⚠️ Иной подход |
| 9 | **End-of-Day** (check-in: materials, cash, odometer, signature) | Tour | CashCollectionScreen + VehicleUnloadingScreen (раздельно) | ⚠️ Частично |
| 10 | **Upload data** (Synchronize) | Synchronize | Нет (sync_log есть, обмена нет) | ❌ Отсутствует |

---

## 4. Детальная дельта по функциональным блокам Android-приложения

### 4.1. Synchronize (стр. 67)

**SAP DSD:** Двунаправленная синхронизация с SAP ERP — загрузка tour data (master data + транзакции) перед туром и выгрузка после. Поддержка OCS (Occasionally Connected Scenario) для дельта-загрузки во время тура.

**DSD Mini:** Sync-инфраструктура подготовлена на уровне схемы (`sync_log`, `sync_meta`) и UI (`SyncMonitoringScreen`, `ConflictResolutionScreen`), но **реального обмена данными нет** — ни HTTP-клиента, ни API endpoints, ни retry-логики. Данные сидируются локально из `seed.js`.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Download tour data | ✅ Full (IDocs, DSD Connector) | ❌ Mock seed | **Критический разрыв** |
| Upload tour results | ✅ Full | ❌ Нет | **Критический разрыв** |
| Delta download (OCS) | ✅ Mid-tour delta sync | ❌ Нет | **Критический разрыв** |
| Conflict resolution | ✅ Backend-driven | ⚠️ UI есть, логика mock | Большой разрыв |

### 4.2. Tour — Start-of-Day / Check-Out (стр. 68-69)

**SAP DSD:** Sequence экранов перед началом тура:
1. Vehicle check (вопросы безопасности)
2. Check-out materials (пересчёт загрузки, reason codes для расхождений)
3. Odometer reading
4. Check-out cash (наличные на руках)
5. Signature capture (подпись проверяющего)
6. Tour progress dashboard (pie chart, open items, sales volume target)

**DSD Mini:** 
- `LoadingTripScreen` — проверка загрузки с barcode scanning (FULL). 
- `ExpeditorHomeScreen` — dashboard с прогрессом (FUNCTIONAL).
- Нет: vehicle check, odometer, check-out cash, supervisor signature, Tour progress cards.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Vehicle safety check | ✅ Configurable questionnaire | ❌ Нет | Отсутствует |
| Material check-out | ✅ With reason codes, supervisor password | ✅ LoadingTripScreen (barcode, qty) | Близко |
| Odometer reading | ✅ Before and after tour | ❌ Нет | Отсутствует |
| Cash check-out | ✅ Record cash on hand | ❌ Нет | Отсутствует |
| Supervisor signature | ✅ Signature capture on check-out | ❌ Нет | Отсутствует |
| Tour progress dashboard | ✅ Pie chart, open items, sales volume, tour memo | ⚠️ ExpeditorHomeScreen (карточки) | Упрощено |
| Multi-day tours | ✅ Supported | ❌ Нет | Отсутствует |

### 4.3. Visit List (стр. 70-71)

**SAP DSD:** Список клиентов на маршруте с:
- Full text search
- Status icons (not processed / optional / partially / processed / canceled)
- Per-customer ACTIVITIES и ATTACHMENTS tabs
- «+» для добавления: delivery, order, CRM activity
- Add visit (дополнительный клиент)
- One-time customer (новый клиент без мастер-данных)
- Cancel visits (с reason code)
- Map view of visits

**DSD Mini:**
- `RouteListScreen` — список точек маршрута, статусы, прогресс (FUNCTIONAL)
- `RouteMapScreen` — карта с маркерами и polylines (FUNCTIONAL)
- `VisitScreen` — hub с 4 действиями (FUNCTIONAL)

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Visit list with status | ✅ 5 statuses, icons | ✅ 5 statuses, icons | Покрыто |
| Free text search | ✅ | ❌ Нет поиска в RouteListScreen | Отсутствует |
| Map view | ✅ Map с позицией водителя | ✅ Yandex Maps, polylines, markers | Покрыто |
| Add unplanned visit | ✅ From customer master | ❌ Нет | Отсутствует |
| One-time customer | ✅ Create inline | ❌ Нет | Отсутствует |
| Cancel visit with reason | ✅ Reason codes | ⚠️ Skip без reason code | Частично |
| ACTIVITIES tab per customer | ✅ Add delivery/order/CRM | ⚠️ VisitScreen: 4 фиксированных действия | Упрощено |
| ATTACHMENTS tab | ✅ Photos, documents | ❌ Нет | Отсутствует |
| Change visit sequence | ✅ Drag/reorder | ❌ Фиксированный порядок | Отсутствует |

### 4.4. Preseller Activities (стр. 72-74)

**SAP DSD:** Take order → material selection → qty → deal conditions → return items → order references → Order confirmation with dual signature (customer + preseller) → Print order.

**DSD Mini:** `OrdersScreen` и `OrderEditScreen` (279 + 516 строк) — создание заказов с выбором клиента, товаров, количества, скидкой и комментарием. Но: нет preseller role, нет deal conditions, нет dual signature, нет печати.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Preseller role | ✅ Dedicated | ❌ Нет роли | Отсутствует |
| Take order | ✅ Full workflow | ⚠️ OrderEditScreen (создание заказа) | Упрощено |
| Material search & filter | ✅ Full text + product hierarchy | ⚠️ Поиск по тексту | Частично |
| Deal conditions on order | ✅ Complex rules | ❌ Нет | Отсутствует |
| Return items in order | ✅ Within order | ❌ Отдельный процесс | Отсутствует |
| Item proposal | ✅ Predefined material suggestions | ❌ Нет | Отсутствует |
| Order confirmation signature | ✅ Dual (customer + preseller) | ❌ Нет | Отсутствует |
| Print order | ✅ Mobile printer | ❌ Нет | Отсутствует |

### 4.5. Delivery Driver Activities (стр. 75-77)

**SAP DSD:** Deliver presold → edit qty → add empties → add return items → deal conditions → Invoice (delivery confirmation with dual signature) → Collection (open items, payment method, calculator, receipt with signature) → Print invoice/receipt.

**DSD Mini:** `ShipmentScreen` (FULL) → `SignatureScreen` (FUNCTIONAL) → `PaymentScreen` (FULL).

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Deliver presold materials | ✅ From shipment | ✅ ShipmentScreen (from order) | Покрыто |
| Edit delivery quantities | ✅ Change/increase/decrease | ✅ +/- controls, stock check | Покрыто |
| Add non-tied empties | ✅ Empties tracking | ❌ Нет | Отсутствует |
| Add return items to delivery | ✅ Inline in delivery | ❌ Отдельный ReturnsScreen | Иной подход |
| Deal conditions on delivery | ✅ Complex rules | ❌ Нет | Отсутствует |
| Cancel delivery | ✅ With reason | ❌ Нет | Отсутствует |
| Delivery confirmation / Invoice | ✅ Dual signature, invoice summary | ⚠️ SignatureScreen (имя, MVP-подпись) | **Существенный разрыв** |
| Invoice with pricing (VAT, discounts) | ✅ Full pricing engine | ❌ Нет invoice | Отсутствует |
| Print invoice | ✅ Mobile printer | ❌ Нет | Отсутствует |
| Delivery preview | ✅ Before confirmation | ❌ Нет | Отсутствует |
| Collection (open items) | ✅ Total debts, overdue, payment methods | ⚠️ PaymentScreen (debt card, 4 types) | Частично |
| Cash calculator (change) | ✅ Built-in | ✅ PaymentScreen (реализован) | Покрыто |
| Payment method selection | ✅ Cash/check/credit card | ✅ Cash/card/QR/transfer | Покрыто |
| Collection receipt + signature | ✅ Dual signature, print | ❌ Нет | Отсутствует |
| Open items display | ✅ Detailed overdue/regular | ⚠️ Только total debt | Упрощено |

### 4.6. Customers (стр. 77-79)

**SAP DSD:** Rich customer master data с табами: GENERAL INFO, SALES AREA, CREDIT INFORMATION, OPEN ITEMS, MESSAGES, LISTED ITEMS, EXCLUDED ITEMS. При интеграции с CRM — CRM ACTIVITIES, CRM MARKETING ATTRIBUTES. Full text search, multiple sales areas.

**DSD Mini:** Клиент отображается внутри `VisitScreen` и `OrderEditScreen` — минимальный набор (имя, адрес, телефон, долг). Нет отдельного экрана Customer Master.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Dedicated customer screen | ✅ Alphabetical list, tabs | ❌ Нет отдельного экрана | Отсутствует |
| General info | ✅ Full | ⚠️ Имя, адрес, телефон в Visit | Упрощено |
| Sales area info | ✅ Organization, channel, division | ❌ Нет | Отсутствует |
| Credit information | ✅ Limit, risk, available credit, progress bar | ⚠️ credit_limit и debt в schema, не визуализированы | Отсутствует (frontend) |
| Open items (debts breakdown) | ✅ Overdue + regular, per-document | ⚠️ Только total debt | Упрощено |
| Messages | ✅ Customer / sales area messages | ❌ Нет | Отсутствует |
| Listed / excluded items | ✅ Per order type | ❌ Нет | Отсутствует |
| CRM activities | ✅ If SAP CRM integrated | ❌ Нет | Отсутствует |
| Multiple sales areas | ✅ Pop-up selector | ❌ Нет | Отсутствует |
| Full text search | ✅ Across customer fields | ⚠️ Поиск в OrderEditScreen | Частично |
| Add to visit list | ✅ From customer master | ❌ Нет | Отсутствует |

### 4.7. Materials (стр. 79-80)

**SAP DSD:** Список материалов с табами: GENERAL INFO, SALES AREA, UNITS OF MEASURE, TIED EMPTIES. Full text search, product hierarchy filter, multiple sales areas. Item proposal support.

**DSD Mini:** Товары внутри `WarehouseScreen` (vehicle stock), `ShipmentScreen` (order items), `OrderEditScreen` (product picker).

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Dedicated materials screen | ✅ Alphabetical, tabbed detail | ❌ Нет отдельного экрана | Отсутствует |
| Product hierarchy filter | ✅ Pyramid icon, slide-in | ❌ Нет иерархии | Отсутствует |
| Tied empties | ✅ Per material | ❌ Нет | Отсутствует |
| Units of measure | ✅ Base + sales UoM | ⚠️ Единственная unit в schema | Упрощено |
| Material search | ✅ Full text | ✅ Поиск по названию/SKU/brand | Покрыто |
| Multiple sales areas per material | ✅ | ❌ Нет | Отсутствует |
| Item proposal | ✅ Suggested materials + quantities | ❌ Нет | Отсутствует |
| Listing / exclusion | ✅ Per customer/order type | ❌ Нет | Отсутствует |

### 4.8. Inventory (стр. 81)

**SAP DSD:** MATERIALS и EMPTIES табы на экране Inventory. Adjust inventory (с паролем авторизации, reason codes). Capture on hand inventory (stock on customer shelves).

**DSD Mini:** `InventoryCheckScreen` — сверка stock (план vs факт), `VehicleUnloadingScreen` — разгрузка с обновлением складских остатков.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Vehicle inventory view | ✅ Materials + empties | ✅ WarehouseScreen (vehicle stock) | Частично (нет empties) |
| Adjust inventory (auth required) | ✅ Supervisor password, reason codes | ❌ Нет (только пересчёт) | Отсутствует |
| Capture on hand inventory | ✅ Customer shelf stock | ❌ Нет | Отсутствует |
| Empties tracking | ✅ Dedicated tab | ⚠️ PackagingReturnsScreen (отдельно) | Иной подход |
| Reason codes for discrepancies | ✅ Configurable in backend | ❌ Нет | Отсутствует |

### 4.9. Expenses (стр. 82)

**SAP DSD:** Запись расходов на маршруте (highway tolls, gas, parking). Configurable expense types. Expenses используются при end-of-day reconciliation.

**DSD Mini:** Нет реализации расходов экспедитора.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Expense recording | ✅ Add/edit/delete expenses | ❌ Нет | **Отсутствует** |
| Expense types | ✅ Configurable | ❌ Нет | **Отсутствует** |
| Integration in settlement | ✅ Used in discrepancy calc | ❌ Нет | **Отсутствует** |

### 4.10. Reports (стр. 83)

**SAP DSD:** Presettlement report, Route Performance report, Custom reports (enhanced XML layouts), PDF generation and upload, e-mailing PDF from device.

**DSD Mini:** `AnalyticsReportsScreen` — KPI-дашборд с progress bars и top debtors. Не SAP-reports, а локальная аналитика.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Presettlement report | ✅ Payment overview | ❌ Нет | Отсутствует |
| Route performance report | ✅ Multi-metric | ⚠️ AnalyticsReportsScreen (progress) | Упрощено |
| Custom report layouts | ✅ XML export from backend | ❌ Нет | Отсутствует |
| PDF generation | ✅ Invoices, delivery notes, orders | ❌ Нет | Отсутствует |
| PDF upload to backend | ✅ Stored in SAP ERP | ❌ Нет | Отсутствует |
| Email PDF from device | ✅ Configurable | ❌ Нет | Отсутствует |
| Print reports | ✅ Mobile printer | ❌ Нет | Отсутствует |

### 4.11. End-of-Day / Check-In (стр. 69, 15)

**SAP DSD:** Material check-in (verify returns, damaged goods, empties), cash check-in, odometer, vehicle check, supervisor signatures, discrepancy reason codes.

**DSD Mini:** `CashCollectionScreen` (FUNCTIONAL) + `VehicleUnloadingScreen` (FULL) — покрывают часть End-of-Day, но как отдельные процессы.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Material check-in (returns, damaged, empties) | ✅ Single workflow | ⚠️ VehicleUnloadingScreen | Частично |
| Cash check-in | ✅ Reconciliation | ✅ CashCollectionScreen | Покрыто |
| Odometer reading | ✅ End-of-day | ❌ Нет | Отсутствует |
| Supervisor signature | ✅ Signature capture | ❌ Нет | Отсутствует |
| Discrepancy reason codes | ✅ Configurable | ❌ Нет | Отсутствует |
| Unified check-in flow | ✅ Sequential screens | ❌ Раздельные экраны | Иной подход |

---

## 5. Backend-специфичные возможности SAP DSD (отсутствуют в DSD Mini)

Эти функции описаны в разделах 6.1—6.10 PDF и полностью отсутствуют в DSD Mini, т.к. требуют enterprise backend:

| SAP DSD Feature | Раздел PDF | Статус в DSD Mini |
| --- | --- | --- |
| **Pricing Engine** (offline pricing, condition technique, manual discounts) | 6.7 | ❌ Нет — цены из локального price_lists |
| **Deal Conditions** (rebates, free goods, scales, preconditions, exclusion lists) | 6.6 | ❌ Нет |
| **Deal Conditions per Period** (accumulated drop volume) | 6.6.1 | ❌ Нет |
| **CRM Activities** (surveys, audits, photos, activity journal) | 6.4 | ❌ Нет |
| **360-Degree Activity View** | 6.4.2 | ❌ Нет |
| **Delta Tour Data** / OCS (mid-tour sync, delta download/upload) | 6.5 | ❌ Нет |
| **Generic Data Transport** (custom data download to mobile) | 6.3 | ❌ Нет |
| **Trade Assets and Notifications** (coolers, equipment) | 6.2.1 | ❌ Нет |
| **Listing and Exclusion of Materials** (per customer/sales area) | 6.8 | ❌ Нет |
| **Application Log Monitoring** (pricing errors, sync errors) | 6.9 | ⚠️ AuditLogScreen (иной смысл) |
| **Data Archiving** | 6.10 | ❌ Нет |
| **Tour Monitor** (web-app, GPS tracking, planned/actual comparison) | 3.2 | ⚠️ MonitoringMapScreen (мобильное, без web) |
| **Settlement Cockpit / Route Accounting** | Post-tour | ❌ Нет |

---

## 6. Подпись и Proof-of-Delivery

**SAP DSD:** Signature capture используется многократно:
- Check-out (supervisor)
- Order confirmation (customer + preseller — dual)
- Delivery confirmation (customer + driver — dual)
- Collection receipt (customer + driver — dual)
- Check-in (supervisor)

Подпись — графическая, с возможностью стирания (X icon), с контролем размера.

**DSD Mini:** `SignatureScreen` — ввод ФИО получателя текстом, зона подписи помечена как `/* Зона подписи (заглушка) */`. Нет графической подписи, нет dual signature, нет подписи при check-out/check-in.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Графическая подпись | ✅ Canvas capture | ❌ Текстовое ФИО | **Существенный разрыв** |
| Dual signature (customer + driver) | ✅ На каждом подтверждении | ❌ Нет | **Существенный разрыв** |
| Signature on check-out | ✅ Supervisor signs | ❌ Нет | Отсутствует |
| Signature on check-in | ✅ Supervisor signs | ❌ Нет | Отсутствует |
| Erase and redo | ✅ X icon | ❌ N/A | Отсутствует |

---

## 7. Печать и документы

**SAP DSD:** Mobile printing: invoices, delivery notes, orders, collection receipts, reports. Custom report layouts. PDF generation and e-mail.

**DSD Mini:** В `package.json` нет библиотек для печати. Нет генерации PDF. Нет формирования invoice / delivery note / receipt.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Print invoice | ✅ | ❌ | **Отсутствует** |
| Print delivery note | ✅ | ❌ | **Отсутствует** |
| Print receipt | ✅ | ❌ | **Отсутствует** |
| PDF generation | ✅ | ❌ | **Отсутствует** |
| Custom report layouts | ✅ XML-based | ❌ | **Отсутствует** |
| Email documents | ✅ | ❌ | **Отсутствует** |

---

## 8. Empties / Тара

**SAP DSD:** Empties (возвратная тара) — сквозная функция: tied empties привязаны к товарам, отображаются в Material master (tab TIED EMPTIES), учитываются в inventory (tab EMPTIES), могут добавляться к deliveries и orders (Add non-tied empties), reconciliation при check-in.

**DSD Mini:** `PackagingReturnsScreen` — отдельный экран с 4 типами тары (plastic box, wooden pallet, cardboard, bottles), expected vs actual qty, состояние (good/damaged/missing). Не интегрирован с товарами и deliveries.

| Аспект | SAP DSD | DSD Mini | Дельта |
| --- | --- | --- | --- |
| Tied empties per material | ✅ In material master | ❌ Нет привязки к товарам | Отсутствует |
| Empties in inventory | ✅ Dedicated tab | ❌ Отдельный экран | Иной подход |
| Add empties to delivery | ✅ Inline | ❌ Нет | Отсутствует |
| Packaging types | 4+ configurable | 4 hardcoded | Частично |
| Condition tracking | ✅ | ✅ good/damaged/missing | Покрыто |

---

## 9. Сводная таблица покрытия

| Функция SAP DSD for Android | DSD Mini Frontend | Уровень покрытия |
| --- | --- | --- |
| **Synchronize** (download/upload) | Нет (mock data) | ❌ 0% |
| **Tour** — Start-of-Day, Check-Out | LoadingTripScreen (частично) | ⚠️ 25% |
| **Tour** — Tour Progress dashboard | ExpeditorHomeScreen | ⚠️ 30% |
| **Tour** — End-of-Day, Check-In | CashCollection + VehicleUnloading | ⚠️ 40% |
| **Visit List** — customer list, activities | RouteListScreen + VisitScreen | ⚠️ 50% |
| **Visit List** — add visit / one-time customer | Нет | ❌ 0% |
| **Visit List** — map view | RouteMapScreen | ✅ 80% |
| **Preseller** — Take order, confirm, sign | OrderEditScreen (без sign/deal) | ⚠️ 30% |
| **Delivery** — deliver presold | ShipmentScreen | ✅ 70% |
| **Delivery** — invoice + pricing | Нет | ❌ 0% |
| **Delivery** — confirmation (dual signature) | SignatureScreen (name only) | ⚠️ 20% |
| **Collection** — open items, payment, receipt | PaymentScreen | ⚠️ 50% |
| **Returns** | ReturnsScreen + ReturnApprovalScreen | ⚠️ 60% |
| **Customers** master data | В составе VisitScreen | ⚠️ 20% |
| **Materials** master data | В составе Warehouse/Shipment | ⚠️ 25% |
| **Inventory** — adjust, capture on hand | InventoryCheckScreen | ⚠️ 35% |
| **Expenses** | Нет | ❌ 0% |
| **Reports** | AnalyticsReportsScreen (KPI) | ⚠️ 15% |
| **Pricing Engine** (offline pricing) | Нет | ❌ 0% |
| **Deal Conditions** | Нет | ❌ 0% |
| **CRM Activities** (surveys, photos) | Нет | ❌ 0% |
| **Printing** (invoice, receipt, delivery note) | Нет | ❌ 0% |
| **PDF generation / email** | Нет | ❌ 0% |
| **Tour Monitor** (web-app) | MonitoringMapScreen (mobile) | ⚠️ 40% |
| **Empties management** | PackagingReturnsScreen | ⚠️ 30% |
| **Barcode scanning** | LoadingTripScreen (real camera) | ⚠️ 50% |
| **GPS tracking** | MonitoringMapScreen (positions) | ⚠️ 40% |
| **OCS / Delta data** | Нет | ❌ 0% |

---

## 10. Что DSD Mini реализует сверх SAP DSD for Android

Некоторые аспекты DSD Mini не имеют прямого аналога в описании SAP DSD for Android:

| Функция DSD Mini | Описание | Аналог в SAP DSD |
| --- | --- | --- |
| **Роль «Администратор»** с мобильным UI | Управление пользователями, устройствами, настройками на телефоне | SAP DSD: backend-only (SAP ERP) |
| **SyncMonitoringScreen** | Мониторинг синхронизации устройств на мобильном | SAP DSD: backend monitoring |
| **ConflictResolutionScreen** | Side-by-side конфликт resolution на мобильном | SAP DSD: backend-driven |
| **AuditLogScreen** | Журнал аудита на мобильном | SAP DSD: Application Log Monitor (backend) |
| **QR-оплата** | PaymentScreen поддерживает QR | SAP DSD: cash/check/credit card |
| **Yandex Maps** | Навигация через Yandex Maps deep linking | SAP DSD: generic GPS/maps |
| **SystemSettingsScreen** | Настройки на мобильном (auto-sync, limits, DB reset) | SAP DSD: backend Customizing |

---

## 11. Оценка глубины frontend-реализации по экранам

| Экран | Строк кода | Оценка | Комментарий |
| --- | --- | --- | --- |
| ShipmentScreen | ~400 | **FULL** | Сложное управление qty, stock validation, модальный picker |
| PaymentScreen | ~200 | **FULL** | 4 типа оплат, калькулятор сдачи, debt integration |
| LoadingTripScreen | ~350 | **FULL** | Real barcode camera, trip verification, alerts |
| VehicleUnloadingScreen | ~300 | **FULL** | Dual sections, stock transfer, multi-step confirm |
| MonitoringMapScreen | ~350 | **FULL** | Multi-route map, color-coded, selection filtering |
| RouteListScreen | ~250 | FUNCTIONAL | State management, progress bar, DB integration |
| VisitScreen | ~300 | FUNCTIONAL | State machine, conditional actions, customer data |
| ReturnsScreen | ~250 | FUNCTIONAL | Reason chips, product picker, qty controls |
| ReturnApprovalScreen | ~200 | FUNCTIONAL | Expandable cards, lazy-load, approve/reject |
| OrderEditScreen | 516 | FUNCTIONAL | Client/product picker, qty, discount, comments |
| OrdersScreen | 279 | FUNCTIONAL | Order list, status filters, delete |
| AnalyticsReportsScreen | ~250 | FUNCTIONAL | KPI cards, progress bars, top debtors |
| CashCollectionScreen | ~200 | FUNCTIONAL | Expected vs actual, discrepancy calc |
| InventoryCheckScreen | ~150 | FUNCTIONAL | Stock reconciliation, discrepancy detection |
| SignatureScreen | ~150 | FUNCTIONAL | Name input, delivery creation (signature = заглушка) |
| ScanningScreen | ~100 | **SHELL** | Camera placeholder, manual barcode only |

---

## 12. Главные выводы

### Что реализовано хорошо (frontend-уровень close to SAP DSD):
1. **Delivery workflow** (ShipmentScreen) — сопоставим с SAP Deliver Presold
2. **Payment collection** (PaymentScreen) — покрывает основной сценарий
3. **Vehicle loading with barcode scanning** (LoadingTripScreen) — production-quality
4. **Vehicle unloading** (VehicleUnloadingScreen) — полноценный end-of-day flow
5. **Supervisor map monitoring** (MonitoringMapScreen) — хорошая визуализация
6. **Returns workflow** (ReturnsScreen + ReturnApprovalScreen) — двухстадийный процесс

### Критические функциональные разрывы по сравнению с SAP DSD:
1. **Нет синхронизации** — ни download tour data, ни upload results
2. **Нет Pricing Engine** — нет расчёта invoice, taxes, discounts, conditions
3. **Нет Invoice / Receipt / Delivery Note** — нет формирования документов
4. **Нет печати** — ни одной библиотеки printing
5. **Нет графической подписи** — только текстовое ФИО
6. **Нет Preseller role** — нет предзаказного сценария
7. **Нет CRM Activities** — нет surveys, audits, photo capture
8. **Нет Deal Conditions** — нет rebates, free goods, scales
9. **Нет Expenses** — нет учёта расходов на маршруте
10. **Нет Start-of-Day / End-of-Day** как единого flow (vehicle check, odometer, cash, signatures)

### Общая оценка frontend-покрытия: **~30-35% от SAP DSD for Android**

Приложение покрывает **ядро delivery workflow** на хорошем уровне, но не реализует примерно ⅔ функций SAP DSD — прежде всего тех, которые связаны с enterprise-процессами (pricing, invoicing, deal conditions, CRM, settlement) и production operations (printing, signatures, synchronization, OCS).

---

## Файлы, на которых основан анализ

### Исходный код:
- `src/screens/expeditor/*` (13 экранов)
- `src/screens/supervisor/*` (4 экрана)
- `src/screens/admin/*` (7 экранов)
- `src/screens/home/*` (3 экрана)
- `src/screens/orders/*` (2 экрана)
- `src/screens/auth/LoginScreen.js`
- `src/screens/warehouse/WarehouseScreen.js`
- `src/screens/delivery/DeliveryScreen.js`
- `src/screens/finance/FinanceScreen.js`
- `src/navigation/*` (13 файлов навигации)
- `src/database/schema.js`, `src/database/index.js`, `src/database/seed.js`
- `src/services/authService.js`, `src/store/authStore.js`

### Документация SAP:
- `sap_dsd_1.0_application_help_en.pdf` — разделы 2, 3, 4, 5.3, 6.1–6.10
