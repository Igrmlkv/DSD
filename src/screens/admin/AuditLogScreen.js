import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getAuditLog } from '../../database';

const ACTION_ICONS = {
  login: { icon: 'log-in', color: COLORS.primary },
  logout: { icon: 'log-out', color: COLORS.tabBarInactive },
  create: { icon: 'add-circle', color: '#34C759' },
  update: { icon: 'create', color: COLORS.secondary },
  delete: { icon: 'trash', color: COLORS.error },
  approve: { icon: 'checkmark-circle', color: '#34C759' },
  reject: { icon: 'close-circle', color: COLORS.error },
  sync: { icon: 'sync', color: COLORS.info },
  export: { icon: 'download', color: COLORS.accent },
};

export default function AuditLogScreen() {
  const { t, i18n } = useTranslation();

  const FILTERS = [
    { key: 'all', label: t('auditLog.filters.all') },
    { key: 'login', label: t('auditLog.filters.login') },
    { key: 'create', label: t('auditLog.filters.create') },
    { key: 'update', label: t('auditLog.filters.update') },
    { key: 'approve', label: t('auditLog.filters.approve') },
  ];

  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const loadData = useCallback(async () => {
    try {
      const data = await getAuditLog({
        action: filter !== 'all' ? filter : null,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setEntries(data);
      setPage(0);
    } catch (e) { console.error('AuditLog load:', e); }
  }, [filter]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const loadMore = async () => {
    try {
      const nextPage = page + 1;
      const more = await getAuditLog({
        action: filter !== 'all' ? filter : null,
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
      });
      if (more.length > 0) {
        setEntries((prev) => [...prev, ...more]);
        setPage(nextPage);
      }
    } catch (e) { console.error('AuditLog loadMore:', e); }
  };

  const filtered = search
    ? entries.filter((e) =>
        e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.details?.toLowerCase().includes(search.toLowerCase()) ||
        e.entity_type?.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return isToday ? `${t('auditLog.today')}, ${time}` : d.toLocaleDateString(locale) + ` ${time}`;
  };

  const renderEntry = ({ item }) => {
    const cfg = ACTION_ICONS[item.action] || { icon: 'ellipsis-horizontal', color: COLORS.textSecondary };
    const actionLabel = t('auditLog.types.' + item.action, { defaultValue: item.action });

    return (
      <View style={styles.entryRow}>
        <View style={[styles.entryIcon, { backgroundColor: cfg.color + '15' }]}>
          <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        </View>
        <View style={styles.entryInfo}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryAction}>{actionLabel}</Text>
            {item.entity_type && (
              <Text style={styles.entryEntity}>{item.entity_type}</Text>
            )}
          </View>
          <Text style={styles.entryDetails} numberOfLines={2}>{item.details || '—'}</Text>
          <View style={styles.entryMeta}>
            <Text style={styles.entryUser}>{item.user_name || t('common.system')}</Text>
            <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
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
          placeholder={t('auditLog.searchPlaceholder')}
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

      {/* Фильтры */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Список */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('auditLog.noRecords')}</Text>
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
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: COLORS.text },
  filterTextActive: { color: COLORS.white },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  entryRow: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 4 },
  entryIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  entryInfo: { flex: 1 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryAction: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  entryEntity: { fontSize: 11, color: COLORS.info, backgroundColor: COLORS.info + '10', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  entryDetails: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  entryUser: { fontSize: 11, fontWeight: '500', color: COLORS.primary },
  entryDate: { fontSize: 11, color: COLORS.tabBarInactive },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
