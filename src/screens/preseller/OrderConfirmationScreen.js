import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { ORDER_STATUS } from '../../constants/statuses';
import { DEFAULT_VAT_PERCENT } from '../../constants/config';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import { getOrderById, getOrderItems, updateOrder, getCustomerById } from '../../database';
import { orderConfirmationTemplate } from '../../services/documentTemplates';
import { printDocument, shareDocument, generatePdf } from '../../services/documentService';
import SignaturePad from '../../components/SignaturePad';

export default function OrderConfirmationScreen({ route }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { orderId, customerId, customerName } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const printFormType = useSettingsStore((s) => s.printFormType);

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  // Signatures
  const [hasClientSig, setHasClientSig] = useState(false);
  const [hasPresSellerSig, setHasPresSellerSig] = useState(false);
  const [clientSigData, setClientSigData] = useState(null);
  const [presSellerSigData, setPresSellerSigData] = useState(null);
  const clientSigRef = useRef(null);
  const presSellerSigRef = useRef(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const ord = await getOrderById(orderId);
      const oi = await getOrderItems(orderId);
      setOrder(ord);
      setItems(oi);
      if (customerId) {
        const c = await getCustomerById(customerId);
        setCustomer(c);
      }
      if (ord.status === ORDER_STATUS.CONFIRMED || ord.status === ORDER_STATUS.SHIPPED) {
        setConfirmed(true);
      }
    } catch (e) {
      console.error('OrderConfirmation load:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSigChange = useCallback((hasSig, data) => {
    setHasClientSig(hasSig);
    if (data) setClientSigData(data);
  }, []);

  const handlePresSellerSigChange = useCallback((hasSig, data) => {
    setHasPresSellerSig(hasSig);
    if (data) setPresSellerSigData(data);
  }, []);

  const canConfirm = hasClientSig;

  const handleConfirm = () => {
    if (!hasClientSig) {
      Alert.alert('', t('signatureScreen.clientSignatureRequired'));
      return;
    }

    clientSigRef.current?.readSignature();
    presSellerSigRef.current?.readSignature();

    setTimeout(() => {
      Alert.alert(
        t('preseller.confirmOrderTitle'),
        t('preseller.confirmOrderMsg', { amount: (order?.total_amount || 0).toLocaleString() }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              try {
                await updateOrder(orderId, { status: ORDER_STATUS.CONFIRMED });
                setConfirmed(true);
                Alert.alert(t('common.done'), t('preseller.orderConfirmed'));
                await loadOrder();
              } catch (e) {
                Alert.alert(t('common.error'), e.message);
              }
            },
          },
        ]
      );
    }, 200);
  };

  const handlePrint = async () => {
    try {
      const html = orderConfirmationTemplate(order, items, customer);
      await printDocument(html);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleShare = async () => {
    try {
      const html = orderConfirmationTemplate(order, items, customer);
      const pdfUri = await generatePdf(html, `order_${orderId.slice(0, 8)}.pdf`);
      await shareDocument(pdfUri);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  if (loading) return null;

  if (!order) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.tabBarInactive} />
        <Text style={styles.emptyText}>{t('common.noData')}</Text>
      </View>
    );
  }

  // Pricing breakdown
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const discountTotal = items.reduce((s, i) => s + i.quantity * i.price * (i.discount_percent || 0) / 100, 0);
  const vatPercent = customer?.vat_rate ?? DEFAULT_VAT_PERCENT;
  const taxRate = vatPercent / 100;
  const taxAmount = Math.round((subtotal - discountTotal) * taxRate * 100) / 100;
  const total = subtotal - discountTotal + taxAmount;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Ionicons name="document-text" size={28} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>{t('preseller.orderConfirmTitle')}</Text>
            <Text style={styles.subtitle}>{customerName || order.customer_name}</Text>
          </View>
          {confirmed && (
            <View style={styles.confirmedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.confirmedText}>{t('invoice.statusConfirmed')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items */}
      <Text style={styles.sectionTitle}>{t('invoice.items')} ({items.length})</Text>
      {items.map((item, i) => (
        <View key={item.id} style={styles.itemRow}>
          <Text style={styles.itemIndex}>{i + 1}</Text>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
            <Text style={styles.itemDetail}>
              {item.quantity} × {item.price.toLocaleString()} ₽
              {item.discount_percent > 0 && ` (-${item.discount_percent}%)`}
            </Text>
          </View>
          <Text style={styles.itemTotal}>{item.total.toLocaleString()} ₽</Text>
        </View>
      ))}

      {/* Pricing breakdown */}
      <View style={styles.pricingCard}>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>{t('invoice.subtotal')}</Text>
          <Text style={styles.pricingValue}>{subtotal.toLocaleString()} ₽</Text>
        </View>
        {discountTotal > 0 && (
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>{t('invoice.discount')}</Text>
            <Text style={[styles.pricingValue, { color: COLORS.accent }]}>-{discountTotal.toLocaleString()} ₽</Text>
          </View>
        )}
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>{t('invoice.taxDynamic', { rate: vatPercent })}</Text>
          <Text style={styles.pricingValue}>{taxAmount.toLocaleString()} ₽</Text>
        </View>
        <View style={[styles.pricingRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>{t('invoice.total')}</Text>
          <Text style={styles.grandTotalValue}>{total.toLocaleString()} ₽</Text>
        </View>
      </View>

      {/* Dual signatures */}
      {!confirmed && (
        <View style={styles.sigCard}>
          <SignaturePad
            ref={clientSigRef}
            label={t('signatureScreen.clientSignature')}
            height={150}
            onSignChange={handleClientSigChange}
          />
          <SignaturePad
            ref={presSellerSigRef}
            label={t('preseller.presSellerSignature')}
            height={150}
            onSignChange={handlePresSellerSigChange}
          />
        </View>
      )}

      {/* Actions */}
      {confirmed ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
            <Ionicons name="print-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>{t('invoice.print')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>{t('invoice.share')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={!canConfirm}
        >
          <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
          <Text style={styles.confirmBtnText}>{t('preseller.confirmOrder')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  headerCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  confirmedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.success + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  confirmedText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12, gap: 10, marginBottom: 4,
  },
  itemIndex: { fontSize: 12, fontWeight: '600', color: COLORS.primary, width: 20, textAlign: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  itemDetail: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  pricingCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginTop: 12, marginBottom: 16,
  },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pricingLabel: { fontSize: 13, color: COLORS.textSecondary },
  pricingValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 6 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  grandTotalValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  sigCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '500', color: COLORS.primary },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 16,
  },
  disabledBtn: { opacity: 0.5 },
  confirmBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
