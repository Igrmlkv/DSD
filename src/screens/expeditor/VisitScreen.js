import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { VISIT_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getCustomerById, getOrdersByRoutePoint, updateRoutePointStatus,
  getDeliveryByRoutePoint, getOrderById, getActiveVisitCustomer,
  searchOrderByCode,
} from '../../database';
import { getInvoiceByDelivery } from '../../services/invoiceService';
import { recordVisitLocation } from '../../services/locationService';

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
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanProcessedRef = useRef(false);

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
      recordVisitLocation(user?.id, routeId, pointId, 'visit_start').catch(() => {});
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
            recordVisitLocation(user?.id, routeId, pointId, 'visit_end').catch(() => {});
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleOpenQrScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(t('visit.cameraPermission'), t('visit.cameraPermissionMsg'));
        return;
      }
    }
    scanProcessedRef.current = false;
    setShowManualInput(false);
    setQrCode('');
    setShowQrModal(true);
  };

  const processScannedCode = async (code) => {
    if (!code) return;
    try {
      const order = await searchOrderByCode(code);
      if (!order) {
        Alert.alert(t('visit.qrNotFound'), t('visit.qrNotFoundMsg', { code }));
        scanProcessedRef.current = false;
        setQrCode('');
        return;
      }
      if (order.route_point_id && order.route_point_id !== pointId) {
        Alert.alert(
          t('visit.wrongOrder'),
          t('visit.wrongOrderMsg', { code, customer: order.customer_name }),
          [{ text: t('common.confirm'), onPress: () => { scanProcessedRef.current = false; } }]
        );
        setQrCode('');
        return;
      }
      setQrCode('');
      setShowQrModal(false);
      navigation.navigate(SCREEN_NAMES.SHIPMENT, {
        pointId: order.route_point_id || pointId,
        customerId: order.customer_id || customerId,
        customerName: order.customer_name || customerName,
        routeId,
        readOnly: isCompleted,
      });
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
      scanProcessedRef.current = false;
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanProcessedRef.current) return;
    scanProcessedRef.current = true;
    processScannedCode(data.trim());
  };

  const handleManualSearch = () => {
    const code = qrCode.trim();
    if (!code) return;
    scanProcessedRef.current = true;
    processScannedCode(code);
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
      onPress: handleOpenQrScanner },
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
      <Modal visible={showQrModal} animationType="slide" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => { setShowQrModal(false); setQrCode(''); }} style={styles.scannerCloseBtn}>
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>{t('visit.scanQrTitle')}</Text>
            <TouchableOpacity onPress={() => setShowManualInput(!showManualInput)} style={styles.scannerCloseBtn}>
              <Ionicons name={showManualInput ? 'camera' : 'keypad'} size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {!showManualInput ? (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.scanCorner, styles.scanCornerTL]} />
                  <View style={[styles.scanCorner, styles.scanCornerTR]} />
                  <View style={[styles.scanCorner, styles.scanCornerBL]} />
                  <View style={[styles.scanCorner, styles.scanCornerBR]} />
                </View>
              </View>
              <Text style={styles.scanHint}>{t('visit.scanQrHint')}</Text>
            </View>
          ) : (
            <KeyboardAvoidingView style={styles.manualInputContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Ionicons name="qr-code" size={48} color={COLORS.primary} style={{ marginBottom: 16 }} />
              <Text style={styles.manualInputTitle}>{t('visit.manualInputTitle')}</Text>
              <TextInput
                style={styles.qrInput}
                value={qrCode}
                onChangeText={(text) => { setQrCode(text); scanProcessedRef.current = false; }}
                placeholder={t('visit.qrPlaceholder')}
                placeholderTextColor={COLORS.tabBarInactive}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={handleManualSearch}
              />
              <TouchableOpacity style={styles.qrSearchBtn} onPress={handleManualSearch}>
                <Ionicons name="search" size={18} color={COLORS.white} />
                <Text style={styles.qrSearchText}>{t('visit.findOrder')}</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}
        </View>
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
  // QR scanner modal
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10,
  },
  scannerCloseBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scannerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.white },
  cameraWrapper: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 240, height: 240, position: 'relative' },
  scanCorner: { position: 'absolute', width: 32, height: 32, borderColor: COLORS.white },
  scanCornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  scanCornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  scanCornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  scanCornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanHint: { position: 'absolute', bottom: 80, alignSelf: 'center', fontSize: 14, color: COLORS.white, textAlign: 'center', paddingHorizontal: 32 },
  manualInputContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.background },
  manualInputTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  qrInput: { backgroundColor: COLORS.white, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 16, width: '100%' },
  qrSearchBtn: { flexDirection: 'row', padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' },
  qrSearchText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
});
