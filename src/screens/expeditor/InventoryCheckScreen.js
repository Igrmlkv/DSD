import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getVehicleByDriver, getVehicleStock } from '../../database';

export default function InventoryCheckScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [vehicle, setVehicle] = useState(null);
  const [items, setItems] = useState([]);
  const [factQty, setFactQty] = useState({});
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const v = await getVehicleByDriver(user.id);
        if (v) {
          setVehicle(v);
          const stock = await getVehicleStock(v.id);
          setItems(stock);
          const initial = {};
          stock.forEach((s) => { initial[s.id] = s.quantity; });
          setFactQty(initial);
        }
      } catch (e) { console.error('InventoryCheck load:', e); }
    })();
  }, [user.id]));

  const updateFact = (id, text) => {
    const val = parseInt(text, 10);
    setFactQty((prev) => ({ ...prev, [id]: isNaN(val) ? 0 : val }));
  };

  const filtered = items.filter((i) =>
    !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const discrepancies = items.filter((i) => (factQty[i.id] || 0) !== i.quantity);

  const handleSubmit = () => {
    Alert.alert(
      t('inventoryScreen.completeInventory'),
      discrepancies.length > 0
        ? t('inventoryScreen.discrepanciesFound', { count: discrepancies.length })
        : t('inventoryScreen.noDiscrepancies'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('inventoryScreen.saveButton'), onPress: () => Alert.alert(t('common.done'), t('inventoryScreen.actSaved')) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {vehicle && (
        <View style={styles.header}>
          <Ionicons name="car" size={20} color={COLORS.primary} />
          <Text style={styles.headerText}>{vehicle.model} • {vehicle.plate_number}</Text>
        </View>
      )}

      <TextInput
        style={styles.search}
        placeholder={t('inventoryScreen.searchPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const fact = factQty[item.id] || 0;
          const isDiff = fact !== item.quantity;
          return (
            <View style={[styles.itemRow, isDiff && styles.itemDiff]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.itemSku}>{item.sku} • {t('inventoryScreen.calculated')}: {item.quantity}</Text>
              </View>
              <TextInput
                style={[styles.factInput, isDiff && styles.factDiff]}
                value={String(fact)}
                onChangeText={(t) => updateFact(item.id, t)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('inventoryScreen.noItems')}</Text>
          </View>
        }
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{t('inventoryScreen.itemsCount', { count: items.length })}</Text>
            <Text style={[styles.summaryText, discrepancies.length > 0 && styles.discrepancy]}>
              {t('inventoryScreen.discrepancyCount', { count: discrepancies.length })}
            </Text>
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>{t('inventoryScreen.completeInventoryBtn')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  headerText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  search: { backgroundColor: COLORS.white, margin: 12, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text },
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 12, gap: 10, marginBottom: 4 },
  itemDiff: { borderLeftWidth: 3, borderLeftColor: COLORS.error },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  factInput: { width: 60, height: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.text },
  factDiff: { borderColor: COLORS.error, color: COLORS.error },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryText: { fontSize: 13, color: COLORS.textSecondary },
  discrepancy: { color: COLORS.error, fontWeight: '600' },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
