import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { ROUTE_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getSupervisorStats, getExpeditorProgress, getUnreadNotificationCount,
} from '../../database';

export default function SupervisorHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [expeditors, setExpeditors] = useState([]);
  const [unread, setUnread] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [s, exp, n] = await Promise.all([
        getSupervisorStats(),
        getExpeditorProgress(),
        getUnreadNotificationCount(user.id),
      ]);
      setStats(s);
      setExpeditors(exp);
      setUnread(n);
    } catch (e) {
      console.error('SupervisorHome load error:', e);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatMoney = (val) =>
    (val || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

  const kpiCards = stats ? [
    { icon: 'people-outline', value: stats.expeditorsOnRoute, label: t('supervisorHome.onRoute'), color: COLORS.primary },
    { icon: 'location-outline', value: `${stats.completedPoints}/${stats.totalPoints}`, label: t('supervisorHome.points'), color: COLORS.secondary },
    { icon: 'wallet-outline', value: formatMoney(stats.totalPayments), label: t('supervisorHome.payments'), color: COLORS.accent },
    { icon: 'return-down-back-outline', value: stats.pendingReturns, label: t('supervisorHome.returns'), color: COLORS.error },
  ] : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Заголовок */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{t('roles.supervisor')}</Text>
          <Text style={styles.userName}>{user.fullName?.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE_TAB, { screen: SCREEN_NAMES.NOTIFICATIONS })}
        >
          <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
          {unread > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* KPI */}
      {stats && (
        <>
          <Text style={styles.sectionTitle}>{t('supervisorHome.dayOverview')}</Text>
          <View style={styles.kpiGrid}>
            {kpiCards.map((k) => (
              <View key={k.label} style={styles.kpiCard}>
                <Ionicons name={k.icon} size={24} color={k.color} />
                <Text style={styles.kpiValue}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>

          {stats.pendingReturns > 0 && (
            <TouchableOpacity
              style={styles.alertBar}
              onPress={() => navigation.navigate(SCREEN_NAMES.RETURNS_APPROVAL_TAB)}
            >
              <Ionicons name="warning-outline" size={20} color={COLORS.white} />
              <Text style={styles.alertText}>
                {t('supervisorHome.pendingReturnsAlert', { count: stats.pendingReturns, amount: formatMoney(stats.pendingReturnsAmount) })}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Экспедиторы */}
      <Text style={styles.sectionTitle}>{t('supervisorHome.expeditorsOnRoute')}</Text>
      {expeditors.length === 0 ? (
        <Text style={styles.emptyText}>{t('supervisorHome.noActiveRoutes')}</Text>
      ) : (
        expeditors.map((exp) => (
          <TouchableOpacity
            key={exp.id + '-' + exp.route_id}
            style={styles.expCard}
            onPress={() => navigation.navigate(SCREEN_NAMES.MONITORING_TAB, {
              screen: SCREEN_NAMES.EXPEDITOR_ROUTE_DETAIL,
              params: { expeditorId: exp.id, routeId: exp.route_id },
            })}
          >
            <View style={styles.expAvatar}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.expInfo}>
              <Text style={styles.expName}>{exp.full_name}</Text>
              <Text style={styles.expMeta}>
                {exp.vehicle_number} • {exp.completed_points}/{exp.total_points} {t('routeList.pointsCount')}
              </Text>
            </View>
            <View style={[
              styles.expBadge,
              exp.route_status === ROUTE_STATUS.IN_PROGRESS ? styles.badgeActive : styles.badgePlanned,
            ]}>
              <Text style={styles.expBadgeText}>
                {exp.route_status === ROUTE_STATUS.IN_PROGRESS ? t('supervisorHome.inTransit') : t('supervisorHome.plan')}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
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
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  kpiValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary },
  alertBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: COLORS.error, borderRadius: 12, padding: 12,
  },
  alertText: { flex: 1, color: COLORS.white, fontSize: 13, fontWeight: '500' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 },
  expCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 14, gap: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  expAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  expInfo: { flex: 1 },
  expName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  expMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  expBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: COLORS.primary + '20' },
  badgePlanned: { backgroundColor: COLORS.border + '60' },
  expBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
});
