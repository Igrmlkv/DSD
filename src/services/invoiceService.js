import { getDatabase, generateId } from '../database';
import { DOC_PREFIX, DEFAULT_VAT_PERCENT } from '../constants/config';
import { INVOICE_STATUS, DELIVERY_NOTE_STATUS } from '../constants/statuses';

// Generate sequential number: INV-YYYYMMDD-XXXX
async function generateNumber(prefix) {
  const database = await getDatabase();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const pattern = `${prefix}-${today}-%`;
  const table = prefix === DOC_PREFIX.INVOICE ? 'invoices' : prefix === DOC_PREFIX.RECEIPT ? 'receipts' : 'delivery_notes';
  const col = prefix === DOC_PREFIX.INVOICE ? 'invoice_number' : prefix === DOC_PREFIX.RECEIPT ? 'receipt_number' : 'note_number';
  const row = await database.getFirstAsync(
    `SELECT COUNT(*) as cnt FROM ${table} WHERE ${col} LIKE ?`, [pattern]
  );
  const seq = String((row?.cnt || 0) + 1).padStart(4, '0');
  return `${prefix}-${today}-${seq}`;
}

export async function createInvoiceFromDelivery(deliveryId) {
  const database = await getDatabase();
  const delivery = await database.getFirstAsync(
    `SELECT d.*, c.name as customer_name, c.vat_rate as customer_vat_rate FROM deliveries d JOIN customers c ON c.id = d.customer_id WHERE d.id = ?`,
    [deliveryId]
  );
  if (!delivery) throw new Error('Delivery not found');

  const items = await database.getAllAsync(
    `SELECT di.*, p.name as product_name, p.sku FROM delivery_items di JOIN products p ON p.id = di.product_id WHERE di.delivery_id = ?`,
    [deliveryId]
  );

  const id = generateId();
  const invoiceNumber = await generateNumber(DOC_PREFIX.INVOICE);
  const now = new Date().toISOString();
  const subtotal = items.reduce((s, i) => s + i.delivered_quantity * i.price, 0);
  const vatPercent = delivery.customer_vat_rate ?? DEFAULT_VAT_PERCENT;
  const taxRate = vatPercent / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = subtotal + taxAmount;

  await database.execAsync('BEGIN TRANSACTION');
  try {
    await database.runAsync(
      `INSERT INTO invoices (id, delivery_id, order_id, customer_id, driver_id, route_point_id, invoice_number, invoice_date, status, subtotal, discount_amount, tax_amount, total_amount, currency, signature_customer, signature_driver, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '${INVOICE_STATUS.DRAFT}', ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [id, deliveryId, delivery.order_id, delivery.customer_id, delivery.driver_id, delivery.route_point_id,
       invoiceNumber, now, subtotal, taxAmount, totalAmount, delivery.currency || 'RUB',
       delivery.signature_data, delivery.signature_driver_data, now, now]
    );

    for (const item of items) {
      const iiId = generateId();
      const itemSubtotal = item.delivered_quantity * item.price;
      const itemTax = Math.round(itemSubtotal * taxRate * 100) / 100;
      await database.runAsync(
        `INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, discount_percent, discount_amount, tax_percent, tax_amount, subtotal, total, unit, currency)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)`,
        [iiId, id, item.product_id, item.delivered_quantity, item.price, vatPercent, itemTax, itemSubtotal, itemSubtotal + itemTax, item.unit || 'PCE', item.currency || 'RUB']
      );
    }

    await database.execAsync('COMMIT');
    return { id, invoiceNumber, totalAmount };
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function confirmInvoice(invoiceId) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE invoices SET status = '${INVOICE_STATUS.CONFIRMED}', updated_at = ? WHERE id = ?`,
    [now, invoiceId]
  );
}

