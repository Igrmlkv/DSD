import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AppMapView from '../../components/AppMapView';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { VISIT_STATUS, ROUTE_STATUS } from '../../constants/statuses';
import { getExpeditorProgress, getRoutePoints, getAllDriverPositions, getGpsTracksByRoute } from '../../database';
import useSettingsStore from '../../store/settingsStore';

const ROUTE_COLORS = ['#2196F3', '#FF5722', '#4CAF50', '#9C27B0', '#FF9800'];

function darkenColor(hex, factor = 0.5) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function MonitoringMapScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [expeditors, setExpeditors] = useState([]);
  const [routePointsMap, setRoutePointsMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpeditor, setSelectedExpeditor] = useState(null);
  const [driverPositions, setDriverPositions] = useState([]);
  const [selectedGpsTrack, setSelectedGpsTrack] = useState([]);
  const gpsTrackingEnabled = useSettingsStore((s) => s.gpsTrackingEnabled);

  const loadData = useCallback(async () => {
    try {
      const data = await getExpeditorProgress();
      setExpeditors(data);
      const ptsMap = {};
      for (const exp of data) {
        if (exp.route_id) {
          const pts = await getRoutePoints(exp.route_id);
          ptsMap[exp.route_id] = pts.filter((p) => p.latitude && p.longitude);
        }
      }
      setRoutePointsMap(ptsMap);
      if (gpsTrackingEnabled) {
        const positions = await getAllDriverPositions();
        setDriverPositions(positions);
      }
    } catch (e) { console.error('Monitoring load:', e); }
  }, [gpsTrackingEnabled]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const allPoints = Object.values(routePointsMap).flat();

  useEffect(() => {
    if (mapRef.current && allPoints.length > 0) {
      const timer = setTimeout(() => {
        mapRef.current.fitToPoints(
          allPoints.map((p) => ({ lat: p.latitude, lon: p.longitude })),
          48
        );
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allPoints.length]);

  // Build markers and polylines from all visible routes
  const markers = [];
  const polylines = [];

  expeditors.forEach((exp, expIndex) => {
    const pts = routePointsMap[exp.route_id] || [];
    const routeColor = ROUTE_COLORS[expIndex % ROUTE_COLORS.length];
    const isVisible = !selectedExpeditor || selectedExpeditor === exp.route_id;

    if (!isVisible || pts.length === 0) return;

    pts.forEach((point, ptIndex) => {
      const isCompleted = point.status === VISIT_STATUS.COMPLETED;
      const markerColor = isCompleted ? darkenColor(routeColor, 0.5) : routeColor;
      markers.push({
        id: `${exp.route_id}-${point.id}`,
        lat: point.latitude,
        lon: point.longitude,
        zIndex: selectedExpeditor === exp.route_id ? 20 : 10,
        children: (
          <View style={styles.mapMarkerContainer}>
            <View style={[styles.mapMarkerBubble, { backgroundColor: markerColor }]}>
              {isCompleted
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Text style={styles.mapMarkerSeq}>{ptIndex + 1}</Text>
              }
            </View>
            <View style={[styles.mapMarkerArrow, { borderTopColor: markerColor }]} />
          </View>
        ),
      });
    });

    if (pts.length >= 2) {
      polylines.push({
        key: exp.route_id,
        points: pts.map((p) => ({ lat: p.latitude, lon: p.longitude })),
        color: routeColor,
        width: selectedExpeditor === exp.route_id ? 4 : 2,
      });
    }
  });

  // Add GPS driver position markers
  if (gpsTrackingEnabled) {
    driverPositions.forEach((dp) => {
      markers.push({
        id: `driver-gps-${dp.driver_id}`,
        lat: dp.latitude,
        lon: dp.longitude,
        zIndex: 50,
        children: (
          <View style={styles.driverGpsMarker}>
            <View style={styles.driverGpsInner}>
              <Ionicons name="navigate" size={14} color="#fff" />
            </View>
          </View>
        ),
      });
    });

    if (selectedGpsTrack.length >= 2) {
      polylines.push({
        key: 'selected-gps-track',
        points: selectedGpsTrack.map((p) => ({ lat: p.latitude, lon: p.longitude })),
        color: '#2196F380',
        width: 4,
      });
    }
  }

  const renderExpeditor = ({ item, index }) => {
    const progress = item.total_points > 0 ? (item.completed_points / item.total_points) * 100 : 0;
    const isActive = item.route_status === ROUTE_STATUS.IN_PROGRESS;
    const routeColor = ROUTE_COLORS[index % ROUTE_COLORS.length];
    const isSelected = selectedExpeditor === item.route_id;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && { borderColor: routeColor, borderWidth: 2 }]}
        onPress={async () => {
          const newSelected = isSelected ? null : item.route_id;
          setSelectedExpeditor(newSelected);
          if (newSelected && gpsTrackingEnabled) {
            try {
              const track = await getGpsTracksByRoute(newSelected);
              setSelectedGpsTrack(track);
            } catch { setSelectedGpsTrack([]); }
          } else {
            setSelectedGpsTrack([]);
          }
          const pts = routePointsMap[item.route_id];
          if (mapRef.current && pts && pts.length > 0) {
            const lats = pts.map((p) => p.latitude);
            const lons = pts.map((p) => p.longitude);
            const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
            const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
            mapRef.current.setCenter(centerLat, centerLon, 12);
          }
        }}
        onLongPress={() => navigation.navigate(SCREEN_NAMES.EXPEDITOR_ROUTE_DETAIL, {
          expeditorId: item.id, routeId: item.route_id, driverName: item.full_name,
        })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.colorIndicator, { backgroundColor: routeColor }]} />
          <View style={[styles.avatar, isActive && styles.avatarActive]}>
            <Ionicons name="person" size={18} color={isActive ? COLORS.white : COLORS.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.full_name}</Text>
            <Text style={styles.cardMeta}>{item.vehicle_number}</Text>
          </View>
          <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgePlanned]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success : COLORS.tabBarInactive }]} />
            <Text style={styles.statusText}>{isActive ? t('monitoringMap.inTransit') : t('monitoringMap.plan')}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>{t('monitoringMap.points')}: {item.completed_points}/{item.total_points}</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: routeColor }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ lat: 55.75, lon: 37.62, zoom: 9 }}
        markers={markers}
        polylines={polylines}
      />

      <View style={styles.listContainer}>
        <FlatList
          data={expeditors}
          keyExtractor={(item) => item.id + '-' + item.route_id}
          renderItem={renderExpeditor}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{t('monitoringMap.expeditors', { count: expeditors.length })}</Text>
              <Text style={styles.listHint}>{t('monitoringMap.hint')}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('monitoringMap.noActiveRoutes')}</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 7 },
  listContainer: { flex: 3 },
  list: { padding: 12 },
  listHeader: { marginBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  listHint: { fontSize: 11, color: COLORS.tabBarInactive, marginTop: 2 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    borderWidth: 1, borderColor: 'transparent',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  colorIndicator: { width: 4, height: 36, borderRadius: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  avatarActive: { backgroundColor: COLORS.primary },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: COLORS.success + '15' },
  badgePlanned: { backgroundColor: COLORS.border + '40' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '500', color: COLORS.text },
  progressSection: {},
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary },
  progressPercent: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  progressBg: { height: 5, backgroundColor: COLORS.border + '60', borderRadius: 3 },
  progressFill: { height: 5, borderRadius: 3 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  mapMarkerContainer: { alignItems: 'center' },
  mapMarkerBubble: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, shadowRadius: 2, elevation: 3,
  },
  mapMarkerSeq: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mapMarkerArrow: {
    width: 0, height: 0,
    borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },
  driverGpsMarker: {
    alignItems: 'center',
  },
  driverGpsInner: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
});
