# Техническая спецификация: модуль «Merchandising Audit» для DSD Mini

| Поле | Значение |
| --- | --- |
| Документ | Техническая спецификация подключаемого модуля |
| Продукт | DSD Mini (React Native / Expo SDK 55) |
| Модуль | `merchandising` (Merch Audit) |
| Версия документа | 1.0 (draft) |
| Дата | 2026-04-26 |
| Заказчик | _____________________________ |
| Исполнитель | _____________________________ |
| Связанные документы | `TZ_photo_kpi_recognition.docx`, `KPI_merchandising_audit.xlsx`, `CLAUDE.md` |
| Статус | Draft для согласования |

---

## 1. Назначение и область применения

Модуль `merchandising` добавляет в существующее приложение **DSD Mini** функциональность аудита торговой точки силами мерчендайзера. Он реализуется как **подключаемый feature-модуль** (включается флагом `settingsStore.merchandisingEnabled`) и расширяет роль **`preseller`** дополнительным табом «Аудит ТТ».

Модуль ведёт жизнь по трём последовательным версиям, каждая из которых **обратно совместима** на уровне API и БД:

| Версия | Источник данных KPI | ML на устройстве | ML на сервере |
| --- | --- | --- | --- |
| **v1** | Опрос мерчендайзера + фото-доказательства | Нет | Нет (только хранение фото и расчёт KPI Engine) |
| **v2** | Фото + автораспознавание через **Trax SDK** | Trax on-device | Trax cloud / Trax on-prem |
| **v3** | Фото + собственный CV-стек (**YOLOv8/v11, Detectron2, SAM, PaddleOCR**) | YOLO-lite (опционально) | Полный стек ML on-prem (k8s + GPU) |

> **Обратная совместимость.** Структура ответов (`audit_visits.answers`, `audit_visits.kpi`) единая на v1/v2/v3. На v2/v3 поля «факт» опросного листа автоматически предзаполняются результатом распознавания, мерчендайзер только подтверждает или корректирует.

Out of scope (всех трёх версий): нумерическая/взвешенная дистрибуция (BI-агрегаты), staff knowledge / тайный гость, кассовые данные и распознавание чеков, FIFO/срок годности через стекло, температура холодильника без видимого термометра.

---

## 2. Термины и сокращения

| Термин | Расшифровка |
| --- | --- |
| MML | Must-Must-List — обязательная ассортиментная матрица для канала/ТТ |
| OSA / OOS | On-Shelf Availability / Out of Stock |
| SoS / SoC | Share of Shelf / Share of Cooler |
| POSM | Point of Sale Materials |
| РРЦ | Рекомендованная розничная цена |
| PSS | Perfect Store Score |
| ТТ | Торговая точка |
| SFA | Sales Force Automation (DSD Mini) |
| Quality gate | On-device проверка качества фотографии |
| Backoffice | Серверный административный портал DSD-middleware |

---

## 3. Архитектура модуля внутри DSD Mini

### 3.1. Принципы

- **Подключаемый feature-модуль**: включается через `settingsStore.merchandisingEnabled` (boolean) и `settingsStore.merchandisingMlMode` (`survey` | `trax` | `cv`). Отключение модуля не нарушает основной функционал DSD Mini.
- **Offline-first**: все операции — запись в локальную SQLite, синхронизация через существующий `syncService.js` (push → pull → status).
- **Один источник правды по сущности**: модуль расширяет таблицу `visit_reports`, а не создаёт изолированную БД.
- **Модель «опрос как контейнер»**: на v1/v2/v3 интерфейс — это шаблон опроса, поля которого в зависимости от режима либо заполняются мерчендайзером, либо автозаполняются ML-сервисом.

### 3.2. Размещение в репозитории

```
src/
├── modules/
│   └── merchandising/                # Точка подключения модуля
│       ├── index.js                  # Регистрация модуля и feature flags
│       ├── navigation/
│       │   └── MerchStack.js         # Stack: Templates → Audit → Question → Camera → Summary
│       ├── screens/
│       │   ├── AuditListScreen.js
│       │   ├── AuditScreen.js        # Опрос
│       │   ├── QuestionScreen.js     # Один вопрос (текст/число/да-нет/select/photo)
│       │   ├── PhotoCaptureScreen.js # Камера с подсказками + Quality Gate
│       │   ├── AuditSummaryScreen.js
│       │   └── KpiResultScreen.js
│       ├── components/
│       │   ├── QuestionRenderer.js
│       │   ├── QualityGateOverlay.js
│       │   └── PhotoThumb.js
│       ├── services/
│       │   ├── auditService.js       # CRUD аудита (через database.js)
│       │   ├── templateService.js    # Шаблоны опросов
│       │   ├── photoService.js       # Сохранение фото в FS, EXIF, превью
│       │   ├── qualityGate.js        # Резкость, экспозиция, угол
│       │   ├── kpiEngine.js          # Локальный расчёт KPI/PSS (опц.)
│       │   ├── traxAdapter.js        # v2: вызов Trax SDK
│       │   └── cvAdapter.js          # v3: YOLO/PaddleOCR через native bridge
│       └── store/
│           └── auditStore.js         # Zustand: текущий аудит, прогресс
└── plugins/
    └── withMerchPlugins.js           # v2/v3: native config plugin (Trax / TFLite)
```

