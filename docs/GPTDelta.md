# GPT Delta: текущий front end DSD Mini vs SAP Direct Store Delivery for Android

## 1. Контекст и источники

Этот документ сравнивает **текущую frontend-реализацию** приложения в репозитории с функционалом **SAP Direct Store Delivery for Android**, описанным в `sap_dsd_1.0_application_help_en.pdf`.

В анализе использованы:

- исходный код экранов и навигации (`src/screens/**`, `src/navigation/**`);
- локальная схема данных (`src/database/schema.js`);
- извлеченный текст PDF: `/tmp/sap_dsd_android.txt`.

Ключевые разделы PDF, на которые опирается сравнение:

- `5.3.2 Synchronize`
- `5.3.3 Tour`
- `5.3.4 Visit List`
- `5.3.5 Customers`
- `5.3.6 Materials`
- `5.3.7 Inventory`
- `5.3.8 Expenses`
- `5.3.9 Reports`
- раздел ролей: `Preseller`, `Delivery Driver`, `Van Seller`, `Mixed Role`

---

## 2. Краткий вывод

С точки зрения front end текущее приложение уже покрывает **ядро полевого delivery-сценария**:

- маршрут и точки;
- старт и завершение визита;
- отгрузка;
- оплата;
- возвраты;
- возврат тары;
- ревизия остатков;
- мониторинг на карте;
- базовая аналитика супервайзера.

Но относительно SAP DSD for Android в приложении отсутствует значительная часть **enterprise и process-driven UX**:

- двусторонняя синхронизация с back end;
- полноценный Tour dashboard со start-of-day / end-of-day цепочкой;
- rich customer/material master screens;
- expenses;
- mobile reports SAP-класса;
- графическая подпись;
- invoice / receipt / delivery note;
- deal conditions и pricing engine;
- CRM activities;
- one-time customer, add visit, reason codes, item proposal, tied empties.

Итог: по frontend-покрытию приложение выглядит как **сильный offline-first MVP для delivery driver / expeditor**, но не как полный аналог SAP DSD for Android.

---

## 3. Что именно есть в текущем front end

### 3.1. Роли

По коду (`src/navigation/RoleNavigator.js`, `src/services/authService.js`) доступны только 3 роли:

- `expeditor`
- `supervisor`
- `admin`

Причем авторизация построена на `MOCK_USERS`, а не на backend users.

### 3.2. Основные пользовательские потоки

Подтвержденные экраны и сценарии:

- `RouteListScreen.js` — маршрутный лист со статусами точек и прогрессом;
- `VisitScreen.js` — старт/завершение визита и выбор действий;
- `ShipmentScreen.js` — отгрузка по заказам, частичная отгрузка, добор из остатков машины;
- `SignatureScreen.js` — подтверждение получения, но подпись реализована как заглушка;
- `PaymentScreen.js` — прием оплаты наличными, картой, QR и переводом;
- `CashCollectionScreen.js` — сверка и оформление инкассации;
- `LoadingTripScreen.js` — загрузка рейса с реальным barcode scanning через `expo-camera`;
- `InventoryCheckScreen.js` — ревизия остатков;
- `PackagingReturnsScreen.js` — возврат тары;
- `MonitoringMapScreen.js` — мониторинг маршрутов экспедиторов на карте;
- `AnalyticsReportsScreen.js` — KPI и рейтинг дебиторов для супервайзера;
- `OrderEditScreen.js` — создание/редактирование заказа.

### 3.3. Архитектурная модель front end

По коду видно, что приложение построено как **offline-first local app**:

- данные хранятся в SQLite;
- запросы идут через локальный database-layer;
- реальные API-вызовы не обнаружены;
- есть следы задела под sync (`sync_log`, `sync_meta`), но не сам механизм обмена.

---

## 4. Сопоставление по меню SAP Android

Ниже сравнение выстроено по логике SAP Android navigation drawer.

### 4.1. Synchronize

### Что говорит SAP

В PDF (`5.3.2`) указано, что `Synchronize`:

- синхронизирует данные между mobile front end и back end systems;
- используется **до** и **после** тура;
- поддерживает повторные синки в течение дня;
- участвует в Occasionally Connected Scenario.

### Что есть в DSD Mini

Во front end нет пользовательского сценария реальной синхронизации:

