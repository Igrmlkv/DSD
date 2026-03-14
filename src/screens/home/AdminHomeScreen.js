import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import useAuthStore from '../../store/authStore';
import {
  getDevices, getSyncStats, getSyncConflicts,
  getAuditLog, getUnreadNotificationCount,
} from '../../database';

export default function AdminHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [deviceCount, setDeviceCount] = useState(0);
  const [activeDevices, setActiveDevices] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [recentAudit, setRecentAudit] = useState([]);
  const [unread, setUnread] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [devices, syncConflicts, audit, n] = await Promise.all([
        getDevices(),
        getSyncConflicts(),
        getAuditLog({ limit: 5 }),
        getUnreadNotificationCount(user.id),
      ]);
      setDeviceCount(devices.length);
      setActiveDevices(devices.filter((d) => d.status === 'active').length);
      setConflicts(syncConflicts.length);
      setRecentAudit(audit);
      setUnread(n);
    } catch (e) {
      console.error('AdminHome load error:', e);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const statusCards = [
    { icon: 'phone-portrait-outline', value: `${activeDevices}/${deviceCount}`, label: t('adminHome.devices'), color: COLORS.primary,
      onPress: () => navigation.navigate(SCREEN_NAMES.DEVICES_TAB) },
    { icon: 'git-compare-outline', value: conflicts, label: t('adminHome.conflicts'), color: conflicts > 0 ? COLORS.error : COLORS.primary,
      onPress: () => navigation.navigate(SCREEN_NAMES.SYNC_TAB) },
    { icon: 'people-outline', value: '', label: t('adminHome.users'), color: COLORS.secondary,
      onPress: () => navigation.navigate(SCREEN_NAMES.USERS_TAB) },
    { icon: 'settings-outline', value: '', label: t('adminHome.settings'), color: COLORS.info,
      onPress: () => navigation.navigate(SCREEN_NAMES.SETTINGS_TAB) },
  ];

  const actionIcon = (action) => {
    if (action.includes('login')) return 'log-in-outline';
    if (action.includes('delivery')) return 'cube-outline';
    if (action.includes('payment')) return 'wallet-outline';
    if (action.includes('return')) return 'return-down-back-outline';
    if (action.includes('sync')) return 'sync-outline';
    if (action.includes('user')) return 'person-outline';
    if (action.includes('settings')) return 'settings-outline';
    return 'document-text-outline';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Заголовок */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{t('roles.admin')}</Text>
          <Text style={styles.userName}>{user.fullName?.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
          {unread > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Статус системы */}
      <Text style={styles.sectionTitle}>{t('adminHome.systemStatus')}</Text>
      <View style={styles.cardsGrid}>
        {statusCards.map((c) => (
          <TouchableOpacity key={c.label} style={styles.statusCard} onPress={c.onPress}>
            <Ionicons name={c.icon} size={28} color={c.color} />
            {c.value !== '' && <Text style={styles.cardValue}>{c.value}</Text>}
            <Text style={styles.cardLabel}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {conflicts > 0 && (
        <TouchableOpacity
          style={styles.alertBar}
          onPress={() => navigation.navigate(SCREEN_NAMES.SYNC_TAB)}
        >
          <Ionicons name="warning-outline" size={20} color={COLORS.white} />
          <Text style={styles.alertText}>{t('adminHome.syncConflicts', { count: conflicts })}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Журнал аудита */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('adminHome.recentActions')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.SYNC_TAB, {
          screen: SCREEN_NAMES.AUDIT_LOG,
        })}>
          <Text style={styles.seeAll}>{t('adminHome.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      {recentAudit.map((entry) => (
        <View key={entry.id} style={styles.auditRow}>
          <View style={styles.auditIcon}>
            <Ionicons name={actionIcon(entry.action)} size={16} color={COLORS.primary} />
          </View>
          <View style={styles.auditInfo}>
            <Text style={styles.auditAction} numberOfLines={1}>{entry.details}</Text>
            <Text style={styles.auditMeta}>
              {entry.user_name} • {new Date(entry.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  userName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  notifBtn: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute', top: 4, right: 4, backgroundColor: COLORS.error,
    borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },
  alertBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: COLORS.error, borderRadius: 12, padding: 12,
  },
  alertText: { flex: 1, color: COLORS.white, fontSize: 13, fontWeight: '500' },
  auditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 6,
  },
  auditIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  auditInfo: { flex: 1 },
  auditAction: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  auditMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