### 3.3. Расширение роли `preseller`

В `src/constants/roles.js` роль `preseller` получает дополнительный таб по флагу:

```js
preseller: {
  key: 'preseller',
  tabs: [
    SCREEN_NAMES.PRESELLER_HOME,
    SCREEN_NAMES.ROUTE_TAB,
    ...(settingsStore.merchandisingEnabled
      ? [SCREEN_NAMES.MERCH_AUDIT_TAB]
      : []),
    SCREEN_NAMES.PROFILE_TAB,
  ],
}
```

`SCREEN_NAMES.MERCH_AUDIT_TAB` добавляется в `src/constants/screens.js`.

### 3.4. Версии модуля и режимы работы

```
┌───────────────────────────────────────────────────────────────┐
│  Mobile (DSD Mini)                                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ AuditScreen (общий UI для v1/v2/v3)                      │ │
│  │   ├─ QuestionRenderer  ─── ответ пользователя           │ │
│  │   └─ PhotoCaptureScreen ── фото + Quality Gate          │ │
│  └──────────────────────────────────────────────────────────┘ │
│            │                  │                  │             │
│       v1 │ ручной        v2 │ Trax SDK     v3 │ CV-стек     │
│            ▼                  ▼                  ▼             │
│   answers[] only       Trax response         YOLO/Detectron   │
└────────────┬─────────────────┬─────────────────┬─────────────┘
             ▼                 ▼                 ▼
       sync_log push    sync_log push +    sync_log push +
       (audit_visits)   trax_jobs upload   cv_jobs upload
             ▼                 ▼                 ▼
       DSD-middleware ── KPI Engine ── BI / Backoffice / SFA-карточка
```

---

## 4. Функциональные требования

### 4.1. Сценарий «Аудит ТТ» (общий для всех версий)

1. Мерчендайзер открывает визит на маршруте (существующий поток DSD Mini → `route_points`).
2. Если `settingsStore.merchandisingEnabled = true` и тип ТТ предполагает аудит, в карточке визита появляется кнопка «Начать аудит».
3. Модуль подбирает шаблон опроса по `customer.outlet_type` (`retail` | `kiosk` | `horeca_bar` | `horeca_cafe`) и текущей версии шаблона из `audit_templates`.
4. Перед стартом запускаются предусловия (см. §4.6). Если хотя бы одно не выполнено — экран блокировки с инструкцией.
5. Мерчендайзер последовательно отвечает на вопросы. Для вопросов типа `photo` / `photo_required` открывается камера с Quality Gate.
6. Для каждого фото записывается `EXIF` (время, GPS, устройство) + кастомные метки (`visit_id`, `question_id`, `photo_type`).
7. По завершении аудита формируется черновик `audit_visit` со статусом `draft`. После явного «Завершить» статус меняется на `submitted`, появляется запись в `sync_log`.
8. На v1 KPI рассчитываются на сервере (после sync). На v2/v3 локально появляется предварительный результат (по доступным фото-проверкам).
9. Backoffice возвращает финальный `kpi`/`pss` обратно через pull-фазу sync; результат отображается на экране карточки визита.

### 4.2. Типы вопросов в шаблоне

Каждый вопрос в шаблоне имеет тип, который определяет рендер UI и валидацию:

| Тип | Описание | Пример (KPI) |
| --- | --- | --- |
| `bool` | Да/Нет | Pure Cooler, Целостность брендирования |
| `int` | Целое число | Кол-во фейсингов, °C, балл 1–5 |
| `decimal` | Дробное число | Доля, % |
| `select` | Один из вариантов | Состояние POSM (1–5) |
| `multiselect` | Несколько | Виды POSM на полке |
| `text` | Свободный текст | Комментарий мерчендайзера |
| `photo` | Одно или несколько фото | Фото полки, ценника, меню |
| `photo_required` | Фото обязательно | Фото-доказательство для KPI с пометкой «фото-evidence» |
| `composite` | Группа из нескольких полей | OSA: SKU из MML × присутствует/нет + фото |

Каждый вопрос связан с одним или несколькими **KPI-кодами** (`OSA`, `SOS`, `SOC`, `PURE_COOLER`, `FILL_RATE`, `PLANO`, `PRICE_COMPLIANCE`, `POSM_PLACEMENT`, `POSM_CONDITION`, `MENU_LISTING`, `FEATURED_POS`, `BRANDED_GLASSWARE`, `STAFF_KNOWLEDGE` и т. д.) — это позволяет KPI Engine на бэке подсчитать значения по ответам.

### 4.3. Шаблоны опросов по типу ТТ

Шаблоны соответствуют чек-листам из `KPI_merchandising_audit.xlsx`:

- **`retail`** (сетевой ритейл): блоки «Наличие», «Выкладка», «Холодильник» (если есть), «Цена», «POSM», «Процесс».
- **`kiosk`** (киоск с холодильником): блоки «Наличие», «Холодильник», «Выкладка», «Цена», «POSM», «Процесс».
- **`horeca_bar`** (бар): блоки «Меню и барная карта», «Наличие и выкладка (back-bar)», «Бренд-оборудование и подача», «POSM и активации», «Персонал», «Процесс».
- **`horeca_cafe`** (кафе/ресторан): блоки «Меню», «Наличие и хранение», «Подача и сервировка», «POSM и видимость», «Персонал», «Процесс».

