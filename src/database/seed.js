import { PROMO_PRICE_MULTIPLIER } from '../constants/config';

// ============================================================
// Пользователи системы — 4 пользователя, 3 роли
// ============================================================
const USERS = [
  { id: 'usr-001', username: 'petrov', password_hash: 'hash_petrov', full_name: 'Петров Алексей Иванович', role: 'expeditor', phone: '+79161234567', vehicle_id: 'veh-001' },
  { id: 'usr-003', username: 'kozlov', password_hash: 'hash_kozlov', full_name: 'Козлов Дмитрий Сергеевич', role: 'expeditor', phone: '+79031112233', vehicle_id: 'veh-002' },
  { id: 'usr-004', username: 'ivanova', password_hash: 'hash_ivanova', full_name: 'Иванова Елена Николаевна', role: 'supervisor', phone: '+79057778899', vehicle_id: null },
  { id: 'usr-005', username: 'sokolov', password_hash: 'hash_sokolov', full_name: 'Соколов Артём Владимирович', role: 'preseller', phone: '+79261234500', vehicle_id: 'veh-003' },
  { id: 'usr-006', username: 'admin', password_hash: 'hash_admin', full_name: 'Администратор Системы', role: 'admin', phone: '+79990001122', vehicle_id: null },
];

// ============================================================
// Товары - Напитки (безалкогольные и слабоалкогольные)
// ============================================================
const PRODUCTS = [
  // Газированные напитки
  { id: 'prd-001', sku: 'CC-500', name: 'Coca-Cola 0.5л', category: 'Газированные напитки', subcategory: 'Кола', brand: 'Coca-Cola', volume: '0.5л', barcode: '5449000000996', weight: 0.55 },
  { id: 'prd-002', sku: 'CC-1000', name: 'Coca-Cola 1л', category: 'Газированные напитки', subcategory: 'Кола', brand: 'Coca-Cola', volume: '1л', barcode: '5449000001009', weight: 1.05 },
  { id: 'prd-003', sku: 'CC-2000', name: 'Coca-Cola 2л', category: 'Газированные напитки', subcategory: 'Кола', brand: 'Coca-Cola', volume: '2л', barcode: '5449000001016', weight: 2.1 },
  { id: 'prd-004', sku: 'FA-500', name: 'Fanta Апельсин 0.5л', category: 'Газированные напитки', subcategory: 'Фруктовые', brand: 'Fanta', volume: '0.5л', barcode: '5449000011527', weight: 0.55 },
  { id: 'prd-005', sku: 'FA-1000', name: 'Fanta Апельсин 1л', category: 'Газированные напитки', subcategory: 'Фруктовые', brand: 'Fanta', volume: '1л', barcode: '5449000011534', weight: 1.05 },
  { id: 'prd-006', sku: 'SP-500', name: 'Sprite 0.5л', category: 'Газированные напитки', subcategory: 'Лимон-лайм', brand: 'Sprite', volume: '0.5л', barcode: '5449000014535', weight: 0.55 },
  { id: 'prd-007', sku: 'SP-1500', name: 'Sprite 1.5л', category: 'Газированные напитки', subcategory: 'Лимон-лайм', brand: 'Sprite', volume: '1.5л', barcode: '5449000014542', weight: 1.55 },
  { id: 'prd-008', sku: 'PEP-500', name: 'Pepsi 0.5л', category: 'Газированные напитки', subcategory: 'Кола', brand: 'Pepsi', volume: '0.5л', barcode: '4600494001234', weight: 0.55 },
  { id: 'prd-009', sku: 'PEP-1000', name: 'Pepsi 1л', category: 'Газированные напитки', subcategory: 'Кола', brand: 'Pepsi', volume: '1л', barcode: '4600494001241', weight: 1.05 },
  { id: 'prd-010', sku: '7UP-500', name: '7UP 0.5л', category: 'Газированные напитки', subcategory: 'Лимон-лайм', brand: '7UP', volume: '0.5л', barcode: '4600494005678', weight: 0.55 },

  // Вода
  { id: 'prd-011', sku: 'BON-500', name: 'BonAqua 0.5л', category: 'Вода', subcategory: 'Без газа', brand: 'BonAqua', volume: '0.5л', barcode: '5449000100894', weight: 0.52 },
  { id: 'prd-012', sku: 'BON-1500', name: 'BonAqua 1.5л', category: 'Вода', subcategory: 'Без газа', brand: 'BonAqua', volume: '1.5л', barcode: '5449000100900', weight: 1.55 },
  { id: 'prd-013', sku: 'SV-500', name: 'Святой Источник 0.5л', category: 'Вода', subcategory: 'Без газа', brand: 'Святой Источник', volume: '0.5л', barcode: '4607047320012', weight: 0.52 },
  { id: 'prd-014', sku: 'SV-1500', name: 'Святой Источник 1.5л', category: 'Вода', subcategory: 'Без газа', brand: 'Святой Источник', volume: '1.5л', barcode: '4607047320029', weight: 1.55 },
  { id: 'prd-015', sku: 'ESS-500', name: 'Ессентуки №17 0.5л', category: 'Вода', subcategory: 'Минеральная', brand: 'Ессентуки', volume: '0.5л', barcode: '4600536005012', weight: 0.55 },
  { id: 'prd-016', sku: 'ESS4-500', name: 'Ессентуки №4 0.5л', category: 'Вода', subcategory: 'Минеральная', brand: 'Ессентуки', volume: '0.5л', barcode: '4600536004012', weight: 0.55 },
  { id: 'prd-017', sku: 'NAR-500', name: 'Нарзан 0.5л', category: 'Вода', subcategory: 'Минеральная', brand: 'Нарзан', volume: '0.5л', barcode: '4600536080012', weight: 0.55 },

  // Соки
  { id: 'prd-018', sku: 'DJ-1000-APL', name: 'Добрый Яблоко 1л', category: 'Соки', subcategory: 'Яблоко', brand: 'Добрый', volume: '1л', barcode: '4602024000123', weight: 1.05 },
  { id: 'prd-019', sku: 'DJ-1000-ORA', name: 'Добрый Апельсин 1л', category: 'Соки', subcategory: 'Апельсин', brand: 'Добрый', volume: '1л', barcode: '4602024000130', weight: 1.05 },
  { id: 'prd-020', sku: 'DJ-1000-TOM', name: 'Добрый Томат 1л', category: 'Соки', subcategory: 'Томат', brand: 'Добрый', volume: '1л', barcode: '4602024000147', weight: 1.08 },
  { id: 'prd-021', sku: 'RR-1000-APL', name: 'Rich Яблоко 1л', category: 'Соки', subcategory: 'Яблоко', brand: 'Rich', volume: '1л', barcode: '4602024001000', weight: 1.05 },
  { id: 'prd-022', sku: 'RR-1000-VIN', name: 'Rich Виноград 1л', category: 'Соки', subcategory: 'Виноград', brand: 'Rich', volume: '1л', barcode: '4602024001017', weight: 1.05 },
  { id: 'prd-023', sku: 'LB-200-APL', name: 'Любимый Яблоко 0.2л', category: 'Соки', subcategory: 'Яблоко', brand: 'Любимый', volume: '0.2л', barcode: '4602024002000', weight: 0.22 },
  { id: 'prd-024', sku: 'LB-1000-MUL', name: 'Любимый Мультифрукт 1л', category: 'Соки', subcategory: 'Мультифрукт', brand: 'Любимый', volume: '1л', barcode: '4602024002017', weight: 1.05 },

  // Чай холодный
  { id: 'prd-025', sku: 'LIP-500-LEM', name: 'Lipton Лимон 0.5л', category: 'Холодный чай', subcategory: 'Лимон', brand: 'Lipton', volume: '0.5л', barcode: '4823063100120', weight: 0.53 },
  { id: 'prd-026', sku: 'LIP-500-PCH', name: 'Lipton Персик 0.5л', category: 'Холодный чай', subcategory: 'Персик', brand: 'Lipton', volume: '0.5л', barcode: '4823063100137', weight: 0.53 },
  { id: 'prd-027', sku: 'FT-500-MNG', name: 'FuzeTea Манго-Ромашка 0.5л', category: 'Холодный чай', subcategory: 'Манго', brand: 'FuzeTea', volume: '0.5л', barcode: '5449000234567', weight: 0.53 },

  // Энергетики
  { id: 'prd-028', sku: 'ADR-250', name: 'Adrenaline Rush 0.25л', category: 'Энергетики', subcategory: 'Классический', brand: 'Adrenaline Rush', volume: '0.25л', barcode: '4600494600012', weight: 0.27 },
  { id: 'prd-029', sku: 'ADR-500', name: 'Adrenaline Rush 0.5л', category: 'Энергетики', subcategory: 'Классический', brand: 'Adrenaline Rush', volume: '0.5л', barcode: '4600494600029', weight: 0.53 },
  { id: 'prd-030', sku: 'BRN-500', name: 'Burn 0.5л', category: 'Энергетики', subcategory: 'Классический', brand: 'Burn', volume: '0.5л', barcode: '5449000200012', weight: 0.53 },

  // Квас
  { id: 'prd-031', sku: 'OK-1500', name: 'Очаковский Квас 1.5л', category: 'Квас', subcategory: 'Хлебный', brand: 'Очаковский', volume: '1.5л', barcode: '4600494900012', weight: 1.55 },
  { id: 'prd-032', sku: 'NK-1000', name: 'Никола Квас 1л', category: 'Квас', subcategory: 'Хлебный', brand: 'Никола', volume: '1л', barcode: '4607001560012', weight: 1.05 },

  // Молочные напитки
  { id: 'prd-033', sku: 'DH-930', name: 'Домик в деревне Молоко 2.5% 930мл', category: 'Молочные', subcategory: 'Молоко', brand: 'Домик в деревне', volume: '930мл', barcode: '4607025390012', weight: 0.97 },
  { id: 'prd-034', sku: 'PP-290-VAN', name: 'Простоквашино Ряженка 290г', category: 'Молочные', subcategory: 'Ряженка', brand: 'Простоквашино', volume: '290г', barcode: '4607025391000', weight: 0.30 },
  { id: 'prd-035', sku: 'AG-200-CL', name: 'Агуша Вода детская 0.2л', category: 'Вода', subcategory: 'Детская', brand: 'Агуша', volume: '0.2л', barcode: '4607025392000', weight: 0.22 },
];

