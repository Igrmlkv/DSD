import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { invoiceTemplate, updTemplate, receiptTemplate, deliveryNoteTemplate, orderConfirmationTemplate } from './documentTemplates';
import { PRINT_FORM_TYPE } from '../constants/config';

export async function generatePdf(html, fileName) {
  const { uri } = await Print.printToFileAsync({ html });
  // Move to a named file
  const dest = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}

export async function generateInvoicePdf(invoice, printFormType = PRINT_FORM_TYPE.UPD, companyInfo = {}) {
  const html = printFormType === PRINT_FORM_TYPE.UPD ? updTemplate(invoice, companyInfo) : invoiceTemplate(invoice);
  return generatePdf(html, `invoice_${invoice.invoice_number}.pdf`);
}

export async function generateReceiptPdf(receipt) {
  const html = receiptTemplate(receipt);
  return generatePdf(html, `receipt_${receipt.receipt_number}.pdf`);
}

export async function generateDeliveryNotePdf(note, items) {
  const html = deliveryNoteTemplate(note, items);
  return generatePdf(html, `delivery_note_${note.note_number}.pdf`);
}

export async function generateOrderConfirmationPdf(order, items) {
  const html = orderConfirmationTemplate(order, items);
  return generatePdf(html, `order_${order.id?.slice(0, 8)}.pdf`);
}

export async function printDocument(html) {
  await Print.printAsync({ html });
}

export async function shareDocument(fileUri) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

export async function printAndShare(html, fileName) {
  const pdfUri = await generatePdf(html, fileName);
  return { pdfUri, print: () => Print.printAsync({ html }), share: () => shareDocument(pdfUri) };
}

export function getInvoiceHtml(data, printFormType = PRINT_FORM_TYPE.UPD, companyInfo = {}) {
  return printFormType === PRINT_FORM_TYPE.UPD ? updTemplate(data, companyInfo) : invoiceTemplate(data);
}

export function getHtmlForDocument(type, data, items, printFormType = PRINT_FORM_TYPE.UPD, companyInfo = {}) {
  switch (type) {
    case 'invoice': return printFormType === PRINT_FORM_TYPE.UPD ? updTemplate(data, companyInfo) : invoiceTemplate(data);
    case 'receipt': return receiptTemplate(data);
    case 'delivery_note': return deliveryNoteTemplate(data, items);
    case 'order': return orderConfirmationTemplate(data, items);
    default: throw new Error(`Unknown document type: ${type}`);
  }
}