Каждый блок имеет вес для расчёта PSS (см. §6.2). Полный список вопросов и связки `question → KPI` поставляется через backoffice (см. §7.1).

### 4.4. Фото-захват и Quality Gate (on-device)

- Камера `expo-camera` с overlay-подсказками: рамка кадра, индикатор расстояния, наклон, освещение.
- Сохранение **оригинала** в `FileSystem.documentDirectory + 'merch/<visit_id>/<question_id>/<idx>.jpg'` (без пережатия) + сжатой копии (longest edge ≤ 2048px, quality 85) для быстрой загрузки.
- EXIF: время, GPS (`expo-location`), ориентация, модель устройства; кастомные метки в EXIF UserComment: `visit_id`, `question_id`, `photo_type`, `template_version`.
- Quality Gate (целевые пороги — настраиваются с сервера):
  - резкость: Laplacian variance ≥ 100;
  - экспозиция: пересветы ≤ 5%, недосветы ≤ 10%;
  - угол: отклонение ≤ 15°, при 5–15° — авто-гомография;
  - полнота кадра (для `shelf_full` / `cooler_interior`);
  - отсутствие перекрытий > 20%.
- При провале — пересъёмка с подсказкой, что не так.
- Поддержка серии 2–3 кадра на один объект.

### 4.5. Версионные особенности

#### v1 — опрос (без CV)
- Все KPI считаются по ответам мерчендайзера; фото — только evidence.
- KPI Engine на сервере применяет правила: например, OSA = (отмеченных «есть» SKU из MML) / (SKU в MML).
- На клиенте — только Quality Gate, без распознавания.

#### v2 — Trax SDK (вендор открыт)
- Подключается **Trax SDK** через native config plugin (`withMerchPlugins`).
- Поток: после `quality gate ok` фото отправляется в Trax (on-device pre-detection + cloud / on-prem обработка по контракту).
- Поля «факт» опроса автозаполняются результатом Trax (фейсинги по SKU, наличие POSM и т. д.); мерчендайзер видит pre-filled значения и подтверждает.
- Расхождения «человек vs ML» сохраняются в `audit_answers.discrepancy = true` для аналитики качества модели.
- В случае недоступности Trax модуль **деградирует до v1** (graceful fallback) и помечает визит как `ml_status = 'fallback_survey'`.
- Альтернативные вендоры (Vispera, ParallelDots, EYC и др.) поддерживаются через единый интерфейс `services/traxAdapter.js` (`MerchVisionAdapter`), что оставляет вендор открытым на этапе закупки.

#### v3 — собственный CV-стек on-prem
- Бэкенд: **YOLOv8/v11** (детекция SKU + POSM), **Detectron2** (instance segmentation полок и зон), **SAM** (для тонкой сегментации зон золотой полки), **PaddleOCR** (ценники + меню, кириллица + латиница).
- Развёртывание: **on-prem k8s + GPU (NVIDIA T4 / A10 / L4)**, очереди (RabbitMQ/Kafka), модельный реестр (MLflow), feature store эталонов SKU.
- Клиент: то же поведение, что в v2 (предзаполненный опрос), но взаимодействует с собственным Inference API (`/cv/photo/{job_id}`), а не с Trax.
- Опционально: TFLite-версия YOLOv8n для on-device pre-detection (сжатие ≥ 4×, ≤ 50 МБ модель), чтобы давать предварительный SoS прямо в камере.

### 4.6. Предусловия запуска аудита

Модуль блокирует запуск аудита, пока не выполнены все условия:

- сессия SFA валидна (`authStore.isAuthenticated = true`);
- визит открыт (есть запись в `route_points` со статусом `in_progress`);
- получена геолокация устройства, и расстояние до ТТ ≤ настраиваемого радиуса (по умолчанию 100 м);
- мастер-данные SKU и MML для ТТ загружены и не устарели (`sync_meta.master_data_age_days ≤ N`);
- актуальный шаблон опроса для типа ТТ загружен (`audit_templates`);
- разрешения камеры, геолокации и хранилища предоставлены;
- свободное место для оригинала фото ≥ 50 МБ.

Для v2/v3 дополнительно: версия Trax SDK / TFLite-модели не ниже минимально допустимой (`min_ml_version`).

---

## 5. Модель данных

### 5.1. Расширение существующей таблицы `visit_reports`

В существующих таблицах добавляются поля (миграция `schema.js` v6):

```sql
ALTER TABLE visit_reports ADD COLUMN report_kind TEXT NOT NULL DEFAULT 'generic'
   CHECK(report_kind IN ('generic','merch_audit'));
ALTER TABLE visit_reports ADD COLUMN template_id TEXT;
ALTER TABLE visit_reports ADD COLUMN template_version INTEGER;
ALTER TABLE visit_reports ADD COLUMN outlet_type TEXT
   CHECK(outlet_type IN ('retail','kiosk','horeca_bar','horeca_cafe'));
ALTER TABLE visit_reports ADD COLUMN ml_status TEXT
   CHECK(ml_status IN ('survey_only','pending_ml','done','fallback_survey'));
ALTER TABLE visit_reports ADD COLUMN kpi_payload TEXT;   -- JSON KPI результата
ALTER TABLE visit_reports ADD COLUMN pss REAL;           -- Perfect Store Score
```

