import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { getSyncStats, getSyncConflicts } from '../../database';

const SYNC_STATUS_ICONS = {
  ok: { color: COLORS.success, icon: 'checkmark-circle' },
  warning: { color: COLORS.accent, icon: 'warning' },
  critical: { color: COLORS.error, icon: 'alert-circle' },
};

export default function SyncMonitoringScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [stats, setStats] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([getSyncStats(), getSyncConflicts()]);
      setStats(s);
      setConflicts(c);
    } catch (e) { console.error('SyncMonitoring load:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getSyncLevel = (item) => {
    if (!item.last_sync) return 'critical';
    const hours = (Date.now() - new Date(item.last_sync).getTime()) / 3600000;
    if (hours > 48) return 'critical';
    if (hours > 24) return 'warning';
    return 'ok';
  };

  const renderSyncItem = ({ item }) => {
    const level = getSyncLevel(item);
    const cfg = SYNC_STATUS_ICONS[level];
    const statusLabel = t('syncMonitoring.statuses.' + level);

    return (
      <View style={styles.syncCard}>
        <View style={styles.syncHeader}>
          <View style={[styles.syncIcon, { backgroundColor: cfg.color + '15' }]}>
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
          </View>
          <View style={styles.syncInfo}>
            <Text style={styles.syncName}>{item.device_name || item.user_name}</Text>
            <Text style={styles.syncUser}>{item.user_name}</Text>
          </View>
          <View style={[styles.syncBadge, { backgroundColor: cfg.color + '15' }]}>
            <Text style={[styles.syncBadgeText, { color: cfg.color }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.syncDetails}>
          <View style={styles.syncDetail}>
            <Text style={styles.syncDetailLabel}>{t('syncMonitoring.lastSync')}</Text>
            <Text style={styles.syncDetailValue}>{formatDate(item.last_sync)}</Text>
          </View>
          <View style={styles.syncDetail}>
            <Text style={styles.syncDetailLabel}>{t('syncMonitoring.docsInQueue')}</Text>
            <Text style={[styles.syncDetailValue, item.pending_docs > 0 && { color: COLORS.error }]}>
              {item.pending_docs || 0}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Общая сводка */}
      {stats && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.totalDevices || 0}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.devicesCount')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>{stats.syncedDevices || 0}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.synced')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>{stats.pendingDocs || 0}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.inQueue')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.accent }]}>{stats.conflicts || conflicts.length}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.conflictsCount')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Кнопка конфликтов */}
      {conflicts.length > 0 && (
        <TouchableOpacity
          style={styles.conflictBanner}
          onPress={() => navigation.navigate(SCREEN_NAMES.CONFLICT_RESOLUTION)}
        >
          <Ionicons name="git-compare" size={20} color={COLORS.error} />
          <Text style={styles.conflictText}>
            {t('syncMonitoring.conflictsRequire', { count: conflicts.length })}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}

      {/* Список устройств */}
      <Text style={styles.sectionTitle}>{t('syncMonitoring.deviceStatus')}</Text>
      <FlatList
        data={stats?.devices || []}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={renderSyncItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sync-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('syncMonitoring.noData')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryCard: { backgroundColor: COLORS.white, margin: 16, marginBottom: 0, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  conflictBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.error + '10', margin: 16, marginBottom: 0, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.error + '30' },
  conflictText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.error },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  syncCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  syncHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  syncIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  syncInfo: { flex: 1 },
  syncName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  syncUser: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  syncBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  syncBadgeText: { fontSize: 11, fontWeight: '600' },
  syncDetails: { flexDirection: 'row', gap: 16 },
  syncDetail: { flex: 1 },
  syncDetailLabel: { fontSize: 11, color: COLORS.textSecondary },
  syncDetailValue: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
