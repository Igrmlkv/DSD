import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { LOADING_TRIP_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getLoadingTrips, getLoadingTripItems, updateLoadingTripItem, updateLoadingTripStatus,
  searchProductByBarcode,
} from '../../database';

export default function LoadingTripScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const trips = await getLoadingTrips(user.id);
      if (trips.length > 0) {
        const latest = trips[0];
        setTrip(latest);
        const tripItems = await getLoadingTripItems(latest.id);
        setItems(tripItems);
      }
    } catch (e) { console.error('LoadingTrip load:', e); }
  }, [user.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const isVerified = trip?.status === LOADING_TRIP_STATUS.VERIFIED;

  // --- Qty adjustment ---
  const adjustQty = async (item, delta) => {
    if (isVerified) return;
    const newQty = Math.max(0, item.actual_quantity + delta);
    const scanned = newQty > 0;
    await updateLoadingTripItem(item.id, newQty, scanned);
    setItems((prev) => prev.map((i) =>
      i.id === item.id ? { ...i, actual_quantity: newQty, scanned: scanned ? 1 : 0 } : i
    ));
  };

  // --- Barcode scanner ---
  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t('loadingTrip.cameraAccess'), t('loadingTrip.cameraAccessMsg'));
        return;
      }
    }
    scanLockRef.current = false;
    setShowScanner(true);
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const barcode = data.trim();
    // Find item in current trip by barcode
    const matchItem = items.find((i) => i.barcode === barcode);

    if (matchItem) {
      if (matchItem.scanned && matchItem.actual_quantity >= matchItem.planned_quantity) {
        Alert.alert(t('loadingTrip.alreadyScanned'), t('loadingTrip.planCompleted', { name: matchItem.product_name }), [
          { text: 'OK', onPress: () => { scanLockRef.current = false; } },
        ]);
        return;
      }
      const newQty = Math.min(matchItem.actual_quantity + 1, matchItem.planned_quantity);
      await updateLoadingTripItem(matchItem.id, newQty, true);
      setItems((prev) => prev.map((i) =>
        i.id === matchItem.id ? { ...i, actual_quantity: newQty, scanned: 1 } : i
      ));
      Alert.alert(t('loadingTrip.found'), t('loadingTrip.itemScanned', { name: matchItem.product_name, qty: newQty, planned: matchItem.planned_quantity }), [
        { text: t('loadingTrip.continueScanning'), onPress: () => { scanLockRef.current = false; } },
        { text: t('common.close'), onPress: () => setShowScanner(false) },
      ]);
    } else {
      // Try to find product in DB
      try {
        const product = await searchProductByBarcode(barcode);
        if (product) {
          Alert.alert(t('loadingTrip.notInTask'), t('loadingTrip.notInTaskMsg', { name: product.name, sku: product.sku }), [
            { text: 'OK', onPress: () => { scanLockRef.current = false; } },
          ]);
        } else {
          Alert.alert(t('loadingTrip.notFound'), t('loadingTrip.barcodeNotFound', { barcode }), [
            { text: 'OK', onPress: () => { scanLockRef.current = false; } },
          ]);
        }
      } catch {
        scanLockRef.current = false;
      }
    }
  };

  // --- Finalize ---
  const handleVerify = () => {
    const unscanned = items.filter((i) => !i.scanned);
    if (unscanned.length > 0) {
      Alert.alert(t('loadingTrip.notAllScanned'), t('loadingTrip.notAllScannedMsg', { count: unscanned.length }), [
        { text: t('common.no'), style: 'cancel' },
        { text: t('routeList.complete'), onPress: finalizeTrip },
      ]);
    } else {
      const mismatch = items.filter((i) => i.actual_quantity !== i.planned_quantity);
      if (mismatch.length > 0) {
        Alert.alert(t('loadingTrip.discrepancies'), t('loadingTrip.discrepanciesMsg', { count: mismatch.length }), [
          { text: t('common.no'), style: 'cancel' },
          { text: t('routeList.complete'), onPress: finalizeTrip },
        ]);
      } else {
        finalizeTrip();
      }
    }
  };

  const finalizeTrip = async () => {
    if (trip) {
      await updateLoadingTripStatus(trip.id, LOADING_TRIP_STATUS.VERIFIED);
      Alert.alert(t('common.done'), t('loadingTrip.tripConfirmed'));
      await loadData();
    }
  };

  const scannedCount = items.filter((i) => i.scanned).length;
  const totalPlanned = items.reduce((s, i) => s + i.planned_quantity, 0);
  const totalActual = items.reduce((s, i) => s + i.actual_quantity, 0);

  const renderItem = ({ item }) => {
    const isDiff = item.actual_quantity !== item.planned_quantity;
    const isFull = item.actual_quantity >= item.planned_quantity;
    return (
      <View style={[styles.itemCard, item.scanned && styles.itemScanned, isDiff && item.scanned && styles.itemMismatch]}>
        <View style={styles.checkBox}>
          {item.scanned ? (
            <Ionicons name={isFull ? 'checkmark-circle' : 'alert-circle'} size={26} color={isFull ? COLORS.success : COLORS.accent} />
          ) : (
            <Ionicons name="ellipse-outline" size={26} color={COLORS.border} />
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
          <Text style={styles.itemSku}>{item.sku} • {item.volume}</Text>
          {item.barcode && <Text style={styles.itemBarcode}>{t('loadingTrip.barcodeLabel')}: {item.barcode}</Text>}
        </View>
        {isVerified ? (
          <View style={styles.qtyBox}>
            <Text style={[styles.qtyValue, isDiff && styles.qtyDiff]}>{item.actual_quantity}/{item.planned_quantity}</Text>
            <Text style={styles.qtyLabel}>{t('common.pcs')}</Text>
          </View>
        ) : (
          <View style={styles.qtyControl}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(item, -1)}>
              <Ionicons name="remove" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.qtyCenter}>
              <Text style={[styles.qtyValue, isDiff && styles.qtyDiff]}>{item.actual_quantity}</Text>
              <Text style={styles.qtyPlanned}>/ {item.planned_quantity}</Text>
            </View>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(item, 1)}>
              <Ionicons name="add" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {trip && (
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{trip.vehicle_model} • {trip.plate_number}</Text>
            <Text style={styles.headerSub}>
              {t('loadingTrip.headerSub', { scanned: scannedCount, total: items.length, actual: totalActual, planned: totalPlanned })}
            </Text>
          </View>
          <View style={[styles.statusBadge, isVerified && styles.statusDone]}>
            <Text style={[styles.statusText, isVerified && styles.statusTextDone]}>
              {isVerified ? t('loadingTrip.verified') : trip.status === LOADING_TRIP_STATUS.LOADED ? t('loadingTrip.loaded') : t('loadingTrip.loadingLabel')}
            </Text>
          </View>
        </View>
      )}

      {/* Read-only banner */}
      {isVerified && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyText}>{t('loadingTrip.completedViewOnly')}</Text>
        </View>
      )}

      {/* Progress */}
      {items.length > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${(scannedCount / items.length) * 100}%` }]} />
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('loadingTrip.noTask')}</Text>
          </View>
        }
      />

      {items.length > 0 && !isVerified && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
            <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
            <Text style={styles.scanBtnText}>{t('loadingTrip.scan')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
            <Text style={styles.verifyText}>{t('loadingTrip.completeLoading')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>{t('loadingTrip.scanningBarcode')}</Text>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scannerClose}>
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a'],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
          </View>
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerHint}>{t('loadingTrip.scanHint')}</Text>
            <Text style={styles.scannerCount}>
              {t('loadingTrip.scannedCount', { scanned: scannedCount, total: items.length })}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.accent + '20' },
  statusDone: { backgroundColor: COLORS.success + '20' },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  statusTextDone: { color: COLORS.success },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, padding: 10,
  },
  readOnlyText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  progressWrap: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.white },
  progressBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: COLORS.success, borderRadius: 2 },
  list: { padding: 12, paddingBottom: 100 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12, gap: 10, marginBottom: 6,
  },
  itemScanned: { backgroundColor: COLORS.success + '08' },
  itemMismatch: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  checkBox: { width: 30 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemBarcode: { fontSize: 10, color: COLORS.info, marginTop: 2 },
  qtyBox: { alignItems: 'center' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyCenter: { alignItems: 'center', minWidth: 40 },
  qtyValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  qtyPlanned: { fontSize: 10, color: COLORS.textSecondary },
  qtyDiff: { color: COLORS.error },
  qtyLabel: { fontSize: 10, color: COLORS.textSecondary },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, backgroundColor: COLORS.white, padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  scanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, padding: 14,
  },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  verifyBtn: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  verifyText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  // Scanner modal
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.7)',
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  scannerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.white },
  scannerClose: { padding: 4 },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
  },
  scannerFrame: {
    width: 260, height: 160, borderWidth: 2, borderColor: COLORS.white,
    borderRadius: 12, backgroundColor: 'transparent',
  },
  scannerFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 50, paddingTop: 16, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scannerHint: { fontSize: 15, color: COLORS.white, fontWeight: '500' },
  scannerCount: { fontSize: 13, color: '#aaa', marginTop: 6 },
});
