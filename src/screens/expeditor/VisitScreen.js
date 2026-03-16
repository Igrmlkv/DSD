import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { VISIT_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getCustomerById, getOrdersByRoutePoint, updateRoutePointStatus,
  getDeliveryByRoutePoint, getOrderById, getActiveVisitCustomer,
} from '../../database';
import { getInvoiceByDelivery } from '../../services/invoiceService';

export default function VisitScreen({ route }) {
  const { t } = useTranslation();
  const { pointId, routeId, customerId, customerName, pointStatus: initialStatus } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [invoiceId, setInvoiceId] = useState(null);
  const [visitStatus, setVisitStatus] = useState(initialStatus || VISIT_STATUS.PENDING);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState('');

  const isCompleted = visitStatus === VISIT_STATUS.COMPLETED || visitStatus === VISIT_STATUS.SKIPPED;
  const visitStarted = visitStatus === VISIT_STATUS.IN_PROGRESS || isCompleted;

  const loadData = useCallback(async () => {
    try {
      const [c, ord, delivery] = await Promise.all([
        customerId ? getCustomerById(customerId) : null,
        pointId ? getOrdersByRoutePoint(pointId) : [],
        pointId ? getDeliveryByRoutePoint(pointId) : null,
      ]);
      if (c) setCustomer(c);
      setOrders(ord || []);
      if (delivery) {
        const invoice = await getInvoiceByDelivery(delivery.id);
        setInvoiceId(invoice?.id || null);
      } else {
        setInvoiceId(null);
      }
    } catch (e) {
      console.error('Visit load error:', e);
    }
  }, [customerId, pointId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleStartVisit = async () => {
    if (!pointId) return;
    try {
      const activeVisit = await getActiveVisitCustomer(user?.id);
      if (activeVisit && activeVisit.point_id !== pointId) {
        Alert.alert(
          t('visit.activeVisitExists'),
          t('visit.activeVisitMsg', { customer: activeVisit.customer_name }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('visit.goToActiveVisit'),
              onPress: () => navigation.navigate(SCREEN_NAMES.ROUTE_LIST),
            },
          ]
        );
        return;
      }
      await updateRoutePointStatus(pointId, VISIT_STATUS.IN_PROGRESS);
      setVisitStatus(VISIT_STATUS.IN_PROGRESS);
    } catch (e) {
      console.error('Start visit error:', e);
      await updateRoutePointStatus(pointId, VISIT_STATUS.IN_PROGRESS);
      setVisitStatus(VISIT_STATUS.IN_PROGRESS);
    }
  };

  const handleEndVisit = () => {
    Alert.alert(t('visit.completeVisit'), t('visit.completeVisitMsg'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('visit.yesComplete'), onPress: async () => {
          if (pointId) {
            await updateRoutePointStatus(pointId, VISIT_STATUS.COMPLETED);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleQrScan = async () => {
    const code = qrCode.trim();
    if (!code) return;
    try {
      const order = await getOrderById(code);
      if (!order) {
        Alert.alert(t('visit.qrNotFound'), t('visit.qrNotFoundMsg', { code }));
        setQrCode('');
        return;
      }
      setQrCode('');
      setShowQrModal(false);
      navigation.navigate(SCREEN_NAMES.SHIPMENT, {
        pointId: order.route_point_id || pointId,
        customerId: order.customer_id || customerId,
        customerName,
        routeId,
        readOnly: isCompleted,
      });
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const navParams = { pointId, customerId, customerName, routeId, readOnly: isCompleted };

  const actions = [
    { key: 'shipment', title: t('visit.shipment'), subtitle: `${orders.length} ${t('visit.shipmentSub')}`, icon: 'cart-outline', color: COLORS.primary,
      onPress: () => navigation.navigate(SCREEN_NAMES.SHIPMENT, navParams) },
    { key: 'returns', title: t('visit.returns'), subtitle: t('visit.returnsSub'), icon: 'return-down-back-outline', color: COLORS.error,
      onPress: () => navigation.navigate(SCREEN_NAMES.RETURNS, navParams) },
    { key: 'packaging', title: t('visit.packaging'), subtitle: t('visit.packagingSub'), icon: 'archive-outline', color: COLORS.info,
      onPress: () => navigation.navigate(SCREEN_NAMES.PACKAGING_RETURNS, navParams) },
    { key: 'payment', title: t('visit.payment'), subtitle: customer?.debt_amount > 0 ? `${t('visit.debtLabel')}: ${customer.debt_amount.toLocaleString()} ₽` : t('visit.noDebt'), icon: 'wallet-outline', color: COLORS.accent,
      onPress: () => navigation.navigate(SCREEN_NAMES.PAYMENT, navParams) },
    { key: 'qrscan', title: t('visit.scanQr'), subtitle: t('visit.scanQrSub'), icon: 'qr-code-outline', color: COLORS.secondary,
      onPress: () => setShowQrModal(true) },
    { key: 'invoices', title: t('visit.invoices'), subtitle: t('visit.invoicesSub'), icon: 'document-text-outline', color: '#8E44AD',
      onPress: () => {
        if (invoiceId) {
          navigation.navigate(SCREEN_NAMES.INVOICE_SUMMARY, { invoiceId, ...navParams });
        } else {
          Alert.alert('', t('visit.noInvoice'));
        }
      } },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Баннер только для просмотра */}
      {isCompleted && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyText}>{t('shipmentScreen.processedViewOnly')}</Text>
        </View>
      )}

      {/* Информация о клиенте */}
      <TouchableOpacity
        style={styles.customerCard}
        onPress={() => navigation.navigate(SCREEN_NAMES.CUSTOMER_DETAIL, { customerId })}
        activeOpacity={0.7}
      >
        <View style={styles.customerHeader}>
          <Ionicons name="storefront" size={24} color={COLORS.primary} />
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName || customer?.name}</Text>
            <Text style={styles.customerAddress} numberOfLines={2}>{customer?.address}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.tabBarInactive} />
        </View>
        {customer && (
          <View style={styles.customerMeta}>
            {customer.contact_person && (
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{customer.contact_person}</Text>
              </View>
            )}
            {customer.phone && (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{customer.phone}</Text>
              </View>
            )}
            {customer.debt_amount > 0 && (
              <View style={[styles.metaRow, styles.debtRow]}>
                <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                <Text style={styles.debtText}>{t('visit.debtAmountLabel')}: {customer.debt_amount.toLocaleString('ru-RU')} ₽</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Кнопка старта/завершения */}
      {!isCompleted && (
        visitStatus === VISIT_STATUS.PENDING ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStartVisit}>
            <Ionicons name="play-circle" size={22} color={COLORS.white} />
            <Text style={styles.startBtnText}>{t('visit.startVisit')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.endBtn} onPress={handleEndVisit}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
            <Text style={styles.endBtnText}>{t('visit.endVisit')}</Text>
          </TouchableOpacity>
        )
      )}

      {/* Действия */}
      <Text style={styles.sectionTitle}>{isCompleted ? t('visit.visitData') : t('visit.actions')}</Text>
      <View style={styles.actionsGrid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[styles.actionCard, isCompleted && styles.actionCardReadOnly, !visitStarted && styles.actionCardDisabled]}
            onPress={visitStarted ? a.onPress : () => Alert.alert('', t('visit.startVisitFirst'))}
            activeOpacity={visitStarted ? 0.7 : 1}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.color + (visitStarted ? '15' : '08') }]}>
              <Ionicons name={a.icon} size={26} color={visitStarted ? a.color : COLORS.tabBarInactive} />
            </View>
            <Text style={[styles.actionTitle, !visitStarted && styles.actionTitleDisabled]}>{a.title}</Text>
            <Text style={styles.actionSubtitle}>{a.subtitle}</Text>
            {isCompleted && (
              <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
            )}
            {!visitStarted && (
              <Ionicons name="lock-closed-outline" size={14} color={COLORS.tabBarInactive} style={{ marginTop: 2 }} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Заказы точки */}
      {orders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('visit.orders')} ({orders.length})</Text>
          {orders.map((o) => (
            <View key={o.id} style={styles.orderRow}>
              <View>
                <Text style={styles.orderNum}>{t('visit.orderNum')} #{o.id.slice(-6)}</Text>
                <Text style={styles.orderStatus}>{o.status}</Text>
              </View>
              <Text style={styles.orderAmount}>{o.total_amount?.toLocaleString('ru-RU')} ₽</Text>
            </View>
          ))}
        </>
      )}
      {/* QR Scan Modal */}
      <Modal visible={showQrModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.qrOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.qrContent}>
            <View style={styles.qrHeader}>
              <Ionicons name="qr-code" size={32} color={COLORS.primary} />
              <Text style={styles.qrTitle}>{t('visit.scanQrTitle')}</Text>
            </View>
            <Text style={styles.qrSubtitle}>{t('visit.scanQrHint')}</Text>
            <TextInput
              style={styles.qrInput}
              value={qrCode}
              onChangeText={setQrCode}
              placeholder={t('visit.qrPlaceholder')}
              placeholderTextColor={COLORS.tabBarInactive}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={handleQrScan}
            />
            <View style={styles.qrButtons}>
              <TouchableOpacity style={styles.qrCancelBtn} onPress={() => { setShowQrModal(false); setQrCode(''); }}>
                <Text style={styles.qrCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrSearchBtn} onPress={handleQrScan}>
                <Ionicons name="search" size={18} color={COLORS.white} />
                <Text style={styles.qrSearchText}>{t('visit.findOrder')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, borderRadius: 10, padding: 10, marginBottom: 16,
  },
  readOnlyText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  customerCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  customerHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  customerAddress: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  customerMeta: { marginTop: 12, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },
  debtRow: { marginTop: 4 },
  debtText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, marginBottom: 20,
  },
  startBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.success, borderRadius: 12, padding: 14, marginBottom: 20,
  },
  endBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  actionCardReadOnly: { opacity: 0.85 },
  actionCardDisabled: { opacity: 0.5 },
  actionTitleDisabled: { color: COLORS.tabBarInactive },
  actionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actionSubtitle: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 6,
  },
  orderNum: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  orderStatus: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  orderAmount: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  // QR modal
  qrOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  qrContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  qrTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  qrSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 18 },
  qrInput: { backgroundColor: COLORS.background, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  qrButtons: { flexDirection: 'row', gap: 12 },
  qrCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
  qrCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  qrSearchBtn: { flex: 1, flexDirection: 'row', padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', gap: 6 },
  qrSearchText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
});
