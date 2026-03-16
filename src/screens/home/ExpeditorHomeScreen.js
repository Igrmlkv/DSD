import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { ROUTE_STATUS, VISIT_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getRoutesByDate, getRoutePoints, getPayments,
  getUnreadNotificationCount, getVehicleByDriver,
} from '../../database';

export default function ExpeditorHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPoints: 0, completedPoints: 0,
    totalPayments: 0, paymentCount: 0,
    routeStatus: ROUTE_STATUS.PLANNED, vehiclePlate: '',
    unreadNotifications: 0,
  });

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
        // Auto-detect route completed: all points done
        if (totalPoints > 0 && completedPoints === totalPoints && routeStatus === ROUTE_STATUS.IN_PROGRESS) {
          routeStatus = ROUTE_STATUS.COMPLETED;
        }
      }

      const payments = await getPayments(user.id);
      const todayPayments = payments.filter((p) =>
        p.payment_date && p.payment_date.startsWith(today)
      );
      const totalPayments = todayPayments.reduce((sum, p) => sum + p.amount, 0);

      const vehicle = await getVehicleByDriver(user.id);
      const unread = await getUnreadNotificationCount(user.id);

      setStats({
        totalPoints,
        completedPoints,
        totalPayments,
        paymentCount: todayPayments.length,
        routeStatus,
        vehiclePlate: vehicle?.plate_number || '',
        unreadNotifications: unread,
      });
    } catch (e) {
      console.error('ExpeditorHome load error:', e);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isRouteCompleted = stats.routeStatus === ROUTE_STATUS.COMPLETED;

  const quickActions = [
    { title: t('expeditorHome.actionStartOfDay'), icon: 'sunny-outline', onPress: () => navigation.navigate(SCREEN_NAMES.WAREHOUSE_OPS_TAB, { screen: SCREEN_NAMES.START_OF_DAY }) },
    { title: t('expeditorHome.actionInventory'), icon: 'clipboard-outline', onPress: () => navigation.navigate(SCREEN_NAMES.WAREHOUSE_OPS_TAB, { screen: SCREEN_NAMES.INVENTORY_CHECK }) },
    { title: t('expeditorHome.actionExpenses'), icon: 'receipt-outline', onPress: () => navigation.navigate(SCREEN_NAMES.WAREHOUSE_OPS_TAB, { screen: SCREEN_NAMES.EXPENSES }) },
    { title: t('expeditorHome.actionEndOfDay'), icon: 'moon-outline', onPress: () => navigation.navigate(SCREEN_NAMES.WAREHOUSE_OPS_TAB, { screen: SCREEN_NAMES.END_OF_DAY }) },
  ];

  const formatMoney = (val) =>
    val.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Приветствие */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>{t('expeditorHome.goodDay')}</Text>
          <Text style={styles.userName}>{user.fullName?.split(' ')[0] || t('expeditorHome.defaultName')}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE_TAB, {
            screen: SCREEN_NAMES.NOTIFICATIONS,
          })}
        >
          <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
          {stats.unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Транспорт */}
      {stats.vehiclePlate ? (
        <View style={styles.vehicleRow}>
          <Ionicons name="car-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.vehicleText}>{stats.vehiclePlate}</Text>
        </View>
      ) : null}

      {/* Сводка дня */}
      <Text style={styles.sectionTitle}>{t('expeditorHome.daySummary')}</Text>
      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Ionicons name="location-outline" size={28} color={COLORS.primary} />
          <Text style={styles.cardValue}>{stats.completedPoints} / {stats.totalPoints}</Text>
          <Text style={styles.cardLabel}>{t('expeditorHome.points')}</Text>
        </View>
        <View style={styles.card}>
          <Ionicons name="wallet-outline" size={28} color={COLORS.accent} />
          <Text style={styles.cardValue}>{formatMoney(stats.totalPayments)}</Text>
          <Text style={styles.cardLabel}>{t('expeditorHome.payments')} ({stats.paymentCount})</Text>
        </View>
      </View>

      {/* Статус маршрута */}
      <View style={[
        styles.statusBar,
        stats.routeStatus === ROUTE_STATUS.IN_PROGRESS && styles.statusActive,
        stats.routeStatus === ROUTE_STATUS.COMPLETED && styles.statusCompleted,
      ]}>
        <Ionicons
          name={stats.routeStatus === ROUTE_STATUS.COMPLETED ? 'checkmark-circle' :
                stats.routeStatus === ROUTE_STATUS.IN_PROGRESS ? 'navigate' : 'time-outline'}
          size={20}
          color={stats.routeStatus === ROUTE_STATUS.IN_PROGRESS || stats.routeStatus === ROUTE_STATUS.COMPLETED
            ? COLORS.white : COLORS.primary}
        />
        <Text style={[
          styles.statusText,
          (stats.routeStatus === ROUTE_STATUS.IN_PROGRESS || stats.routeStatus === ROUTE_STATUS.COMPLETED) && styles.statusTextActive,
        ]}>
          {stats.routeStatus === ROUTE_STATUS.IN_PROGRESS ? t('expeditorHome.routeInProgress') :
           stats.routeStatus === ROUTE_STATUS.COMPLETED ? t('expeditorHome.routeCompleted') : t('expeditorHome.routePlanned')}
        </Text>
      </View>

      {/* Быстрые действия */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { fontSize: 16, color: COLORS.textSecondary },
  userName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  notifBtn: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute', top: 4, right: 4, backgroundColor: COLORS.error,
    borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  vehicleText: { fontSize: 14, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 20 },
  cardsRow: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },
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
});