// ============================================================
// Возвратная тара (материалы типа empty из ERP)
// ============================================================
const EMPTIES = [
  { id: 'emp-001', sku: 'EMP-PB-01', name: 'Ящик пластиковый (20 бут.)', category: 'Возвратная тара', subcategory: 'Ящики', brand: '', volume: '20 мест', barcode: '9900000000011', weight: 1.2, material_type: 'empty' },
  { id: 'emp-002', sku: 'EMP-PAL-01', name: 'Паллета EUR 1200x800', category: 'Возвратная тара', subcategory: 'Паллеты', brand: '', volume: '1200x800', barcode: '9900000000028', weight: 25.0, material_type: 'empty' },
  { id: 'emp-003', sku: 'EMP-BTL-05', name: 'Бутылка стеклянная 0.5л', category: 'Возвратная тара', subcategory: 'Бутылки', brand: '', volume: '0.5л', barcode: '9900000000035', weight: 0.35, material_type: 'empty' },
];

// ============================================================
// Привязка тары к товарам (tied empties)
// ============================================================
const PRODUCT_EMPTIES = [
  // Coca-Cola 0.5л → 1 бутылка стеклянная, входит в пластиковый ящик по 20 шт
  { id: 'pe-001', product_id: 'prd-001', empty_product_id: 'emp-003', quantity: 1, unit: 'шт', is_active: 1 },
  { id: 'pe-002', product_id: 'prd-001', empty_product_id: 'emp-001', quantity: 0.05, unit: 'шт', is_active: 1 },
  // Coca-Cola 1л → 1 бутылка
  { id: 'pe-003', product_id: 'prd-002', empty_product_id: 'emp-003', quantity: 1, unit: 'шт', is_active: 1 },
  // Fanta 0.5л → 1 бутылка, 1/20 ящика
  { id: 'pe-004', product_id: 'prd-004', empty_product_id: 'emp-003', quantity: 1, unit: 'шт', is_active: 1 },
  { id: 'pe-005', product_id: 'prd-004', empty_product_id: 'emp-001', quantity: 0.05, unit: 'шт', is_active: 1 },
  // Sprite 0.5л → 1 бутылка, 1/20 ящика
  { id: 'pe-006', product_id: 'prd-006', empty_product_id: 'emp-003', quantity: 1, unit: 'шт', is_active: 1 },
  { id: 'pe-007', product_id: 'prd-006', empty_product_id: 'emp-001', quantity: 0.05, unit: 'шт', is_active: 1 },
  // Паллета: ящики перевозятся на паллетах (40 ящиков = 1 паллета)
  { id: 'pe-008', product_id: 'emp-001', empty_product_id: 'emp-002', quantity: 0.025, unit: 'шт', is_active: 1 },
];

// ============================================================
// Единицы измерения (units)
// ============================================================
const UNITS = [
  { code: 'шт', name: 'Штука (PCE)' },
  { code: 'KGM', name: 'Килограмм' },
  { code: 'LTR', name: 'Литр' },
  { code: 'PK', name: 'Упаковка' },
  { code: 'CS', name: 'Ящик' },
  { code: 'PAL', name: 'Паллета' },
];

// ============================================================
// Прайс-лист (базовые и розничные цены)
// ============================================================
function generatePrices() {
  const basePrices = {
    'prd-001': 65, 'prd-002': 99, 'prd-003': 139, 'prd-004': 65, 'prd-005': 99,
    'prd-006': 65, 'prd-007': 109, 'prd-008': 55, 'prd-009': 89, 'prd-010': 55,
    'prd-011': 39, 'prd-012': 59, 'prd-013': 29, 'prd-014': 49, 'prd-015': 69,
    'prd-016': 65, 'prd-017': 59, 'prd-018': 89, 'prd-019': 95, 'prd-020': 89,
    'prd-021': 129, 'prd-022': 135, 'prd-023': 39, 'prd-024': 85,
    'prd-025': 79, 'prd-026': 79, 'prd-027': 79,
    'prd-028': 89, 'prd-029': 139, 'prd-030': 129,
    'prd-031': 89, 'prd-032': 79,
    'prd-033': 85, 'prd-034': 55, 'prd-035': 35,
  };

  const prices = [];
  let idx = 1;
  for (const [productId, basePrice] of Object.entries(basePrices)) {
    prices.push({
      id: `prc-${String(idx++).padStart(3, '0')}`,
      product_id: productId,
      price_type: 'base',
      price: basePrice,
      valid_from: '2026-01-01',
      valid_to: '2026-12-31',
    });
    prices.push({
      id: `prc-${String(idx++).padStart(3, '0')}`,
      product_id: productId,
      price_type: 'promo',
      price: Math.round(basePrice * PROMO_PRICE_MULTIPLIER),
      valid_from: '2026-03-01',
      valid_to: '2026-03-31',
    });
  }
  return prices;
}