> Поле `checklist` (TEXT) сохраняется как «сырой» снимок ответов опросного листа — JSON со структурой `{question_id: {value, comment, photos:[]}}`. Так при выключенном модуле/устаревших мобильных клиентах данные остаются читаемыми.

### 5.2. Новые таблицы (схема v6)

```sql
-- Шаблон опросного листа (синхронизируется из backoffice)
CREATE TABLE audit_templates (
  id TEXT PRIMARY KEY,
  outlet_type TEXT NOT NULL CHECK(outlet_type IN ('retail','kiosk','horeca_bar','horeca_cafe')),
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  questions TEXT NOT NULL,        -- JSON-массив вопросов
  scoring TEXT NOT NULL,          -- JSON: веса блоков для PSS
  active INTEGER NOT NULL DEFAULT 1,
  effective_from TEXT,
  effective_to TEXT,
  external_id TEXT,
  synced INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_templates_outlet ON audit_templates(outlet_type, active);

-- Ответы аудита (нормализованные, для аналитики)
CREATE TABLE audit_answers (
  id TEXT PRIMARY KEY,
  visit_report_id TEXT NOT NULL,
  question_id TEXT NOT NULL,      -- идентификатор внутри template
  kpi_codes TEXT,                 -- JSON-массив кодов KPI, к которым относится
  value_text TEXT,
  value_number REAL,
  value_bool INTEGER,             -- 0/1
  value_json TEXT,                -- для composite/multiselect
  ml_value TEXT,                  -- значение, предложенное ML (v2/v3)
  discrepancy INTEGER DEFAULT 0,  -- расхождение human vs ML
  source TEXT NOT NULL CHECK(source IN ('survey','ml_trax','ml_cv','mixed')),
  confidence REAL,                -- уверенность ML (0..1)
  synced INTEGER DEFAULT 0,
  external_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (visit_report_id) REFERENCES visit_reports(id) ON DELETE CASCADE
);
CREATE INDEX idx_audit_answers_visit ON audit_answers(visit_report_id);
CREATE INDEX idx_audit_answers_question ON audit_answers(question_id);

-- Расширенная таблица фото (заменяет visit_report_photos функционально)
CREATE TABLE audit_photos (
  id TEXT PRIMARY KEY,
  visit_report_id TEXT NOT NULL,
  question_id TEXT,               -- к какому вопросу относится
  photo_type TEXT,                -- shelf_full, shelf_section, cooler_interior, ...
  uri_original TEXT NOT NULL,     -- путь к оригиналу в FS
  uri_compressed TEXT,            -- сжатая копия для загрузки
  exif_json TEXT,                 -- сериализованный EXIF
  qg_passed INTEGER,              -- 1/0 quality gate
  qg_metrics TEXT,                -- JSON: laplacian, exposure, angle...
  ml_job_id TEXT,                 -- job в Trax/CV (v2/v3)
  ml_status TEXT,                 -- queued/processing/done/failed
  ml_result TEXT,                 -- JSON: bounding boxes, OCR, классы
  upload_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(upload_status IN ('pending','uploading','done','failed')),
  remote_url TEXT,                -- URL после загрузки на S3/MinIO
  hash_sha256 TEXT,               -- идемпотентность загрузки
  synced INTEGER DEFAULT 0,
  external_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (visit_report_id) REFERENCES visit_reports(id) ON DELETE CASCADE
);
CREATE INDEX idx_audit_photos_visit ON audit_photos(visit_report_id);
CREATE INDEX idx_audit_photos_upload ON audit_photos(upload_status);

-- Очередь ML-задач (v2/v3)
CREATE TABLE ml_jobs (
  id TEXT PRIMARY KEY,
  visit_report_id TEXT NOT NULL,
  audit_photo_id TEXT NOT NULL,
  engine TEXT NOT NULL CHECK(engine IN ('trax','yolo','detectron','sam','paddleocr','composite')),
  request_json TEXT,
  response_json TEXT,
  status TEXT NOT NULL CHECK(status IN ('queued','sent','processing','done','failed','cancelled')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (visit_report_id) REFERENCES visit_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (audit_photo_id) REFERENCES audit_photos(id) ON DELETE CASCADE
);
CREATE INDEX idx_ml_jobs_status ON ml_jobs(status);

-- Версионируемые KPI-результаты по визиту (для аудита и сравнения версий формул)
CREATE TABLE kpi_results (
  id TEXT PRIMARY KEY,
  visit_report_id TEXT NOT NULL,
  kpi_code TEXT NOT NULL,
  value REAL,                     -- числовое значение KPI
  status TEXT,                    -- red/yellow/green
  formula_version TEXT,           -- версия формулы из KPI Engine
  source TEXT,                    -- survey/ml_trax/ml_cv
  details_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (visit_report_id) REFERENCES visit_reports(id) ON DELETE CASCADE
);
CREATE INDEX idx_kpi_results_visit ON kpi_results(visit_report_id, kpi_code);
```

### 5.3. Регистрация в `syncService.js`

В `ENTITY_TABLE_MAP`, `ENTITY_COLUMNS` и `ALLOWED_TABLES` добавляются:

```js
ENTITY_TABLE_MAP = {
  ...,
  audit_templates: 'audit_templates',     // PULL
  audit_visits:    'visit_reports',       // PUSH (фильтр report_kind='merch_audit')
  audit_answers:   'audit_answers',       // PUSH
  audit_photos:    'audit_photos',        // PUSH (метаданные; контент — отдельный uploader)
  kpi_results:     'kpi_results',         // PULL
};
```

