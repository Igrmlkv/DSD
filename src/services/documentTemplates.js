import { DEFAULT_VAT_PERCENT } from '../constants/config';

const commonStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #003766; padding-bottom: 12px; }
  .header h1 { font-size: 18px; color: #003766; margin-bottom: 4px; }
  .header .doc-number { font-size: 14px; color: #666; }
  .header .date { font-size: 12px; color: #666; margin-top: 4px; }
  .info-grid { display: flex; justify-content: space-between; margin-bottom: 16px; }
  .info-block { width: 48%; }
  .info-block h3 { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
  .info-block p { font-size: 12px; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #003766; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
  tr:nth-child(even) { background: #f9f9f9; }
  .totals { text-align: right; margin-top: 12px; }
  .totals .row { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 4px; }
  .totals .label { color: #666; min-width: 120px; text-align: right; }
  .totals .value { font-weight: bold; min-width: 80px; text-align: right; }
  .totals .grand-total { font-size: 16px; color: #003766; border-top: 2px solid #003766; padding-top: 8px; margin-top: 8px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 16px; border-top: 1px solid #ccc; }
  .sig-block { width: 45%; text-align: center; }
  .sig-block .label { font-size: 10px; color: #666; margin-bottom: 8px; }
  .sig-block .line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 4px; }
  .sig-block img { max-height: 50px; margin-bottom: 4px; }
  .sig-block .name { font-size: 11px; }
  .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
`;

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount) {
  return (amount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sigImage(data) {
  if (!data) return '<div class="line"></div>';
  return `<img src="${data}" alt="signature" />`;
}

export function invoiceTemplate(invoice) {
  const items = invoice.items || [];
  const itemRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td>${item.sku || ''}</td>
      <td>${item.quantity} ${item.unit || 'PCE'}</td>
      <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
      <td style="text-align:right">${item.discount_percent > 0 ? item.discount_percent + '%' : '-'}</td>
      <td style="text-align:right">${formatCurrency(item.tax_amount)}</td>
      <td style="text-align:right">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${commonStyles}</style></head><body>
    <div class="header">
      <h1>INVOICE</h1>
      <div class="doc-number">${invoice.invoice_number}</div>
      <div class="date">${formatDate(invoice.invoice_date)}</div>
    </div>
    <div class="info-grid">
      <div class="info-block">
        <h3>Customer</h3>
        <p><strong>${invoice.customer_name}</strong></p>
        <p>${invoice.customer_address || ''}</p>
        ${invoice.customer_inn ? `<p>INN: ${invoice.customer_inn}</p>` : ''}
      </div>
      <div class="info-block">
        <h3>Driver</h3>
        <p><strong>${invoice.driver_name}</strong></p>
        ${invoice.vehicle_number ? `<p>Vehicle: ${invoice.vehicle_number}</p>` : ''}
        <p>Status: ${invoice.status === 'confirmed' ? 'Confirmed' : 'Draft'}</p>
      </div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Disc.</th><th>Tax</th><th>Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span class="label">Subtotal:</span><span class="value">${formatCurrency(invoice.subtotal)} ₽</span></div>
      <div class="row"><span class="label">Discount:</span><span class="value">${formatCurrency(invoice.discount_amount)} ₽</span></div>
      <div class="row"><span class="label">Tax (VAT ${invoice.customer_vat_rate ?? DEFAULT_VAT_PERCENT}%):</span><span class="value">${formatCurrency(invoice.tax_amount)} ₽</span></div>
      <div class="row grand-total"><span class="label">TOTAL:</span><span class="value">${formatCurrency(invoice.total_amount)} ₽</span></div>
    </div>
    <div class="signatures">
      <div class="sig-block"><div class="label">Customer signature</div>${sigImage(invoice.signature_customer)}<div class="name">${invoice.signature_name || ''}</div></div>
      <div class="sig-block"><div class="label">Driver signature</div>${sigImage(invoice.signature_driver)}<div class="name">${invoice.driver_name}</div></div>
    </div>
    <div class="footer">DSD Mini • Generated ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}

const OKEI_MAP = { 'PCE': '796', 'KGM': '166', 'LTR': '112', 'PK': '778', 'шт': '796', 'кг': '166', 'л': '112', 'уп': '778' };

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function f(val, fallback) {
  return val || fallback || '--- (не настроено)';
}

// УПД — Универсальный передаточный документ (Приложение №1 к Постановлению Правительства РФ от 26.12.2011 №1137)
export function updTemplate(invoice, companyInfo = {}) {
  const items = invoice.items || [];
  const ci = companyInfo || {};
  const updStyles = `
    @page { size: A4 landscape; margin: 8mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 8pt; color: #000; padding: 2px; }
    table.main { width: 100%; border-collapse: collapse; }
    table.main th, table.main td { border: 1px solid #000; padding: 1px 2px; font-size: 7pt; vertical-align: middle; }
    table.main th { font-weight: bold; text-align: center; font-size: 6.5pt; }
    td.num { text-align: right; white-space: nowrap; }
    td.center { text-align: center; }
    .totals-row td { font-weight: bold; }
    .top-area { display: flex; gap: 0; margin-bottom: 0; }
    .status-col { width: 130px; border: 1px solid #000; padding: 3px 5px; font-size: 7pt; flex-shrink: 0; }
    .status-col .status-val { font-size: 16pt; font-weight: bold; display: inline-block; border: 1px solid #000; padding: 1px 6px; margin-bottom: 2px; }
    .header-col { flex: 1; font-size: 7.5pt; padding-left: 4px; }
    .header-col .sf-line { margin-bottom: 1px; }
    .header-col .sf-line .lbl { display: inline-block; width: 180px; }
    .header-col .val { border-bottom: 1px solid #000; display: inline; }
    .header-col .ref { float: right; font-size: 7pt; color: #333; }
    .sig-section { display: flex; font-size: 7.5pt; margin-top: 0; }
    .sig-section .sig-left, .sig-section .sig-right { width: 50%; display: flex; gap: 10px; align-items: flex-end; padding: 3px 5px; }
    .sig-section .sig-left { border: 1px solid #000; border-right: none; }
    .sig-section .sig-right { border: 1px solid #000; }
    .transfer { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 7pt; }
    .transfer td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
    .transfer .lbl { font-weight: bold; }
    .sig-line { border-bottom: 1px solid #000; display: inline-block; min-width: 80px; height: 16px; vertical-align: bottom; }
    .sig-img { max-height: 30px; vertical-align: bottom; }
    .stamp-area { display: inline-block; width: 45px; height: 45px; border: 1px dashed #999; text-align: center; font-size: 6pt; color: #999; line-height: 45px; vertical-align: top; }
    .footer-note { font-size: 6pt; color: #999; text-align: center; margin-top: 4px; }
    u { text-decoration: none; border-bottom: 1px solid #000; }
  `;

  const customerLegal = invoice.customer_legal_name || invoice.customer_name || '';
  const customerShipTo = invoice.customer_ship_to_name || invoice.customer_name || '';
  const customerFullAddr = [invoice.customer_postal_code, invoice.customer_city, invoice.customer_address].filter(Boolean).join(', ') || '—';
  const customerInnKpp = [invoice.customer_inn, invoice.customer_kpp].filter(Boolean).join('/') || '—';
  const sellerInnKpp = [ci.inn, ci.kpp].filter(Boolean).join('/') || '--- (не настроено)';

  const itemRows = items.map((item, i) => {
    const unit = item.unit || 'PCE';
    const okei = OKEI_MAP[unit] || '—';
    return `<tr>
      <td class="center">${i + 1}</td>
      <td class="center" style="font-size:6pt">${item.sku || '—'}</td>
      <td>${item.product_name}</td>
      <td class="center">—</td>
      <td class="center">${okei}</td>
      <td class="center">${unit}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${formatCurrency(item.unit_price)}</td>
      <td class="num">${formatCurrency(item.subtotal)}</td>
      <td class="center" style="font-size:5.5pt">Без акциза</td>
      <td class="center">${item.tax_percent || 0}%</td>
      <td class="num">${formatCurrency(item.tax_amount)}</td>
      <td class="num">${formatCurrency(item.total)}</td>
      <td class="center">—</td>
      <td class="center">—</td>
      <td class="center">—</td>
    </tr>`;
  }).join('');

  const totalSubtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const totalTax = items.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalWithTax = items.reduce((s, i) => s + (i.total || 0), 0);

  const statusCode = invoice.status === 'confirmed' ? '1' : '2';
  const dateShort = formatDateShort(invoice.invoice_date);

  const driverSig = invoice.signature_driver
    ? `<img class="sig-img" src="${invoice.signature_driver}" />`
    : '<span class="sig-line"></span>';
  const customerSig = invoice.signature_customer
    ? `<img class="sig-img" src="${invoice.signature_customer}" />`
    : '<span class="sig-line"></span>';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${updStyles}</style></head><body>

  <!-- Top area: Status left + Header right -->
  <div class="top-area">
    <div class="status-col">
      <div style="font-size:7pt;margin-bottom:2px">Универсальный<br/>передаточный<br/>документ</div>
      <div>Статус: <span class="status-val">${statusCode}</span></div>
      <div style="margin-top:3px;font-size:6pt">1 - счёт-фактура и<br/>передаточный документ<br/>(акт)</div>
      <div style="font-size:6pt">2 - передаточный<br/>документ (акт)</div>
    </div>
    <div class="header-col">
      <div class="sf-line">Счёт-фактура №&nbsp;<u>&nbsp;${invoice.invoice_number}&nbsp;</u>&nbsp;от&nbsp;<u>&nbsp;${dateShort}&nbsp;</u><span class="ref">(1)</span></div>
      <div class="sf-line">Исправление №&nbsp;<u>&nbsp;---&nbsp;</u>&nbsp;от&nbsp;<u>&nbsp;---&nbsp;</u><span class="ref">(1а)</span></div>
      <div class="sf-line"><span class="lbl">Продавец</span>&nbsp;<u>${f(ci.legalName)}</u><span class="ref">(2)</span></div>
      <div class="sf-line"><span class="lbl">Адрес</span>&nbsp;<u>${f(ci.address)}</u><span class="ref">(2а)</span></div>
      <div class="sf-line"><span class="lbl">ИНН/КПП продавца</span>&nbsp;<u>${sellerInnKpp}</u><span class="ref">(2б)</span></div>
      <div class="sf-line"><span class="lbl">Грузоотправитель и его адрес</span>&nbsp;<u>Он же</u><span class="ref">(3)</span></div>
      <div class="sf-line"><span class="lbl">Грузополучатель и его адрес</span>&nbsp;<u>${customerShipTo}, ${customerFullAddr}</u><span class="ref">(4)</span></div>
      <div class="sf-line"><span class="lbl">К платёжно-расчётному документу №</span>&nbsp;<u>---</u><span class="ref">(5)</span></div>
      <div class="sf-line"><span class="lbl">Документ об отгрузке: наименование, №</span>&nbsp;<u>Универсальный передаточный документ; № ${invoice.invoice_number} от ${dateShort}</u><span class="ref">(5а)</span></div>
      <div class="sf-line"><span class="lbl">Покупатель</span>&nbsp;<u>${customerLegal}</u><span class="ref">(6)</span></div>
      <div class="sf-line"><span class="lbl">Адрес</span>&nbsp;<u>${customerFullAddr}</u><span class="ref">(6а)</span></div>
      <div class="sf-line"><span class="lbl">ИНН/КПП покупателя</span>&nbsp;<u>${customerInnKpp}</u><span class="ref">(6б)</span></div>
      <div class="sf-line"><span class="lbl">Валюта: наименование, код</span>&nbsp;<u>российский рубль, 643</u><span class="ref">(7)</span></div>
      <div class="sf-line"><span class="lbl">Идентификатор государственного контракта, договора (соглашения) (при наличии)</span><span class="ref">(8)</span></div>
    </div>
  </div>

  <!-- Block C: Items table (16 columns) -->
  <table class="main">
    <thead>
      <tr>
        <th rowspan="2" style="width:18px">№<br/>п/п</th>
        <th rowspan="2" style="width:42px">Код товара /<br/>работ, услуг</th>
        <th rowspan="2">Наименование товара<br/>(описание выполненных работ,<br/>оказанных услуг),<br/>имущественного права</th>
        <th rowspan="2" style="width:22px">Код<br/>вида<br/>тов.</th>
        <th colspan="2">Единица измерения</th>
        <th rowspan="2" style="width:32px">Кол-во<br/>(объём)</th>
        <th rowspan="2" style="width:46px">Цена<br/>(тариф)<br/>за ед.</th>
        <th rowspan="2" style="width:52px">Стоимость<br/>товаров без<br/>налога — всего</th>
        <th rowspan="2" style="width:40px">В т.ч.<br/>сумма<br/>акциза</th>
        <th rowspan="2" style="width:24px">Нало-<br/>говая<br/>ставка</th>
        <th rowspan="2" style="width:48px">Сумма<br/>налога,<br/>предъявл.<br/>покупат.</th>
        <th rowspan="2" style="width:52px">Стоимость<br/>товаров с<br/>налогом — всего</th>
        <th colspan="2">Страна происхождения товара</th>
        <th rowspan="2" style="width:32px">Рег.номер<br/>деклар.<br/>или парт.<br/>товара</th>
      </tr>
      <tr>
        <th style="width:22px">код</th>
        <th style="width:24px">условное<br/>обознач.<br/>(нац.)</th>
        <th style="width:22px">Циф-<br/>ровой<br/>код</th>
        <th style="width:28px">Краткое<br/>наименов.</th>
      </tr>
      <tr>
        <th>1</th><th>А</th><th>1а</th><th>1б</th><th>2</th><th>2а</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>10а</th><th>11</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="totals-row">
        <td colspan="8" style="text-align:left"><b>Всего к оплате (9)</b></td>
        <td class="num">${formatCurrency(totalSubtotal)}</td>
        <td class="center">X</td>
        <td class="center"></td>
        <td class="num">${formatCurrency(totalTax)}</td>
        <td class="num">${formatCurrency(totalWithTax)}</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>

  <!-- Block D: Invoice signatures -->
  <div style="display:flex;font-size:7pt;border:1px solid #000;border-top:none;padding:3px 5px;">
    <div style="flex:1">
      <div style="font-size:6pt;color:#666">документ составлен на ___ листах</div>
    </div>
    <div style="flex:2;display:flex;align-items:center;gap:4px">
      Руководитель организации<br/>или иное уполномоченное лицо
    </div>
    <div style="flex:1;text-align:center">
      <i>${f(ci.directorName, '________')}</i><br/><span style="font-size:6pt">(подпись)</span>
    </div>
    <div style="flex:1;text-align:center">
      <span>${f(ci.directorName, '________')}</span><br/><span style="font-size:6pt">(ф.и.о.)</span>
    </div>
    <div style="flex:2;display:flex;align-items:center;gap:4px">
      Главный бухгалтер<br/>или иное уполномоченное лицо
    </div>
    <div style="flex:1;text-align:center">
      <i>${f(ci.accountantName, '________')}</i><br/><span style="font-size:6pt">(подпись)</span>
    </div>
    <div style="flex:1;text-align:center">
      <span>${f(ci.accountantName, '________')}</span><br/><span style="font-size:6pt">(ф.и.о.)</span>
    </div>
  </div>
  <div style="font-size:6.5pt;border:1px solid #000;border-top:none;padding:2px 5px;">
    Индивидуальный предприниматель или иное уполномоченное лицо&nbsp;&nbsp;<span class="sig-line" style="min-width:50px;height:12px"></span>&nbsp;<span style="font-size:6pt">(подпись)&nbsp;&nbsp;(ф.и.о.)&nbsp;&nbsp;(реквизиты свидетельства о государственной регистрации индивидуального предпринимателя)</span>
  </div>

  <!-- Block E: Transfer section (two columns) -->
  <table class="transfer" style="width:100%;border-collapse:collapse;margin-top:0">
    <tr>
      <td style="width:50%;vertical-align:top">
        <div style="margin-bottom:3px">Основание передачи (сдачи) / получения (приёмки)<span class="ref" style="float:right;font-weight:bold">[10]</span></div>
        <div style="margin-bottom:3px;border-bottom:1px solid #000;padding-bottom:2px">Доставка по маршруту ${dateShort}</div>
        <div style="margin-bottom:3px">Данные о транспортировке и грузе<span style="float:right;font-weight:bold">[11]</span></div>
        <div style="margin-bottom:3px;border-bottom:1px solid #000;padding-bottom:2px">${invoice.vehicle_number ? `а/м ${invoice.vehicle_number}` : '—'}</div>
        <div style="margin-bottom:2px">Товар (груз) передал/услугу, результаты работ, права сдал<span style="float:right;font-weight:bold">[12]</span></div>
        <div style="display:flex;align-items:flex-end;gap:6px;margin-bottom:2px">
          <span>Водитель-экспедитор</span>
          <span style="flex:1;text-align:center">${driverSig}<br/><span style="font-size:5.5pt">(должность)</span></span>
          <span style="flex:1;text-align:center"><span style="font-size:5.5pt">(подпись)</span></span>
          <span><b>${invoice.driver_name}</b><br/><span style="font-size:5.5pt">(ф.и.о.)</span></span>
        </div>
        <div style="margin-bottom:2px">Дата отгрузки, передачи (сдачи)&nbsp;&nbsp;«&nbsp;<u>${dateShort.split('.')[0]}</u>&nbsp;»&nbsp;<u>${dateShort.split('.')[1]}</u>&nbsp;20<u>${dateShort.split('.')[2]?.slice(2)}</u>&nbsp;г.<span style="float:right;font-weight:bold">[13]</span></div>
        <div style="margin-bottom:2px">Иные сведения об отгрузке, передаче<span style="float:right;font-weight:bold">[14]</span></div>
        <div style="margin-bottom:4px;border-bottom:1px solid #000;padding-bottom:2px">—</div>
        <div style="margin-bottom:2px;font-size:6.5pt">Ответственный за правильность оформления факта хозяйственной жизни<span style="float:right;font-weight:bold">[15]</span></div>
        <div style="display:flex;align-items:flex-end;gap:6px;margin-bottom:4px">
          <span style="flex:1;text-align:center">${driverSig}<br/><span style="font-size:5.5pt">(должность)</span></span>
          <span style="flex:1;text-align:center"><span style="font-size:5.5pt">(подпись)</span></span>
          <span><b>${invoice.driver_name}</b><br/><span style="font-size:5.5pt">(ф.и.о.)</span></span>
        </div>
        <div style="margin-bottom:2px;font-size:6.5pt">Наименование экономического субъекта — составителя документа (в т.ч. комиссионера/агента)<span style="float:right;font-weight:bold">[16]</span></div>
        <div style="display:flex;align-items:flex-start;gap:6px">
          <b>${f(ci.legalName, 'Организация')}</b>
        </div>
        <div style="margin-top:3px"><span class="stamp-area">М.П.</span></div>
      </td>
      <td style="width:50%;vertical-align:top">
        <div style="margin-bottom:2px">Товар (груз) получил/услугу, результаты работ, права принял<span style="float:right;font-weight:bold">[17]</span></div>
        <div style="display:flex;align-items:flex-end;gap:6px;margin-bottom:2px">
          <span>Ст.кладовщик</span>
          <span style="flex:1;text-align:center">${customerSig}<br/><span style="font-size:5.5pt">(должность)</span></span>
          <span style="flex:1;text-align:center"><span style="font-size:5.5pt">(подпись)</span></span>
          <span><b>${invoice.signature_name || '________'}</b><br/><span style="font-size:5.5pt">(ф.и.о.)</span></span>
        </div>
        <div style="margin-bottom:2px">Дата получения (приёмки)&nbsp;&nbsp;«&nbsp;<u>${dateShort.split('.')[0]}</u>&nbsp;»&nbsp;<u>${dateShort.split('.')[1]}</u>&nbsp;20<u>${dateShort.split('.')[2]?.slice(2)}</u>&nbsp;г.<span style="float:right;font-weight:bold">[18]</span></div>
        <div style="margin-bottom:2px">Иные сведения о получении, приёмке<span style="float:right;font-weight:bold">[19]</span></div>
        <div style="margin-bottom:4px;border-bottom:1px solid #000;padding-bottom:2px">—</div>
        <div style="margin-bottom:2px;font-size:6.5pt">Ответственный за правильность оформления факта хозяйственной жизни<span style="float:right;font-weight:bold">[20]</span></div>
        <div style="display:flex;align-items:flex-end;gap:6px;margin-bottom:4px">
          <span style="flex:1;text-align:center">${customerSig}<br/><span style="font-size:5.5pt">(должность)</span></span>
          <span style="flex:1;text-align:center"><span style="font-size:5.5pt">(подпись)</span></span>
          <span><b>${invoice.signature_name || '________'}</b><br/><span style="font-size:5.5pt">(ф.и.о.)</span></span>
        </div>
        <div style="margin-bottom:2px;font-size:6.5pt">Наименование экономического субъекта — составителя документа<span style="float:right;font-weight:bold">[21]</span></div>
        <div style="display:flex;align-items:flex-start;gap:6px">
          <b>${customerLegal}</b>
        </div>
        <div style="margin-top:3px"><span class="stamp-area">М.П.</span></div>
      </td>
    </tr>
  </table>

  <div class="footer-note">DSD Mini • Документ сформирован ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}

export function receiptTemplate(receipt) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${commonStyles}</style></head><body>
    <div class="header">
      <h1>COLLECTION RECEIPT</h1>
      <div class="doc-number">${receipt.receipt_number}</div>
      <div class="date">${formatDate(receipt.receipt_date)}</div>
    </div>
    <div class="info-grid">
      <div class="info-block">
        <h3>Customer</h3>
        <p><strong>${receipt.customer_name}</strong></p>
        <p>${receipt.customer_address || ''}</p>
      </div>
      <div class="info-block">
        <h3>Driver</h3>
        <p><strong>${receipt.driver_name}</strong></p>
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>Amount Due</td><td style="text-align:right">${formatCurrency(receipt.amount_due)} ₽</td></tr>
        <tr><td>Amount Paid (${receipt.payment_method || 'cash'})</td><td style="text-align:right">${formatCurrency(receipt.amount_paid)} ₽</td></tr>
        ${receipt.change_amount > 0 ? `<tr><td>Change</td><td style="text-align:right">${formatCurrency(receipt.change_amount)} ₽</td></tr>` : ''}
      </tbody>
    </table>
    <div class="signatures">
      <div class="sig-block"><div class="label">Customer signature</div>${sigImage(receipt.signature_customer)}</div>
      <div class="sig-block"><div class="label">Driver signature</div><div class="line"></div></div>
    </div>
    <div class="footer">DSD Mini • Generated ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}

export function deliveryNoteTemplate(note, items) {
  const itemRows = (items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td>${item.sku || ''}</td>
      <td>${item.ordered_quantity} ${item.unit || 'PCE'}</td>
      <td>${item.delivered_quantity} ${item.unit || 'PCE'}</td>
      <td>${item.ordered_quantity !== item.delivered_quantity ? '⚠' : '✓'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${commonStyles}</style></head><body>
    <div class="header">
      <h1>DELIVERY NOTE</h1>
      <div class="doc-number">${note.note_number}</div>
      <div class="date">${formatDate(note.note_date)}</div>
    </div>
    <div class="info-grid">
      <div class="info-block"><h3>Customer</h3><p><strong>${note.customer_name}</strong></p></div>
      <div class="info-block"><h3>Driver</h3><p><strong>${note.driver_name}</strong></p></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Ordered</th><th>Delivered</th><th>OK</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="signatures">
      <div class="sig-block"><div class="label">Received by</div><div class="line"></div></div>
      <div class="sig-block"><div class="label">Delivered by</div><div class="line"></div></div>
    </div>
    <div class="footer">DSD Mini • Generated ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}

export function orderConfirmationTemplate(order, items, customer) {
  const vatRate = customer?.vat_rate ?? DEFAULT_VAT_PERCENT;
  const subtotal = (items || []).reduce((s, i) => s + (i.total || 0), 0);
  const discountTotal = (items || []).reduce((s, i) => s + (i.quantity * i.price * ((i.discount_percent || 0) / 100)), 0);
  const netTotal = subtotal;
  const vatAmount = Math.round(netTotal * (vatRate / 100) * 100) / 100;
  const grandTotal = Math.round((netTotal + vatAmount) * 100) / 100;

  const itemRows = (items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td>${item.quantity} ${item.unit || 'PCE'}</td>
      <td style="text-align:right">${formatCurrency(item.price)}</td>
      <td style="text-align:right">${item.discount_percent > 0 ? item.discount_percent + '%' : '-'}</td>
      <td style="text-align:right">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${commonStyles}</style></head><body>
    <div class="header">
      <h1>ПОДТВЕРЖДЕНИЕ ЗАКАЗА</h1>
      <div class="doc-number">Заказ #${order.id?.slice(0, 8)}</div>
      <div class="date">${formatDate(order.order_date)}</div>
    </div>
    <div class="info-grid">
      <div class="info-block">
        <h3>Покупатель</h3>
        <p><strong>${customer?.legal_name || order.customer_name || ''}</strong></p>
        <p>${customer?.address || ''}</p>
        ${customer?.inn ? `<p>ИНН: ${customer.inn}${customer.kpp ? ` / КПП: ${customer.kpp}` : ''}</p>` : ''}
      </div>
      <div class="info-block">
        <h3>Грузополучатель</h3>
        <p><strong>${customer?.ship_to_name || order.customer_name || ''}</strong></p>
        <p>${customer?.address || ''}</p>
      </div>
    </div>
    <table>
      <thead><tr><th>№</th><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Скидка</th><th>Сумма</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      ${discountTotal > 0 ? `<div class="row"><span class="label">Скидка:</span><span class="value">${formatCurrency(discountTotal)} ₽</span></div>` : ''}
      <div class="row"><span class="label">Итого:</span><span class="value">${formatCurrency(netTotal)} ₽</span></div>
      <div class="row"><span class="label">НДС (${vatRate}%):</span><span class="value">${formatCurrency(vatAmount)} ₽</span></div>
      <div class="row grand-total"><span class="label">ИТОГО С НДС:</span><span class="value">${formatCurrency(grandTotal)} ₽</span></div>
    </div>
    <div class="signatures">
      <div class="sig-block"><div class="label">Покупатель</div><div class="line"></div></div>
      <div class="sig-block"><div class="label">Мерчендайзер</div><div class="line"></div></div>
    </div>
    <div class="footer">DSD Mini • Сформировано ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}
