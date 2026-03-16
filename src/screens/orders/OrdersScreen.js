import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllOrders, getOrderItems, deleteOrder, getActiveVisitCustomer } from '../../database';
import { SCREEN_NAMES } from '../../constants/screens';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ORDER_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';

const STATUS_COLORS = {
  draft: COLORS.textSecondary,
  confirmed: COLORS.secondary,
  shipped: COLORS.accent,
  delivered: '#4CAF50',
  cancelled: COLORS.error,
};

function formatMoney(v) {
  return Number(v).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  async function loadOrders() {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleOrder(orderId) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    if (!items[orderId]) {
      const orderItems = await getOrderItems(orderId);
      setItems((prev) => ({ ...prev, [orderId]: orderItems }));
    }
    setExpandedOrder(orderId);
  }

  function handleEdit(orderId) {
    navigation.navigate(SCREEN_NAMES.ORDER_EDIT, { orderId });
  }

  async function handleCreate() {
    const visit = user?.id ? await getActiveVisitCustomer(user.id) : null;
    navigation.navigate(SCREEN_NAMES.ORDER_EDIT, visit
      ? { customerId: visit.customer_id, customerName: visit.customer_name, pointId: visit.point_id, routeId: visit.route_id }
      : {}
    );
  }

  function handleDelete(orderId) {
    Alert.alert(t('ordersScreen.deleteOrder'), t('ordersScreen.deleteOrderMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ordersScreen.deleteButton'), style: 'destructive', onPress: async () => {
          await deleteOrder(orderId);
          setItems((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
          setExpandedOrder(null);
          loadOrders();
        },
      },
    ]);
  }

  function renderItem({ item: oi }) {
    return (
      <View style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{oi.product_name}</Text>
          <Text style={styles.itemSku}>{oi.sku} / {oi.volume}</Text>
        </View>
        <Text style={styles.itemQty}>{oi.quantity} шт</Text>
        <Text style={styles.itemPrice}>{formatMoney(oi.total)}</Text>
      </View>
    );
  }

  function renderOrder({ item }) {
    const stColor = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
    const stLabel = t('ordersScreen.statuses.' + (item.status || 'draft'));
    const isExpanded = expandedOrder === item.id;
    const orderItems = items[item.id] || [];
    const canEdit = item.status === ORDER_STATUS.DRAFT || item.status === ORDER_STATUS.CONFIRMED;

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleOrder(item.id)}>
          <View style={styles.cardLeft}>
            <Text style={styles.orderId}>#{item.id.slice(-3)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
              <Text style={styles.customerAddr} numberOfLines={1}>{item.customer_address}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.orderTotal}>{formatMoney(item.total_amount)}</Text>
            <View style={[styles.badge, { backgroundColor: stColor + '20' }]}>
              <Text style={[styles.badgeText, { color: stColor }]}>{stLabel}</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.itemsList}>
            {orderItems.length > 0 && (
              <>
                <View style={styles.itemsHeader}>
                  <Text style={[styles.itemsHeaderText, { flex: 1 }]}>{t('ordersScreen.product')}</Text>
                  <Text style={styles.itemsHeaderText}>{t('ordersScreen.quantity')}</Text>
                  <Text style={[styles.itemsHeaderText, { textAlign: 'right', width: 90 }]}>{t('ordersScreen.amount')}</Text>
                </View>
                {orderItems.map((oi) => (
                  <React.Fragment key={oi.id}>{renderItem({ item: oi })}</React.Fragment>
                ))}
              </>
            )}
            {item.discount_amount > 0 && (
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>{t('ordersScreen.discount')}</Text>
                <Text style={styles.discountValue}>-{formatMoney(item.discount_amount)}</Text>
              </View>
            )}
            <View style={styles.actionsRow}>
              {canEdit ? (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item.id)}>
                    <Ionicons name="create-outline" size={16} color={COLORS.secondary} />
                    <Text style={[styles.actionText, { color: COLORS.secondary }]}>{t('ordersScreen.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                    <Text style={[styles.actionText, { color: COLORS.error }]}>{t('ordersScreen.delete')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate(SCREEN_NAMES.ORDER_EDIT, { orderId: item.id, readOnly: true })}>
                  <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionText, { color: COLORS.primary }]}>{t('ordersScreen.view')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const totalSum = orders.reduce((s, o) => s + o.total_amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('ordersScreen.title')}</Text>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>{t('ordersScreen.ordersCount')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatMoney(totalSum)}</Text>
          <Text style={styles.summaryLabel}>{t('ordersScreen.totalAmount')}</Text>
        </View>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('ordersScreen.noOrders')}</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={handleCreate} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.white },
  summary: {
    flexDirection: 'row', backgroundColor: COLORS.white, paddingVertical: 14,
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  list: { padding: 12, paddingBottom: 80 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  orderId: {
    fontSize: 14, fontWeight: '700', color: COLORS.white, backgroundColor: COLORS.primary,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden',
  },
  customerName: { fontSize: 14, fontWeight: '600', color: COLORS.text, maxWidth: 160 },
  customerAddr: { fontSize: 11, color: COLORS.textSecondary, maxWidth: 160, marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  orderTotal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  itemsList: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 14, paddingBottom: 10 },
  itemsHeader: {
    flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemsHeaderText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, color: COLORS.text },
  itemSku: { fontSize: 11, color: COLORS.textSecondary },
  itemQty: { fontSize: 13, color: COLORS.text, width: 55, textAlign: 'center' },
  itemPrice: { fontSize: 13, fontWeight: '600', color: COLORS.text, width: 90, textAlign: 'right' },
  discountRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4,
  },
  discountLabel: { fontSize: 13, color: COLORS.error },
  discountValue: { fontSize: 13, fontWeight: '600', color: COLORS.error },
  actionsRow: {
    flexDirection: 'row', gap: 16, paddingTop: 10, marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
});