export async function getInvoiceWithItems(invoiceId) {
  const database = await getDatabase();
  const invoice = await database.getFirstAsync(
    `SELECT inv.*, c.name as customer_name, c.address as customer_address, c.inn as customer_inn,
            c.vat_rate as customer_vat_rate, c.legal_name as customer_legal_name,
            c.ship_to_name as customer_ship_to_name, c.kpp as customer_kpp,
            c.city as customer_city, c.region as customer_region,
            c.postal_code as customer_postal_code,
            u.full_name as driver_name, v.plate_number as vehicle_number
     FROM invoices inv
     JOIN customers c ON c.id = inv.customer_id
     JOIN users u ON u.id = inv.driver_id
     LEFT JOIN vehicles v ON v.driver_id = inv.driver_id AND v.is_active = 1
     WHERE inv.id = ?`,
    [invoiceId]
  );
  if (!invoice) return null;

  const items = await database.getAllAsync(
    `SELECT ii.*, p.name as product_name, p.sku, p.unit, p.volume
     FROM invoice_items ii
     JOIN products p ON p.id = ii.product_id
     WHERE ii.invoice_id = ?
     ORDER BY p.name`,
    [invoiceId]
  );

  return { ...invoice, items };
}

export async function getInvoicesByCustomer(customerId) {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT inv.*, c.name as customer_name
     FROM invoices inv JOIN customers c ON c.id = inv.customer_id
     WHERE inv.customer_id = ? ORDER BY inv.invoice_date DESC`,
    [customerId]
  );
}

export async function getInvoiceByDelivery(deliveryId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT * FROM invoices WHERE delivery_id = ? ORDER BY created_at DESC LIMIT 1`,
    [deliveryId]
  );
}

export async function createReceipt({ paymentId, invoiceId, customerId, driverId, paymentMethod, amountDue, amountPaid, changeAmount, signatureCustomer, notes }) {
  const database = await getDatabase();
  const id = generateId();
  const receiptNumber = await generateNumber(DOC_PREFIX.RECEIPT);
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO receipts (id, payment_id, invoice_id, customer_id, driver_id, receipt_number, receipt_date, payment_method, amount_due, amount_paid, change_amount, currency, status, signature_customer, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
    [id, paymentId, invoiceId, customerId, driverId, receiptNumber, now, paymentMethod, amountDue, amountPaid, changeAmount, 'RUB', signatureCustomer, notes, now]
  );

  return { id, receiptNumber };
}

export async function getReceiptById(receiptId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT r.*, c.name as customer_name, c.address as customer_address,
            u.full_name as driver_name
     FROM receipts r
     JOIN customers c ON c.id = r.customer_id
     JOIN users u ON u.id = r.driver_id
     WHERE r.id = ?`,
    [receiptId]
  );
}

export async function createDeliveryNote(deliveryId, invoiceId) {
  const database = await getDatabase();
  const delivery = await database.getFirstAsync(
    `SELECT * FROM deliveries WHERE id = ?`, [deliveryId]
  );
  if (!delivery) throw new Error('Delivery not found');

  const items = await database.getAllAsync(
    `SELECT * FROM delivery_items WHERE delivery_id = ?`, [deliveryId]
  );

  const id = generateId();
  const noteNumber = await generateNumber(DOC_PREFIX.DELIVERY_NOTE);
  const now = new Date().toISOString();

  const totalAmount = items.reduce((s, i) => s + (i.total || 0), 0);
  await database.runAsync(
    `INSERT INTO delivery_notes (id, delivery_id, invoice_id, note_number, note_date, customer_id, driver_id, status, total_amount, currency, total_items, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '${DELIVERY_NOTE_STATUS.CONFIRMED}', ?, ?, ?, ?)`,
    [id, deliveryId, invoiceId, noteNumber, now, delivery.customer_id, delivery.driver_id, totalAmount, delivery.currency || 'RUB', items.length, now]
  );

  return { id, noteNumber };
}

export async function getDeliveryNoteByDelivery(deliveryId) {
  const database = await getDatabase();
  return database.getFirstAsync(
    `SELECT dn.*, c.name as customer_name, u.full_name as driver_name
     FROM delivery_notes dn
     JOIN customers c ON c.id = dn.customer_id
     JOIN users u ON u.id = dn.driver_id
     WHERE dn.delivery_id = ?`,
    [deliveryId]
  );
}
