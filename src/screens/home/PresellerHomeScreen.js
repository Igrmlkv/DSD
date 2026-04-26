import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { ROUTE_STATUS, VISIT_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import {
  getRoutesByDate, getRoutePoints, getTodayOrdersByUser,
  getUnreadNotificationCount, getTodayExpensesTotal,
  getAnyRoutePointForTesting, getCustomerById,
} from '../../database';
import { startAudit } from '../../modules/merchandising/services/auditService';
import { mapCustomerTypeToOutletType } from '../../modules/merchandising/services/preconditions';
import useAuditStore from '../../modules/merchandising/store/auditStore';

export default function PresellerHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const merchTestBypass = useSettingsStore((s) => s.merchTestBypass);
  const merchandisingEnabled = useSettingsStore((s) => s.merchandisingEnabled);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPoints: 0, completedPoints: 0,
    totalOrders: 0, ordersAmount: 0,
    routeStatus: ROUTE_STATUS.PLANNED,
    unreadNotifications: 0,
    todayExpenses: 0,
  });

  // Bypass-only entry point: runs a full merch audit on a seeded route_point.
  // Uses a real route_point from the DB so the visit_reports.route_point_id FK is satisfied;
  // synthetic IDs would fail with FOREIGN KEY constraint failed.
  // Hidden behind both flags — never visible in production builds where bypass is off.
  const handleStartTestAudit = useCallback(async () => {
    try {
      const routePoint = await getAnyRoutePointForTesting(user?.id);
      if (!routePoint) {
        Alert.alert(t('common.error'), 'No route_points seeded — reset DB and retry.');
        return;
      }
      const customer = routePoint.customer_id ? await getCustomerById(routePoint.customer_id) : null;
      const outletType = mapCustomerTypeToOutletType(customer?.customer_type) || 'retail';
      const ctx = await startAudit({ outletType, customer, routePoint, testMode: true });
      useAuditStore.getState().startAudit(ctx);
      navigation.navigate(SCREEN_NAMES.ROUTE_TAB, {
        screen: SCREEN_NAMES.MERCH_AUDIT,
        params: { visitId: ctx.visitId },
      });
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  }, [navigation, t, user]);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const routes = await getRoutesByDate(today, user.id);
      let totalPoints = 0, completedPoints = 0, routeStatus = ROUTE_STATUS.PLANNED;

      if (routes.length > 0) {
        routeStatus = routes[0].status;
        for (const route of routes) {
          const points = await getRoutePoints(route.id);
          totalPoints += points.length;
          completedPoints += points.filter((p) => p.status === VISIT_STATUS.COMPLETED).length;
        }
      }

      const [todayOrders, unread, todayExpenses] = await Promise.all([
        getTodayOrdersByUser(user.id),
        getUnreadNotificationCount(user.id),
        getTodayExpensesTotal(user.id),
      ]);
      const ordersAmount = todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

      setStats({
        totalPoints, completedPoints,
        totalOrders: todayOrders.length, ordersAmount,
        routeStatus,
        unreadNotifications: unread,
        todayExpenses,
      });
    } catch (e) {
      console.error('PresellerHome load error:', e);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatMoney = (val) =>
    val.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

  const quickActions = [
    { title: t('preseller.actionStartOfDay'), icon: 'sunny-outline', onPress: () => navigation.navigate(SCREEN_NAMES.ROUTE_TAB, { screen: SCREEN_NAMES.START_OF_DAY }) },
    { title: t('preseller.actionRoute'), icon: 'map-outline', onPress: () => navigation.navigate(SCREEN_NAMES.ROUTE_TAB) },
    { title: t('preseller.actionExpenses'), icon: 'receipt-outline', onPress: () => navigation.navigate(SCREEN_NAMES.ROUTE_TAB, { screen: SCREEN_NAMES.EXPENSES }) },
    { title: t('preseller.actionEndOfDay'), icon: 'moon-outline', onPress: () => navigation.navigate(SCREEN_NAMES.ROUTE_TAB, { screen: SCREEN_NAMES.END_OF_DAY }) },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>{t('expeditorHome.goodDay')}</Text>
          <Text style={styles.userName}>{user.fullName?.split(' ')[0] || t('preseller.defaultName')}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Ionicons name="briefcase-outline" size={14} color={COLORS.info} />
          <Text style={styles.roleText}>{t('roles.preseller')}</Text>
        </View>
      </View>

      {/* Day Summary */}
      <Text style={styles.sectionTitle}>{t('expeditorHome.daySummary')}</Text>
      <View style={styles.cardsRow}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate(SCREEN_NAMES.ROUTE_TAB, { screen: SCREEN_NAMES.ROUTE_LIST })}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={28} color={COLORS.primary} />
          <Text style={styles.cardValue}>{stats.completedPoints} / {stats.totalPoints}</Text>
          <Text style={styles.cardLabel}>{t('expeditorHome.points')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate(SCREEN_NAMES.ROUTE_TAB, { screen: SCREEN_NAMES.ORDERS_LIST, params: { myToday: true } })}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={28} color={COLORS.accent} />
          <Text style={styles.cardValue}>{stats.totalOrders}</Text>
          <Text style={styles.cardLabel}>{t('preseller.ordersToday')}</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.cardsRow, { marginTop: 12 }]}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate(SCREEN_NAMES.ROUTE_TAB, { screen: SCREEN_NAMES.EXPENSES })}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt-outline" size={28} color={COLORS.error} />
          <Text style={styles.cardValue}>{formatMoney(stats.todayExpenses)}</Text>
          <Text style={styles.cardLabel}>{t('expeditorHome.expenses')}</Text>
        </TouchableOpacity>
        {stats.ordersAmount > 0 ? (
          <View style={styles.card}>
            <Ionicons name="trending-up-outline" size={28} color={COLORS.success} />
            <Text style={styles.cardValue}>{formatMoney(stats.ordersAmount)}</Text>
            <Text style={styles.cardLabel}>{t('preseller.ordersTotal')}</Text>
          </View>
        ) : (
          <View style={styles.cardPlaceholder} />
        )}
      </View>

      {/* Route status */}
      <View style={[
        styles.statusBar,
        stats.routeStatus === ROUTE_STATUS.IN_PROGRESS && styles.statusActive,
        stats.routeStatus === ROUTE_STATUS.COMPLETED && styles.statusCompleted,
      ]}>
        <Ionicons
          name={stats.routeStatus === ROUTE_STATUS.COMPLETED ? 'checkmark-circle' : stats.routeStatus === ROUTE_STATUS.IN_PROGRESS ? 'navigate' : 'time-outline'}
          size={20}
          color={stats.routeStatus === ROUTE_STATUS.IN_PROGRESS || stats.routeStatus === ROUTE_STATUS.COMPLETED ? COLORS.white : COLORS.primary}
        />
        <Text style={[
          styles.statusText,
          (stats.routeStatus === ROUTE_STATUS.IN_PROGRESS || stats.routeStatus === ROUTE_STATUS.COMPLETED) && styles.statusTextActive,
        ]}>
          {stats.routeStatus === ROUTE_STATUS.IN_PROGRESS ? t('expeditorHome.routeInProgress') :
           stats.routeStatus === ROUTE_STATUS.COMPLETED ? t('expeditorHome.routeCompleted') : t('expeditorHome.routePlanned')}
        </Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>{t('expeditorHome.quickActions')}</Text>
      <View style={styles.actionsRow}>
        {quickActions.map((a) => (
          <TouchableOpacity key={a.title} style={styles.actionBtn} onPress={a.onPress}>
            <View style={styles.actionIcon}>
              <Ionicons name={a.icon} size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>{a.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Test bypass: standalone audit launcher (visible only when both flags are on) */}
      {merchandisingEnabled && merchTestBypass && (
        <TouchableOpacity style={styles.bypassCard} onPress={handleStartTestAudit}>
          <Ionicons name="bug" size={20} color={COLORS.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bypassTitle}>{t('merchAudit.bypass.startTitle')}</Text>
            <Text style={styles.bypassSub}>{t('merchAudit.bypass.startSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.tabBarInactive} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { fontSize: 16, color: COLORS.textSecondary },
  userName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.info + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: COLORS.info },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 20 },
  cardsRow: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },
  cardPlaceholder: { flex: 1 },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    backgroundColor: COLORS.primary + '12', borderRadius: 12, padding: 14,
  },
  statusActive: { backgroundColor: COLORS.primary },
  statusCompleted: { backgroundColor: COLORS.textSecondary },
  statusText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  statusTextActive: { color: COLORS.white },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '500', color: COLORS.text, textAlign: 'center' },
  bypassCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 24, padding: 14, borderRadius: 12,
    backgroundColor: COLORS.error + '0E',
    borderWidth: 1, borderColor: COLORS.error + '40', borderStyle: 'dashed',
  },
  bypassTitle: { fontSize: 14, fontWeight: '600', color: COLORS.error },
  bypassSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
