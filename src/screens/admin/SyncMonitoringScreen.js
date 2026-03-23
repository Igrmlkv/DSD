import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { getSyncConflicts, getSyncDashboardData } from '../../database';
import useSettingsStore from '../../store/settingsStore';
import { performFullSync } from '../../services/syncService';

const LOCALE_MAP = { ru: 'ru-RU', en: 'en-US' };

const SYNC_STATUS_ICONS = {
  ok: { color: COLORS.success, icon: 'checkmark-circle' },
  warning: { color: COLORS.accent, icon: 'warning' },
  critical: { color: COLORS.error, icon: 'alert-circle' },
};

export default function SyncMonitoringScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const serverSyncEnabled = useSettingsStore((s) => s.serverSyncEnabled);
  const language = useSettingsStore((s) => s.language);
  const [dashboard, setDashboard] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    if (!serverSyncEnabled) return;
    try {
      const [d, c] = await Promise.all([getSyncDashboardData(), getSyncConflicts()]);
      setDashboard(d);
      setConflicts(c);
    } catch (e) { console.error('SyncMonitoring load:', e); }
  }, [serverSyncEnabled]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await performFullSync({ force: true });
      await loadData();

      if (result.skipped) {
        Alert.alert(t('syncMonitoring.syncSkipped'), t('syncMonitoring.syncSkippedMsg'));
      } else if (result.hasErrors) {
        const details = result.errors.map((e) => `${e.phase}: ${e.error}`).join('\n');
        Alert.alert(
          t('syncMonitoring.syncPartialTitle'),
          t('syncMonitoring.syncPartialMsg', { details })
        );
      } else {
        const pushed = result.push?.sent || 0;
        const pulled = result.pull?.upserted || 0;
        Alert.alert(
          t('syncMonitoring.syncCompleteTitle'),
          t('syncMonitoring.syncCompleteMsg', { pushed, pulled })
        );
      }
    } catch (e) {
      console.error('Manual sync error:', e);
      Alert.alert(t('syncMonitoring.syncErrorTitle'), e.message);
    }
    setSyncing(false);
  }, [loadData, t]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    const locale = LOCALE_MAP[language] || 'ru-RU';
    return d.toLocaleDateString(locale) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const getEntityLevel = (item) => {
    if (item.pending_count > 0) return 'warning';
    if (!item.last_sync_at) return 'critical';
    const hours = (Date.now() - new Date(item.last_sync_at).getTime()) / 3600000;
    if (hours > 48) return 'critical';
    if (hours > 24) return 'warning';
    return 'ok';
  };

  const renderEntityItem = ({ item }) => {
    const level = getEntityLevel(item);
    const cfg = SYNC_STATUS_ICONS[level];
    const statusLabel = t('syncMonitoring.statuses.' + level);

    return (
      <View style={styles.syncCard}>
        <View style={styles.syncHeader}>
          <View style={[styles.syncIcon, { backgroundColor: cfg.color + '15' }]}>
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
          </View>
          <View style={styles.syncInfo}>
            <Text style={styles.syncName}>{item.entity_type}</Text>
          </View>
          <View style={[styles.syncBadge, { backgroundColor: cfg.color + '15' }]}>
            <Text style={[styles.syncBadgeText, { color: cfg.color }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.syncDetails}>
          <View style={styles.syncDetail}>
            <Text style={styles.syncDetailLabel}>{t('syncMonitoring.lastSync')}</Text>
            <Text style={styles.syncDetailValue}>{formatDate(item.last_sync_at)}</Text>
          </View>
          <View style={styles.syncDetail}>
            <Text style={styles.syncDetailLabel}>{t('syncMonitoring.docsInQueue')}</Text>
            <Text style={[styles.syncDetailValue, item.pending_count > 0 && { color: COLORS.error }]}>
              {item.pending_count || 0}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!serverSyncEnabled) {
    return (
      <View style={styles.disabledContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color={COLORS.tabBarInactive} />
        <Text style={styles.disabledTitle}>{t('syncMonitoring.serverSyncDisabled')}</Text>
        <Text style={styles.disabledSubtitle}>{t('syncMonitoring.serverSyncDisabledSub')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sync button banner */}
      <TouchableOpacity
        style={[styles.syncBanner, syncing && styles.syncBannerDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Ionicons name="sync" size={18} color={COLORS.white} />
        )}
        <Text style={styles.syncBannerText}>
          {syncing ? t('syncMonitoring.syncInProgress') : t('syncMonitoring.syncNow')}
        </Text>
      </TouchableOpacity>

      {/* Summary */}
      {dashboard && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>{dashboard.pendingDocs}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.inQueue')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>{dashboard.syncedDocs}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.totalSynced')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.accent }]}>{dashboard.failedDocs}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.totalFailed')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.accent }]}>{conflicts.length}</Text>
              <Text style={styles.summaryLabel}>{t('syncMonitoring.conflictsCount')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Conflicts banner */}
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

      {/* Entity list */}
      <Text style={styles.sectionTitle}>{t('syncMonitoring.entityStatus')}</Text>
      <FlatList
        data={dashboard?.entities || []}
        keyExtractor={(item, index) => item.entity_type || String(index)}
        renderItem={renderEntityItem}
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
  disabledContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  disabledTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16, textAlign: 'center' },
  disabledSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  syncBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, margin: 16, marginBottom: 0, padding: 12, borderRadius: 12 },
  syncBannerDisabled: { opacity: 0.6 },
  syncBannerText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
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
  syncBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  syncBadgeText: { fontSize: 11, fontWeight: '600' },
  syncDetails: { flexDirection: 'row', gap: 16 },
  syncDetail: { flex: 1 },
  syncDetailLabel: { fontSize: 11, color: COLORS.textSecondary },
  syncDetailValue: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
