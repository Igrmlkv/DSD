// Бизнес
export const DEFAULT_VAT_PERCENT = 22;
export const PROMO_PRICE_MULTIPLIER = 0.85;
export const DEFAULT_CURRENCY = 'RUB';
export const DEFAULT_UNIT = 'шт';

// Документы
export const DOC_PREFIX = {
  INVOICE: 'INV',
  RECEIPT: 'RCP',
  DELIVERY_NOTE: 'DN',
};

export const PRINT_FORM_TYPE = {
  UPD: 'upd',
  INVOICE: 'invoice',
};

export const MAP_PROVIDER = {
  YANDEX: 'yandex',
  OSM: 'osm',
};

// Карта: Москва по умолчанию
export const DEFAULT_MAP_CENTER = { latitude: 55.75, longitude: 37.62, zoom: 11 };
export const MAP_ZOOM = {
  SINGLE_POINT: 14,
  MIN: 5,
  MAX: 15,
  BASE: 12,
};

// Моки
export const LOGIN_MOCK_DELAY_MS = 300;
