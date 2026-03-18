import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getErrorLogs, getErrorLogStats, clearErrorLogs } from '../../database';

const SEVERITY_CONFIG = {
  debug:    { icon: 'code-slash',      color: COLORS.tabBarInactive, label: 'Debug' },
  info:     { icon: 'information-circle', color: COLORS.secondary,   label: 'Info' },
  warning:  { icon: 'warning',         color: '#F5A623',             label: 'Warning' },
  error:    { icon: 'close-circle',    color: COLORS.error,          label: 'Error' },
  critical: { icon: 'alert-circle',    color: '#D0021B',             label: 'Critical' },
};

export default function ErrorLogScreen() {
  const { t, i18n } = useTranslation();

  const FILTERS = [
    { key: 'all',      label: t('errorLog.filters.all') },
    { key: 'critical', label: t('errorLog.filters.critical') },
    { key: 'error',    label: t('errorLog.filters.error') },
    { key: 'warning',  label: t('errorLog.filters.warning') },
    { key: 'info',     label: t('errorLog.filters.info') },
  ];

  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, bySeverity: [] });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const PAGE_SIZE = 50;

  const loadData = useCallback(async () => {
    try {
      const [data, st] = await Promise.all([
        getErrorLogs({
          severity: filter !== 'all' ? filter : null,
          search: search.length > 1 ? search : null,
          limit: PAGE_SIZE,
          offset: 0,
        }),
        getErrorLogStats(),
      ]);
      setEntries(data);
      setStats(st);
      setPage(0);
    } catch (e) {
      console.error('ErrorLog load:', e);
    }
  }, [filter, search]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const loadMore = async () => {
    try {
      const nextPage = page + 1;
      const more = await getErrorLogs({
        severity: filter !== 'all' ? filter : null,
        search: search.length > 1 ? search : null,
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
      });
      if (more.length > 0) {
        setEntries((prev) => [...prev, ...more]);
        setPage(nextPage);
      }
    } catch (e) {
      console.error('ErrorLog loadMore:', e);
    }
  };

  const handleClearOld = () => {
    Alert.alert(
      t('errorLog.clearTitle'),
      t('errorLog.clearMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('errorLog.clearButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              const deleted = await clearErrorLogs(30);
              Alert.alert(t('common.done'), t('errorLog.cleared', { count: deleted }));
              loadData();
            } catch (e) {
              console.error('ErrorLog clear:', e);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return isToday ? `${t('auditLog.today')}, ${time}` : d.toLocaleDateString(locale) + ` ${time}`;
  };

  const severityCount = (sev) => {
    const found = stats.bySeverity.find((s) => s.severity === sev);
    return found?.count || 0;
  };

  const renderEntry = ({ item }) => {
    const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.error;

    return (
      <TouchableOpacity style={styles.entryRow} onPress={() => setSelectedEntry(item)} activeOpacity={0.7}>
        <View style={[styles.severityBar, { backgroundColor: cfg.color }]} />
        <View style={styles.entryContent}>
          <View style={styles.entryHeader}>
            <View style={[styles.severityBadge, { backgroundColor: cfg.color + '18' }]}>
              <Ionicons name={cfg.icon} size={14} color={cfg.color} />
              <Text style={[styles.severityText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.entrySource}>{item.source}</Text>
          </View>
          <Text style={styles.entryMessage} numberOfLines={2}>{item.message}</Text>
          <View style={styles.entryMeta}>
            {item.screen && <Text style={styles.entryScreen}>{item.screen}</Text>}
            <Text style={styles.entryUser}>{item.user_name || t('common.system')}</Text>
            <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedEntry) return null;
    const cfg = SEVERITY_CONFIG[selectedEntry.severity] || SEVERITY_CONFIG.error;

    return (
      <Modal visible={!!selectedEntry} animationType="slide" transparent onRequestClose={() => setSelectedEntry(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.severityBadge, { backgroundColor: cfg.color + '18' }]}>
                <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                <Text style={[styles.severityText, { color: cfg.color, fontSize: 13 }]}>{cfg.label}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>{t('errorLog.detail.source')}</Text>
              <Text style={styles.detailValue}>{selectedEntry.source}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>{t('errorLog.detail.message')}</Text>
              <Text style={styles.detailValueMono}>{selectedEntry.message}</Text>
            </View>

            {selectedEntry.context && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('errorLog.detail.context')}</Text>
                <Text style={styles.detailValueMono}>{selectedEntry.context}</Text>
              </View>
            )}

            {selectedEntry.stack_trace && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('errorLog.detail.stackTrace')}</Text>
                <Text style={styles.stackTrace} numberOfLines={15}>{selectedEntry.stack_trace}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('errorLog.detail.screen')}</Text>
                <Text style={styles.detailValue}>{selectedEntry.screen || '—'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('errorLog.detail.user')}</Text>
                <Text style={styles.detailValue}>{selectedEntry.user_name || t('common.system')}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>{t('errorLog.detail.timestamp')}</Text>
              <Text style={styles.detailValue}>{selectedEntry.created_at}</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats banner */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('errorLog.stats.total')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.today}</Text>
          <Text style={styles.statLabel}>{t('errorLog.stats.today')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.error }]}>{severityCount('error') + severityCount('critical')}</Text>
          <Text style={styles.statLabel}>{t('errorLog.stats.errors')}</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearOld}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('errorLog.searchPlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadData}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Severity filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const cfg = SEVERITY_CONFIG[f.key];
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterActive,
                isActive && cfg && { backgroundColor: cfg.color, borderColor: cfg.color }]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
            <Text style={styles.emptyText}>{t('errorLog.noErrors')}</Text>
          </View>
        }
      />

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, margin: 16, marginBottom: 0, padding: 14,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  clearBtn: { padding: 8 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.white, margin: 16, marginBottom: 0, padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 11, fontWeight: '500', color: COLORS.text },
  filterTextActive: { color: COLORS.white },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  entryRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 10, marginBottom: 6, overflow: 'hidden',
  },
  severityBar: { width: 4 },
  entryContent: { flex: 1, padding: 12 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  severityText: { fontSize: 11, fontWeight: '600' },
  entrySource: { fontSize: 11, color: COLORS.info, fontWeight: '500' },
  entryMessage: { fontSize: 12, color: COLORS.text, marginTop: 6, lineHeight: 18 },
  entryMeta: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' },
  entryScreen: { fontSize: 10, color: COLORS.info, backgroundColor: COLORS.info + '10', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  entryUser: { fontSize: 11, fontWeight: '500', color: COLORS.primary },
  entryDate: { fontSize: 11, color: COLORS.tabBarInactive, marginLeft: 'auto' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },

  // Detail Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailSection: { marginBottom: 14 },
  detailRow: { flexDirection: 'row', gap: 16 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: 14, color: COLORS.text },
  detailValueMono: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  stackTrace: {
    fontSize: 11, color: COLORS.textSecondary, fontFamily: 'monospace',
    backgroundColor: COLORS.background, padding: 10, borderRadius: 8, lineHeight: 16,
  },
});
