import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert } from 'react-native';
import { GPS_CONFIG } from '../constants/config';
import useSettingsStore from '../store/settingsStore';
import useLocationStore from '../store/locationStore';
import { insertGpsTrack, updateRoutePointCoords } from '../database';

let watchSubscription = null;

// Background task definition — must be at module top level
TaskManager.defineTask(GPS_CONFIG.BACKGROUND_TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations) return;
  const { driverId, routeId } = useLocationStore.getState();
  if (!driverId) return;
  for (const loc of data.locations) {
    try {
      await insertGpsTrack({
        driverId,
        routeId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        eventType: 'track',
      });
    } catch (e) {
      console.error('GPS background insert error:', e);
    }
  }
  const lastLoc = data.locations[data.locations.length - 1];
  useLocationStore.getState().setPosition(lastLoc.coords);
  useLocationStore.getState().incrementTrackPoints();
});

export async function requestPermissions() {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  let bgStatus = 'denied';
  if (fgStatus === 'granted') {
    const bg = await Location.requestBackgroundPermissionsAsync();
    bgStatus = bg.status;
  }
  const overall = fgStatus === 'granted' ? (bgStatus === 'granted' ? 'granted' : 'foreground_only') : 'denied';
  useLocationStore.getState().setPermission(overall);
  return { foreground: fgStatus, background: bgStatus };
}

export async function startTracking(driverId, routeId) {
  if (!useSettingsStore.getState().gpsTrackingEnabled) return;

  const perms = await requestPermissions();
  if (perms.foreground !== 'granted') {
    Alert.alert(
      'GPS-трекинг',
      'Для отслеживания маршрута необходимо разрешить доступ к геолокации.',
    );
    return;
  }

  const { gpsTrackingInterval, gpsTrackingDistance } = useSettingsStore.getState();

  // Record route_start event
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await insertGpsTrack({
      driverId,
      routeId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      eventType: 'route_start',
    });
    useLocationStore.getState().setPosition(pos.coords);
  } catch (e) {
    console.error('GPS start position error:', e);
  }

  useLocationStore.getState().setRoute(routeId, driverId);

  // Try background tracking first
  if (perms.background === 'granted') {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_CONFIG.BACKGROUND_TASK_NAME);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(GPS_CONFIG.BACKGROUND_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: gpsTrackingInterval * 1000,
        distanceInterval: gpsTrackingDistance,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'GPS-трекинг',
          notificationBody: 'Отслеживание маршрута активно',
        },
      });
    }
  } else {
    // Foreground-only fallback
    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: gpsTrackingInterval * 1000,
        distanceInterval: gpsTrackingDistance,
      },
      async (loc) => {
        const state = useLocationStore.getState();
        if (!state.driverId) return;
        try {
          await insertGpsTrack({
            driverId: state.driverId,
            routeId: state.routeId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            speed: loc.coords.speed,
            heading: loc.coords.heading,
            eventType: 'track',
          });
        } catch (e) {
          console.error('GPS watch insert error:', e);
        }
        state.setPosition(loc.coords);
        state.incrementTrackPoints();
      },
    );
  }

  useLocationStore.getState().setTracking(true);
}

export async function stopTracking() {
  const { driverId, routeId, isTracking } = useLocationStore.getState();

  if (!isTracking) return;

  // Record route_end event
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (driverId) {
      await insertGpsTrack({
        driverId,
        routeId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        eventType: 'route_end',
      });
    }
  } catch (e) {
    console.error('GPS stop position error:', e);
  }

  // Stop background task
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_CONFIG.BACKGROUND_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GPS_CONFIG.BACKGROUND_TASK_NAME);
    }
  } catch (e) {
    console.error('GPS stop background error:', e);
  }

  // Stop foreground watch
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }

  useLocationStore.getState().reset();
}

export async function recordVisitLocation(driverId, routeId, pointId, eventType) {
  if (!useSettingsStore.getState().gpsTrackingEnabled) return;

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await insertGpsTrack({
      driverId,
      routeId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      eventType,
      routePointId: pointId,
    });

    if (eventType === 'visit_start') {
      await updateRoutePointCoords(pointId, {
        actual_arrival_lat: pos.coords.latitude,
        actual_arrival_lon: pos.coords.longitude,
      });
    } else if (eventType === 'visit_end') {
      await updateRoutePointCoords(pointId, {
        actual_departure_lat: pos.coords.latitude,
        actual_departure_lon: pos.coords.longitude,
      });
    }
  } catch (e) {
    console.error('GPS visit location error:', e);
  }
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
