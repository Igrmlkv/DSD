import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AppMapView from '../../components/AppMapView';
import { COLORS } from '../../constants/colors';
import { getRoutePoints } from '../../database';

const STATUS_COLORS = {
  pending: COLORS.tabBarInactive,
  arrived: COLORS.secondary,
  in_progress: COLORS.accent,
  completed: '#34C759',
  skipped: COLORS.error,
};

export default function RouteMapScreen({ route }) {
  const { t } = useTranslation();
  const { routeId } = route.params || {};
  const [points, setPoints] = useState([]);
  const mapRef = useRef(null);

  useFocusEffect(useCallback(() => {
    if (routeId) {
      getRoutePoints(routeId).then(setPoints).catch(console.error);
    }
  }, [routeId]));

  const validPoints = points.filter((p) => p.latitude && p.longitude);

  useEffect(() => {
    if (mapRef.current && validPoints.length > 0) {
      const timer = setTimeout(() => {
        if (validPoints.length === 1) {
          mapRef.current.setCenter(validPoints[0].latitude, validPoints[0].longitude, 14);
        } else {
          const lats = validPoints.map((p) => p.latitude);
          const lons = validPoints.map((p) => p.longitude);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
          const latDelta = (Math.max(...lats) - Math.min(...lats)) * 1.5;
          const lonDelta = (Math.max(...lons) - Math.min(...lons)) * 1.5;
          const delta = Math.max(latDelta, lonDelta, 0.01);
          const zoom = Math.max(5, Math.min(15, 12 - Math.log2(delta / 0.01)));
          mapRef.current.setCenter(centerLat, centerLon, zoom);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [validPoints.length]);

  const openInYandexNav = (point) => {
    if (point.latitude && point.longitude) {
      const url = `yandexnavi://build_route_on_map?lat_to=${point.latitude}&lon_to=${point.longitude}`;
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(
            `https://yandex.ru/maps/?rtext=~${point.latitude},${point.longitude}&rtt=auto`
          );
        }
      });
    } else {
      Alert.alert(t('routeMap.coordinates'), t('routeMap.noCoordinates'));
    }
  };

  const markers = validPoints.map((point, index) => {
    const color = STATUS_COLORS[point.status] || COLORS.tabBarInactive;
    return {
      id: point.id,
      lat: point.latitude,
      lon: point.longitude,
      onPress: () => openInYandexNav(point),
      children: (
        <View style={styles.mapMarkerContainer}>
          <View style={[styles.mapMarkerBubble, { backgroundColor: color }]}>
            <Text style={styles.mapMarkerSeq}>{index + 1}</Text>
          </View>
          <View style={[styles.mapMarkerArrow, { borderTopColor: color }]} />
        </View>
      ),
    };
  });

  const polylines = validPoints.length >= 2 ? [{
    key: 'route',
    points: validPoints.map((p) => ({ lat: p.latitude, lon: p.longitude })),
    color: COLORS.primary,
    width: 3,
  }] : [];

  const firstPoint = validPoints[0];

  const renderPoint = ({ item, index }) => {
    const isCompleted = item.status === 'completed';
    const color = STATUS_COLORS[item.status] || COLORS.tabBarInactive;
    return (
      <View style={[styles.pointRow, isCompleted && styles.pointCompleted]}>
        <View style={[styles.marker, { backgroundColor: color }]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          ) : (
            <Text style={styles.markerText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.pointInfo}>
          <Text style={[styles.pointName, isCompleted && styles.textDone]}>{item.customer_name}</Text>
          <Text style={styles.pointAddress} numberOfLines={1}>{item.customer_address}</Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => openInYandexNav(item)}>
          <Ionicons name="navigate" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          lat: firstPoint?.latitude || 55.75,
          lon: firstPoint?.longitude || 37.62,
          zoom: 11,
        }}
        markers={markers}
        polylines={polylines}
      />

      <View style={styles.legend}>
        {[
          { color: COLORS.tabBarInactive, label: t('status.pending') },
          { color: COLORS.accent, label: t('status.inProgress') },
          { color: '#34C759', label: t('status.completed') },
          { color: COLORS.error, label: t('status.skipped') },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={points}
        keyExtractor={(item) => item.id}
        renderItem={renderPoint}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.listTitle}>{t('routeMap.routePoints')} ({points.length})</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { height: 300 },
  legend: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: COLORS.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
  list: { padding: 16 },
  listTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  pointRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12, gap: 12, marginBottom: 6,
  },
  pointCompleted: { opacity: 0.6 },
  marker: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  markerText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  pointInfo: { flex: 1 },
  pointName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  textDone: { textDecorationLine: 'line-through' },
  pointAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  navBtn: { padding: 8 },
  mapMarkerContainer: { alignItems: 'center' },
  mapMarkerBubble: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  mapMarkerSeq: { color: '#fff', fontSize: 13, fontWeight: '700' },
  mapMarkerArrow: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },
});
