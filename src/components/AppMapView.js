import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import useSettingsStore from '../store/settingsStore';
import { COLORS } from '../constants/colors';

// Lazy imports to avoid loading both map SDKs
let YaMap, YaMarker, YaPolyline;
let RNMapView, RNMarker, RNPolyline, PROVIDER_DEFAULT, UrlTile;

try {
  const yamap = require('react-native-yamap');
  YaMap = yamap.default;
  YaMarker = yamap.Marker;
  YaPolyline = yamap.Polyline;
} catch (e) { /* react-native-yamap not available */ }

try {
  const rnmaps = require('react-native-maps');
  RNMapView = rnmaps.default;
  RNMarker = rnmaps.Marker;
  RNPolyline = rnmaps.Polyline;
  PROVIDER_DEFAULT = rnmaps.PROVIDER_DEFAULT;
  UrlTile = rnmaps.UrlTile;
} catch (e) { /* react-native-maps not available */ }

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Universal map component supporting Yandex Maps and OSM (via react-native-maps).
 *
 * Props:
 * - style: map container style
 * - initialRegion: { lat, lon, zoom }
 * - markers: [{ id, lat, lon, color, children (React node for custom marker), onPress }]
 * - polylines: [{ key, points: [{lat, lon}], color, width }]
 * - showUserPosition: bool
 *
 * Ref methods:
 * - setCenter(lat, lon, zoom, duration)
 */
const AppMapView = forwardRef(function AppMapView(
  { style, initialRegion, markers = [], polylines = [], showUserPosition = false },
  ref
) {
  const mapProvider = useSettingsStore((s) => s.mapProvider);
  const yaMapRef = useRef(null);
  const rnMapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setCenter: (lat, lon, zoom = 12, duration = 0.5) => {
      if (mapProvider === 'yandex' && yaMapRef.current) {
        yaMapRef.current.setCenter({ lat, lon }, zoom, 0, 0, duration);
      } else if (rnMapRef.current) {
        const delta = 360 / Math.pow(2, zoom) * 0.5;
        rnMapRef.current.animateToRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }, duration * 1000);
      }
    },
  }));

  const ir = initialRegion || { lat: 55.75, lon: 37.62, zoom: 10 };

  if (mapProvider === 'yandex') {
    if (!YaMap) {
      return (
        <View style={[styles.fallback, style]}>
          <Text style={styles.fallbackText}>Яндекс Карты недоступны</Text>
        </View>
      );
    }

    return (
      <YaMap
        ref={yaMapRef}
        style={[styles.map, style]}
        initialRegion={{ lat: ir.lat, lon: ir.lon, zoom: ir.zoom, azimuth: 0, tilt: 0 }}
        showUserPosition={showUserPosition}
      >
        {markers.map((m) => (
          <YaMarker
            key={m.id}
            point={{ lat: m.lat, lon: m.lon }}
            scale={1}
            zIndex={m.zIndex || 10}
            onPress={m.onPress}
          >
            {m.children}
          </YaMarker>
        ))}
        {polylines.map((pl) => (
          <YaPolyline
            key={pl.key}
            points={pl.points.map((p) => ({ lat: p.lat, lon: p.lon }))}
            strokeColor={pl.color || COLORS.primary}
            strokeWidth={pl.width || 3}
            outlineColor={(pl.color || COLORS.primary) + '40'}
            outlineWidth={1}
          />
        ))}
      </YaMap>
    );
  }

  // OSM via react-native-maps
  if (!RNMapView) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>OSM карты недоступны</Text>
      </View>
    );
  }

  const zoomToDelta = (zoom) => 360 / Math.pow(2, zoom) * 0.5;

  return (
    <RNMapView
      ref={rnMapRef}
      style={[styles.map, style]}
      provider={PROVIDER_DEFAULT}
      initialRegion={{
        latitude: ir.lat,
        longitude: ir.lon,
        latitudeDelta: zoomToDelta(ir.zoom),
        longitudeDelta: zoomToDelta(ir.zoom),
      }}
      showsUserLocation={showUserPosition}
      mapType="none"
    >
      <UrlTile
        urlTemplate={OSM_TILE_URL}
        maximumZ={19}
        tileSize={256}
      />
      {markers.map((m) => (
        <RNMarker
          key={m.id}
          coordinate={{ latitude: m.lat, longitude: m.lon }}
          onPress={m.onPress}
        >
          {m.children}
        </RNMarker>
      ))}
      {polylines.map((pl) => (
        <RNPolyline
          key={pl.key}
          coordinates={pl.points.map((p) => ({ latitude: p.lat, longitude: p.lon }))}
          strokeColor={pl.color || COLORS.primary}
          strokeWidth={pl.width || 3}
        />
      ))}
    </RNMapView>
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
  fallback: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
  },
  fallbackText: { fontSize: 14, color: COLORS.textSecondary },
});

export default AppMapView;