Фотографии загружаются отдельным uploader’ом (multipart, presigned URL → S3/MinIO middleware), идемпотентно по `hash_sha256`. Метаданные фото идут через обычный sync push.

### 5.4. Карта KPI → вопросы → версии

Полная карта поддерживается на бэке (`audit_templates.questions`). Эталонная схема для MVP — на основе `KPI_merchandising_audit.xlsx`:

| Категория | KPI код | Тип ТТ | Источник в v1 (опрос) | Источник в v2 (Trax) | Источник в v3 (CV) | Целевое значение |
| --- | --- | --- | --- | --- | --- | --- |
| Наличие | `OSA` | retail/kiosk/horeca | composite (SKU из MML) | детекция SKU на полке + MML | YOLO + MML | ≥ 95% |
| Наличие | `OOS` | retail/kiosk/horeca | composite | детекция | YOLO | ≤ 5% |
| Наличие | `NEW_SKU_DIST` | retail/kiosk | bool/select | детекция | YOLO | 100% из списка new |
| Наличие | `FIFO` | retail/kiosk/horeca | bool | bool (фото-evidence, без ML) | bool | Да |
| Холодильник | `SOC` | kiosk | int (фейсинги) | Trax cooler analyzer | YOLO + классификация | ≥ 80% |
| Холодильник | `PURE_COOLER` | kiosk | bool | детекция конкурентов | YOLO + классификатор | Да |
| Холодильник | `FILL_RATE` | kiosk | int (заполнено/полок) | Trax | Detectron2 (полки) + YOLO | ≥ 90% |
| Холодильник | `BRANDING_COOLER` | kiosk | bool | классификатор | классификатор + SAM | Да |
| Холодильник | `COOLER_TEMP` | kiosk | int (°C) | OCR термометра (если в кадре) | PaddleOCR | +2…+6 °C |
| Выкладка | `SOS` | retail | int (фейсинги наши/всего) | Trax | YOLO + категория | ≥ 30% |
| Выкладка | `PLANO_COMPLIANCE` | retail | composite | Trax planogram matcher | YOLO + planogram matcher | ≥ 90% |
| Выкладка | `EYE_LEVEL` | retail | bool | Trax (зональная аналитика) | SAM + YOLO | Да |
| Выкладка | `BLOCKS` | retail | bool | Trax | YOLO + group analysis | Да |
| Цена | `PRICE_COMPLIANCE` | retail/kiosk/horeca | composite (РРЦ ↔ факт) | Trax OCR | PaddleOCR + price master | ≥ 95% |
| Цена | `PRICE_TAG_PRESENCE` | retail/kiosk | int / % | Trax detection | YOLO | 100% |
| Цена | `PRICE_TAG_CORRECTNESS` | retail/kiosk | bool | Trax OCR + master | PaddleOCR + master | ≥ 95% |
| POSM | `POSM_PLACEMENT` | все | composite | Trax POSM | YOLO POSM | ≥ 90% |
| POSM | `POSM_CONDITION` | все | select 1–5 | Trax | классификатор состояния | ≥ 4 |
| POSM | `PROMO_EXEC` | все | composite | Trax + чеки (BI) | CV + чеки | ≥ 95% |
| HoReCa | `MENU_LISTING` | bar/cafe | composite | Trax menu OCR | PaddleOCR + menu master | 100% |
| HoReCa | `FEATURED_POS` | bar/cafe | bool | Trax | PaddleOCR + layout | Да |
| HoReCa | `BRANDED_GLASSWARE` | bar/cafe | composite | Trax | YOLO + классификатор | ≥ 80% |
| HoReCa | `RECIPE_COMPLIANCE` | bar/cafe | photo + bool | bool (фото-evidence) | bool | ≥ 90% |
| HoReCa | `STAFF_KNOWLEDGE` | bar/cafe | _не покрывается_ | _не покрывается_ | _не покрывается_ | (тайный гость) |
| Процесс | `ROUTE_COMPLIANCE` | все | _из SFA_ | _из SFA_ | _из SFA_ | ≥ 95% |
| Процесс | `PHOTO_QA` | все | автопроверка | автопроверка | автопроверка | ≥ 95% |
| Интегральный | `PSS` | все | взвешенный микс | взвешенный микс | взвешенный микс | ≥ 85% |

> Эта таблица — стартовая раскладка. Окончательные вопросы и связки `question → KPI` фиксируются в шаблонах `audit_templates`, поэтому изменяются через backoffice без релиза мобильного приложения.

---

## 6. KPI Engine

### 6.1. Принципы

- **Детерминированные формулы.** Каждый KPI имеет явную формулу, версия формулы (`formula_version`) сохраняется в `kpi_results` — это нужно для аудитопригодности и сравнений между периодами.
- **Маршрут расчёта в зависимости от режима:**
  - v1: формулы применяются только к ответам опроса (например, `OSA = sum(answer.bool == 1) / count(MML)`);
  - v2/v3: формулы применяются к выходу ML, мерчендайзер видит pre-filled значения; поле `source` в `audit_answers` фиксирует, кто предоставил данные.
