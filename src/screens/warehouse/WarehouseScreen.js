import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getStockWithProducts, getVehicleStock, hasVerifiedLoadingTrip } from '../../database';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

function formatMoney(v) {
  return v != null ? Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' R' : '-';
}

export default function WarehouseScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isExpeditor = user?.role === 'expeditor';
  const vehicleId = user?.vehicleId;

  const [sections, setSections] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stockAccepted, setStockAccepted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStock();
    }, [])
  );

  async function loadStock() {
    setLoading(true);
    try {
      if (isExpeditor && vehicleId) {
        // Check if driver has a verified loading trip
        const verified = await hasVerifiedLoadingTrip(user.id);
        setStockAccepted(verified);
        if (verified) {
          const data = await getVehicleStock(vehicleId);
          setAllItems(data);
          groupByCategory(data, '');
        } else {
          setAllItems([]);
          setSections([]);
        }
      } else {
        // Supervisor/admin — show main warehouse stock
        setStockAccepted(true);
        const data = await getStockWithProducts();
        setAllItems(data);
        groupByCategory(data, '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function groupByCategory(items, filter) {
    const filtered = filter
      ? items.filter((i) =>
          i.product_name.toLowerCase().includes(filter.toLowerCase()) ||
          i.sku.toLowerCase().includes(filter.toLowerCase()) ||
          i.brand?.toLowerCase().includes(filter.toLowerCase())
        )
      : items;

    const grouped = {};
    for (const item of filtered) {
      const cat = item.category || t('warehouseScreen.other');
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    const secs = Object.entries(grouped).map(([title, data]) => ({ title, data }));
    setSections(secs);
  }

  function onSearch(text) {
    setSearch(text);
    groupByCategory(allItems, text);
  }

  function renderProduct({ item }) {
    const available = item.quantity - item.reserved;
    const lowStock = available < (isExpeditor ? 10 : 50);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.product_name}</Text>
            <Text style={styles.productMeta}>{item.sku} | {item.brand} | {item.volume}</Text>
          </View>
          <Text style={styles.price}>{formatMoney(item.base_price)}</Text>
        </View>
        <View style={styles.stockRow}>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>{isExpeditor ? t('warehouseScreen.inTruck') : t('warehouseScreen.inWarehouse')}</Text>
            <Text style={styles.stockValue}>{item.quantity}</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Резерв</Text>
            <Text style={[styles.stockValue, { color: COLORS.accent }]}>{item.reserved}</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Доступно</Text>
            <Text style={[styles.stockValue, { color: lowStock ? COLORS.error : '#4CAF50' }]}>
              {available}
            </Text>
          </View>
          {lowStock && (
            <View style={styles.lowBadge}>
              <Ionicons name="warning" size={12} color={COLORS.error} />
              <Text style={styles.lowText}>Мало</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderSectionHeader({ section }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>{section.data.length} поз.</Text>
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

  // Expeditor without verified loading trip
  if (isExpeditor && !stockAccepted) {
    return (
      <View style={styles.container}>
        {vehicleId && (
          <View style={styles.vehicleBar}>
            <Ionicons name="car" size={18} color={COLORS.white} />
            <Text style={styles.vehicleText}>
              {user.vehicleModel} | {user.vehiclePlate}
            </Text>
          </View>
        )}
        <View style={styles.notAccepted}>
          <Ionicons name="cube-outline" size={64} color={COLORS.tabBarInactive} />
          <Text style={styles.notAcceptedTitle}>Остатки не приняты в машину</Text>
          <Text style={styles.notAcceptedSub}>
            Завершите загрузку рейса, чтобы подтвердить остатки в автомобиле
          </Text>
        </View>
      </View>
    );
  }

  const totalItems = sections.reduce((s, sec) => s + sec.data.length, 0);
  const totalQty = allItems.reduce((s, i) => s + i.quantity, 0);
  const totalWeight = allItems.reduce((s, i) => s + i.quantity * (i.weight || 0), 0);

  return (
    <View style={styles.container}>
      {isExpeditor && vehicleId && (
        <View style={styles.vehicleBar}>
          <Ionicons name="car" size={18} color={COLORS.white} />
          <Text style={styles.vehicleText}>
            {user.vehicleModel} | {user.vehiclePlate}
          </Text>
        </View>
      )}

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('warehouseScreen.searchPlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          value={search}
          onChangeText={onSearch}
        />
        {search.length > 0 && (
          <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} onPress={() => onSearch('')} />
        )}
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {totalItems} поз. | {totalQty} ед.
          {isExpeditor ? ` | ~${Math.round(totalWeight)} кг в кузове` : ' на складе'}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="search-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>Ничего не найдено</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  vehicleBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10,
  },
  vehicleText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  notAccepted: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  notAcceptedTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 20, textAlign: 'center',
  },
  notAcceptedSub: {
    fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 4 },
  statsRow: {
    paddingHorizontal: 16, paddingVertical: 6, backgroundColor: COLORS.background,
  },
  statsText: { fontSize: 12, color: COLORS.textSecondary },
  list: { padding: 12, paddingTop: 0 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4, backgroundColor: COLORS.background,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  sectionCount: { fontSize: 12, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  productMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginLeft: 8 },
  stockRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16,
  },
  stockItem: { alignItems: 'center' },
  stockLabel: { fontSize: 10, color: COLORS.textSecondary },
  stockValue: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 1 },
  lowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto',
    backgroundColor: COLORS.error + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  lowText: { fontSize: 11, color: COLORS.error, fontWeight: '600' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
