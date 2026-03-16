import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { INVOICE_STATUS } from '../../constants/statuses';
import { DEFAULT_VAT_PERCENT } from '../../constants/config';
import { getInvoiceWithItems, confirmInvoice, createDeliveryNote } from '../../services/invoiceService';
import { getInvoiceHtml, printDocument, shareDocument, generatePdf } from '../../services/documentService';
import useSettingsStore from '../../store/settingsStore';

export default function InvoiceSummaryScreen({ route }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { invoiceId } = route.params || {};
  const printFormType = useSettingsStore((s) => s.printFormType);
  const companyInfo = useSettingsStore((s) => s.companyInfo);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoiceWithItems(invoiceId);
      setInvoice(data);
    } catch (e) {
      console.error('Load invoice error:', e);
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      t('invoice.confirmTitle'),
      t('invoice.confirmMsg', { number: invoice.invoice_number }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await confirmInvoice(invoiceId);
              await createDeliveryNote(invoice.delivery_id, invoiceId);
              await loadInvoice();
              Alert.alert(t('common.done'), t('invoice.confirmed'));
            } catch (e) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  const handlePrint = async () => {
    try {
      const html = getInvoiceHtml(invoice, printFormType, companyInfo);
      await printDocument(html);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleShare = async () => {
    try {
      const html = getInvoiceHtml(invoice, printFormType, companyInfo);
      const pdfUri = await generatePdf(html, `invoice_${invoice.invoice_number}.pdf`);
      await shareDocument(pdfUri);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleViewDocument = () => {
    navigation.navigate(SCREEN_NAMES.PRINT_PREVIEW, {
      type: 'invoice',
      documentId: invoiceId,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.tabBarInactive} />
        <Text style={styles.emptyText}>{t('invoice.notFound')}</Text>
      </View>
    );
  }

  const isConfirmed = invoice.status === INVOICE_STATUS.CONFIRMED;

  return (
    <View style={styles.container}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={28} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.invoiceDate}>{new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}</Text>
          </View>
          <View style={[styles.statusBadge, isConfirmed ? styles.statusConfirmed : styles.statusDraft]}>
            <Text style={[styles.statusText, isConfirmed && styles.statusTextConfirmed]}>
              {isConfirmed ? t('invoice.statusConfirmed') : t('invoice.statusDraft')}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{invoice.customer_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="car-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{invoice.driver_name} {invoice.vehicle_number ? `• ${invoice.vehicle_number}` : ''}</Text>
        </View>
      </View>

      {/* Items */}
      <Text style={styles.sectionTitle}>{t('invoice.items')} ({invoice.items.length})</Text>
      <FlatList
        data={invoice.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemIndex}><Text style={styles.indexText}>{index + 1}</Text></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
              <Text style={styles.itemDetail}>
                {item.quantity} {item.unit || t('common.pcs')} × {item.unit_price.toLocaleString()} ₽
              </Text>
            </View>
            <View style={styles.itemTotal}>
              <Text style={styles.itemTotalText}>{item.total.toLocaleString()} ₽</Text>
              {item.tax_amount > 0 && (
                <Text style={styles.itemTax}>{t('invoice.vatIncl')} {item.tax_amount.toLocaleString()} ₽</Text>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      {/* Totals & actions */}
      <View style={styles.footer}>
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('invoice.subtotal')}</Text>
            <Text style={styles.totalValue}>{invoice.subtotal.toLocaleString()} ₽</Text>
          </View>
          {invoice.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoice.discount')}</Text>
              <Text style={[styles.totalValue, { color: COLORS.accent }]}>-{invoice.discount_amount.toLocaleString()} ₽</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('invoice.taxDynamic', { rate: invoice.customer_vat_rate ?? DEFAULT_VAT_PERCENT })}</Text>
            <Text style={styles.totalValue}>{invoice.tax_amount.toLocaleString()} ₽</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>{t('invoice.total')}</Text>
            <Text style={styles.grandTotalValue}>{invoice.total_amount.toLocaleString()} ₽</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {isConfirmed && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleViewDocument}>
                <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                <Text style={styles.actionText}>{t('invoice.view')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
                <Ionicons name="print-outline" size={20} color={COLORS.primary} />
                <Text style={styles.actionText}>{t('invoice.print')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color={COLORS.primary} />
                <Text style={styles.actionText}>{t('invoice.share')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {!isConfirmed && (
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
            <Text style={styles.confirmText}>{t('invoice.confirmInvoice')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  headerCard: {
    backgroundColor: COLORS.white, margin: 12, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  invoiceDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusDraft: { backgroundColor: COLORS.accent + '20' },
  statusConfirmed: { backgroundColor: COLORS.success + '20' },
  statusText: { fontSize: 11, fontWeight: '600', color: COLORS.accent },
  statusTextConfirmed: { color: COLORS.success },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  infoText: { fontSize: 13, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 200 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12, gap: 10, marginBottom: 4,
  },
  itemIndex: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  indexText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  itemDetail: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemTotal: { alignItems: 'flex-end' },
  itemTotalText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  itemTax: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 5,
  },
  totalsBlock: { marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  grandTotalValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, color: COLORS.primary, fontWeight: '500' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 16,
  },
  confirmText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