// ============================================================
// Клиенты - Розничные магазины Москвы
// ============================================================
const CUSTOMERS = [
  // Центр / ЦАО
  { id: 'cst-001', name: 'ООО "Агроторг"', ship_to_name: 'Пятёрочка #1245', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, ул. Тверская, д. 15', city: 'Москва', region: 'Москва', postal_code: '125009', latitude: 55.7648, longitude: 37.6054, contact_person: 'Кузнецова А.В.', phone: '+74951234567', visit_time_from: '09:00', visit_time_to: '18:00', delivery_notes_text: 'Въезд со двора, домофон 15К. Разгрузка через служебный вход.', customer_type: 'retail', payment_terms: 'credit', credit_limit: 500000, debt_amount: 125000 },
  { id: 'cst-002', name: 'АО "Тандер"', ship_to_name: 'Магнит #8834', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, ул. Арбат, д. 24', city: 'Москва', region: 'Москва', postal_code: '119002', latitude: 55.7520, longitude: 37.5927, contact_person: 'Белов И.П.', phone: '+74959876543', visit_time_from: '08:00', visit_time_to: '20:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 600000, debt_amount: 89000 },
  { id: 'cst-003', name: 'ООО "Дикси Юг"', ship_to_name: 'Дикси #456', legal_name: 'ООО "Дикси Юг"', inn: '5036045205', kpp: '503601001', address: 'г. Москва, Ленинградский пр-т, д. 76', city: 'Москва', region: 'Москва', postal_code: '125315', latitude: 55.8007, longitude: 37.5259, contact_person: 'Морозова Т.Л.', phone: '+74951112233', visit_time_from: '07:00', visit_time_to: '15:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 300000, debt_amount: 45000 },
  { id: 'cst-004', name: 'ООО "Проект Избёнка"', ship_to_name: 'ВкусВилл #78', legal_name: 'ООО "Проект Избёнка"', inn: '5029168824', kpp: '502901001', address: 'г. Москва, ул. Покровка, д. 10', city: 'Москва', region: 'Москва', postal_code: '101000', latitude: 55.7600, longitude: 37.6450, contact_person: 'Фёдоров С.А.', phone: '+74954445566', visit_time_from: '10:00', visit_time_to: '19:00', customer_type: 'retail', payment_terms: 'cash', credit_limit: 200000, debt_amount: 0 },
  { id: 'cst-005', name: 'АО "ТД Перекрёсток"', ship_to_name: 'Перекрёсток #312', legal_name: 'АО "Торговый Дом Перекрёсток"', inn: '7728029110', kpp: '772801001', address: 'г. Москва, Кутузовский пр-т, д. 45', city: 'Москва', region: 'Москва', postal_code: '121151', latitude: 55.7405, longitude: 37.5350, contact_person: 'Новикова Е.М.', phone: '+74957778899', visit_time_from: '08:00', visit_time_to: '21:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 800000, debt_amount: 230000 },

  // Юг / ЮАО / ЮЗАО
  { id: 'cst-006', name: 'ООО "Агроторг"', ship_to_name: 'Пятёрочка #3456', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Варшавское ш., д. 72', city: 'Москва', region: 'Москва', postal_code: '117556', latitude: 55.6545, longitude: 37.6195, contact_person: 'Васильев Н.К.', phone: '+74951230001', visit_time_from: '09:00', visit_time_to: '18:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 400000, debt_amount: 67000 },
  { id: 'cst-007', name: 'ООО "Лента"', ship_to_name: 'Лента #22', legal_name: 'ООО "Лента"', inn: '7814148471', kpp: '781401001', address: 'г. Москва, Каширское ш., д. 61', city: 'Москва', region: 'Москва', postal_code: '115230', latitude: 55.6380, longitude: 37.6440, contact_person: 'Захарова О.П.', phone: '+74951230002', visit_time_from: '06:00', visit_time_to: '22:00', delivery_notes_text: 'Крупногабаритная разгрузка — рампа №3. Пропуск заказывать за 1 час.', customer_type: 'wholesale', payment_terms: 'credit', credit_limit: 1000000, debt_amount: 340000 },
  { id: 'cst-008', name: 'АО "Тандер"', ship_to_name: 'Магнит #5521', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, ул. Профсоюзная, д. 104', city: 'Москва', region: 'Москва', postal_code: '117485', latitude: 55.6290, longitude: 37.5270, contact_person: 'Григорьев А.Ю.', phone: '+74951230003', visit_time_from: '08:00', visit_time_to: '20:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 500000, debt_amount: 112000 },

  // Восток / ВАО / ЮВАО
  { id: 'cst-009', name: 'АО "ТД Перекрёсток"', ship_to_name: 'Перекрёсток #455', legal_name: 'АО "Торговый Дом Перекрёсток"', inn: '7728029110', kpp: '772801001', address: 'г. Москва, Щёлковское ш., д. 75', city: 'Москва', region: 'Москва', postal_code: '105523', latitude: 55.8050, longitude: 37.8050, contact_person: 'Попов В.Г.', phone: '+74951230004', visit_time_from: '09:00', visit_time_to: '17:00', customer_type: 'retail', payment_terms: 'cash', credit_limit: 250000, debt_amount: 0 },
  { id: 'cst-010', name: 'ООО "Агроторг"', ship_to_name: 'Пятёрочка #7721', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Рязанский пр-т, д. 30', city: 'Москва', region: 'Москва', postal_code: '109052', latitude: 55.7220, longitude: 37.7530, contact_person: 'Лебедева М.С.', phone: '+74951230005', visit_time_from: '09:00', visit_time_to: '18:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 350000, debt_amount: 78000 },

  // Север / САО / СВАО
  { id: 'cst-011', name: 'ООО "Дикси Юг"', ship_to_name: 'Дикси #789', legal_name: 'ООО "Дикси Юг"', inn: '5036045205', kpp: '503601001', address: 'г. Москва, Дмитровское ш., д. 89', city: 'Москва', region: 'Москва', postal_code: '127247', latitude: 55.8480, longitude: 37.5580, contact_person: 'Ермаков Д.В.', phone: '+74951230006', visit_time_from: '07:00', visit_time_to: '16:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 400000, debt_amount: 55000 },
  { id: 'cst-012', name: 'АО "Тандер"', ship_to_name: 'Магнит #6612', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, пр-т Мира, д. 176', city: 'Москва', region: 'Москва', postal_code: '129344', latitude: 55.8350, longitude: 37.6370, contact_person: 'Соколов П.Н.', phone: '+74951230007', visit_time_from: '08:00', visit_time_to: '20:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 450000, debt_amount: 91000 },

  // Запад / ЗАО / СЗАО
  { id: 'cst-013', name: 'ООО "Проект Избёнка"', ship_to_name: 'ВкусВилл #112', legal_name: 'ООО "Проект Избёнка"', inn: '5029168824', kpp: '502901001', address: 'г. Москва, ул. Маршала Жукова, д. 35', city: 'Москва', region: 'Москва', postal_code: '123154', latitude: 55.7760, longitude: 37.4720, contact_person: 'Хасанов Р.Ф.', phone: '+74951230008', visit_time_from: '10:00', visit_time_to: '19:00', customer_type: 'retail', payment_terms: 'cash', credit_limit: 300000, debt_amount: 0 },
  { id: 'cst-014', name: 'ООО "Агроторг"', ship_to_name: 'Пятёрочка #4478', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Можайское ш., д. 41', city: 'Москва', region: 'Москва', postal_code: '121471', latitude: 55.7170, longitude: 37.4530, contact_person: 'Мухаметшина Г.И.', phone: '+74951230009', visit_time_from: '09:00', visit_time_to: '18:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 350000, debt_amount: 44000 },

  // Дополнительные точки по Москве
  { id: 'cst-015', name: 'ООО "СПАР Мидл"', ship_to_name: 'Spar #33', legal_name: 'ООО "СПАР Мидл"', inn: '5260254030', kpp: '526001001', address: 'г. Москва, ул. Новокузнецкая, д. 13', city: 'Москва', region: 'Москва', postal_code: '115184', latitude: 55.7380, longitude: 37.6290, contact_person: 'Тихонов И.А.', phone: '+74951230010', visit_time_from: '08:00', visit_time_to: '17:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 250000, debt_amount: 32000 },
  { id: 'cst-016', name: 'АО "Тандер"', ship_to_name: 'Магнит #0012', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, ул. Люблинская, д. 169', city: 'Москва', region: 'Москва', postal_code: '109341', latitude: 55.6610, longitude: 37.7440, contact_person: 'Кравченко С.В.', phone: '+74951230011', visit_time_from: '08:00', visit_time_to: '20:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 700000, debt_amount: 195000 },
  { id: 'cst-017', name: 'ООО "Агроторг"', ship_to_name: 'Пятёрочка #9901', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Ленинский пр-т, д. 89', city: 'Москва', region: 'Москва', postal_code: '119313', latitude: 55.6830, longitude: 37.5340, contact_person: 'Бондаренко Л.Н.', phone: '+74951230012', visit_time_from: '09:00', visit_time_to: '18:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 350000, debt_amount: 57000 },
  { id: 'cst-018', name: 'АО "ТД Перекрёсток"', ship_to_name: 'Перекрёсток #128', legal_name: 'АО "Торговый Дом Перекрёсток"', inn: '7728029110', kpp: '772801001', address: 'г. Москва, ул. Таганская, д. 3', city: 'Москва', region: 'Москва', postal_code: '109004', latitude: 55.7390, longitude: 37.6535, contact_person: 'Орлов В.А.', phone: '+74951230013', visit_time_from: '08:00', visit_time_to: '21:00', customer_type: 'retail', payment_terms: 'credit', credit_limit: 400000, debt_amount: 83000 },

  // HoReCa
  { id: 'cst-019', name: 'ООО "Шоколадница"', ship_to_name: 'Кофейня "Шоколадница"', legal_name: 'ООО "Шоколадница"', inn: '7705557843', kpp: '770501001', address: 'г. Москва, ул. Мясницкая, д. 12', city: 'Москва', region: 'Москва', postal_code: '101000', latitude: 55.7620, longitude: 37.6380, contact_person: 'Романова О.С.', phone: '+74952223344', visit_time_from: '10:00', visit_time_to: '22:00', delivery_notes_text: 'Только мелкий товар. Не более 5 коробок за раз. Звонить за 30 мин.', customer_type: 'horeca', payment_terms: 'credit', credit_limit: 150000, debt_amount: 22000 },
  { id: 'cst-020', name: 'ИП Жуков А.Н.', ship_to_name: 'Столовая "Обед Буфет"', legal_name: 'ИП Жуков А.Н.', inn: '770800112233', kpp: null, address: 'г. Москва, ул. Бауманская, д. 7', city: 'Москва', region: 'Москва', postal_code: '105005', latitude: 55.7720, longitude: 37.6800, contact_person: 'Жуков А.Н.', phone: '+79165556677', visit_time_from: '08:00', visit_time_to: '16:00', customer_type: 'horeca', payment_terms: 'cash', credit_limit: 50000, debt_amount: 0 },
];

// ============================================================
// Транспортные средства (оба — Москва, регион 77)
// ============================================================
const VEHICLES = [
  { id: 'veh-001', plate_number: 'А123БВ77', model: 'ГАЗель Next', driver_id: 'usr-001', capacity_kg: 1500 },
  { id: 'veh-002', plate_number: 'К456МН77', model: 'ГАЗель Business', driver_id: 'usr-003', capacity_kg: 1200 },
  { id: 'veh-003', plate_number: 'Е789ОР77', model: 'Lada Largus', driver_id: 'usr-005', capacity_kg: 700 },
];

// ============================================================
// Остатки на основном складе
// ============================================================
function generateStock() {
  return PRODUCTS.map((p, i) => ({
    id: `stk-${String(i + 1).padStart(3, '0')}`,
    product_id: p.id,
    warehouse: 'main',
    quantity: Math.floor(Math.random() * 500) + 100,
    reserved: Math.floor(Math.random() * 30),
  }));
}

// ============================================================
// Остатки в кузовах машин (загрузка рейса)
// ============================================================
function generateVehicleStock() {
  const stock = [];
  let idx = 1;

  // Петров: покрытие заказов ord-001..003, ord-006, ord-007 + ~20% запас
  const vehicle1Products = [
    { product_id: 'prd-001', quantity: 200 },  // CC-500: заказано 168
    { product_id: 'prd-002', quantity: 72 },   // CC-1000: заказано 48
    { product_id: 'prd-003', quantity: 36 },   // CC-2000: заказано 24
    { product_id: 'prd-004', quantity: 36 },   // FA-500: заказано 24
    { product_id: 'prd-006', quantity: 48 },   // SP-500: заказано 36
    { product_id: 'prd-008', quantity: 48 },   // PEP-500: заказано 36
    { product_id: 'prd-011', quantity: 120 },  // BON-500: заказано 96
    { product_id: 'prd-015', quantity: 60 },   // ESS-500: заказано 48
    { product_id: 'prd-018', quantity: 60 },   // DJ-1000-APL: заказано 48
    { product_id: 'prd-021', quantity: 72 },   // RR-1000-APL: заказано 54
    { product_id: 'prd-025', quantity: 72 },   // LIP-500-LEM: заказано 60
    { product_id: 'prd-028', quantity: 36 },   // ADR-250: заказано 24
    { product_id: 'prd-029', quantity: 72 },   // ADR-500: заказано 48
    { product_id: 'prd-031', quantity: 24 },   // OK-1500: заказано 18
    // Свободный запас (не в заказах)
    { product_id: 'prd-005', quantity: 24 },   // FA-1000
    { product_id: 'prd-010', quantity: 24 },   // 7UP-500
    { product_id: 'prd-012', quantity: 36 },   // BON-1500
    { product_id: 'prd-019', quantity: 24 },   // DJ-1000-ORA
    { product_id: 'prd-027', quantity: 24 },   // FT-500-MNG
  ];

  for (const item of vehicle1Products) {
    stock.push({
      id: `vstk-${String(idx++).padStart(3, '0')}`,
      product_id: item.product_id,
      warehouse: 'veh-001',
      quantity: item.quantity,
      reserved: 0,
    });
  }

  // Козлов: покрытие заказов ord-004, ord-005 + ~20% запас
  const vehicle2Products = [
    { product_id: 'prd-001', quantity: 100 },  // CC-500: заказано 84
    { product_id: 'prd-006', quantity: 48 },   // SP-500: заказано 36
    { product_id: 'prd-013', quantity: 72 },   // SV-500: заказано 60
    { product_id: 'prd-019', quantity: 48 },   // DJ-1000-ORA: заказано 36
    { product_id: 'prd-026', quantity: 48 },   // LIP-500-PCH: заказано 36
    { product_id: 'prd-030', quantity: 48 },   // BRN-500: заказано 36
    { product_id: 'prd-032', quantity: 36 },   // NK-1000: заказано 24
    // Свободный запас (не в заказах)
    { product_id: 'prd-008', quantity: 36 },   // PEP-500
    { product_id: 'prd-011', quantity: 48 },   // BON-500
    { product_id: 'prd-017', quantity: 24 },   // NAR-500
    { product_id: 'prd-025', quantity: 24 },   // LIP-500-LEM
    { product_id: 'prd-028', quantity: 24 },   // ADR-250
  ];

  for (const item of vehicle2Products) {
    stock.push({
      id: `vstk-${String(idx++).padStart(3, '0')}`,
      product_id: item.product_id,
      warehouse: 'veh-002',
      quantity: item.quantity,
      reserved: 0,
    });
  }

  return stock;
}

// ============================================================
// Маршруты на сегодня и завтра — Москва
// ============================================================
function generateRoutes() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const routes = [
    // Сегодня — Петров ×2, Козлов ×1, Соколов ×2
    { id: 'rte-001', date: today, name: 'Центр + Запад', driver_id: 'usr-001', status: 'planned', vehicle_number: 'А123БВ77' },
    { id: 'rte-002', date: today, name: 'Юг', driver_id: 'usr-001', status: 'planned', vehicle_number: 'А123БВ77' },
    { id: 'rte-003', date: today, name: 'Восток', driver_id: 'usr-003', status: 'planned', vehicle_number: 'К456МН77' },
    { id: 'rte-004', date: today, name: 'Центр (Preseller)', driver_id: 'usr-005', status: 'planned', vehicle_number: 'Е789ОР77' },
    { id: 'rte-005', date: today, name: 'Север + Запад (Preseller)', driver_id: 'usr-005', status: 'planned', vehicle_number: 'Е789ОР77' },
    // Завтра — Петров ×1, Козлов ×1, Соколов ×1
    { id: 'rte-006', date: tomorrow, name: 'Север + Восток', driver_id: 'usr-001', status: 'planned', vehicle_number: 'А123БВ77' },
    { id: 'rte-007', date: tomorrow, name: 'Запад + Центр', driver_id: 'usr-003', status: 'planned', vehicle_number: 'К456МН77' },
    { id: 'rte-008', date: tomorrow, name: 'Юг + HoReCa (Preseller)', driver_id: 'usr-005', status: 'planned', vehicle_number: 'Е789ОР77' },
  ];

  const routePoints = [
    // === СЕГОДНЯ ===

    // Маршрут 1 — Петров: Центр + Запад (7 точек)
    { id: 'rp-001', route_id: 'rte-001', customer_id: 'cst-001', sequence_number: 1, planned_arrival: `${today}T09:00:00`, status: 'pending' },
    { id: 'rp-002', route_id: 'rte-001', customer_id: 'cst-002', sequence_number: 2, planned_arrival: `${today}T10:00:00`, status: 'pending' },
    { id: 'rp-003', route_id: 'rte-001', customer_id: 'cst-003', sequence_number: 3, planned_arrival: `${today}T11:00:00`, status: 'pending' },
    { id: 'rp-004', route_id: 'rte-001', customer_id: 'cst-004', sequence_number: 4, planned_arrival: `${today}T12:30:00`, status: 'pending' },
    { id: 'rp-005', route_id: 'rte-001', customer_id: 'cst-005', sequence_number: 5, planned_arrival: `${today}T14:00:00`, status: 'pending' },
    { id: 'rp-006', route_id: 'rte-001', customer_id: 'cst-019', sequence_number: 6, planned_arrival: `${today}T15:30:00`, status: 'pending' },
    { id: 'rp-007', route_id: 'rte-001', customer_id: 'cst-020', sequence_number: 7, planned_arrival: `${today}T16:30:00`, status: 'pending' },

    // Маршрут 2 — Петров: Юг (5 точек)
    { id: 'rp-008', route_id: 'rte-002', customer_id: 'cst-006', sequence_number: 1, planned_arrival: `${today}T09:00:00`, status: 'pending' },
    { id: 'rp-009', route_id: 'rte-002', customer_id: 'cst-007', sequence_number: 2, planned_arrival: `${today}T10:00:00`, status: 'pending' },
    { id: 'rp-010', route_id: 'rte-002', customer_id: 'cst-008', sequence_number: 3, planned_arrival: `${today}T11:30:00`, status: 'pending' },
    { id: 'rp-011', route_id: 'rte-002', customer_id: 'cst-017', sequence_number: 4, planned_arrival: `${today}T13:00:00`, status: 'pending' },
    { id: 'rp-012', route_id: 'rte-002', customer_id: 'cst-016', sequence_number: 5, planned_arrival: `${today}T14:30:00`, status: 'pending' },

    // Маршрут 3 — Козлов: Восток Москвы (6 точек)
    { id: 'rp-013', route_id: 'rte-003', customer_id: 'cst-009', sequence_number: 1, planned_arrival: `${today}T09:00:00`, status: 'pending' },
    { id: 'rp-014', route_id: 'rte-003', customer_id: 'cst-010', sequence_number: 2, planned_arrival: `${today}T10:00:00`, status: 'pending' },
    { id: 'rp-015', route_id: 'rte-003', customer_id: 'cst-016', sequence_number: 3, planned_arrival: `${today}T11:00:00`, status: 'pending' },
    { id: 'rp-016', route_id: 'rte-003', customer_id: 'cst-018', sequence_number: 4, planned_arrival: `${today}T12:30:00`, status: 'pending' },
    { id: 'rp-017', route_id: 'rte-003', customer_id: 'cst-011', sequence_number: 5, planned_arrival: `${today}T14:00:00`, status: 'pending' },
    { id: 'rp-018', route_id: 'rte-003', customer_id: 'cst-012', sequence_number: 6, planned_arrival: `${today}T15:30:00`, status: 'pending' },

    // Маршрут 4 — Соколов (Preseller): Центр (5 точек)
    { id: 'rp-019', route_id: 'rte-004', customer_id: 'cst-001', sequence_number: 1, planned_arrival: `${today}T09:30:00`, status: 'pending' },
    { id: 'rp-020', route_id: 'rte-004', customer_id: 'cst-002', sequence_number: 2, planned_arrival: `${today}T10:30:00`, status: 'pending' },
    { id: 'rp-021', route_id: 'rte-004', customer_id: 'cst-003', sequence_number: 3, planned_arrival: `${today}T12:00:00`, status: 'pending' },
    { id: 'rp-022', route_id: 'rte-004', customer_id: 'cst-004', sequence_number: 4, planned_arrival: `${today}T13:30:00`, status: 'pending' },
    { id: 'rp-023', route_id: 'rte-004', customer_id: 'cst-015', sequence_number: 5, planned_arrival: `${today}T15:00:00`, status: 'pending' },

    // Маршрут 5 — Соколов (Preseller): Север + Запад (4 точки)
    { id: 'rp-024', route_id: 'rte-005', customer_id: 'cst-011', sequence_number: 1, planned_arrival: `${today}T09:30:00`, status: 'pending' },
    { id: 'rp-025', route_id: 'rte-005', customer_id: 'cst-013', sequence_number: 2, planned_arrival: `${today}T11:00:00`, status: 'pending' },
    { id: 'rp-026', route_id: 'rte-005', customer_id: 'cst-014', sequence_number: 3, planned_arrival: `${today}T12:30:00`, status: 'pending' },
    { id: 'rp-027', route_id: 'rte-005', customer_id: 'cst-005', sequence_number: 4, planned_arrival: `${today}T14:00:00`, status: 'pending' },

    // === ЗАВТРА ===

    // Маршрут 6 — Петров: Север + Восток (6 точек)
    { id: 'rp-028', route_id: 'rte-006', customer_id: 'cst-011', sequence_number: 1, planned_arrival: `${tomorrow}T09:00:00`, status: 'pending' },
    { id: 'rp-029', route_id: 'rte-006', customer_id: 'cst-012', sequence_number: 2, planned_arrival: `${tomorrow}T10:00:00`, status: 'pending' },
    { id: 'rp-030', route_id: 'rte-006', customer_id: 'cst-009', sequence_number: 3, planned_arrival: `${tomorrow}T11:00:00`, status: 'pending' },
    { id: 'rp-031', route_id: 'rte-006', customer_id: 'cst-010', sequence_number: 4, planned_arrival: `${tomorrow}T12:30:00`, status: 'pending' },
    { id: 'rp-032', route_id: 'rte-006', customer_id: 'cst-013', sequence_number: 5, planned_arrival: `${tomorrow}T14:00:00`, status: 'pending' },
    { id: 'rp-033', route_id: 'rte-006', customer_id: 'cst-014', sequence_number: 6, planned_arrival: `${tomorrow}T15:30:00`, status: 'pending' },

    // Маршрут 7 — Козлов: Запад + Центр (5 точек)
    { id: 'rp-034', route_id: 'rte-007', customer_id: 'cst-005', sequence_number: 1, planned_arrival: `${tomorrow}T09:00:00`, status: 'pending' },
    { id: 'rp-035', route_id: 'rte-007', customer_id: 'cst-015', sequence_number: 2, planned_arrival: `${tomorrow}T10:00:00`, status: 'pending' },
    { id: 'rp-036', route_id: 'rte-007', customer_id: 'cst-017', sequence_number: 3, planned_arrival: `${tomorrow}T11:30:00`, status: 'pending' },
    { id: 'rp-037', route_id: 'rte-007', customer_id: 'cst-004', sequence_number: 4, planned_arrival: `${tomorrow}T13:00:00`, status: 'pending' },
    { id: 'rp-038', route_id: 'rte-007', customer_id: 'cst-001', sequence_number: 5, planned_arrival: `${tomorrow}T14:30:00`, status: 'pending' },

    // Маршрут 8 — Соколов (Preseller): Юг + HoReCa (4 точки)
    { id: 'rp-039', route_id: 'rte-008', customer_id: 'cst-006', sequence_number: 1, planned_arrival: `${tomorrow}T09:30:00`, status: 'pending' },
    { id: 'rp-040', route_id: 'rte-008', customer_id: 'cst-017', sequence_number: 2, planned_arrival: `${tomorrow}T11:00:00`, status: 'pending' },
    { id: 'rp-041', route_id: 'rte-008', customer_id: 'cst-020', sequence_number: 3, planned_arrival: `${tomorrow}T12:30:00`, status: 'pending' },
    { id: 'rp-042', route_id: 'rte-008', customer_id: 'cst-019', sequence_number: 4, planned_arrival: `${tomorrow}T14:00:00`, status: 'pending' },
  ];

  return { routes, routePoints };
}

// ============================================================
// Тестовые заказы
// ============================================================
function generateOrders() {
  const today = new Date().toISOString().split('T')[0];

  const orders = [
    { id: 'ord-001', customer_id: 'cst-001', user_id: 'usr-001', route_id: 'rte-001', route_point_id: 'rp-001', order_date: today, status: 'confirmed', total_amount: 12450, discount_amount: 0, vat_amount: 2739, currency: 'RUB' },
    { id: 'ord-002', customer_id: 'cst-002', user_id: 'usr-001', route_id: 'rte-001', route_point_id: 'rp-002', order_date: today, status: 'confirmed', total_amount: 8970, discount_amount: 500, vat_amount: 1973.4, currency: 'RUB' },
    { id: 'ord-003', customer_id: 'cst-005', user_id: 'usr-001', route_id: 'rte-001', route_point_id: 'rp-005', order_date: today, status: 'confirmed', total_amount: 23100, discount_amount: 1200, vat_amount: 5082, currency: 'RUB' },
    { id: 'ord-004', customer_id: 'cst-009', user_id: 'usr-003', route_id: 'rte-003', route_point_id: 'rp-013', order_date: today, status: 'confirmed', total_amount: 15600, discount_amount: 0, vat_amount: 3432, currency: 'RUB' },
    { id: 'ord-005', customer_id: 'cst-016', user_id: 'usr-003', route_id: 'rte-003', route_point_id: 'rp-015', order_date: today, status: 'draft', total_amount: 7890, discount_amount: 0, vat_amount: 1735.8, currency: 'RUB' },
    // Дополнительные заказы Петрова — маршрут 1, точки 2 и 3
    { id: 'ord-006', customer_id: 'cst-002', user_id: 'usr-001', route_id: 'rte-001', route_point_id: 'rp-002', order_date: today, status: 'confirmed', total_amount: 5740, discount_amount: 0, vat_amount: 1262.8, currency: 'RUB' },
    { id: 'ord-007', customer_id: 'cst-003', user_id: 'usr-001', route_id: 'rte-001', route_point_id: 'rp-003', order_date: today, status: 'confirmed', total_amount: 9350, discount_amount: 400, vat_amount: 2057, currency: 'RUB' },
  ];

  const orderItems = [
    // Заказ 1 — Пятёрочка Тверская
    { id: 'oi-001', order_id: 'ord-001', product_id: 'prd-001', quantity: 48, price: 65, discount_percent: 0, total: 3120 },
    { id: 'oi-002', order_id: 'ord-001', product_id: 'prd-003', quantity: 24, price: 139, discount_percent: 0, total: 3336 },
    { id: 'oi-003', order_id: 'ord-001', product_id: 'prd-011', quantity: 48, price: 39, discount_percent: 0, total: 1872 },
    { id: 'oi-004', order_id: 'ord-001', product_id: 'prd-018', quantity: 24, price: 89, discount_percent: 0, total: 2136 },
    { id: 'oi-005', order_id: 'ord-001', product_id: 'prd-028', quantity: 24, price: 89, discount_percent: 0, total: 1986 },

    // Заказ 2 — Магнит Арбат
    { id: 'oi-006', order_id: 'ord-002', product_id: 'prd-008', quantity: 36, price: 55, discount_percent: 0, total: 1980 },
    { id: 'oi-007', order_id: 'ord-002', product_id: 'prd-004', quantity: 24, price: 65, discount_percent: 0, total: 1560 },
    { id: 'oi-008', order_id: 'ord-002', product_id: 'prd-025', quantity: 36, price: 79, discount_percent: 0, total: 2844 },
    { id: 'oi-009', order_id: 'ord-002', product_id: 'prd-031', quantity: 18, price: 89, discount_percent: 5, total: 1521.9 },

    // Заказ 3 — Перекрёсток Кутузовский
    { id: 'oi-010', order_id: 'ord-003', product_id: 'prd-001', quantity: 60, price: 65, discount_percent: 3, total: 3783 },
    { id: 'oi-011', order_id: 'ord-003', product_id: 'prd-002', quantity: 48, price: 99, discount_percent: 3, total: 4609.44 },
    { id: 'oi-012', order_id: 'ord-003', product_id: 'prd-021', quantity: 36, price: 129, discount_percent: 0, total: 4644 },
    { id: 'oi-013', order_id: 'ord-003', product_id: 'prd-029', quantity: 48, price: 139, discount_percent: 0, total: 6672 },
    { id: 'oi-014', order_id: 'ord-003', product_id: 'prd-015', quantity: 24, price: 69, discount_percent: 0, total: 1656 },

    // Заказ 4 — Пятёрочка Варшавское ш.
    { id: 'oi-015', order_id: 'ord-004', product_id: 'prd-001', quantity: 48, price: 65, discount_percent: 0, total: 3120 },
    { id: 'oi-016', order_id: 'ord-004', product_id: 'prd-006', quantity: 36, price: 65, discount_percent: 0, total: 2340 },
    { id: 'oi-017', order_id: 'ord-004', product_id: 'prd-019', quantity: 36, price: 95, discount_percent: 0, total: 3420 },
    { id: 'oi-018', order_id: 'ord-004', product_id: 'prd-013', quantity: 60, price: 29, discount_percent: 0, total: 1740 },
    { id: 'oi-019', order_id: 'ord-004', product_id: 'prd-030', quantity: 36, price: 129, discount_percent: 5, total: 4413.6 },

    // Заказ 5 — Магнит Люблинская (черновик)
    { id: 'oi-020', order_id: 'ord-005', product_id: 'prd-001', quantity: 36, price: 65, discount_percent: 0, total: 2340 },
    { id: 'oi-021', order_id: 'ord-005', product_id: 'prd-032', quantity: 24, price: 79, discount_percent: 0, total: 1896 },
    { id: 'oi-022', order_id: 'ord-005', product_id: 'prd-026', quantity: 36, price: 79, discount_percent: 0, total: 2844 },

    // Заказ 6 — Магнит Арбат (второй заказ, доп. ассортимент)
    { id: 'oi-023', order_id: 'ord-006', product_id: 'prd-011', quantity: 48, price: 39, discount_percent: 0, total: 1872 },
    { id: 'oi-024', order_id: 'ord-006', product_id: 'prd-015', quantity: 24, price: 69, discount_percent: 0, total: 1656 },
    { id: 'oi-025', order_id: 'ord-006', product_id: 'prd-021', quantity: 18, price: 129, discount_percent: 3, total: 2253.06 },

    // Заказ 7 — Дикси Ленинградский пр-т
    { id: 'oi-026', order_id: 'ord-007', product_id: 'prd-001', quantity: 60, price: 65, discount_percent: 0, total: 3900 },
    { id: 'oi-027', order_id: 'ord-007', product_id: 'prd-006', quantity: 36, price: 65, discount_percent: 0, total: 2340 },
    { id: 'oi-028', order_id: 'ord-007', product_id: 'prd-018', quantity: 24, price: 89, discount_percent: 5, total: 2030.4 },
    { id: 'oi-029', order_id: 'ord-007', product_id: 'prd-025', quantity: 24, price: 79, discount_percent: 0, total: 1896 },
  ];

  return { orders, orderItems };
}

// ============================================================
// Тестовые доставки и платежи
// ============================================================
function generateDeliveriesAndPayments() {
  const today = new Date().toISOString().split('T')[0];

  const deliveries = [
    { id: 'dlv-001', order_id: 'ord-001', route_id: 'rte-001', route_point_id: 'rp-001', customer_id: 'cst-001', driver_id: 'usr-001', delivery_date: today, status: 'delivered', total_amount: 12450, currency: 'RUB', signature_name: 'Кузнецова А.В.', signature_confirmed: 1 },
    { id: 'dlv-002', order_id: 'ord-002', route_id: 'rte-001', route_point_id: 'rp-002', customer_id: 'cst-002', driver_id: 'usr-001', delivery_date: today, status: 'delivered', total_amount: 8470, currency: 'RUB', signature_name: 'Белов И.П.', signature_confirmed: 1 },
  ];

  const deliveryItems = [
    { id: 'di-001', delivery_id: 'dlv-001', product_id: 'prd-001', ordered_quantity: 48, delivered_quantity: 48, price: 65, total: 3120 },
    { id: 'di-002', delivery_id: 'dlv-001', product_id: 'prd-003', ordered_quantity: 24, delivered_quantity: 24, price: 139, total: 3336 },
    { id: 'di-003', delivery_id: 'dlv-001', product_id: 'prd-011', ordered_quantity: 48, delivered_quantity: 48, price: 39, total: 1872 },
    { id: 'di-004', delivery_id: 'dlv-001', product_id: 'prd-018', ordered_quantity: 24, delivered_quantity: 24, price: 89, total: 2136 },
    { id: 'di-005', delivery_id: 'dlv-001', product_id: 'prd-028', ordered_quantity: 24, delivered_quantity: 24, price: 89, total: 1986 },
    { id: 'di-006', delivery_id: 'dlv-002', product_id: 'prd-008', ordered_quantity: 36, delivered_quantity: 36, price: 55, total: 1980 },
    { id: 'di-007', delivery_id: 'dlv-002', product_id: 'prd-004', ordered_quantity: 24, delivered_quantity: 24, price: 65, total: 1560 },
    { id: 'di-008', delivery_id: 'dlv-002', product_id: 'prd-025', ordered_quantity: 36, delivered_quantity: 36, price: 79, total: 2844 },
    { id: 'di-009', delivery_id: 'dlv-002', product_id: 'prd-031', ordered_quantity: 18, delivered_quantity: 12, price: 89, total: 1068, reason_code: 'damaged' },
  ];

  const payments = [
    { id: 'pay-001', customer_id: 'cst-001', user_id: 'usr-001', order_id: 'ord-001', delivery_id: 'dlv-001', route_point_id: 'rp-001', payment_date: today, amount: 12450, change_amount: 0, currency: 'RUB', payment_type: 'cash', status: 'completed', receipt_number: 'ПКО-001' },
    { id: 'pay-002', customer_id: 'cst-002', user_id: 'usr-001', order_id: 'ord-002', delivery_id: 'dlv-002', route_point_id: 'rp-002', payment_date: today, amount: 5000, change_amount: 0, currency: 'RUB', payment_type: 'card', status: 'completed', receipt_number: 'ПКО-002' },
  ];

  return { deliveries, deliveryItems, payments };
}

// ============================================================
// Возвраты (с разными статусами для супервайзера)
// ============================================================
function generateReturns() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const returns = [
    { id: 'ret-001', customer_id: 'cst-001', driver_id: 'usr-001', route_point_id: 'rp-001', return_date: today, reason: 'damaged', status: 'pending_approval', total_amount: 780 },
    { id: 'ret-002', customer_id: 'cst-005', driver_id: 'usr-001', route_point_id: 'rp-005', return_date: today, reason: 'expired', status: 'pending_approval', total_amount: 1560 },
    { id: 'ret-003', customer_id: 'cst-009', driver_id: 'usr-003', route_point_id: 'rp-013', return_date: yesterday, reason: 'quality', status: 'approved', total_amount: 390, approved_by: 'usr-004', approved_at: `${yesterday}T14:30:00` },
    { id: 'ret-004', customer_id: 'cst-002', driver_id: 'usr-001', route_point_id: 'rp-002', return_date: yesterday, reason: 'unsold', status: 'rejected', total_amount: 5500, approved_by: 'usr-004', approved_at: `${yesterday}T15:00:00`, rejection_reason: 'Превышен лимит возврата' },
  ];

  const returnItems = [
    { id: 'ri-001', return_id: 'ret-001', product_id: 'prd-001', quantity: 12, price: 65, total: 780, condition: 'damaged', reason: 'Повреждена упаковка при транспортировке' },
    { id: 'ri-002', return_id: 'ret-002', product_id: 'prd-033', quantity: 12, price: 85, total: 1020, condition: 'expired', reason: 'Истёк срок годности' },
    { id: 'ri-003', return_id: 'ret-002', product_id: 'prd-034', quantity: 18, price: 30, total: 540, condition: 'expired', reason: 'Истёк срок годности' },
    { id: 'ri-004', return_id: 'ret-003', product_id: 'prd-011', quantity: 10, price: 39, total: 390, condition: 'normal', reason: 'Бракованная партия' },
    { id: 'ri-005', return_id: 'ret-004', product_id: 'prd-008', quantity: 100, price: 55, total: 5500, condition: 'normal', reason: 'Не реализовано' },
  ];

  return { returns, returnItems };
}

// ============================================================
// Уведомления
// ============================================================
function generateNotifications() {
  const now = new Date().toISOString();

  return [
    // Экспедитор Петров
    { id: 'ntf-001', user_id: 'usr-001', title: 'Маршрут назначен', message: 'Вам назначен маршрут на сегодня: Москва центр, 7 точек', type: 'info', is_read: 0, related_entity: 'route', related_id: 'rte-001', created_at: now },
    { id: 'ntf-002', user_id: 'usr-001', title: 'Загрузка рейса', message: 'Подготовьте автомобиль к загрузке до 08:00', type: 'warning', is_read: 0, related_entity: 'loading_trip', related_id: null, created_at: now },
    { id: 'ntf-003', user_id: 'usr-001', title: 'Возврат отклонён', message: 'Возврат по Магнит #8834 отклонён супервайзером: Превышен лимит возврата', type: 'error', is_read: 1, related_entity: 'return', related_id: 'ret-004', created_at: now },

    // Экспедитор Козлов
    { id: 'ntf-004', user_id: 'usr-003', title: 'Маршрут назначен', message: 'Вам назначен маршрут на сегодня: Москва восток, 6 точек', type: 'info', is_read: 0, related_entity: 'route', related_id: 'rte-003', created_at: now },

    // Супервайзер Иванова
    { id: 'ntf-005', user_id: 'usr-004', title: 'Возврат на утверждение', message: 'Новый возврат от Петрова А.И. — Пятёрочка #1245, 780 ₽', type: 'warning', is_read: 0, related_entity: 'return', related_id: 'ret-001', created_at: now },
    { id: 'ntf-006', user_id: 'usr-004', title: 'Возврат на утверждение', message: 'Новый возврат от Петрова А.И. — Перекрёсток #312, 1 560 ₽', type: 'warning', is_read: 0, related_entity: 'return', related_id: 'ret-002', created_at: now },
    { id: 'ntf-007', user_id: 'usr-004', title: 'Задержка на маршруте', message: 'Козлов Д.С. отстаёт от графика на 15 мин', type: 'error', is_read: 0, related_entity: 'route', related_id: 'rte-003', created_at: now },

    // Администратор
    { id: 'ntf-008', user_id: 'usr-006', title: 'Ошибка синхронизации', message: 'Устройство Козлова Д.С. не синхронизировалось более 2 часов', type: 'error', is_read: 0, related_entity: 'device', related_id: 'dev-002', created_at: now },
  ];
}

// ============================================================
// Устройства
// ============================================================
function generateDevices() {
  const now = new Date().toISOString();
  const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();

  return [
    { id: 'dev-001', user_id: 'usr-001', device_model: 'Samsung Galaxy A54', os_version: 'Android 14', app_version: '1.0.0', last_sync_at: now, status: 'active', storage_used_mb: 145.3 },
    { id: 'dev-002', user_id: 'usr-003', device_model: 'Xiaomi Redmi Note 12', os_version: 'Android 13', app_version: '1.0.0', last_sync_at: twoHoursAgo, status: 'active', storage_used_mb: 98.7 },
    { id: 'dev-003', user_id: 'usr-004', device_model: 'iPhone 15', os_version: 'iOS 17.4', app_version: '1.0.0', last_sync_at: now, status: 'active', storage_used_mb: 67.2 },
    { id: 'dev-004', user_id: 'usr-006', device_model: 'iPad Pro 12.9', os_version: 'iPadOS 17.4', app_version: '1.0.0', last_sync_at: now, status: 'active', storage_used_mb: 210.5 },
  ];
}

// ============================================================
// Аудит-лог
// ============================================================
function generateAuditLog() {
  const now = new Date();
  const entries = [];

  const actions = [
    { user_id: 'usr-001', action: 'login', entity_type: 'session', details: 'Вход в систему с устройства Samsung Galaxy A54' },
    { user_id: 'usr-001', action: 'route_start', entity_type: 'route', entity_id: 'rte-001', details: 'Начат маршрут Москва центр' },
    { user_id: 'usr-001', action: 'delivery_complete', entity_type: 'delivery', entity_id: 'dlv-001', details: 'Доставка завершена — Пятёрочка #1245, 12 450 ₽' },
    { user_id: 'usr-001', action: 'payment_received', entity_type: 'payment', entity_id: 'pay-001', details: 'Принята оплата наличными 12 450 ₽' },
    { user_id: 'usr-001', action: 'delivery_complete', entity_type: 'delivery', entity_id: 'dlv-002', details: 'Доставка завершена — Магнит #8834, 8 470 ₽' },
    { user_id: 'usr-001', action: 'return_created', entity_type: 'return', entity_id: 'ret-001', details: 'Создан возврат — Пятёрочка #1245, повреждение, 780 ₽' },
    { user_id: 'usr-003', action: 'login', entity_type: 'session', details: 'Вход в систему с устройства Xiaomi Redmi Note 12' },
    { user_id: 'usr-003', action: 'route_start', entity_type: 'route', entity_id: 'rte-002', details: 'Начат маршрут Москва юг-восток' },
    { user_id: 'usr-004', action: 'login', entity_type: 'session', details: 'Вход в систему с устройства iPhone 15' },
    { user_id: 'usr-004', action: 'return_approved', entity_type: 'return', entity_id: 'ret-003', details: 'Утверждён возврат — Пятёрочка #3456, 390 ₽' },
    { user_id: 'usr-004', action: 'return_rejected', entity_type: 'return', entity_id: 'ret-004', details: 'Отклонён возврат — Магнит #8834, превышен лимит' },
    { user_id: 'usr-006', action: 'login', entity_type: 'session', details: 'Вход в систему с устройства iPad Pro 12.9' },
    { user_id: 'usr-006', action: 'user_updated', entity_type: 'user', entity_id: 'usr-001', details: 'Обновлены данные пользователя Петров А.И.' },
    { user_id: 'usr-006', action: 'sync_forced', entity_type: 'device', entity_id: 'dev-002', details: 'Принудительная синхронизация устройства Козлова Д.С.' },
    { user_id: 'usr-006', action: 'settings_changed', entity_type: 'settings', details: 'Изменён лимит возвратов: 5 000 → 10 000 ₽' },
  ];

  for (let i = 0; i < actions.length; i++) {
    const time = new Date(now.getTime() - (actions.length - i) * 600000);
    entries.push({
      id: `aud-${String(i + 1).padStart(3, '0')}`,
      ...actions[i],
      entity_id: actions[i].entity_id || null,
      created_at: time.toISOString(),
    });
  }

  return entries;
}

// ============================================================
// Загрузки рейсов
// ============================================================
function generateLoadingTrips() {
  const today = new Date().toISOString().split('T')[0];

  const trips = [
    { id: 'lt-001', driver_id: 'usr-001', vehicle_id: 'veh-001', route_id: 'rte-001', loading_date: today, status: 'loaded', total_items: 19, loaded_items: 19 },
    { id: 'lt-002', driver_id: 'usr-003', vehicle_id: 'veh-002', route_id: 'rte-003', loading_date: today, status: 'loaded', total_items: 12, loaded_items: 12 },
  ];

  const tripItems = [
    // Загрузка Петрова (19 позиций — соответствует vehicle1Products)
    { id: 'lti-001', loading_trip_id: 'lt-001', product_id: 'prd-001', planned_quantity: 200, actual_quantity: 200, scanned: 1 },
    { id: 'lti-002', loading_trip_id: 'lt-001', product_id: 'prd-002', planned_quantity: 72, actual_quantity: 72, scanned: 1 },
    { id: 'lti-003', loading_trip_id: 'lt-001', product_id: 'prd-003', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-004', loading_trip_id: 'lt-001', product_id: 'prd-004', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-005', loading_trip_id: 'lt-001', product_id: 'prd-006', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-006', loading_trip_id: 'lt-001', product_id: 'prd-008', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-007', loading_trip_id: 'lt-001', product_id: 'prd-011', planned_quantity: 120, actual_quantity: 120, scanned: 1 },
    { id: 'lti-008', loading_trip_id: 'lt-001', product_id: 'prd-015', planned_quantity: 60, actual_quantity: 60, scanned: 1 },
    { id: 'lti-009', loading_trip_id: 'lt-001', product_id: 'prd-018', planned_quantity: 60, actual_quantity: 60, scanned: 1 },
    { id: 'lti-010', loading_trip_id: 'lt-001', product_id: 'prd-021', planned_quantity: 72, actual_quantity: 72, scanned: 1 },
    { id: 'lti-011', loading_trip_id: 'lt-001', product_id: 'prd-025', planned_quantity: 72, actual_quantity: 72, scanned: 1 },
    { id: 'lti-012', loading_trip_id: 'lt-001', product_id: 'prd-028', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-013', loading_trip_id: 'lt-001', product_id: 'prd-029', planned_quantity: 72, actual_quantity: 72, scanned: 1 },
    { id: 'lti-014', loading_trip_id: 'lt-001', product_id: 'prd-031', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
    { id: 'lti-015', loading_trip_id: 'lt-001', product_id: 'prd-005', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
    { id: 'lti-016', loading_trip_id: 'lt-001', product_id: 'prd-010', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
    { id: 'lti-017', loading_trip_id: 'lt-001', product_id: 'prd-012', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-018', loading_trip_id: 'lt-001', product_id: 'prd-019', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
    { id: 'lti-019', loading_trip_id: 'lt-001', product_id: 'prd-027', planned_quantity: 24, actual_quantity: 24, scanned: 1 },

    // Загрузка Козлова (12 позиций — соответствует vehicle2Products)
    { id: 'lti-020', loading_trip_id: 'lt-002', product_id: 'prd-001', planned_quantity: 100, actual_quantity: 100, scanned: 1 },
    { id: 'lti-021', loading_trip_id: 'lt-002', product_id: 'prd-006', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-022', loading_trip_id: 'lt-002', product_id: 'prd-013', planned_quantity: 72, actual_quantity: 72, scanned: 1 },
    { id: 'lti-023', loading_trip_id: 'lt-002', product_id: 'prd-019', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-024', loading_trip_id: 'lt-002', product_id: 'prd-026', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-025', loading_trip_id: 'lt-002', product_id: 'prd-030', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-026', loading_trip_id: 'lt-002', product_id: 'prd-032', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-027', loading_trip_id: 'lt-002', product_id: 'prd-008', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-028', loading_trip_id: 'lt-002', product_id: 'prd-011', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-029', loading_trip_id: 'lt-002', product_id: 'prd-017', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
    { id: 'lti-030', loading_trip_id: 'lt-002', product_id: 'prd-025', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
    { id: 'lti-031', loading_trip_id: 'lt-002', product_id: 'prd-028', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
  ];

  return { trips, tripItems };
}

// ============================================================
// Инкассации
// ============================================================
function generateCashCollections() {
  const today = new Date().toISOString().split('T')[0];

  return [
    { id: 'cc-001', driver_id: 'usr-001', route_id: 'rte-001', collection_date: today, expected_amount: 17450, actual_amount: 17450, discrepancy: 0, status: 'collected' },
  ];
}

// ============================================================
// Возвраты тары
// ============================================================
function generatePackagingReturns() {
  const today = new Date().toISOString().split('T')[0];

  const packagingReturns = [
    { id: 'pkr-001', customer_id: 'cst-001', driver_id: 'usr-001', route_point_id: 'rp-001', return_date: today, status: 'confirmed' },
  ];

  const packagingReturnItems = [
    { id: 'pkri-001', packaging_return_id: 'pkr-001', product_id: 'emp-001', expected_quantity: 5, actual_quantity: 4, condition: 'good' },
    { id: 'pkri-002', packaging_return_id: 'pkr-001', product_id: 'emp-002', expected_quantity: 2, actual_quantity: 2, condition: 'good' },
    { id: 'pkri-003', packaging_return_id: 'pkr-001', product_id: 'emp-003', expected_quantity: 10, actual_quantity: 8, condition: 'damaged' },
  ];

  return { packagingReturns, packagingReturnItems };
}

function generateErrorLog() {
  const today = new Date().toISOString().slice(0, 10);
  const h = (hh, mm) => `${today}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`;

  const entries = [
    { id: 'elog-001', severity: 'error', source: 'database', message: 'UNIQUE constraint failed: stock.warehouse, stock.product_id', context: '{"warehouse":"veh-001","product_id":"prd-001"}', stack_trace: null, user_id: 'usr-001', screen: 'ShipmentScreen', created_at: h(8, 14) },
    { id: 'elog-002', severity: 'warning', source: 'sync', message: 'Sync upload timeout after 30s — request aborted', context: '{"entity":"orders","attempt":2}', stack_trace: null, user_id: null, screen: null, created_at: h(8, 30) },
    { id: 'elog-003', severity: 'critical', source: 'database', message: 'Database migration failed: column "material_type" already exists', context: null, stack_trace: 'Error: column already exists\n    at initDatabase (database.js:65)\n    at App.js:12', user_id: null, screen: null, created_at: h(7, 2) },
    { id: 'elog-004', severity: 'error', source: 'pricing', message: 'Price not found for product prd-015 in price_lists', context: '{"product_id":"prd-015","customer_id":"cst-005"}', stack_trace: null, user_id: 'usr-004', screen: 'OrderEditScreen', created_at: h(9, 45) },
    { id: 'elog-005', severity: 'info', source: 'auth', message: 'User session restored from secure storage', context: '{"user":"petrov"}', stack_trace: null, user_id: 'usr-001', screen: 'LoginScreen', created_at: h(7, 55) },
    { id: 'elog-006', severity: 'warning', source: 'location', message: 'GPS accuracy low: 150m (threshold 50m)', context: '{"lat":55.7558,"lon":37.6173,"accuracy":150}', stack_trace: null, user_id: 'usr-001', screen: 'RouteListScreen', created_at: h(10, 12) },
    { id: 'elog-007', severity: 'error', source: 'document', message: 'PDF generation failed: expo-print returned null', context: '{"invoice_id":"inv-001"}', stack_trace: 'Error: Print result is null\n    at documentService.js:42\n    at InvoiceSummaryScreen.js:88', user_id: 'usr-001', screen: 'InvoiceSummaryScreen', created_at: h(11, 20) },
    { id: 'elog-008', severity: 'debug', source: 'navigation', message: 'Screen transition: ExpeditorHome -> RouteList', context: null, stack_trace: null, user_id: 'usr-001', screen: 'RouteListScreen', created_at: h(8, 5) },
    { id: 'elog-009', severity: 'error', source: 'sync', message: 'Failed to parse server response: Unexpected token < in JSON', context: '{"url":"/api/sync/upload","status":502}', stack_trace: 'SyntaxError: Unexpected token <\n    at JSON.parse\n    at syncService.js:123', user_id: null, screen: null, created_at: h(12, 0) },
    { id: 'elog-010', severity: 'warning', source: 'inventory', message: 'Negative stock detected after adjustment: prd-003 qty=-2', context: '{"product_id":"prd-003","warehouse":"veh-001","qty":-2}', stack_trace: null, user_id: 'usr-001', screen: 'AdjustInventoryScreen', created_at: h(13, 30) },
  ];

  return entries;
}

export {
  USERS,
  PRODUCTS,
  EMPTIES,
  PRODUCT_EMPTIES,
  UNITS,
  CUSTOMERS,
  VEHICLES,
  generatePrices,
  generateStock,
  generateVehicleStock,
  generateRoutes,
  generateOrders,
  generateDeliveriesAndPayments,
  generateReturns,
  generateNotifications,
  generateDevices,
  generateAuditLog,
  generateLoadingTrips,
  generateCashCollections,
  generatePackagingReturns,
  generateErrorLog,
};
