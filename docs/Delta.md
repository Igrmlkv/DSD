# Delta: текущее приложение vs SAP DSD Mobile

## Краткий вывод

Текущее приложение в репозитории — это **офлайн-first MVP/демо DSD-системы** на React Native с локальной SQLite-базой, ролями `expeditor / supervisor / admin`, маршрутами, доставкой, возвратами, оплатами, складскими операциями и картой.

По сравнению с **SAP DSD Mobile** приложение покрывает **часть полевого операционного контура**, но заметно уступает в **enterprise-функциональности**: нет реальной интеграции с ERP, нет полноценной синхронизации, нет печати, нет настоящей ЭП/PoD, нет мерчандайзинга, нет rule-based pricing/promotions, нет production-grade device/admin/security tooling.

## Что реально реализовано в коде

Анализ делался по фактическому коду, а не только по названиям экранов.

Подтверждённые возможности:

- Авторизация и хранение сессии, но на **mock-аккаунтах**: `src/services/authService.js`, `src/store/authStore.js`
- Ролевая навигация для экспедитора, супервайзера и администратора: `src/navigation/RoleNavigator.js`
- Локальная офлайн-база SQLite со схемой для маршрутов, заказов, доставок, возвратов, оплат, загрузки рейса, инкассации, уведомлений, устройств, аудита и sync-логов: `src/database/schema.js`
- Маршруты и точки маршрута, статусы визитов, карта маршрута: `src/screens/expeditor/RouteListScreen.js`, `RouteMapScreen.js`
- Загрузка рейса и сканирование штрихкодов через камеру в этом конкретном процессе: `src/screens/expeditor/LoadingTripScreen.js`
- Отгрузка, частичная доставка, изменение количества, работа с остатками: `src/screens/expeditor/ShipmentScreen.js`
- Возвраты товара и согласование возвратов супервайзером: `src/screens/expeditor/ReturnsScreen.js`, `src/screens/supervisor/ReturnApprovalScreen.js`
- Приём оплаты и инкассация: `src/screens/expeditor/PaymentScreen.js`, `CashCollectionScreen.js`
- Мониторинг маршрутов на карте для супервайзера: `src/screens/supervisor/MonitoringMapScreen.js`
- Админские экраны по пользователям, устройствам, sync monitoring, audit log: `src/screens/admin/*`

## Что SAP DSD Mobile обычно покрывает

По открытым материалам SAP и партнёрским обзорам SAP DSD Mobile / SAP Direct Store Delivery обычно включает:

- исполнение маршрута и визитов;
- van sales / direct delivery;
- оформление delivery/returns;
- onboard inventory и truck stock;
- cash collection и settlement;
- офлайн-работу с последующей синхронизацией;
- device integrations: barcode/RFID, GPS, камера, печать;
- supervisor monitoring;
- enterprise-интеграцию с SAP ERP / S/4HANA;
- merchandising / surveys / store execution в расширенных сценариях.

Опорные источники:

- SAP Help Portal: `https://help.sap.com/docs/SAP_DIRECT_STORE_DELIVERY/027f4475a1494bd1bd81bd129cd59d21/fa624f95203b4bfab6c0271484111910.html`
- SAP Feature Scope PDF: `https://help.sap.com/doc/fb8c9956bd704afe9dd92a0bd96c1d42/1.0.4.0/en-US/sap_dsd_10_for_S4HANA_feature_scope_description.pdf`

## Дельта по функциональным блокам

| Функциональный блок | Текущее приложение | SAP DSD Mobile | Дельта |
| --- | --- | --- | --- |
| Аутентификация и пользователи | Mock-логин на зашитых аккаунтах, secure storage локально | Корпоративная аутентификация, реальные пользователи и роли из backend/ERP landscape | **Большой разрыв** |
| Роли и доступ | 3 роли реализованы, навигация разделена | Обычно роли глубже и привязаны к процессам/организационной структуре | **Частично покрыто** |
| Маршруты и визиты | Есть маршрутный лист, карта, статусы точек | Полноценное route execution с enterprise orchestration | **Частично покрыто** |
| Доставка / van sales | Есть отгрузка, частичная доставка, работа с заказом | Полный van sales/direct delivery контур с документами и ERP-проводками | **Частично покрыто** |
| Подтверждение доставки | Есть ввод ФИО получателя и флаг signature | Обычно полноценная electronic proof of delivery / signature capture | **Существенный разрыв** |
| Штрихкодирование | Камера работает в загрузке рейса, отдельный scanning screen пока заглушка | Полноценное device scanning across flows, нередко RFID | **Частично покрыто** |
| Остатки и склад на борту | Есть vehicle stock, loading trip, inventory check, unloading | Обычно глубже: перемещения, корректировки, settlement, ERP reconciliation | **Частично покрыто** |
| Возвраты товара | Создание возврата и approval супервайзером есть | Полный enterprise returns flow с проводками, статусами, интеграцией | **Частично покрыто** |
| Возвратная тара | Есть schema и UI, но функционал выглядит незавершённым | Обычно полноценный учёт оборотной тары | **Частично / слабо покрыто** |
| Оплаты | Есть локальная регистрация cash/card/qr/transfer и инкассация | Реальный settlement, закрытие смены/рейса, интеграция с финансами | **Частично покрыто** |
| Печать документов | Не реализована | Обычно есть mobile printing invoices/receipts/documents | **Отсутствует** |
| Фото / камера для доказательств | Не реализовано как бизнес-функция | Часто используется для store execution / delivery evidence | **Отсутствует** |
| Merchandising / surveys / promo execution | Нет подтверждённой реализации | Часто входит в DSD/store execution landscape | **Отсутствует** |
| Pricing / promotions / trade terms | Есть локальные price lists, но нет rule engine/promotions | В SAP-сценариях pricing/promotions обычно enterprise-driven | **Сильный разрыв** |
| Офлайн-работа | Сильная локальная офлайн-модель на SQLite | Офлайн + корпоративная синхронизация/репликация | **Частично покрыто** |
| Синхронизация | Есть `sync_log`, `sync_meta`, monitoring UI, но нет реального обмена | Production-grade sync с ERP/S/4HANA | **Критический разрыв** |
| Интеграция с ERP | Не найдена | Ключевая часть SAP DSD Mobile | **Критический разрыв** |
| Мониторинг супервайзера | Карта и прогресс есть | Обычно глубже: exceptions, compliance, KPIs, real-time process control | **Частично покрыто** |
| Администрирование устройств | Есть экраны и локальная модель устройств | Обычно есть централизованное device/user management и policies | **Частично покрыто** |
| Аудит и контроль | Есть audit log schema/UI | В enterprise-среде обычно глубже и связан с интеграцией/безопасностью | **Частично покрыто** |

