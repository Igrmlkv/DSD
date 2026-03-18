import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import useAuthStore from '../../store/authStore';
import {
  getVehicleByDriver, getVehicleStock, getEmptiesStock,
  createInventoryAdjustment, getInventoryAdjustments, getInventoryAdjustmentItems,
} from '../../database';

const TABS = ['stock', 'adjust', 'empties'];

export default function InventoryCheckScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('stock');
  const [vehicle, setVehicle] = useState(null);
  const [items, setItems] = useState([]);
  const [factQty, setFactQty] = useState({});
  const [search, setSearch] = useState('');
  const [empties, setEmpties] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [expandedAdj, setExpandedAdj] = useState(null);
  const [adjItems, setAdjItems] = useState({});

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const v = await getVehicleByDriver(user.id);
        if (v) {
          setVehicle(v);
          const [stock, emptiesData, adjs] = await Promise.all([
            getVehicleStock(v.id),
            getEmptiesStock(v.id).catch(() => []),
            getInventoryAdjustments(v.id).catch(() => []),
          ]);
          setItems(stock);
          const initial = {};
          stock.forEach((s) => { initial[s.id] = s.quantity; });
          setFactQty(initial);
          setEmpties(emptiesData);
          setAdjustments(adjs);
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
        {
          text: t('inventoryScreen.saveButton'),
          onPress: async () => {
            try {
              if (discrepancies.length > 0) {
                const adjItems = discrepancies.map((i) => ({
                  product_id: i.product_id,
                  reason_id: 'ar-recount',
                  previous_qty: i.quantity,
                  adjusted_qty: factQty[i.id] || 0,
                }));
                await createInventoryAdjustment({
                  vehicleId: vehicle?.id,
                  warehouse: vehicle?.id || 'main',
                  userId: user.id,
                  supervisorUserId: null,
                  notes: t('inventoryScreen.inventoryCheckNote'),
                  items: adjItems,
                });
              }
              Alert.alert(t('common.done'), t('inventoryScreen.actSaved'));
              // Reload stock to reflect updated quantities
              if (vehicle) {
                const stock = await getVehicleStock(vehicle.id);
                setItems(stock);
                const updated = {};
                stock.forEach((s) => { updated[s.id] = s.quantity; });
                setFactQty(updated);
                // Reload adjustments list
                const adjs = await getInventoryAdjustments(vehicle.id);
                setAdjustments(adjs);
              }
            } catch (e) {
              console.error('Inventory submit error:', e);
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  const conditionColor = (c) => c === 'good' ? COLORS.success : c === 'damaged' ? COLORS.accent : COLORS.error;
  const conditionLabel = (c) => {
    if (c === 'good') return t('emptiesTab.conditionGood');
    if (c === 'damaged') return t('emptiesTab.conditionDamaged');
    return t('emptiesTab.conditionMissing');
  };

  // Group empties by customer
  const emptiesSections = React.useMemo(() => {
    const grouped = {};
    for (const e of empties) {
      const key = e.customer_id || 'unknown';
      if (!grouped[key]) {
        grouped[key] = { title: e.customer_name || t('emptiesTab.customer'), data: [] };
      }
      grouped[key].data.push(e);
    }
    return Object.values(grouped);
  }, [empties, t]);

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {t(`inventoryTabs.${tab}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStockTab = () => (
    <>
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
                onChangeText={(txt) => updateFact(item.id, txt)}
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
    </>
  );

  const toggleAdjExpand = async (adjId) => {
    if (expandedAdj === adjId) {
      setExpandedAdj(null);
      return;
    }
    setExpandedAdj(adjId);
    if (!adjItems[adjId]) {
      try {
        const items = await getInventoryAdjustmentItems(adjId);
        setAdjItems((prev) => ({ ...prev, [adjId]: items }));
      } catch { /* ignore */ }
    }
  };

  const formatAdjDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderAdjustTab = () => (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.newAdjBtn}
        onPress={() => navigation.navigate(SCREEN_NAMES.ADJUST_INVENTORY)}
      >
        <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
        <Text style={styles.newAdjBtnText}>{t('adjustInventory.title')}</Text>
      </TouchableOpacity>

      <FlatList
        data={adjustments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: adj }) => {
          const isExpanded = expandedAdj === adj.id;
          const detailItems = adjItems[adj.id] || [];
          return (
            <TouchableOpacity style={styles.adjRow} onPress={() => toggleAdjExpand(adj.id)} activeOpacity={0.7}>
              <View style={styles.adjHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adjDate}>{formatAdjDate(adj.created_at)}</Text>
                  <Text style={styles.adjUser}>{adj.user_name}{adj.supervisor_name ? ` • ${adj.supervisor_name}` : ''}</Text>
                  {adj.notes ? <Text style={styles.adjNotes} numberOfLines={1}>{adj.notes}</Text> : null}
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
              </View>
              {isExpanded && detailItems.length > 0 && (
                <View style={styles.adjDetails}>
                  {detailItems.map((di) => {
                    const diff = di.difference;
                    return (
                      <View key={di.id} style={styles.adjDetailRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adjDetailName} numberOfLines={1}>{di.product_name}</Text>
                          <Text style={styles.adjDetailReason}>{(i18n.language === 'en' ? di.reason_name_en : di.reason_name_ru) || di.reason_code}</Text>
                        </View>
                        <Text style={styles.adjDetailQty}>{di.previous_qty}</Text>
                        <Ionicons name="arrow-forward" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.adjDetailQty}>{di.adjusted_qty}</Text>
                        <Text style={[styles.adjDetailDiff, diff > 0 ? styles.adjDiffPos : styles.adjDiffNeg]}>
                          {diff > 0 ? '+' : ''}{diff}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="construct-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('inventoryScreen.noAdjustments')}</Text>
          </View>
        }
      />
    </View>
  );

  const renderEmptiesTab = () => (
    <SectionList
      sections={emptiesSections}
      keyExtractor={(item, idx) => `${item.product_id}-${idx}`}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={16} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.emptiesRow}>
          <View style={styles.emptiesInfo}>
            <Text style={styles.emptiesType}>{item.product_name}</Text>
            <View style={styles.emptiesQtyRow}>
              <Text style={styles.emptiesQtyLabel}>{t('emptiesTab.expected')}: <Text style={styles.emptiesQtyVal}>{item.expected_quantity}</Text></Text>
              <Text style={styles.emptiesQtyLabel}>{t('emptiesTab.actual')}: <Text style={styles.emptiesQtyVal}>{item.actual_quantity}</Text></Text>
            </View>
          </View>
          <View style={[styles.condBadge, { backgroundColor: conditionColor(item.condition) + '20' }]}>
            <Text style={[styles.condText, { color: conditionColor(item.condition) }]}>
              {conditionLabel(item.condition)}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="cube-outline" size={48} color={COLORS.tabBarInactive} />
          <Text style={styles.emptyText}>{t('emptiesTab.noEmpties')}</Text>
        </View>
      }
    />
  );

  return (
    <View style={styles.container}>
      {vehicle && (
        <View style={styles.header}>
          <Ionicons name="car" size={20} color={COLORS.primary} />
          <Text style={styles.headerText}>{vehicle.model} • {vehicle.plate_number}</Text>
        </View>
      )}

      {renderTabBar()}

      {activeTab === 'stock' && renderStockTab()}
      {activeTab === 'adjust' && renderAdjustTab()}
      {activeTab === 'empties' && renderEmptiesTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  headerText: { fontSize: 15, fontWeight: '600', color: COLORS.text },

  // Tab bar
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Stock tab
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

  // Adjust tab
  newAdjBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, margin: 12, marginBottom: 0, paddingVertical: 12,
  },
  newAdjBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  adjRow: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 6 },
  adjHeader: { flexDirection: 'row', alignItems: 'center' },
  adjDate: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  adjUser: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  adjNotes: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  adjDetails: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, paddingTop: 8, gap: 6 },
  adjDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adjDetailName: { fontSize: 12, fontWeight: '500', color: COLORS.text },
  adjDetailReason: { fontSize: 10, color: COLORS.textSecondary },
  adjDetailQty: { fontSize: 13, fontWeight: '700', color: COLORS.text, minWidth: 28, textAlign: 'center' },
  adjDetailDiff: { fontSize: 12, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  adjDiffPos: { color: COLORS.success },
  adjDiffNeg: { color: COLORS.error },

  // Empties tab
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: COLORS.background },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.primary },
  emptiesRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 4 },
  emptiesInfo: { flex: 1 },
  emptiesType: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  emptiesQtyRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  emptiesQtyLabel: { fontSize: 12, color: COLORS.textSecondary },
  emptiesQtyVal: { fontWeight: '700', color: COLORS.text },
  condBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  condText: { fontSize: 11, fontWeight: '600' },
});