- не найдено HTTP/API-клиентов;
- нет потока download/upload tour data;
- нет очередей, retry, delta sync;
- админские экраны sync monitoring существуют, но без рабочего обмена.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Download tour data | Нет | ❌ |
| Upload results | Нет | ❌ |
| Mid-tour sync / delta sync | Нет | ❌ |
| Sync settings / monitoring | Частично, через admin UI | ⚠️ |

**Вывод:** это один из самых больших разрывов. По front end приложение пока не моделирует основной пользовательский опыт SAP Synchronize.

---

### 4.2. Tour

### Что говорит SAP

В PDF (`5.3.3`) Tour используется:

- до тура;
- во время тура;
- в конце тура;
- как экран прогресса;
- как точка входа в `check-out` и `check-in`.

На Tour screen SAP показывает:

- tour progress;
- open items;
- tour overview;
- tour memo;
- sales volume;
- стартовую и финальную последовательность действий;
- поддержку multi-day tours.

### Что есть в DSD Mini

Похожий функционал размазан по нескольким экранам:

- `RouteListScreen.js` — запуск и завершение маршрута;
- `VisitScreen.js` — старт/завершение визита;
- `LoadingTripScreen.js` — проверка загрузки;
- `CashCollectionScreen.js` — сдача наличности;
- `VehicleUnloadingScreen.js` (ранее проанализирован) — выгрузка;
- home/dashboard-экраны — общие показатели, но не tour dashboard уровня SAP.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Tour progress dashboard | Есть частично в разных местах | ⚠️ |
| Check-out flow | Нет единой цепочки | ❌ |
| Vehicle safety checks | Нет | ❌ |
| Odometer capture | Нет | ❌ |
| Open items chart | Нет | ❌ |
| Tour memo | Нет | ❌ |
| Sales volume target/current | Нет | ❌ |
| Check-in flow | Частично через cash collection + unloading | ⚠️ |
| Multiday tours | Нет | ❌ |

**Вывод:** в приложении есть operational route flow, но нет отдельного SAP-style Tour experience.

---

### 4.3. Visit List

### Что говорит SAP

В PDF (`5.3.4`) Visit List поддерживает:

- free text search;
- просмотр карты;
- add visit;
- one time customer;
- cancel visit с reason code;
- customer activities и attachments;
- delivery / order / collection / invoice / free goods / capture on hand / item proposal / CRM activity.

### Что есть в DSD Mini

`RouteListScreen.js` и `VisitScreen.js` дают:

- список точек;
- статусы (`pending`, `arrived`, `in_progress`, `completed`, `skipped`);
- переход в карту;
- карточку клиента;
- действия: `Отгрузка`, `Возвраты`, `Возврат тары`, `Оплата`;
- старт и завершение визита.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Visit statuses | Есть | ✅ |
| Map of visits | Есть | ✅ |
| Free text search in visit list | Нет | ❌ |
| Add visit | Нет | ❌ |
| One time customer | Нет | ❌ |
| Cancel with reason code | Нет reason codes | ⚠️ |
| Activities tab | Есть упрощенно как fixed action grid | ⚠️ |
| Attachments tab | Нет | ❌ |
| CRM activity | Нет | ❌ |
| Item proposal | Нет | ❌ |
| Capture on hand inventory from visit | Нет | ❌ |
| Invoice activity | Нет | ❌ |

**Вывод:** visit hub реализован, но заметно проще SAP и ориентирован на фиксированный delivery flow.

---

### 4.4. Customers

### Что говорит SAP

В PDF (`5.3.5`) Customers дает offline/online customer master с табами:

- `GENERAL INFO`
- `SALES AREA INFORMATION`
- `CREDIT INFORMATION`
- `OPEN ITEMS`
- `MESSAGES`
- `LISTED ITEMS`
- `EXCLUDED ITEMS`
- при CRM-интеграции: `CRM ACTIVITIES`, `CRM MARKETING ATTRIBUTES`

Также есть full text search и multiple sales areas.

### Что есть в DSD Mini

Отдельного customer master screen нет. Клиент показан внутри визита и заказа:

- имя;
- адрес;
- телефон;
- контакт;
- сумма долга.

В схеме (`schema.js`) есть `credit_limit` и `debt_amount`, но полноценного customer credit UI нет.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Dedicated customer master screen | Нет | ❌ |
| General info | Есть частично | ⚠️ |
| Sales area info | Нет | ❌ |
| Credit info with available credit | Нет | ❌ |
| Open items by document | Нет | ❌ |
| Customer messages | Нет | ❌ |
| Listed / excluded items | Нет | ❌ |
| CRM activities | Нет | ❌ |
| Customer search | Есть только косвенно в order picker | ⚠️ |
| Multiple sales areas | Нет | ❌ |