- **Граф расчёта:** `audit_visit + audit_answers + ml_results → KPI Engine → kpi_results + pss`.
- **Графический PSS** считается по матрице весов из `audit_templates.scoring`. Веса редактируются маркетологом в backoffice без вмешательства разработки.
- **Тегирование критичности:** автоматические пометки `red/yellow/green` по порогам из `KPI_merchandising_audit.xlsx`.

### 6.2. Веса блоков для Perfect Store Score (по умолчанию)

| Блок | Вес, % | Целевое выполнение |
| --- | --- | --- |
| Наличие (OSA / дистрибуция) | 25 | ≥ 95% |
| Выкладка / планограмма | 20 | ≥ 90% |
| Холодильник | 15 | ≥ 85% |
| Цена | 10 | ≥ 95% |
| POSM / промо | 10 | ≥ 90% |
| HoReCa: меню и подача | 10 | ≥ 90% |
| Персонал / знание продукта | 5 | ≥ 80% |
| Процесс мерчендайзера | 5 | ≥ 90% |

Веса хранятся в `audit_templates.scoring` (JSON), могут переопределяться по типу ТТ и периоду промо.

### 6.3. Локальный vs серверный расчёт

В `settingsStore.kpiEngineMode` поддерживаются два варианта (флагово):
- `server_only` (по умолчанию): расчёт KPI и PSS — на бэке после sync push;
- `dual`: локальный расчёт сразу после завершения аудита (даёт мерчендайзеру мгновенную обратную связь даже offline) + серверный — как «правда» при rollout-расхождениях. Расхождение `local vs server` логируется для отладки.

---

## 7. Точки интеграции

### 7.1. Интеграция с DSD-middleware (backoffice)

Все эндпоинты — REST/JSON, аутентификация JWT (как в существующем `apiClient.js`), `Content-Type: application/json` для метаданных и `multipart/form-data` для бинарей.

| Направление | Метод/URL | Назначение | Где используется в DSD Mini |
| --- | --- | --- | --- |
| ↓ pull | `GET /sync/audit_templates?since={cursor}` | Шаблоны опросов по типам ТТ | `syncService.js`, фаза PULL |
| ↓ pull | `GET /sync/master_data/mml?point_id={id}` | MML по ТТ | существующий sync, расширение |
| ↓ pull | `GET /sync/pricing/rrp?point_id={id}` | РРЦ для price compliance | существующий sync, расширение |
| ↓ pull | `GET /sync/planograms?outlet_type={x}` | Электронные планограммы | новый ресурс (для v2/v3) |
| ↓ pull | `GET /sync/posm_plan?point_id={id}&date={d}` | План размещения POSM | новый ресурс |
| ↑ push | `POST /sync/audit_visits` | Создание/обновление визита аудита | `syncPayloadBuilder.js` |
| ↑ push | `POST /sync/audit_answers` | Ответы (нормализованно) | `syncPayloadBuilder.js` |
| ↑ push | `POST /sync/audit_photos` | Метаданные фото | `syncPayloadBuilder.js` |
| ↑ upload | `POST /upload/audit_photo (multipart)` | Бинарь + sha256 (идемпотентно) | новый `photoUploader.js` |
| ↓ pull | `GET /sync/kpi_results?visit_id={id}` | Результаты KPI Engine | `syncService.js` |
| ↓ status | `GET /sync/status/audit_visit/{id}` | external_id, статус ML | существующий механизм |

#### 7.1.1. Структура запроса `audit_visits` (push)

```json
{
  "id": "uuid-v4",
  "report_kind": "merch_audit",
  "route_point_id": "...",
  "customer_id": "...",
  "user_id": "...",
  "outlet_type": "kiosk",
  "template_id": "tmpl-kiosk-v3",
  "template_version": 3,
  "started_at": "2026-04-26T08:14:11Z",
  "submitted_at": "2026-04-26T08:31:42Z",
  "ml_status": "pending_ml",
  "geo": {"lat": 55.755, "lon": 37.617, "accuracy_m": 6.2},
  "device": {"model": "...", "os": "iOS 17.4", "app_version": "1.4.0"}
}
```

#### 7.1.2. Структура `audit_answers` (push)

```json
[
  {
    "id": "uuid-v4",
    "visit_report_id": "...",
    "question_id": "kiosk.fridge.fill_rate",
    "kpi_codes": ["FILL_RATE"],
    "value_number": 92,
    "source": "survey",
    "confidence": null
  },
  {
    "id": "uuid-v4",
    "visit_report_id": "...",
    "question_id": "kiosk.fridge.share_of_cooler",
    "kpi_codes": ["SOC"],
    "value_number": 78,
    "ml_value": "76",
    "discrepancy": 1,
    "source": "ml_cv",
    "confidence": 0.91
  }
]
```

### 7.2. Интеграция с Trax / альтернативными CV-вендорами (v2)

`MerchVisionAdapter` — единый внутренний интерфейс, реализуется конкретным вендором:

```ts
interface MerchVisionAdapter {
  warmup(): Promise<void>;
  analyze(photo: AuditPhoto, ctx: VisitContext): Promise<MerchAnalyzeResult>;
  getJobStatus(jobId: string): Promise<MerchJobStatus>;
}
```

Базовый адаптер для **Trax**: используется официальный мобильный SDK. Бинари кладутся через native config plugin `withMerchPlugins.js`. Cloud-эндпоинты конфигурируются через `apiBaseUrl` + отдельный `traxApiKey` в `secureStorage`.

