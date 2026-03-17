import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { VISIT_STATUS, ORDER_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getCustomerById, getOrdersByRoutePoint, updateRoutePointStatus,
  getVisitReportByPoint,
} from '../../database';
import { recordVisitLocation } from '../../services/locationService';

export default function PresellerVisitScreen({ route }) {
  const { t } = useTranslation();
  const { pointId, routeId, customerId, customerName, pointStatus: initialStatus } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [visitStatus, setVisitStatus] = useState(initialStatus || VISIT_STATUS.PENDING);
  const [showOrders, setShowOrders] = useState(false);

  const isCompleted = visitStatus === VISIT_STATUS.COMPLETED || visitStatus === VISIT_STATUS.SKIPPED;
  const visitStarted = visitStatus === VISIT_STATUS.IN_PROGRESS || isCompleted;

  const loadData = useCallback(async () => {
    try {
      if (customerId) {
        const c = await getCustomerById(customerId);
        setCustomer(c);
      }
      if (pointId) {
        const ord = await getOrdersByRoutePoint(pointId);
        setOrders(ord);
        if (ord.length > 0) setShowOrders(true);
      }
    } catch (e) {
      console.error('Preseller visit load:', e);
    }
  }, [customerId, pointId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleStartVisit = async () => {
    if (pointId) {
      await updateRoutePointStatus(pointId, VISIT_STATUS.IN_PROGRESS);
      setVisitStatus(VISIT_STATUS.IN_PROGRESS);
      recordVisitLocation(user?.id, routeId, pointId, 'visit_start').catch(() => {});
    }
  };

  const handleEndVisit = async () => {
    // Check if visit report has been filled
    try {
      const report = await getVisitReportByPoint(pointId);
      if (!report) {
        Alert.alert(
          t('preseller.reportMissing'),
          t('preseller.reportMissingMsg'),
          [
            { text: t('preseller.skipReport'), style: 'cancel', onPress: () => confirmEndVisit() },
            {
              text: t('preseller.fillReport'),
              onPress: () => navigation.navigate(SCREEN_NAMES.VISIT_REPORT, { customerId, customerName, pointId, routeId }),
            },
          ]
        );
        return;
      }
    } catch (e) {
      console.error('Check visit report:', e);
    }
    confirmEndVisit();
  };

  const confirmEndVisit = () => {
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

  const handleNewOrder = () => {
    navigation.navigate(SCREEN_NAMES.ORDER_EDIT, {
      customerId, customerName, pointId, routeId,
    });
  };

  const handleOrderConfirm = (order) => {
    navigation.navigate(SCREEN_NAMES.ORDER_CONFIRMATION, {
      orderId: order.id, customerId, customerName, pointId,
    });
  };

  const hasConfirmedOrders = orders.some((o) => o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.SHIPPED);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isCompleted && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyText}>{t('shipmentScreen.processedViewOnly')}</Text>
        </View>
      )}

      {/* Customer info */}
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
        {customer?.phone && (
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{customer.phone}</Text>
          </View>
        )}
        {customer?.debt_amount > 0 && (
          <View style={[styles.metaRow, { marginTop: 6 }]}>
            <Ionicons name="alert-circle" size={14} color={COLORS.error} />
            <Text style={styles.debtText}>{t('visit.debtAmountLabel')}: {customer.debt_amount.toLocaleString()} ₽</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Start/End visit */}
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

      {/* Actions */}
      <Text style={styles.sectionTitle}>{t('preseller.actions')}</Text>
      <View style={styles.actionsGrid}>
        {/* Take Order */}
        <TouchableOpacity
          style={[styles.actionCard, !visitStarted && styles.actionCardDisabled]}
          onPress={visitStarted ? handleNewOrder : () => Alert.alert('', t('visit.startVisitFirst'))}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <Ionicons name="create-outline" size={26} color={visitStarted ? COLORS.primary : COLORS.tabBarInactive} />
          </View>
          <Text style={[styles.actionTitle, !visitStarted && styles.actionTitleDisabled]}>{t('preseller.takeOrder')}</Text>
          <Text style={styles.actionSubtitle}>{t('preseller.takeOrderSub')}</Text>
        </TouchableOpacity>

        {/* View Orders */}
        <TouchableOpacity
          style={[styles.actionCard, orders.length === 0 && styles.actionCardDisabled]}
          onPress={orders.length > 0 ? () => setShowOrders((v) => !v) : undefined}
          disabled={orders.length === 0}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '15' }]}>
            <Ionicons name={showOrders ? 'chevron-up-outline' : 'list-outline'} size={26} color={orders.length > 0 ? COLORS.info : COLORS.tabBarInactive} />
          </View>
          <Text style={[styles.actionTitle, orders.length === 0 && styles.actionTitleDisabled]}>{t('preseller.viewOrders')}</Text>
          <Text style={styles.actionSubtitle}>{orders.length} {t('visit.shipmentSub')}</Text>
        </TouchableOpacity>
      </View>

      {/* Visit Report */}
      <TouchableOpacity
        style={[styles.reportBtn, !visitStarted && styles.actionCardDisabled]}
        onPress={visitStarted
          ? () => navigation.navigate(SCREEN_NAMES.VISIT_REPORT, { customerId, customerName, pointId, routeId })
          : () => Alert.alert('', t('visit.startVisitFirst'))
        }
      >
        <Ionicons name="clipboard-outline" size={22} color={visitStarted ? COLORS.accent : COLORS.tabBarInactive} />
        <Text style={[styles.reportBtnText, !visitStarted && styles.actionTitleDisabled]}>{t('preseller.visitReport')}</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.tabBarInactive} />
      </TouchableOpacity>

      {/* Orders list */}
      {showOrders && orders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('visit.orders')} ({orders.length})</Text>
          {orders.map((o) => {
            const isDraft = o.status === ORDER_STATUS.DRAFT;
            const isConfirmed = o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.SHIPPED;
            return (
              <View key={o.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderNum}>{t('visit.orderNum')} #{o.id.slice(-6)}</Text>
                    <View style={[styles.orderStatusBadge, isConfirmed && styles.orderStatusConfirmed]}>
                      <Text style={[styles.orderStatusText, isConfirmed && styles.orderStatusTextConfirmed]}>
                        {t(`ordersScreen.statuses.${o.status}`, o.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderAmount}>{(o.total_amount || 0).toLocaleString()} ₽</Text>
                </View>
                <View style={styles.orderActions}>
                  {isDraft && visitStarted && !isCompleted && (
                    <>
                      <TouchableOpacity
                        style={styles.orderActionBtn}
                        onPress={() => navigation.navigate(SCREEN_NAMES.ORDER_EDIT, { orderId: o.id, pointId, routeId })}
                      >
                        <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.orderActionText}>{t('common.edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.orderActionBtn, styles.confirmOrderBtn]}
                        onPress={() => handleOrderConfirm(o)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />
                        <Text style={[styles.orderActionText, { color: COLORS.white }]}>{t('preseller.confirmOrder')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {isConfirmed && (
                    <TouchableOpacity
                      style={styles.orderActionBtn}
                      onPress={() => navigation.navigate(SCREEN_NAMES.ORDER_EDIT, { orderId: o.id, readOnly: true })}
                    >
                      <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.orderActionText}>{t('ordersScreen.view')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}
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
  customerAddress: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },
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
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  actionsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8,
  },
  actionCardDisabled: { opacity: 0.5 },
  actionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actionTitleDisabled: { color: COLORS.tabBarInactive },
  actionSubtitle: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 20,
  },
  reportBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  orderCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNum: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  orderStatusBadge: {
    backgroundColor: COLORS.textSecondary + '20', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start',
  },
  orderStatusConfirmed: { backgroundColor: COLORS.success + '20' },
  orderStatusText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  orderStatusTextConfirmed: { color: COLORS.success },
  orderAmount: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  orderActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  orderActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  confirmOrderBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  orderActionText: { fontSize: 13, fontWeight: '500', color: COLORS.primary },
});