**Вывод:** customer UX в текущем приложении служебный, а не мастер-данные уровня SAP.

---

### 4.5. Materials

### Что говорит SAP

В PDF (`5.3.6`) Materials включает:

- отдельный список материалов;
- `GENERAL INFO`;
- `SALES AREA INFORMATION`;
- `UNITS OF MEASURE`;
- `TIED EMPTIES`;
- full text search;
- product hierarchy filter;
- add material;
- quantity changes с reason code;
- item proposal;
- контроль превышения truck stock.

### Что есть в DSD Mini

Материалы показываются внутри операционных сценариев:

- `OrderEditScreen.js` — выбор товара и количества;
- `ShipmentScreen.js` — изменение отгружаемых количеств;
- `InventoryCheckScreen.js` — остатки;
- `WarehouseScreen.js` — сток машины/склада.

Есть поиск товара и контроль превышения остатков машины. Это один из сильных блоков front end.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Dedicated materials screen | Нет | ❌ |
| Search materials | Есть в order/inventory flows | ✅ |
| Product hierarchy filter | Нет | ❌ |
| Multiple sales areas | Нет | ❌ |
| Units of measure tabs | Нет | ❌ |
| Tied empties | Нет | ❌ |
| Add material in operational flow | Есть | ✅ |
| Stock overrun validation | Есть | ✅ |
| Item proposal | Нет | ❌ |
| Reason code on qty changes | Нет | ❌ |

**Вывод:** operational material handling реализован хорошо, material master UX — нет.

---

### 4.6. Inventory

### Что говорит SAP

В PDF (`5.3.7`) Inventory показывает:

- `MATERIALS` и `EMPTIES`;
- актуальные количества на машине;
- `Adjust Inventory` с авторизацией и reason codes;
- `Capture on Hand Inventory`.

### Что есть в DSD Mini

Есть несколько связанных экранов:

- `InventoryCheckScreen.js` — ревизия остатков;
- `PackagingReturnsScreen.js` — отдельный возврат тары;
- `LoadingTripScreen.js` — подтверждение загрузки;
- `VehicleUnloadingScreen.js` — разгрузка;
- `ShipmentScreen.js` — уменьшение стока при доставке.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Materials inventory | Есть | ✅ |
| Empties tab | Нет единого inventory-tab UX | ⚠️ |
| Adjust inventory with auth | Нет | ❌ |
| Reason codes for discrepancies | Нет | ❌ |
| Capture on hand inventory | Нет | ❌ |
| Inventory integrated with visit activities | Частично | ⚠️ |

**Вывод:** учет остатков покрыт функционально, но не в SAP-структуре и без контрольных механизмов SAP-класса.

---

### 4.7. Expenses

### Что говорит SAP

В PDF (`5.3.8`) Expenses позволяют:

- добавлять расходы;
- выбирать тип расхода;
- редактировать и удалять;
- включать расходы в tour processing.

Примеры: tolls, gas, parking.

### Что есть в DSD Mini

Отдельного front end для расходов нет.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Expense list | Нет | ❌ |
| Add/edit/delete expense | Нет | ❌ |
| Expense types | Нет | ❌ |
| Expense impact on settlement | Нет | ❌ |

**Вывод:** блок Expenses отсутствует полностью.

---

### 4.8. Reports

### Что говорит SAP

В PDF (`5.3.9`) Reports дают:

- Presettlement report;
- Route Performance report;
- custom reports;
- report layouts для invoicing / delivery / collection.

### Что есть в DSD Mini

`AnalyticsReportsScreen.js` дает:

- KPI;
- прогресс экспедиторов;
- топ дебиторов;
- выбор периода (`day/week/month`), но сам период пока не влияет на загрузку данных.

### Дельта

| SAP Android | Текущая реализация | Оценка |
| --- | --- | --- |
| Presettlement report | Нет | ❌ |
| Route performance report | Есть в упрощенном виде | ⚠️ |
| Custom reports | Нет | ❌ |
| Legal/report layouts for documents | Нет | ❌ |
| Tour-based operational reporting | Частично | ⚠️ |

