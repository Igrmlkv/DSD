import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import useAuthStore from '../../store/authStore';
import {
  getOrdersByRoutePoint, getOrderItems, getAvailableVehicleStock,
  getDeliveryByRoutePoint, getDeliveryItems,
} from '../../database';

export default function ShipmentScreen({ route }) {
  const { t } = useTranslation();
  const { pointId, customerId, routeId, readOnly } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [deliveredQty, setDeliveredQty] = useState({});
  const [isShipped, setIsShipped] = useState(false);

  // Vehicle stock map: product_id -> available qty
  const [stockMap, setStockMap] = useState({});

  // Add item from vehicle stock
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [vehicleStock, setVehicleStock] = useState([]);
  const [stockSearch, setStockSearch] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const orders = await getOrdersByRoutePoint(pointId);
        const hasShipped = orders.some((o) => o.status === 'shipped' || o.status === 'delivered');

        if (hasShipped) {
          setIsShipped(true);
          // Load from delivery_items to show all items including added ones
          const delivery = await getDeliveryByRoutePoint(pointId);
          if (delivery) {
            const dItems = await getDeliveryItems(delivery.id);
            const mapped = dItems.map((di) => ({
              id: di.id,
              product_id: di.product_id,
              product_name: di.product_name,
              sku: di.sku,
              volume: di.volume,
              price: di.price,
              quantity: di.ordered_quantity,
              total: di.ordered_quantity * di.price,
              isAdded: di.ordered_quantity === 0,
            }));
            setItems(mapped);
            const qtyMap = {};
            dItems.forEach((di) => { qtyMap[di.id] = di.delivered_quantity; });
            setDeliveredQty(qtyMap);
          } else {
            // Fallback to order items if no delivery record
            let allItems = [];
            for (const o of orders) {
              const oi = await getOrderItems(o.id);
              allItems = [...allItems, ...oi.map((i) => ({ ...i, orderId: o.id }))];
            }
            setItems(allItems);
            const initial = {};
            allItems.forEach((i) => { initial[i.id] = i.quantity; });
            setDeliveredQty(initial);
          }
        } else {
          // Not shipped yet — load from order items for editing
          let allItems = [];
          for (const o of orders) {
            const oi = await getOrderItems(o.id);
            allItems = [...allItems, ...oi.map((i) => ({ ...i, orderId: o.id }))];
          }
          setItems(allItems);
          const initial = {};
          allItems.forEach((i) => { initial[i.id] = i.quantity; });
          setDeliveredQty(initial);

          // Load available vehicle stock (minus other unshipped orders)
          if (user?.vehicleId) {
            const stock = await getAvailableVehicleStock(user.vehicleId, user.id, null, pointId);
            const map = {};
            for (const s of stock) { map[s.product_id] = s.available_quantity; }
            setStockMap(map);
          }
        }
      } catch (e) { console.error('Shipment load:', e); }
    })();
  }, [pointId]));

  const canEdit = !readOnly && !isShipped;

  const adjustQty = (itemId, delta) => {
    if (!canEdit) return;
    setDeliveredQty((prev) => {
      const newVal = Math.max(0, (prev[itemId] || 0) + delta);
      return { ...prev, [itemId]: newVal };
    });
  };

  const handleConfirm = () => {
    // Check stock availability
    const overStock = items.filter((i) => {
      const delivered = deliveredQty[i.id] || 0;
      if (delivered === 0) return false;
      const available = i.isAdded ? (i.maxFromStock ?? Infinity) : (stockMap[i.product_id] ?? Infinity);
      return delivered > available;
    });
    if (overStock.length > 0) {
      const names = overStock.map((i) => {
        const available = i.isAdded ? (i.maxFromStock ?? 0) : (stockMap[i.product_id] ?? 0);
        return t('shipmentScreen.stockLine', { name: i.product_name, delivered: deliveredQty[i.id], available });
      }).join('\n');
      Alert.alert(t('shipmentScreen.insufficientStock'), t('shipmentScreen.stockExceeded', { names }));
      return;
    }

    const shortItems = items.filter((i) => (deliveredQty[i.id] || 0) < i.quantity);
    if (shortItems.length > 0) {
      Alert.alert(
        t('shipmentScreen.partialShipment'),
        t('shipmentScreen.partialShipmentMsg', { count: shortItems.length }),
        [
          { text: t('common.no'), style: 'cancel' },
          { text: t('common.confirm'), onPress: () => goToSignature() },
        ]
      );
    } else {
      goToSignature();
    }
  };

  const goToSignature = () => {
    navigation.navigate(SCREEN_NAMES.SIGNATURE, {
      type: 'shipment', pointId, customerId, items: items.map((i) => ({
        ...i, delivered: deliveredQty[i.id] || 0,
      })),
    });
  };

  // Add item from vehicle stock
  const openStockPicker = async () => {
    try {
      const vehicleId = user?.vehicleId;
      if (!vehicleId) {
        Alert.alert(t('common.error'), t('shipmentScreen.noVehicle'));
        return;
      }
      const stock = await getAvailableVehicleStock(vehicleId, user.id, null, pointId);
      // Filter out items already in the order, show only available
      const existingProductIds = new Set(items.map((i) => i.product_id));
      const available = stock.filter((s) => s.available_quantity > 0 && !existingProductIds.has(s.product_id));
      setVehicleStock(available);
      setStockSearch('');
      setShowStockPicker(true);
    } catch (e) {
      Alert.alert(t('common.error'), t('shipmentScreen.loadError'));
    }
  };

  const addStockItem = (stockItem) => {
    const newItem = {
      id: 'added-' + stockItem.product_id,
      product_id: stockItem.product_id,
      product_name: stockItem.product_name,
      sku: stockItem.sku,
      volume: stockItem.volume,
      price: stockItem.base_price || 0,
      quantity: 0, // plan is 0, since it's an extra item
      total: 0,
      orderId: null,
      isAdded: true,
      maxFromStock: stockItem.available_quantity,
    };
    setItems((prev) => [...prev, newItem]);
    setDeliveredQty((prev) => ({ ...prev, [newItem.id]: 1 }));
    setShowStockPicker(false);
  };

  const removeAddedItem = (itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setDeliveredQty((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const totalPlan = items.reduce((s, i) => s + i.total, 0);
  const totalFact = items.reduce((s, i) => s + (deliveredQty[i.id] || 0) * i.price, 0);

  const filteredStock = vehicleStock.filter((s) =>
    !stockSearch || s.product_name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.sku.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const delivered = deliveredQty[item.id] || 0;
    const isDiff = delivered !== item.quantity;
    const stockAvailable = item.isAdded ? (item.maxFromStock ?? Infinity) : (stockMap[item.product_id] ?? Infinity);
    const isOverStock = delivered > 0 && delivered > stockAvailable;
    const atStockLimit = delivered >= stockAvailable && stockAvailable !== Infinity;
    return (
      <View style={[styles.itemRow, isDiff && styles.itemDiff, item.isAdded && styles.itemAdded, isOverStock && styles.itemOverStock]}>
        <View style={styles.itemInfo}>
          <View style={styles.itemNameRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
            {item.isAdded && (
              <View style={styles.addedBadge}>
                <Text style={styles.addedBadgeText}>{t('shipmentScreen.addedLabel')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemSku}>{item.sku} {item.volume ? `• ${item.volume}` : ''}</Text>
          <Text style={styles.itemPrice}>
            {item.price} ₽ × {item.quantity > 0 ? item.quantity : delivered} = {((item.quantity > 0 ? item.total : delivered * item.price) || 0).toLocaleString()} ₽
          </Text>
          {stockAvailable !== Infinity && (
            <Text style={[styles.stockHint, isOverStock && styles.stockHintError]}>
              {t('shipmentScreen.inVehicle', { qty: stockAvailable })}
            </Text>
          )}
          {isOverStock && (
            <View style={styles.overStockBadge}>
              <Ionicons name="warning" size={12} color={COLORS.error} />
              <Text style={styles.overStockText}>
                {t('shipmentScreen.exceedsStock', { qty: delivered - stockAvailable })}
              </Text>
            </View>
          )}
        </View>
        {canEdit ? (
          <View style={styles.qtySection}>
            {item.isAdded && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeAddedItem(item.id)}>
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              </TouchableOpacity>
            )}
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(item.id, -1)}>
                <Ionicons name="remove" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={[styles.qtyValue, isDiff && styles.qtyDiff, isOverStock && styles.qtyOverStock]}>{delivered}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, atStockLimit && styles.qtyBtnDisabled]}
                onPress={() => {
                  if (atStockLimit) {
                    Alert.alert('', t('shipmentScreen.vehicleRemaining', { qty: stockAvailable }));
                    return;
                  }
                  adjustQty(item.id, 1);
                }}
              >
                <Ionicons name="add" size={18} color={atStockLimit ? COLORS.tabBarInactive : COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.qtyReadOnly}>
            <Text style={styles.qtyReadOnlyLabel}>{t('shipmentScreen.shipped')}</Text>
            <Text style={styles.qtyReadOnlyValue}>{delivered}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {(readOnly || isShipped) && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyText}>
            {isShipped ? t('shipmentScreen.shippedViewOnly') : t('shipmentScreen.processedViewOnly')}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('shipmentScreen.noItems')}</Text>
          </View>
        }
        ListFooterComponent={
          canEdit ? (
            <TouchableOpacity style={styles.addItemBtn} onPress={openStockPicker}>
              <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
              <Text style={styles.addItemText}>{t('shipmentScreen.addFromVehicle')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totals}>
            <Text style={styles.totalLabel}>{t('shipmentScreen.planTotal')}: {totalPlan.toLocaleString()} ₽</Text>
            <Text style={[styles.totalLabel, totalFact !== totalPlan && styles.totalDiff]}>
              {t('shipmentScreen.factTotal')}: {totalFact.toLocaleString()} ₽
            </Text>
          </View>
          {canEdit && (
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>{t('shipmentScreen.confirmShipment')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Vehicle Stock Picker Modal */}
      <Modal visible={showStockPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('shipmentScreen.vehicleStock')}</Text>
            <TouchableOpacity onPress={() => setShowStockPicker(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={t('shipmentScreen.searchPlaceholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            value={stockSearch}
            onChangeText={setStockSearch}
          />
          <FlatList
            data={filteredStock}
            keyExtractor={(item) => item.product_id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.stockRow} onPress={() => addStockItem(item)}>
                <View style={styles.stockInfo}>
                  <Text style={styles.stockName}>{item.product_name}</Text>
                  <Text style={styles.stockSku}>{item.sku} • {item.base_price} ₽</Text>
                  <Text style={styles.stockQty}>{t('shipmentScreen.available', { qty: item.available_quantity })}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyStock}>
                <Text style={styles.emptyStockText}>{t('shipmentScreen.noAvailableProducts')}</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, padding: 10,
  },
  readOnlyText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 120 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12, gap: 10, marginBottom: 6,
  },
  itemDiff: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  itemAdded: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  itemOverStock: { borderLeftWidth: 3, borderLeftColor: COLORS.error, backgroundColor: COLORS.error + '08' },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  addedBadge: { backgroundColor: COLORS.primary + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  addedBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 12, color: COLORS.info, marginTop: 3 },
  stockHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  stockHintError: { color: COLORS.error, fontWeight: '600' },
  overStockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: COLORS.error + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start',
  },
  overStockText: { fontSize: 11, color: COLORS.error, fontWeight: '600' },
  qtySection: { alignItems: 'center', gap: 4 },
  removeBtn: { padding: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyValue: { fontSize: 18, fontWeight: '700', color: COLORS.text, minWidth: 30, textAlign: 'center' },
  qtyDiff: { color: COLORS.error },
  qtyOverStock: { color: COLORS.error, fontWeight: '800' },
  qtyBtnDisabled: { backgroundColor: COLORS.tabBarInactive + '20' },
  qtyReadOnly: { alignItems: 'center', gap: 2 },
  qtyReadOnlyLabel: { fontSize: 10, color: COLORS.textSecondary },
  qtyReadOnlyValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary,
    borderStyle: 'dashed', marginTop: 8,
  },
  addItemText: { fontSize: 15, color: COLORS.primary, fontWeight: '500' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 5,
  },
  totals: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  totalDiff: { color: COLORS.error },
  confirmBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  // Modal
  modal: { flex: 1, backgroundColor: COLORS.background, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchInput: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 8, color: COLORS.text },
  stockRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 4, borderRadius: 8,
  },
  stockInfo: { flex: 1 },
  stockName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  stockSku: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  stockQty: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '500' },
  emptyStock: { padding: 40, alignItems: 'center' },
  emptyStockText: { fontSize: 14, color: COLORS.textSecondary },
});