> Плановые альтернативы: Vispera, ParallelDots ShelfWatch, EYC Photo Recognition. Финальный вендор подтверждается на этапе RFP в фазе 1 плана запуска.

### 7.3. Интеграция с собственным CV-стеком (v3)

Стек on-prem (k8s + GPU):

| Компонент | Технология | Назначение |
| --- | --- | --- |
| Object detection | YOLOv8 / YOLOv11 | Детекция SKU + POSM |
| Segmentation | Detectron2 | Полки, зоны золотой полки, фасады |
| Fine seg | SAM (Segment Anything) | Точная сегментация при низком контрасте |
| OCR | PaddleOCR | Ценники, меню (RU + EN) |
| Inference | Triton Inference Server | Пайплайн распознавания |
| Очереди | RabbitMQ или Kafka | ml_jobs |
| Хранилище | MinIO / S3 | Фото и эталоны |
| Реестр моделей | MLflow | Версии моделей и метрики |
| Feature store | DVC + own catalog | Эталоны SKU/POSM |
| Оркестрация | Airflow / Prefect | Регулярное переобучение |

Контракт с мобильным клиентом тот же, что в v2 (`MerchVisionAdapter`), но реализация — `cvAdapter.js`.

### 7.4. Интеграция с существующими модулями DSD Mini

| Существующий модуль | Точка интеграции |
| --- | --- |
| `authStore` / JWT | Reuse — без изменений |
| `syncService.js` | Расширение `ENTITY_TABLE_MAP` / `ENTITY_COLUMNS` / `ALLOWED_TABLES` |
| `apiClient.js` | Reuse `getBaseUrl()` |
| `locationService.js` | Reuse: проверка близости к ТТ, EXIF GPS |
| `loggerService.js` / `error_log` | Reuse для всех ошибок аудита и ML |
| `syncLogger.js` | Reuse: каждый CRUD по audit_*-таблицам логируется |
| `notifications` (существующая таблица) | Push критичных отклонений супервайзеру |
| GPS-tracks (`gps_tracks`) | Reuse: связь визит-аудита с треком GPS |
| `route_points` | FK для `visit_reports.route_point_id` (уже есть) |

### 7.5. Интеграция с BI / DWH

- Источник: реплика БД middleware + S3 с фото.
- Витрины: KPI по ТТ, регионам, каналам, периодам, SKU; PSS-тренды.
- Экспорт: Excel/CSV по запросу + REST API `/api/bi/kpi/...`.
- Real-time оповещения по критичным KPI: pub/sub event на `kpi_result.status = 'red'`.

---

## 8. Требования к Backoffice (DSD-middleware)

Backoffice — расширение существующего DSD-middleware. Добавляются **3 раздела** в админ-портал и пакет API.

### 8.1. Раздел «Шаблоны аудита»

- CRUD `audit_templates` по типу ТТ.
- Редактор вопросов: drag-and-drop блоков, типы полей (см. §4.2), привязка к KPI-кодам.
- Версионирование шаблона: новые версии не ломают старые визиты (`template_version` на каждом визите).
- Публикация: «черновик → ревью → активный» с `effective_from` / `effective_to`.
- Импорт стартовых шаблонов из `KPI_merchandising_audit.xlsx`.

### 8.2. Раздел «Аудиты ТТ»

- Список визитов (фильтры: дата, регион, мерчендайзер, тип ТТ, статус, цвет PSS).
- Карточка визита:
  - сводка KPI с цветами;
  - таблица ответов (мерчендайзер vs ML, расхождения подсвечены);
  - галерея фото с overlay bounding boxes (v2/v3);
  - GPS-точка визита и фактическое расстояние до ТТ;
  - экспорт PDF/Excel-отчёта.
- Действия: ручная корректировка ответа, повторный расчёт KPI, эскалация.

### 8.3. Раздел «Модерация ML» (v2/v3)

- Очередь фото с низкой уверенностью модели.
- Веб-интерфейс разметки: исправление bounding boxes, классов SKU, текстов OCR.
- Правки уходят в обучающую выборку (для v3) и формируют метрики качества (precision/recall) по каждой модели и SKU.
- SLA модерации (по умолчанию): 80% фото — в течение 24 ч.

### 8.4. Раздел «Master Data»

- Уже существующие справочники (SKU, MML) — расширяются полями: эталонные изображения SKU (≥3 ракурса), штрихкоды, сегмент, приоритетный/новый.
- Новые справочники:
  - **Planograms** — координаты полок и SKU для типа ТТ;
  - **POSM Plan** — план размещения POSM по ТТ/период;
  - **Pricing (РРЦ + промо)** — цены по ТТ/региону/период;
  - **Outlet Types** — каталог типов и подтипов ТТ.

### 8.5. Раздел «KPI Engine»

- Редактор формул (декларативный DSL или коллекция версионированных Python/SQL расчётов).
- Редактор весов PSS по типу ТТ.
- A/B-тесты формул: сравнение `formula_version=1.0` vs `1.1` на исторических визитах.
- Аудит-логи всех изменений формул.

### 8.6. Раздел «BI / Дашборды»

