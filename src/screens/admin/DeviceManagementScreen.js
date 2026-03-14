import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getDevices } from '../../database';

const STATUS_ICONS = {
  active: { icon: 'checkmark-circle', color: '#34C759' },
  inactive: { icon: 'pause-circle', color: COLORS.tabBarInactive },
  blocked: { icon: 'close-circle', color: COLORS.error },
};

export default function DeviceManagementScreen() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (e) { console.error('DeviceManagement load:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filtered = devices.filter((d) =>
    d.device_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.os_version?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const renderDevice = ({ item }) => {
    const statusCfg = STATUS_ICONS[item.status] || STATUS_ICONS.inactive;
    const statusLabel = t('deviceManagement.statuses.' + (item.status || 'inactive'));
    const statusColor = statusCfg.color;
    const syncAge = item.last_sync ? Math.round((Date.now() - new Date(item.last_sync).getTime()) / 3600000) : null;
    const syncWarning = syncAge !== null && syncAge > 24;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.deviceIcon, { backgroundColor: statusColor + '15' }]}>
            <Ionicons name="phone-portrait" size={22} color={statusColor} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.deviceName}>{item.device_name}</Text>
            <Text style={styles.deviceOS}>{item.os_version}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Ionicons name={statusCfg.icon} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Пользователь</Text>
            <Text style={styles.detailValue}>{item.user_name || '—'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Версия приложения</Text>
            <Text style={styles.detailValue}>{item.app_version || '—'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Последняя синхронизация</Text>
            <Text style={[styles.detailValue, syncWarning && styles.detailWarning]}>
              {formatDate(item.last_sync)}
              {syncWarning && ' ⚠️'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Данные</Text>
            <Text style={styles.detailValue}>{item.storage_used ? `${item.storage_used} МБ` : '—'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Поиск */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('deviceManagement.searchPlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Сводка */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{devices.length}</Text>
          <Text style={styles.summaryLabel}>Всего</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#34C759' }]}>{devices.filter((d) => d.status === 'active').length}</Text>
          <Text style={styles.summaryLabel}>Активных</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.error }]}>{devices.filter((d) => d.status === 'blocked').length}</Text>
          <Text style={styles.summaryLabel}>Заблокировано</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="phone-portrait-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>Устройства не найдены</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, margin: 16, marginBottom: 0, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  summaryItem: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  deviceIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  deviceOS: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { width: '48%', paddingVertical: 4 },
  detailLabel: { fontSize: 11, color: COLORS.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginTop: 2 },
  detailWarning: { color: COLORS.error },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