## Главные функциональные разрывы

### 1. Нет ключевой enterprise-интеграции

Это самый большой gap. В коде не найден реальный обмен с ERP/SAP/1С/backend API. Приложение хранит данные локально и работает как автономная демо-система. Для уровня SAP DSD Mobile это критично, потому что ценность решения строится на сквозном процессе:

- master data из ERP;
- маршруты и документы из backend;
- загрузка/выгрузка транзакций;
- статусы доставки, оплаты, возвратов и инкассации в корпоративном контуре.

### 2. PoD и юридически значимое подтверждение доставки реализованы упрощённо

`SignatureScreen.js` фиксирует имя получателя, но не даёт полноценную подпись на экране, графический след подписи, PDF/printable proof, криптографию или полноценный delivery proof.

Для сравнения, в SAP DSD Mobile это обычно часть production-grade delivery confirmation процесса.

### 3. Нет печати мобильных документов

В приложении не видно поддержки Bluetooth/portable printers и формирования печатных документов на месте:

- накладная;
- чек/квитанция;
- акт возврата;
- подтверждение доставки.

Для DSD-сценария это заметный функциональный пробел.

### 4. Синхронизация подготовлена только на уровне задела

В схеме есть `sync_log`, `sync_meta`, а у администратора — экраны мониторинга и конфликтов. Но не видно:

- очередей реальной отправки;
- retry/backoff;
- download/upload сценариев;
- версионирования данных;
- реального conflict resolution;
- API-клиента.

То есть sync-подсистема в текущем состоянии скорее **архитектурный каркас**, а не рабочая интеграционная функция.

### 5. Не хватает продвинутых полевых сценариев SAP-класса

Отсутствуют или не подтверждены кодом:

- merchandising;
- retail execution / shelf checks;
- фотофиксация;
- опросы и анкеты;
- promo compliance;
- геофенсинг и автоматическая фиксация визита;
- расширенные pricing/promotions/business rules;
- полноценное settlement/end-of-day закрытие.

## Где приложение уже близко к SAP DSD Mobile

Несмотря на разрыв, есть блоки, где приложение уже выглядит как хорошая основа:

- правильная ролевая модель для DSD-процессов;
- богатая локальная схема данных;
- офлайн-first подход;
- маршруты, точки, карты и статусы;
- onboard stock / loading / shipment;
- возвраты и approval;
- оплата и инкассация;
- supervisor monitoring;
- admin/device/audit surfaces.

То есть **операционный каркас DSD-приложения уже есть**, но пока без того enterprise-слоя, который делает решение сопоставимым с SAP DSD Mobile.

## Итоговая оценка

Если сравнивать по уровням зрелости, то текущее приложение ближе к:

- **MVP / прототипу для пилота** — по полевым операциям;
- **демо-решению** — по интеграции и администрированию;
- **не production enterprise DSD-платформе** — по полноте процессов SAP-класса.

### Кратко в одной фразе

Текущее приложение покрывает **ядро локальных DSD-операций экспедитора**, но до уровня **SAP DSD Mobile** ему в первую очередь не хватает **ERP-интеграции, полноценной синхронизации, печати, настоящего proof-of-delivery, расширенных торговых/мерчандайзинговых сценариев и production-grade enterprise capabilities**.

## Файлы, на которых основан вывод

- `src/services/authService.js`
- `src/store/authStore.js`
- `src/navigation/RoleNavigator.js`
- `src/database/schema.js`
- `src/database/index.js`
- `src/screens/expeditor/LoadingTripScreen.js`
- `src/screens/expeditor/ShipmentScreen.js`
- `src/screens/expeditor/ReturnsScreen.js`
- `src/screens/expeditor/PaymentScreen.js`
- `src/screens/expeditor/CashCollectionScreen.js`
- `src/screens/expeditor/SignatureScreen.js`
- `src/screens/supervisor/MonitoringMapScreen.js`
- `src/screens/supervisor/ReturnApprovalScreen.js`
- `src/screens/admin/SyncMonitoringScreen.js`
- `src/screens/admin/ConflictResolutionScreen.js`