- Карточки KPI по периоду / каналу / региону / бренду / SKU.
- Тепловая карта ТТ по PSS.
- Топ нарушений и ранжирование мерчендайзеров.
- Экспорт CSV/Excel и REST API для интеграции с внешним BI (Power BI / Yandex DataLens / Apache Superset).

### 8.7. Безопасность

- SSO с существующей системой; RBAC: `merchandiser`, `supervisor`, `marketer`, `moderator`, `admin`.
- TLS 1.2+; шифрование на диске (S3 SSE-KMS / MinIO encryption).
- Хранение фото ≥ 18 мес (настраивается); анонимизация (затирание лиц в кадре).
- Аудит-лог действий пользователей и модераторов.
- Соответствие 152-ФЗ (РФ); GDPR — по применимости.
- Защита от фрода: проверка GPS, time-stamps, EXIF, хэш фото для детекции повторной загрузки.

---

## 9. Нефункциональные требования

| Показатель | Целевое значение |
| --- | --- |
| Запуск сценария съёмки | ≤ 1 сек от тапа до камеры |
| Quality gate | ≤ 0,5 сек на устройстве среднего класса |
| Загрузка фото на сервер (4G) | ≤ 10 сек при ≤ 5 МБ |
| Серверное распознавание `shelf_full` | ≤ 20 сек |
| Серверное распознавание `price_tag` | ≤ 5 сек |
| Возврат KPI в SFA после завершения визита | ≤ 90 сек в 95% случаев |
| Throughput (пиковый) | ≥ 500 фото/мин на кластер |
| Доступность сервиса | 99,5% в рабочие часы |
| Точность детекции SKU (mAP@0.5), MVP / год 1 | ≥ 0,85 / ≥ 0,92 |
| Точность OCR цены (accuracy), MVP / год 1 | ≥ 0,92 / ≥ 0,98 |
| MAE OSA против физического пересчёта, MVP / год 1 | ≤ 5 п.п. / ≤ 2 п.п. |
| Минимальные требования к устройству | Android 10+ / iOS 14+, камера ≥ 8 Мп, 3 ГБ ОЗУ |
| Поддержка локалей | ru, en (через i18next, как в DSD Mini) |
| Offline | Полный сбор аудита и опроса; sync при появлении сети; idempotent upload |
| Брендинг | Цвета PLAUT, primary `#003766`, accent `#FFC400` |

---

## 10. Безопасность модуля и приватность

- Все фото с EXIF GPS — это ПДн только в комбинации с чувствительными атрибутами; модуль не сохраняет лица персонала по умолчанию (опциональный blur людей в backoffice).
- Идентификаторы мерчендайзера и ТТ передаются только по TLS, JWT с коротким сроком жизни и refresh, как в существующем `authService.js`.
- Локальная БД остаётся в `expo-sqlite` с WAL, токены и ключи — в `expo-secure-store`.
- Для v3 отдельно: изоляция CV-сервисов в k8s namespace, RBAC по ролям, сетевые политики.
- Антифрод: совпадение GPS визита с координатой ТТ ± радиус, EXIF GPS совпадает с GPS устройства, `hash_sha256` фото уникален в пределах проекта (детекция reuse).

---

## 11. Управление шаблонами и конфигурацией

- Шаблон опроса — единый источник правды для UX и расчёта KPI.
- Изменение шаблона = новая версия (immutable). Старые визиты остаются связанными со старой версией для воспроизводимости отчётности.
- Конфигурация модуля на устройстве (`settingsStore`):
  - `merchandisingEnabled: boolean`
  - `merchandisingMlMode: 'survey' | 'trax' | 'cv'`
  - `kpiEngineMode: 'server_only' | 'dual'`
  - `geofenceRadiusM: number` (по умолчанию 100)
  - `qgThresholds: { laplacian, exposureMax, exposureMin, angleDegMax }`
  - `photoMaxLongEdgeUpload: number` (по умолчанию 2048)
- Дистанционное управление: значения выше можно прокидывать с backoffice через тот же sync (`/sync/feature_flags`).

---

## 12. Тестирование

- **Unit**: `kpiEngine.js`, `qualityGate.js`, formula library — покрытие ≥ 80%.
- **Интеграционные**: sync push/pull для `audit_*` таблиц, конфликт-резолв (idempotent), photo upload retries.
- **Полевые**: пилот на 1 регионе (см. план запуска) с метриками точности vs ручного аудита.
- **ML-валидация (v2/v3)**: holdout-набор фото с разметкой (≥ 5000 фото на старт), еженедельный отчёт о метриках.
- **A/B**: сравнение `survey-only` vs `trax-prefilled` на одной и той же команде мерчендайзеров (по группам ТТ) — ROI и расхождения.

---

## 13. Открытые вопросы

1. Окончательный список SKU для MVP (рекомендуется 50–100 топ-SKU).
2. Объём и качество эталонных фото для обучения моделей в v3 (нужен аудит фото-архива).
3. Окончательный выбор вендора в v2: Trax / Vispera / иной — RFP.
4. Где хостить v3-стек: on-prem (зафиксировано как обязательное) или гибрид с облаком для обучения.
5. SLA ручной модерации для v2/v3 — какой % фото будет успевать обрабатываться.
6. Включать ли температуру холодильника по фото (только если в кадре виден дисплей термометра).
7. Целевое соотношение «стоимость распознавания одного визита vs экономия времени» (модель ROI).
