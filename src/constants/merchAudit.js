// Merchandising Audit module — shared constants.
// Aligned with docs/merchandising_module_spec.md §5.4 and §11.

export const OUTLET_TYPES = {
  RETAIL: 'retail',
  KIOSK: 'kiosk',
  HORECA_BAR: 'horeca_bar',
  HORECA_CAFE: 'horeca_cafe',
};

export const OUTLET_TYPE_LIST = Object.values(OUTLET_TYPES);

export const ML_MODES = {
  SURVEY: 'survey',
  TRAX: 'trax',
  CV: 'cv',
};

export const KPI_ENGINE_MODES = {
  SERVER_ONLY: 'server_only',
  DUAL: 'dual',
};

export const ML_STATUSES = {
  SURVEY_ONLY: 'survey_only',
  PENDING_ML: 'pending_ml',
  DONE: 'done',
  FALLBACK_SURVEY: 'fallback_survey',
};

export const REPORT_KIND = {
  GENERIC: 'generic',
  MERCH_AUDIT: 'merch_audit',
};

export const VISIT_AUDIT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
};

export const QUESTION_TYPES = {
  BOOL: 'bool',
  INT: 'int',
  DECIMAL: 'decimal',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  TEXT: 'text',
  PHOTO: 'photo',
  PHOTO_REQUIRED: 'photo_required',
  COMPOSITE: 'composite',
};

export const ANSWER_SOURCES = {
  SURVEY: 'survey',
  ML_TRAX: 'ml_trax',
  ML_CV: 'ml_cv',
  MIXED: 'mixed',
};

export const PHOTO_TYPES = {
  SHELF_FULL: 'shelf_full',
  SHELF_SECTION: 'shelf_section',
  COOLER_INTERIOR: 'cooler_interior',
  COOLER_FRONT: 'cooler_front',
  PRICE_TAG: 'price_tag',
  POSM: 'posm',
  MENU: 'menu',
  GLASSWARE: 'glassware',
  OTHER: 'other',
};

export const KPI_CODES = {
  OSA: 'OSA',
  OOS: 'OOS',
  NEW_SKU_DIST: 'NEW_SKU_DIST',
  FIFO: 'FIFO',
  SOC: 'SOC',
  PURE_COOLER: 'PURE_COOLER',
  FILL_RATE: 'FILL_RATE',
  BRANDING_COOLER: 'BRANDING_COOLER',
  COOLER_TEMP: 'COOLER_TEMP',
  SOS: 'SOS',
  PLANO_COMPLIANCE: 'PLANO_COMPLIANCE',
  EYE_LEVEL: 'EYE_LEVEL',
  BLOCKS: 'BLOCKS',
  PRICE_COMPLIANCE: 'PRICE_COMPLIANCE',
  PRICE_TAG_PRESENCE: 'PRICE_TAG_PRESENCE',
  PRICE_TAG_CORRECTNESS: 'PRICE_TAG_CORRECTNESS',
  POSM_PLACEMENT: 'POSM_PLACEMENT',
  POSM_CONDITION: 'POSM_CONDITION',
  PROMO_EXEC: 'PROMO_EXEC',
  MENU_LISTING: 'MENU_LISTING',
  FEATURED_POS: 'FEATURED_POS',
  BRANDED_GLASSWARE: 'BRANDED_GLASSWARE',
  RECIPE_COMPLIANCE: 'RECIPE_COMPLIANCE',
  ROUTE_COMPLIANCE: 'ROUTE_COMPLIANCE',
  PHOTO_QA: 'PHOTO_QA',
  PSS: 'PSS',
};

// Default PSS block weights (spec §6.2). Stored per-template in audit_templates.scoring;
// these are fallbacks used by local KPI engine when scoring is missing.
export const DEFAULT_PSS_WEIGHTS = {
  availability: 25,
  layout: 20,
  cooler: 15,
  price: 10,
  posm: 10,
  horeca: 10,
  staff: 5,
  process: 5,
};

// KPI status thresholds (red/yellow/green) by KPI code.
// status='green' if value >= green; 'yellow' if >= yellow; else 'red'.
// For "lower is better" KPIs (OOS), comparison is inverted.
export const KPI_THRESHOLDS = {
  OSA: { green: 95, yellow: 85, lowerIsBetter: false },
  OOS: { green: 5, yellow: 10, lowerIsBetter: true },
  SOC: { green: 80, yellow: 70, lowerIsBetter: false },
  FILL_RATE: { green: 90, yellow: 75, lowerIsBetter: false },
  SOS: { green: 30, yellow: 20, lowerIsBetter: false },
  PLANO_COMPLIANCE: { green: 90, yellow: 75, lowerIsBetter: false },
  PRICE_COMPLIANCE: { green: 95, yellow: 85, lowerIsBetter: false },
  PRICE_TAG_PRESENCE: { green: 100, yellow: 90, lowerIsBetter: false },
  PRICE_TAG_CORRECTNESS: { green: 95, yellow: 85, lowerIsBetter: false },
  POSM_PLACEMENT: { green: 90, yellow: 75, lowerIsBetter: false },
  POSM_CONDITION: { green: 4, yellow: 3, lowerIsBetter: false },
  MENU_LISTING: { green: 100, yellow: 80, lowerIsBetter: false },
  BRANDED_GLASSWARE: { green: 80, yellow: 60, lowerIsBetter: false },
  PSS: { green: 85, yellow: 70, lowerIsBetter: false },
};

// KPI Engine formula version — bumped whenever formula library changes.
// Stored in kpi_results.formula_version for reproducibility.
export const KPI_FORMULA_VERSION = '1.0.0';

// Quality Gate defaults (spec §4.4). Server can override via /sync/feature_flags.
export const DEFAULT_QG_THRESHOLDS = {
  laplacian: 100,        // min Laplacian variance for sharpness
  exposureMax: 0.05,     // max fraction of pure-white pixels (>240/255)
  exposureMin: 0.10,     // max fraction of pure-black pixels (<15/255)
  angleDegMax: 15,       // max tilt; 5–15° triggers auto-homography
  occlusionMax: 0.20,    // max overlap fraction
};

export const DEFAULT_GEOFENCE_RADIUS_M = 100;
export const DEFAULT_PHOTO_MAX_LONG_EDGE = 2048;

// Native module name (registered by withMerchPlugins).
export const MERCH_NATIVE_MODULE = 'MerchPhoto';
