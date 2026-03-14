import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getRoutePoints, getDeliveries, getReturns } from '../../database';

const STATUS_COLORS = {
  pending: COLORS.tabBarInactive,
  arrived: COLORS.secondary,
  in_progress: COLORS.accent,
  completed: '#34C759',
  skipped: COLORS.error,
};

export default function ExpeditorRouteDetailScreen({ route }) {
  const { t } = useTranslation();
  const { expeditorId, routeId, driverName } = route.params || {};
  const [points, setPoints] = useState([]);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (routeId) {
        const pts = await getRoutePoints(routeId);
        setPoints(pts);
      }
      if (expeditorId) {
        const del = await getDeliveries(expeditorId);
        setDeliveryCount(del.length);
        const ret = await getReturns(expeditorId);
        setReturnCount(ret.length);
      }
    } catch (e) { console.error('ExpeditorRouteDetail load:', e); }
  }, [routeId, expeditorId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const completed = points.filter((p) => p.status === 'completed').length;

  const renderPoint = ({ item, index }) => {
    const color = STATUS_COLORS[item.status] || COLORS.tabBarInactive;
    return (
      <View style={styles.pointRow}>
        <View style={[styles.pointDot, { backgroundColor: color }]}>
          {item.status === 'completed' && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
        </View>
        <View style={styles.pointInfo}>
          <Text style={styles.pointName}>{index + 1}. {item.customer_name}</Text>
          <Text style={styles.pointAddress} numberOfLines={1}>{item.customer_address}</Text>
          <View style={styles.pointMeta}>
            {item.actual_arrival && (
              <Text style={styles.metaText}>
                Прибытие: {new Date(item.actual_arrival).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
            {item.actual_departure && (
              <Text style={styles.metaText}>
                Убытие: {new Date(item.actual_departure).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>
        <Text style={[styles.statusLabel, { color }]}>
          {item.status === 'completed' ? t('expeditorRouteDetail.completed') : item.status === 'in_progress' ? t('expeditorRouteDetail.inProgress') : item.status === 'arrived' ? t('expeditorRouteDetail.onSite') : t('expeditorRouteDetail.pending')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Сводка */}
      <View style={styles.summary}>
        <Text style={styles.driverName}>{driverName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{completed}/{points.length}</Text>
            <Text style={styles.statLabel}>Точки</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="cube" size={18} color={COLORS.accent} />
            <Text style={styles.statValue}>{deliveryCount}</Text>
            <Text style={styles.statLabel}>Доставки</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="return-down-back" size={18} color={COLORS.error} />
            <Text style={styles.statValue}>{returnCount}</Text>
            <Text style={styles.statLabel}>Возвраты</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={points}
        keyExtractor={(item) => item.id}
        renderItem={renderPoint}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summary: { backgroundColor: COLORS.white, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  driverName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  list: { padding: 16 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 6 },
  pointDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  pointInfo: { flex: 1 },
  pointName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  pointAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pointMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaText: { fontSize: 11, color: COLORS.info },
  statusLabel: { fontSize: 11, fontWeight: '600' },
});
