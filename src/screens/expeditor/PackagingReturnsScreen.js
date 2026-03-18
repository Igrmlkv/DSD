import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getEmptyProducts, createPackagingReturn, savePackagingReturnItems } from '../../database';

const SUBCATEGORY_ICONS = {
  'Ящики': 'cube-outline',
  'Паллеты': 'layers-outline',
  'Бутылки': 'wine-outline',
};

export default function PackagingReturnsScreen({ route }) {
  const { t } = useTranslation();
  const { pointId, customerId, customerName, readOnly } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const empties = await getEmptyProducts();
          setItems(empties.map((e) => ({
            product_id: e.id,
            product_name: e.name,
            product_sku: e.sku,
            subcategory: e.subcategory,
            expected_quantity: 0,
            actual_quantity: 0,
            condition: 'good',
          })));
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const adjustQty = (idx, field, delta) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: Math.max(0, updated[idx][field] + delta) };
      return updated;
    });
  };

  const toggleCondition = (idx) => {
    setItems((prev) => {
      const updated = [...prev];
      const conditions = ['good', 'damaged', 'missing'];
      const current = conditions.indexOf(updated[idx].condition);
      updated[idx] = { ...updated[idx], condition: conditions[(current + 1) % conditions.length] };
      return updated;
    });
  };

  const conditionLabel = (c) => c === 'good' ? t('packagingScreen.condition.good') : c === 'damaged' ? t('packagingScreen.condition.damaged') : t('packagingScreen.condition.missing');
  const conditionColor = (c) => c === 'good' ? COLORS.success : c === 'damaged' ? COLORS.accent : COLORS.error;

  const getIcon = (subcategory) => SUBCATEGORY_ICONS[subcategory] || 'cube-outline';

  const handleSubmit = async () => {
    const activeItems = items.filter((i) => i.actual_quantity > 0);
    if (activeItems.length === 0) {
      Alert.alert('', t('packagingScreen.specifyQuantity'));
      return;
    }
    try {
      const id = await createPackagingReturn({
        customer_id: customerId, driver_id: user.id, route_point_id: pointId,
      });
      await savePackagingReturnItems(id, activeItems);
      Alert.alert(t('common.done'), t('packagingScreen.actSaved'));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyBannerText}>{t('shipmentScreen.processedViewOnly')}</Text>
        </View>
      )}
      <Text style={styles.customer}>{customerName}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Ionicons name={getIcon(item.subcategory)} size={22} color={COLORS.primary} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemType}>{item.product_name}</Text>
                <Text style={styles.itemSku}>{item.product_sku}</Text>
              </View>
              <TouchableOpacity
                style={[styles.condBadge, { backgroundColor: conditionColor(item.condition) + '20' }]}
                onPress={() => !readOnly && toggleCondition(index)}
                disabled={readOnly}
              >
                <Text style={[styles.condText, { color: conditionColor(item.condition) }]}>
                  {conditionLabel(item.condition)}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.qtyRow}>
              <View style={styles.qtyGroup}>
                <Text style={styles.qtyLabel}>{t('packagingScreen.expected')}</Text>
                {readOnly ? (
                  <Text style={styles.qtyValue}>{item.expected_quantity}</Text>
                ) : (
                  <View style={styles.qtyControl}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(index, 'expected_quantity', -1)}>
                      <Ionicons name="remove" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.expected_quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(index, 'expected_quantity', 1)}>
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.qtyGroup}>
                <Text style={styles.qtyLabel}>{t('packagingScreen.actual')}</Text>
                {readOnly ? (
                  <Text style={[styles.qtyValue, item.actual_quantity !== item.expected_quantity && styles.qtyDiff]}>
                    {item.actual_quantity}
                  </Text>
                ) : (
                  <View style={styles.qtyControl}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(index, 'actual_quantity', -1)}>
                      <Ionicons name="remove" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyValue, item.actual_quantity !== item.expected_quantity && styles.qtyDiff]}>
                      {item.actual_quantity}
                    </Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(index, 'actual_quantity', 1)}>
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="cube-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('emptiesTab.noEmpties')}</Text>
          </View>
        }
      />
      <View style={styles.footer}>
        {!readOnly && (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>{t('packagingScreen.saveAct')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, padding: 10,
  },
  readOnlyBannerText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  customer: { fontSize: 16, fontWeight: '600', color: COLORS.text, padding: 16, paddingBottom: 0 },
  list: { padding: 16, paddingBottom: 100 },
  itemCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  itemInfo: { flex: 1 },
  itemType: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  condBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  condText: { fontSize: 12, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', gap: 16 },
  qtyGroup: { flex: 1, alignItems: 'center' },
  qtyLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary + '12', justifyContent: 'center', alignItems: 'center' },
  qtyValue: { fontSize: 18, fontWeight: '700', color: COLORS.text, minWidth: 28, textAlign: 'center' },
  qtyDiff: { color: COLORS.error },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitBtn: { backgroundColor: COLORS.info, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
