import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getRoutesByDate, getRoutePoints } from '../../database';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { ROUTE_STATUS } from '../../constants/statuses';

const STATUS_COLORS = {
  planned: COLORS.secondary,
  in_progress: COLORS.accent,
  completed: '#4CAF50',
  cancelled: COLORS.error,
};

const POINT_STATUS_ICONS = {
  pending: { icon: 'time-outline', color: COLORS.textSecondary },
  arrived: { icon: 'location', color: COLORS.accent },
  completed: { icon: 'checkmark-circle', color: '#4CAF50' },
  skipped: { icon: 'close-circle', color: COLORS.error },
};

export default function RoutesScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isDriver = user?.role === 'driver';

  const [routes, setRoutes] = useState([]);
  const [points, setPoints] = useState({});
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
    }, [])
  );

  async function loadRoutes() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const driverId = isDriver ? user.id : null;
      const data = await getRoutesByDate(today, driverId);
      setRoutes(data);
      const pts = {};
      for (const r of data) {
        pts[r.id] = await getRoutePoints(r.id);
      }
      setPoints(pts);
      // Auto-expand for driver (single route)
      if (isDriver && data.length === 1) {
        setExpandedRoute(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function toggleRoute(routeId) {
    setExpandedRoute(expandedRoute === routeId ? null : routeId);
  }

  function renderPoint({ item }) {
    const st = POINT_STATUS_ICONS[item.status];
    const stLabel = t('routesScreen.pointStatuses.' + (item.status || 'pending'));
    const time = item.planned_arrival
      ? new Date(item.planned_arrival).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <View style={styles.pointRow}>
        <View style={styles.pointSeq}>
          <Text style={styles.pointSeqText}>{item.sequence_number}</Text>
        </View>
        <View style={styles.pointInfo}>
          <Text style={styles.pointName}>{item.customer_name}</Text>
          <Text style={styles.pointAddr} numberOfLines={1}>{item.customer_address}</Text>
          {item.customer_phone ? (
            <Text style={styles.pointPhone}>{item.customer_phone}</Text>
          ) : null}
        </View>
        <View style={styles.pointRight}>
          <Text style={styles.pointTime}>{time}</Text>
          <View style={[styles.pointStatusBadge, { backgroundColor: st.color + '20' }]}>
            <Ionicons name={st.icon} size={14} color={st.color} />
            <Text style={[styles.pointStatusText, { color: st.color }]}>{stLabel}</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderRoute({ item }) {
    const stColor = STATUS_COLORS[item.status];
    const stLabel = t('routesScreen.statuses.' + (item.status === ROUTE_STATUS.IN_PROGRESS ? 'inProgress' : item.status || 'planned'));
    const routePoints = points[item.id] || [];
    const isExpanded = expandedRoute === item.id;

    return (
      <View style={styles.routeCard}>
        <TouchableOpacity style={styles.routeHeader} onPress={() => toggleRoute(item.id)}>
          <View style={styles.routeLeft}>
            <Ionicons name="car-outline" size={24} color={COLORS.primary} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeDriver}>{item.driver_name}</Text>
              <Text style={styles.routeVehicle}>{item.vehicle_number}</Text>
            </View>
          </View>
          <View style={styles.routeRight}>
            <View style={[styles.statusBadge, { backgroundColor: stColor + '20' }]}>
              <Text style={[styles.statusText, { color: stColor }]}>{stLabel}</Text>
            </View>
            <View style={styles.routeMeta}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.routeMetaText}>{routePoints.length} {t('routesScreen.points')}</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.pointsList}>
            {routePoints.map((p) => (
              <React.Fragment key={p.id}>{renderPoint({ item: p })}</React.Fragment>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateBar}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>
      {routes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={48} color={COLORS.tabBarInactive} />
          <Text style={styles.emptyText}>{t('routesScreen.noRoutes')}</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={renderRoute}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dateBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dateText: { fontSize: 15, color: COLORS.primary, fontWeight: '600', textTransform: 'capitalize' },
  list: { padding: 12 },
  routeCard: {
    backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 12,
    overflow: 'hidden',
  },
  routeHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  routeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  routeInfo: { flex: 1 },
  routeDriver: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  routeVehicle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  routeRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  routeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeMetaText: { fontSize: 12, color: COLORS.textSecondary },
  pointsList: {
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 4,
  },
  pointRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  pointSeq: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  pointSeqText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  pointInfo: { flex: 1 },
  pointName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  pointAddr: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pointPhone: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  pointRight: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  pointTime: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  pointStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  pointStatusText: { fontSize: 11, fontWeight: '600' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
