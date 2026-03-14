import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import useAuthStore from '../../store/authStore';
import { getRoutesByDate, getRoutePoints, updateRouteStatus } from '../../database';

export default function RouteListScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();

  const STATUS_MAP = {
    pending: { label: t('status.pending'), color: COLORS.tabBarInactive, icon: 'time-outline' },
    arrived: { label: t('status.arrived'), color: COLORS.secondary, icon: 'location' },
    in_progress: { label: t('status.inProgress'), color: COLORS.accent, icon: 'construct' },
    completed: { label: t('status.completed'), color: '#34C759', icon: 'checkmark-circle' },
    skipped: { label: t('status.skipped'), color: COLORS.error, icon: 'close-circle' },
  };
  const [route, setRoute] = useState(null);
  const [points, setPoints] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const routes = await getRoutesByDate(today, user.id);
      if (routes.length > 0) {
        setRoute(routes[0]);
        const pts = await getRoutePoints(routes[0].id);
        setPoints(pts);
      }
    } catch (e) {
      console.error('RouteList load error:', e);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartRoute = async () => {
    if (route) {
      await updateRouteStatus(route.id, 'in_progress');
      await loadData();
    }
  };

  const handleCompleteRoute = () => {
    Alert.alert(t('routeList.completeRoute'), t('routeList.completeRouteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('routeList.complete'), onPress: async () => {
          if (route) {
            await updateRouteStatus(route.id, 'completed');
            await loadData();
          }
        },
      },
    ]);
  };

  const isRouteActive = route?.status === 'in_progress';
  const isRouteCompleted = route?.status === 'completed';
  const isRoutePlanned = route?.status === 'planned';
  const completedCount = points.filter((p) => p.status === 'completed').length;

  const canAccessPoints = isRouteActive || isRouteCompleted;

  const renderPoint = ({ item, index }) => {
    const st = STATUS_MAP[item.status] || STATUS_MAP.pending;
    return (
      <TouchableOpacity
        style={[styles.pointCard, !canAccessPoints && styles.pointCardDisabled]}
        activeOpacity={canAccessPoints ? 0.7 : 1}
        onPress={() => {
          if (!canAccessPoints) {
            Alert.alert('', t('routeList.startRouteFirst'));
            return;
          }
          navigation.navigate(SCREEN_NAMES.VISIT, {
            pointId: item.id, routeId: route?.id, customerId: item.customer_id,
            customerName: item.customer_name, pointStatus: isRouteCompleted ? 'completed' : item.status,
          });
        }}
      >
        <View style={[styles.pointNumber, { backgroundColor: (canAccessPoints ? st.color : COLORS.tabBarInactive) + '20' }]}>
          <Text style={[styles.pointNumberText, { color: canAccessPoints ? st.color : COLORS.tabBarInactive }]}>{index + 1}</Text>
        </View>
        <View style={styles.pointContent}>
          <Text style={[styles.pointName, !canAccessPoints && styles.pointNameDisabled]} numberOfLines={1}>{item.customer_name}</Text>
          <Text style={styles.pointAddress} numberOfLines={1}>{item.customer_address}</Text>
          {item.planned_arrival && (
            <Text style={styles.pointTime}>
              {t('routeList.plannedArrival')}: {new Date(item.planned_arrival).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          {item.debt_amount > 0 && (
            <View style={styles.debtRow}>
              <Ionicons name="alert-circle" size={14} color={COLORS.error} />
              <Text style={styles.debtText}>{t('routeList.debt')}: {item.debt_amount.toLocaleString('ru-RU')} ₽</Text>
            </View>
          )}
        </View>
        <View style={styles.pointRight}>
          {canAccessPoints ? (
            <>
              <Ionicons name={st.icon} size={22} color={st.color} />
              <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
            </>
          ) : (
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.tabBarInactive} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Заголовок маршрута */}
      {route && (
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{t('routeList.todayRoute')}</Text>
            <Text style={styles.headerSub}>
              {route.vehicle_number} • {completedCount}/{points.length} {t('routeList.pointsCount')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => navigation.navigate(SCREEN_NAMES.ROUTE_MAP, { routeId: route.id })}
            >
              <Ionicons name="navigate-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            {(isRoutePlanned || isRouteCompleted) && (
              <TouchableOpacity style={styles.startBtn} onPress={handleStartRoute}>
                <Ionicons name="play" size={16} color={COLORS.white} />
                <Text style={styles.startBtnText}>{t('routeList.start')}</Text>
              </TouchableOpacity>
            )}
            {isRouteActive && (
              <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteRoute}>
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                <Text style={styles.completeBtnText}>{t('routeList.complete')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Прогресс-бар */}
      {points.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${(completedCount / points.length) * 100}%` }]} />
          </View>
        </View>
      )}

      <FlatList
        data={points}
        keyExtractor={(item) => item.id}
        renderItem={renderPoint}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('routeList.noRouteToday')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  mapBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  startBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#34C759', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  completeBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  progressContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.white },
  progressBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  list: { padding: 12, paddingBottom: 32 },
  pointCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 14, gap: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  pointCardDisabled: { opacity: 0.5 },
  pointNameDisabled: { color: COLORS.tabBarInactive },
  pointNumber: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pointNumberText: { fontSize: 16, fontWeight: '700' },
  pointContent: { flex: 1 },
  pointName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  pointAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pointTime: { fontSize: 11, color: COLORS.info, marginTop: 3 },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  debtText: { fontSize: 11, color: COLORS.error, fontWeight: '500' },
  pointRight: { alignItems: 'center', gap: 4 },
  statusLabel: { fontSize: 10, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
