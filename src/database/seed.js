// ============================================================
// Пользователи системы — 4 пользователя, 3 роли
// ============================================================
const USERS = [
  { id: 'usr-001', username: 'petrov', password_hash: 'hash_petrov', full_name: 'Петров Алексей Иванович', role: 'expeditor', phone: '+79161234567', vehicle_id: 'veh-001' },
  { id: 'usr-003', username: 'kozlov', password_hash: 'hash_kozlov', full_name: 'Козлов Дмитрий Сергеевич', role: 'expeditor', phone: '+79031112233', vehicle_id: 'veh-002' },
  { id: 'usr-004', username: 'ivanova', password_hash: 'hash_ivanova', full_name: 'Иванова Елена Николаевна', role: 'supervisor', phone: '+79057778899', vehicle_id: null },
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
      price: Math.round(basePrice * 0.85),
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
  { id: 'cst-001', name: 'Пятёрочка #1245', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, ул. Тверская, д. 15', city: 'Москва', region: 'Москва', postal_code: '125009', latitude: 55.7648, longitude: 37.6054, contact_person: 'Кузнецова А.В.', phone: '+74951234567', customer_type: 'retail', payment_terms: 'credit', credit_limit: 500000, debt_amount: 125000 },
  { id: 'cst-002', name: 'Магнит #8834', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, ул. Арбат, д. 24', city: 'Москва', region: 'Москва', postal_code: '119002', latitude: 55.7520, longitude: 37.5927, contact_person: 'Белов И.П.', phone: '+74959876543', customer_type: 'retail', payment_terms: 'credit', credit_limit: 600000, debt_amount: 89000 },
  { id: 'cst-003', name: 'Дикси #456', legal_name: 'ООО "Дикси Юг"', inn: '5036045205', kpp: '503601001', address: 'г. Москва, Ленинградский пр-т, д. 76', city: 'Москва', region: 'Москва', postal_code: '125315', latitude: 55.8007, longitude: 37.5259, contact_person: 'Морозова Т.Л.', phone: '+74951112233', customer_type: 'retail', payment_terms: 'credit', credit_limit: 300000, debt_amount: 45000 },
  { id: 'cst-004', name: 'ВкусВилл #78', legal_name: 'ООО "Проект Избёнка"', inn: '5029168824', kpp: '502901001', address: 'г. Москва, ул. Покровка, д. 10', city: 'Москва', region: 'Москва', postal_code: '101000', latitude: 55.7600, longitude: 37.6450, contact_person: 'Фёдоров С.А.', phone: '+74954445566', customer_type: 'retail', payment_terms: 'cash', credit_limit: 200000, debt_amount: 0 },
  { id: 'cst-005', name: 'Перекрёсток #312', legal_name: 'АО "Торговый Дом Перекрёсток"', inn: '7728029110', kpp: '772801001', address: 'г. Москва, Кутузовский пр-т, д. 45', city: 'Москва', region: 'Москва', postal_code: '121151', latitude: 55.7405, longitude: 37.5350, contact_person: 'Новикова Е.М.', phone: '+74957778899', customer_type: 'retail', payment_terms: 'credit', credit_limit: 800000, debt_amount: 230000 },

  // Юг / ЮАО / ЮЗАО
  { id: 'cst-006', name: 'Пятёрочка #3456', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Варшавское ш., д. 72', city: 'Москва', region: 'Москва', postal_code: '117556', latitude: 55.6545, longitude: 37.6195, contact_person: 'Васильев Н.К.', phone: '+74951230001', customer_type: 'retail', payment_terms: 'credit', credit_limit: 400000, debt_amount: 67000 },
  { id: 'cst-007', name: 'Лента #22', legal_name: 'ООО "Лента"', inn: '7814148471', kpp: '781401001', address: 'г. Москва, Каширское ш., д. 61', city: 'Москва', region: 'Москва', postal_code: '115230', latitude: 55.6380, longitude: 37.6440, contact_person: 'Захарова О.П.', phone: '+74951230002', customer_type: 'wholesale', payment_terms: 'credit', credit_limit: 1000000, debt_amount: 340000 },
  { id: 'cst-008', name: 'Магнит #5521', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, ул. Профсоюзная, д. 104', city: 'Москва', region: 'Москва', postal_code: '117485', latitude: 55.6290, longitude: 37.5270, contact_person: 'Григорьев А.Ю.', phone: '+74951230003', customer_type: 'retail', payment_terms: 'credit', credit_limit: 500000, debt_amount: 112000 },

  // Восток / ВАО / ЮВАО
  { id: 'cst-009', name: 'Перекрёсток #455', legal_name: 'АО "Торговый Дом Перекрёсток"', inn: '7728029110', kpp: '772801001', address: 'г. Москва, Щёлковское ш., д. 75', city: 'Москва', region: 'Москва', postal_code: '105523', latitude: 55.8050, longitude: 37.8050, contact_person: 'Попов В.Г.', phone: '+74951230004', customer_type: 'retail', payment_terms: 'cash', credit_limit: 250000, debt_amount: 0 },
  { id: 'cst-010', name: 'Пятёрочка #7721', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Рязанский пр-т, д. 30', city: 'Москва', region: 'Москва', postal_code: '109052', latitude: 55.7220, longitude: 37.7530, contact_person: 'Лебедева М.С.', phone: '+74951230005', customer_type: 'retail', payment_terms: 'credit', credit_limit: 350000, debt_amount: 78000 },

  // Север / САО / СВАО
  { id: 'cst-011', name: 'Дикси #789', legal_name: 'ООО "Дикси Юг"', inn: '5036045205', kpp: '503601001', address: 'г. Москва, Дмитровское ш., д. 89', city: 'Москва', region: 'Москва', postal_code: '127247', latitude: 55.8480, longitude: 37.5580, contact_person: 'Ермаков Д.В.', phone: '+74951230006', customer_type: 'retail', payment_terms: 'credit', credit_limit: 400000, debt_amount: 55000 },
  { id: 'cst-012', name: 'Магнит #6612', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, пр-т Мира, д. 176', city: 'Москва', region: 'Москва', postal_code: '129344', latitude: 55.8350, longitude: 37.6370, contact_person: 'Соколов П.Н.', phone: '+74951230007', customer_type: 'retail', payment_terms: 'credit', credit_limit: 450000, debt_amount: 91000 },

  // Запад / ЗАО / СЗАО
  { id: 'cst-013', name: 'ВкусВилл #112', legal_name: 'ООО "Проект Избёнка"', inn: '5029168824', kpp: '502901001', address: 'г. Москва, ул. Маршала Жукова, д. 35', city: 'Москва', region: 'Москва', postal_code: '123154', latitude: 55.7760, longitude: 37.4720, contact_person: 'Хасанов Р.Ф.', phone: '+74951230008', customer_type: 'retail', payment_terms: 'cash', credit_limit: 300000, debt_amount: 0 },
  { id: 'cst-014', name: 'Пятёрочка #4478', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Можайское ш., д. 41', city: 'Москва', region: 'Москва', postal_code: '121471', latitude: 55.7170, longitude: 37.4530, contact_person: 'Мухаметшина Г.И.', phone: '+74951230009', customer_type: 'retail', payment_terms: 'credit', credit_limit: 350000, debt_amount: 44000 },

  // Дополнительные точки по Москве
  { id: 'cst-015', name: 'Spar #33', legal_name: 'ООО "СПАР Мидл"', inn: '5260254030', kpp: '526001001', address: 'г. Москва, ул. Новокузнецкая, д. 13', city: 'Москва', region: 'Москва', postal_code: '115184', latitude: 55.7380, longitude: 37.6290, contact_person: 'Тихонов И.А.', phone: '+74951230010', customer_type: 'retail', payment_terms: 'credit', credit_limit: 250000, debt_amount: 32000 },
  { id: 'cst-016', name: 'Магнит #0012', legal_name: 'АО "Тандер"', inn: '2310031475', kpp: '231001001', address: 'г. Москва, ул. Люблинская, д. 169', city: 'Москва', region: 'Москва', postal_code: '109341', latitude: 55.6610, longitude: 37.7440, contact_person: 'Кравченко С.В.', phone: '+74951230011', customer_type: 'retail', payment_terms: 'credit', credit_limit: 700000, debt_amount: 195000 },
  { id: 'cst-017', name: 'Пятёрочка #9901', legal_name: 'ООО "Агроторг"', inn: '7825706086', kpp: '780201001', address: 'г. Москва, Ленинский пр-т, д. 89', city: 'Москва', region: 'Москва', postal_code: '119313', latitude: 55.6830, longitude: 37.5340, contact_person: 'Бондаренко Л.Н.', phone: '+74951230012', customer_type: 'retail', payment_terms: 'credit', credit_limit: 350000, debt_amount: 57000 },
  { id: 'cst-018', name: 'Перекрёсток #128', legal_name: 'АО "Торговый Дом Перекрёсток"', inn: '7728029110', kpp: '772801001', address: 'г. Москва, ул. Таганская, д. 3', city: 'Москва', region: 'Москва', postal_code: '109004', latitude: 55.7390, longitude: 37.6535, contact_person: 'Орлов В.А.', phone: '+74951230013', customer_type: 'retail', payment_terms: 'credit', credit_limit: 400000, debt_amount: 83000 },

  // HoReCa
  { id: 'cst-019', name: 'Кофейня "Шоколадница"', legal_name: 'ООО "Шоколадница"', inn: '7705557843', kpp: '770501001', address: 'г. Москва, ул. Мясницкая, д. 12', city: 'Москва', region: 'Москва', postal_code: '101000', latitude: 55.7620, longitude: 37.6380, contact_person: 'Романова О.С.', phone: '+74952223344', customer_type: 'horeca', payment_terms: 'credit', credit_limit: 150000, debt_amount: 22000 },
  { id: 'cst-020', name: 'Столовая "Обед Буфет"', legal_name: 'ИП Жуков А.Н.', inn: '770800112233', kpp: null, address: 'г. Москва, ул. Бауманская, д. 7', city: 'Москва', region: 'Москва', postal_code: '105005', latitude: 55.7720, longitude: 37.6800, contact_person: 'Жуков А.Н.', phone: '+79165556677', customer_type: 'horeca', payment_terms: 'cash', credit_limit: 50000, debt_amount: 0 },
];

// ============================================================
// Транспортные средства (оба — Москва, регион 77)
// ============================================================
const VEHICLES = [
  { id: 'veh-001', plate_number: 'А123БВ77', model: 'ГАЗель Next', driver_id: 'usr-001', capacity_kg: 1500 },
  { id: 'veh-002', plate_number: 'К456МН77', model: 'ГАЗель Business', driver_id: 'usr-003', capacity_kg: 1200 },
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

  const vehicle1Products = [
    { product_id: 'prd-001', quantity: 150 },
    { product_id: 'prd-002', quantity: 60 },
    { product_id: 'prd-003', quantity: 36 },
    { product_id: 'prd-004', quantity: 36 },
    { product_id: 'prd-008', quantity: 48 },
    { product_id: 'prd-011', quantity: 60 },
    { product_id: 'prd-015', quantity: 36 },
    { product_id: 'prd-018', quantity: 36 },
    { product_id: 'prd-021', quantity: 48 },
    { product_id: 'prd-025', quantity: 48 },
    { product_id: 'prd-028', quantity: 36 },
    { product_id: 'prd-029', quantity: 60 },
    { product_id: 'prd-031', quantity: 24 },
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

  const vehicle2Products = [
    { product_id: 'prd-001', quantity: 72 },
    { product_id: 'prd-006', quantity: 48 },
    { product_id: 'prd-013', quantity: 72 },
    { product_id: 'prd-019', quantity: 48 },
    { product_id: 'prd-026', quantity: 36 },
    { product_id: 'prd-030', quantity: 48 },
    { product_id: 'prd-032', quantity: 24 },
    { product_id: 'prd-011', quantity: 36 },
    { product_id: 'prd-017', quantity: 24 },
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
// Маршруты на сегодня — оба в Москве
// ============================================================
function generateRoutes() {
  const today = new Date().toISOString().split('T')[0];

  const routes = [
    { id: 'rte-001', date: today, driver_id: 'usr-001', status: 'planned', vehicle_number: 'А123БВ77' },
    { id: 'rte-002', date: today, driver_id: 'usr-003', status: 'planned', vehicle_number: 'К456МН77' },
  ];

  const routePoints = [
    // Маршрут 1 — Петров: Центр + Запад (7 точек)
    { id: 'rp-001', route_id: 'rte-001', customer_id: 'cst-001', sequence_number: 1, planned_arrival: `${today}T09:00:00`, status: 'pending' },
    { id: 'rp-002', route_id: 'rte-001', customer_id: 'cst-002', sequence_number: 2, planned_arrival: `${today}T10:00:00`, status: 'pending' },
    { id: 'rp-003', route_id: 'rte-001', customer_id: 'cst-003', sequence_number: 3, planned_arrival: `${today}T11:00:00`, status: 'pending' },
    { id: 'rp-004', route_id: 'rte-001', customer_id: 'cst-004', sequence_number: 4, planned_arrival: `${today}T12:30:00`, status: 'pending' },
    { id: 'rp-005', route_id: 'rte-001', customer_id: 'cst-005', sequence_number: 5, planned_arrival: `${today}T14:00:00`, status: 'pending' },
    { id: 'rp-006', route_id: 'rte-001', customer_id: 'cst-019', sequence_number: 6, planned_arrival: `${today}T15:30:00`, status: 'pending' },
    { id: 'rp-007', route_id: 'rte-001', customer_id: 'cst-020', sequence_number: 7, planned_arrival: `${today}T16:30:00`, status: 'pending' },

    // Маршрут 2 — Козлов: Юг + Восток Москвы (6 точек)
    { id: 'rp-008', route_id: 'rte-002', customer_id: 'cst-006', sequence_number: 1, planned_arrival: `${today}T09:00:00`, status: 'pending' },
    { id: 'rp-009', route_id: 'rte-002', customer_id: 'cst-007', sequence_number: 2, planned_arrival: `${today}T10:00:00`, status: 'pending' },
    { id: 'rp-010', route_id: 'rte-002', customer_id: 'cst-008', sequence_number: 3, planned_arrival: `${today}T11:00:00`, status: 'pending' },
    { id: 'rp-011', route_id: 'rte-002', customer_id: 'cst-016', sequence_number: 4, planned_arrival: `${today}T12:30:00`, status: 'pending' },
    { id: 'rp-012', route_id: 'rte-002', customer_id: 'cst-010', sequence_number: 5, planned_arrival: `${today}T14:00:00`, status: 'pending' },
    { id: 'rp-013', route_id: 'rte-002', customer_id: 'cst-018', sequence_number: 6, planned_arrival: `${today}T15:30:00`, status: 'pending' },
  ];

  return { routes, routePoints };
}

// ============================================================
// Тестовые заказы
// ============================================================
function generateOrders() {
  const today = new Date().toISOString().split('T')[0];

  const orders = [
    { id: 'ord-001', customer_id: 'cst-001', user_id: 'usr-001', route_point_id: 'rp-001', order_date: today, status: 'confirmed', total_amount: 12450, discount_amount: 0 },
    { id: 'ord-002', customer_id: 'cst-002', user_id: 'usr-001', route_point_id: 'rp-002', order_date: today, status: 'confirmed', total_amount: 8970, discount_amount: 500 },
    { id: 'ord-003', customer_id: 'cst-005', user_id: 'usr-001', route_point_id: 'rp-005', order_date: today, status: 'confirmed', total_amount: 23100, discount_amount: 1200 },
    { id: 'ord-004', customer_id: 'cst-006', user_id: 'usr-003', route_point_id: 'rp-008', order_date: today, status: 'confirmed', total_amount: 15600, discount_amount: 0 },
    { id: 'ord-005', customer_id: 'cst-016', user_id: 'usr-003', route_point_id: 'rp-011', order_date: today, status: 'draft', total_amount: 7890, discount_amount: 0 },
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
  ];

  return { orders, orderItems };
}

// ============================================================
// Тестовые доставки и платежи
// ============================================================
function generateDeliveriesAndPayments() {
  const today = new Date().toISOString().split('T')[0];

  const deliveries = [
    { id: 'dlv-001', order_id: 'ord-001', route_point_id: 'rp-001', customer_id: 'cst-001', driver_id: 'usr-001', delivery_date: today, status: 'delivered', total_amount: 12450, signature_name: 'Кузнецова А.В.', signature_confirmed: 1 },
    { id: 'dlv-002', order_id: 'ord-002', route_point_id: 'rp-002', customer_id: 'cst-002', driver_id: 'usr-001', delivery_date: today, status: 'delivered', total_amount: 8470, signature_name: 'Белов И.П.', signature_confirmed: 1 },
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
    { id: 'pay-001', customer_id: 'cst-001', user_id: 'usr-001', order_id: 'ord-001', route_point_id: 'rp-001', payment_date: today, amount: 12450, payment_type: 'cash', status: 'completed', receipt_number: 'ПКО-001' },
    { id: 'pay-002', customer_id: 'cst-002', user_id: 'usr-001', order_id: 'ord-002', route_point_id: 'rp-002', payment_date: today, amount: 5000, payment_type: 'card', status: 'completed', receipt_number: 'ПКО-002' },
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
    { id: 'ret-003', customer_id: 'cst-006', driver_id: 'usr-003', route_point_id: 'rp-008', return_date: yesterday, reason: 'quality', status: 'approved', total_amount: 390, approved_by: 'usr-004', approved_at: `${yesterday}T14:30:00` },
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
    { id: 'ntf-004', user_id: 'usr-003', title: 'Маршрут назначен', message: 'Вам назначен маршрут на сегодня: Москва юг-восток, 6 точек', type: 'info', is_read: 0, related_entity: 'route', related_id: 'rte-002', created_at: now },

    // Супервайзер Иванова
    { id: 'ntf-005', user_id: 'usr-004', title: 'Возврат на утверждение', message: 'Новый возврат от Петрова А.И. — Пятёрочка #1245, 780 ₽', type: 'warning', is_read: 0, related_entity: 'return', related_id: 'ret-001', created_at: now },
    { id: 'ntf-006', user_id: 'usr-004', title: 'Возврат на утверждение', message: 'Новый возврат от Петрова А.И. — Перекрёсток #312, 1 560 ₽', type: 'warning', is_read: 0, related_entity: 'return', related_id: 'ret-002', created_at: now },
    { id: 'ntf-007', user_id: 'usr-004', title: 'Задержка на маршруте', message: 'Козлов Д.С. отстаёт от графика на 15 мин', type: 'error', is_read: 0, related_entity: 'route', related_id: 'rte-002', created_at: now },

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
    { id: 'lt-001', driver_id: 'usr-001', vehicle_id: 'veh-001', route_id: 'rte-001', loading_date: today, status: 'loaded', total_items: 13, loaded_items: 13 },
    { id: 'lt-002', driver_id: 'usr-003', vehicle_id: 'veh-002', route_id: 'rte-002', loading_date: today, status: 'loaded', total_items: 9, loaded_items: 9 },
  ];

  const tripItems = [
    // Загрузка Петрова
    { id: 'lti-001', loading_trip_id: 'lt-001', product_id: 'prd-001', planned_quantity: 150, actual_quantity: 150, scanned: 1 },
    { id: 'lti-002', loading_trip_id: 'lt-001', product_id: 'prd-002', planned_quantity: 60, actual_quantity: 60, scanned: 1 },
    { id: 'lti-003', loading_trip_id: 'lt-001', product_id: 'prd-003', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-004', loading_trip_id: 'lt-001', product_id: 'prd-004', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-005', loading_trip_id: 'lt-001', product_id: 'prd-008', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-006', loading_trip_id: 'lt-001', product_id: 'prd-011', planned_quantity: 60, actual_quantity: 60, scanned: 1 },
    { id: 'lti-007', loading_trip_id: 'lt-001', product_id: 'prd-015', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-008', loading_trip_id: 'lt-001', product_id: 'prd-018', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-009', loading_trip_id: 'lt-001', product_id: 'prd-021', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-010', loading_trip_id: 'lt-001', product_id: 'prd-025', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-011', loading_trip_id: 'lt-001', product_id: 'prd-028', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-012', loading_trip_id: 'lt-001', product_id: 'prd-029', planned_quantity: 60, actual_quantity: 60, scanned: 1 },
    { id: 'lti-013', loading_trip_id: 'lt-001', product_id: 'prd-031', planned_quantity: 24, actual_quantity: 24, scanned: 1 },

    // Загрузка Козлова
    { id: 'lti-014', loading_trip_id: 'lt-002', product_id: 'prd-001', planned_quantity: 72, actual_quantity: 72, scanned: 1 },
    { id: 'lti-015', loading_trip_id: 'lt-002', product_id: 'prd-006', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-016', loading_trip_id: 'lt-002', product_id: 'prd-013', planned_quantity: 72, actual_quantity: 72, scanned: 1 },
    { id: 'lti-017', loading_trip_id: 'lt-002', product_id: 'prd-019', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-018', loading_trip_id: 'lt-002', product_id: 'prd-026', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-019', loading_trip_id: 'lt-002', product_id: 'prd-030', planned_quantity: 48, actual_quantity: 48, scanned: 1 },
    { id: 'lti-020', loading_trip_id: 'lt-002', product_id: 'prd-032', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
    { id: 'lti-021', loading_trip_id: 'lt-002', product_id: 'prd-011', planned_quantity: 36, actual_quantity: 36, scanned: 1 },
    { id: 'lti-022', loading_trip_id: 'lt-002', product_id: 'prd-017', planned_quantity: 24, actual_quantity: 24, scanned: 1 },
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
    { id: 'pkri-001', packaging_return_id: 'pkr-001', packaging_type: 'Ящик пластиковый', expected_quantity: 5, actual_quantity: 4, condition: 'good' },
    { id: 'pkri-002', packaging_return_id: 'pkr-001', packaging_type: 'Поддон деревянный', expected_quantity: 2, actual_quantity: 2, condition: 'good' },
    { id: 'pkri-003', packaging_return_id: 'pkr-001', packaging_type: 'Ящик пластиковый', expected_quantity: 0, actual_quantity: 1, condition: 'damaged' },
  ];

  return { packagingReturns, packagingReturnItems };
}

export {
  USERS,
  PRODUCTS,
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
};