**Вывод:** вместо SAP reports реализована локальная supervisor analytics.

---

## 5. Сценарии ролей: где совпадает, где нет

### SAP роли из PDF

- `Preseller`
- `Delivery Driver`
- `Van Seller`
- `Mixed Role`

### Текущая модель

`expeditor` покрывает только часть сценариев:

- близок к `Delivery Driver`;
- частично напоминает `Van Seller`, потому что умеет работать с остатками машины;
- не покрывает полноценный `Preseller`;
- не покрывает полный `Mixed Role`.

### Разрывы по ролям

| SAP role | DSD Mini | Комментарий |
| --- | --- | --- |
| Preseller | Нет | Нет отдельной роли и процесса presales |
| Delivery Driver | Частично есть | Это главный покрытый сценарий |
| Van Seller | Частично есть | Нет полного direct-off-truck sales UX |
| Mixed Role | Нет полноценно | Нет presales + merchandising + mixed activities |

---

## 6. Сквозные gaps, не привязанные к одному меню

### 6.1. Подпись

`SignatureScreen.js` прямо содержит заглушку:

- `Зона для рукописной подписи`
- `(MVP — подтверждение по ФИО)`

То есть вместо SAP-style signature capture сейчас реализован только ввод имени получателя.

**Дельта:** нет графической подписи, нет dual signature, нет printable proof.

### 6.2. Документы и печать

В `package.json` не найдены признаки библиотек для:

- печати;
- генерации PDF;
- Bluetooth-принтера;
- invoice / receipt rendering.

**Дельта:** SAP предусматривает invoices, collection docs и custom report layouts, а текущий front end — нет.

### 6.3. Pricing / deals

В схеме есть `price_lists`, но в UI нет:

- pricing engine;
- deal conditions;
- listing / exclusion;
- free goods;
- advanced promo mechanics.

### 6.4. CRM / merchandising

В текущем front end не обнаружены:

- survey;
- audit;
- activity journal;
- photo capture как бизнес-функция;
- shelf / POS / merchandising сценарии.

### 6.5. One-time customer и расширенные visit operations

В SAP это есть прямо в Visit List, а в текущем приложении нет:

- one-time customer;
- add visit;
- cancel with configurable reason codes;
- attachments;
- configurable per-role activity menu.

---

## 7. Сильные стороны текущего front end

Несмотря на дельту, у приложения есть сильные frontend-блоки:

1. `LoadingTripScreen.js`
   Реальный camera scanning, контроль количества, понятный UX проверки загрузки.

2. `ShipmentScreen.js`
   Хорошая работа с количествами, частичной отгрузкой и остатками машины.

3. `PaymentScreen.js`
   Понятный и завершенный UX оплаты, включая сдачу и несколько методов оплаты.

4. `MonitoringMapScreen.js`
   Сильная карта и supervisor view с маршрутом, процентом выполнения и фокусом по экспедитору.

5. `Inventory + unloading + cash collection`
   В приложении уже есть практический operational contour end-of-day, пусть и не оформленный как SAP Tour.

---

## 8. Итоговая оценка покрытия

### Хорошо покрыто

- delivery execution;
- basic route execution;
- stock handling on vehicle;
- payment acceptance;
- returns / packaging returns;
- supervisor monitoring;
- offline local UX.

### Покрыто частично

- order taking;
- inventory control;
- route analytics;
- start/end of day;
- mixed-role behavior;
- sync administration UI.

### Не покрыто

- synchronize как рабочий процесс;
- SAP-style Tour;
- expenses;
- customer/material master data;
- reports SAP-класса;
- CRM activities;
- pricing / deal conditions;
- invoice / receipt / print;
- one-time customer;
- reason codes;
- multiday tours.

---

## 9. Финальный вывод

Если сравнивать именно **front end experience**, то DSD Mini сегодня ближе не к полному SAP Direct Store Delivery for Android, а к:

- мобильному приложению экспедитора для офлайн-доставки;
- пилотному решению для локального DSD-процесса;
- MVP с хорошими operational screens.

Главная разница в том, что SAP DSD Android строится вокруг **процессов тура, синхронизации, master data, документов и enterprise-ограничений**, а текущий front end — вокруг **локального выполнения доставки и связанных с ней операций**.

То есть:

**DSD Mini хорошо реализует delivery-centric front end, но пока не реализует SAP-grade DSD platform front end.**
