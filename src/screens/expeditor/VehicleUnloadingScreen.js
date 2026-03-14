import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getUnloadingData, increaseStock, decreaseStock, generateId } from '../../database';

export default function VehicleUnloadingScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const vehicleId = user?.vehicleId;

  const [sections, setSections] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  async function loadData() {
    setLoading(true);
    try {
      if (!vehicleId) {
        setSections([]);
        setLoading(false);
        return;
      }
      const { remaining, returnItems } = await getUnloadingData(vehicleId, user.id);

      const remainingSection = remaining.map((item) => ({
        key: 'rem-' + item.product_id,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        category: item.category,
        volume: item.volume,
        quantity: item.quantity,
        type: 'remaining',
      }));

      const returnsSection = returnItems.map((item, idx) => ({
        key: 'ret-' + item.product_id + '-' + idx,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        volume: item.volume,
        quantity: item.quantity,
        condition: item.condition,
        type: 'return',
      }));

      // Merge returns by product_id
      const returnsMerged = {};
      for (const r of returnsSection) {
        if (returnsMerged[r.product_id]) {
          returnsMerged[r.product_id].quantity += r.quantity;
        } else {
          returnsMerged[r.product_id] = { ...r };
        }
      }

      const secs = [];
      if (remainingSection.length > 0) {
        secs.push({ title: t('vehicleUnloading.remainingStock'), type: 'remaining', data: remainingSection });
      }
      const mergedReturns = Object.values(returnsMerged);
      if (mergedReturns.length > 0) {
        secs.push({ title: t('vehicleUnloading.customerReturns'), type: 'return', data: mergedReturns });
      }

      setSections(secs);

      const initQty = {};
      for (const item of remainingSection) { initQty[item.key] = item.quantity; }
      for (const item of mergedReturns) { initQty[item.key] = item.quantity; }
      setQuantities(initQty);
    } catch (e) {
      console.error('Unloading load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const adjustQty = (key, delta) => {
    if (confirmed) return;
    setQuantities((prev) => {
      const newVal = Math.max(0, (prev[key] || 0) + delta);
      return { ...prev, [key]: newVal };
    });
  };

  const handleConfirm = () => {
    const allItems = sections.flatMap((s) => s.data);
    const totalQty = allItems.reduce((sum, item) => sum + (quantities[item.key] || 0), 0);

    if (totalQty === 0) {
      Alert.alert('', t('vehicleUnloading.noItemsToUnload'));
      return;
    }

    Alert.alert(
      t('vehicleUnloading.confirmUnloading'),
      t('vehicleUnloading.willUnload', { qty: totalQty }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'), onPress: async () => {
            try {
              const allItems = sections.flatMap((s) => s.data);
              const stockItems = allItems
                .filter((item) => (quantities[item.key] || 0) > 0)
                .map((item) => ({
                  product_id: item.product_id,
                  quantity: quantities[item.key],
                }));

              // Increase main warehouse stock
              if (stockItems.length > 0) {
                await increaseStock('main', stockItems);
              }

              // Decrease vehicle stock by unloaded quantities
              const vehicleDecrease = allItems
                .filter((item) => (quantities[item.key] || 0) > 0)
                .map((item) => ({
                  product_id: item.product_id,
                  quantity: quantities[item.key],
                }));
              if (vehicleDecrease.length > 0) {
                await decreaseStock(vehicleId, vehicleDecrease);
              }

              setConfirmed(true);
              Alert.alert(t('common.done'), t('vehicleUnloading.unloadingConfirmed'));
            } catch (e) {
              console.error('Unloading confirm error:', e);
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const qty = quantities[item.key] || 0;
    const isDiff = qty !== item.quantity;
    return (
      <View style={[styles.itemRow, isDiff && styles.itemDiff]}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
          <Text style={styles.itemMeta}>
            {item.sku} {item.volume ? `| ${item.volume}` : ''}
            {item.condition && item.condition !== 'normal' ? ` | ${item.condition === 'damaged' ? t('vehicleUnloading.conditionDamaged') : t('vehicleUnloading.conditionExpired')}` : ''}
          </Text>
          <Text style={styles.itemExpected}>{t('vehicleUnloading.expectedQty', { qty: item.quantity })}</Text>
        </View>
        {!confirmed ? (
          <View style={styles.qtyControl}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(item.key, -1)}>
              <Ionicons name="remove" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={[styles.qtyValue, isDiff && styles.qtyDiff]}>{qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(item.key, 1)}>
              <Ionicons name="add" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qtyReadOnly}>
            <Text style={styles.qtyReadOnlyLabel}>{t('vehicleUnloading.accepted')}</Text>
            <Text style={styles.qtyReadOnlyValue}>{qty}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, section.type === 'return' && styles.sectionReturn]}>
      <Ionicons
        name={section.type === 'remaining' ? 'cube-outline' : 'return-down-back-outline'}
        size={18}
        color={section.type === 'remaining' ? COLORS.primary : COLORS.error}
      />
      <Text style={[styles.sectionTitle, section.type === 'return' && styles.sectionTitleReturn]}>
        {section.title}
      </Text>
      <Text style={styles.sectionCount}>{section.data.length} {t('vehicleUnloading.positions')}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!vehicleId) {
    return (
      <View style={styles.center}>
        <Ionicons name="car-outline" size={48} color={COLORS.tabBarInactive} />
        <Text style={styles.emptyText}>{t('shipmentScreen.noVehicle')}</Text>
      </View>
    );
  }

  const totalItems = sections.reduce((s, sec) => s + sec.data.length, 0);
  const totalQty = sections.flatMap((s) => s.data).reduce((s, item) => s + (quantities[item.key] || 0), 0);

  return (
    <View style={styles.container}>
      {confirmed && (
        <View style={styles.confirmedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
          <Text style={styles.confirmedText}>{t('vehicleUnloading.confirmedBanner')}</Text>
        </View>
      )}

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{t('vehicleUnloading.summary', { items: totalItems, qty: totalQty })}</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('vehicleUnloading.noItemsToUnload')}</Text>
            <Text style={styles.emptySubText}>{t('vehicleUnloading.allShipped')}</Text>
          </View>
        }
      />

      {totalItems > 0 && !confirmed && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Ionicons name="download-outline" size={22} color={COLORS.white} />
            <Text style={styles.confirmText}>{t('vehicleUnloading.confirmToWarehouse')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  confirmedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#34C759', padding: 10,
  },
  confirmedText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  summaryBar: {
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  summaryText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  list: { padding: 12, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 4, backgroundColor: COLORS.background,
  },
  sectionReturn: {},
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.primary },
  sectionTitleReturn: { color: COLORS.error },
  sectionCount: { fontSize: 12, color: COLORS.textSecondary },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12, gap: 10, marginBottom: 6,
  },
  itemDiff: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemExpected: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyValue: { fontSize: 18, fontWeight: '700', color: COLORS.text, minWidth: 30, textAlign: 'center' },
  qtyDiff: { color: COLORS.error },
  qtyReadOnly: { alignItems: 'center', gap: 2 },
  qtyReadOnlyLabel: { fontSize: 10, color: COLORS.textSecondary },
  qtyReadOnlyValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 13, color: COLORS.tabBarInactive, marginTop: 4, textAlign: 'center' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 5,
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 14,
  },
  confirmText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
