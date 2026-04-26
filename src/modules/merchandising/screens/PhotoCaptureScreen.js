import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';
import useAuditStore from '../store/auditStore';
import useSettingsStore from '../../../store/settingsStore';
import { persistCapturedPhoto } from '../services/photoService';
import QualityGateOverlay from '../components/QualityGateOverlay';

export default function PhotoCaptureScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { visitId, questionId, photoType } = route.params || {};

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [lastQg, setLastQg] = useState(null);
  const { template, addPhotoToQuestion } = useAuditStore();
  const templateVersion = template?.version || null;
  const bypass = useSettingsStore((s) => s.merchTestBypass);

  useEffect(() => {
    if (!bypass && !permission?.granted && permission?.canAskAgain) requestPermission();
  }, [bypass, permission, requestPermission]);

  const persistFromUri = async (capturedUri, capturedExif) => {
    const geoCoords = await safeCurrentPosition();
    const result = await persistCapturedPhoto({
      capturedUri,
      visitId,
      questionId,
      photoType,
      templateVersion,
      geoCoords,
      capturedExif,
    });
    setLastQg(result.qg);

    if (result.qg && result.qg.passed === false) {
      Alert.alert(
        t('merchAudit.qg.rejectedTitle'),
        result.qg.reasons.map((r) => t(r.label)).join('\n')
          + '\n\n' + t('merchAudit.qg.retakeHint'),
        [
          {
            text: t('merchAudit.qg.keepAnyway'),
            onPress: () => addPhotoToQuestion(questionId, photoRowFromResult(result, visitId, questionId, photoType)),
          },
          { text: t('merchAudit.qg.retake'), style: 'cancel' },
        ],
      );
    } else {
      addPhotoToQuestion(questionId, photoRowFromResult(result, visitId, questionId, photoType));
    }
  };

  const handleCapture = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, exif: true, skipProcessing: false });
      await persistFromUri(photo.uri, photo.exif);
    } catch (e) {
      if (e.code === 'photo_reuse_detected') {
        Alert.alert(t('merchAudit.qg.reuseTitle'), t('merchAudit.qg.reuseMsg'));
      } else {
        Alert.alert(t('common.error'), e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  // Bypass mode (simulator): pick from photo library so the audit flow can be exercised
  // without a real camera. iOS Simulator ships with sample photos in the Photos app.
  const handlePickFromLibrary = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('merchAudit.qg.cameraNeeded'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        exif: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      await persistFromUri(result.assets[0].uri, result.assets[0].exif);
    } catch (e) {
      if (e.code === 'photo_reuse_detected') {
        Alert.alert(t('merchAudit.qg.reuseTitle'), t('merchAudit.qg.reuseMsg'));
      } else {
        Alert.alert(t('common.error'), e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!permission && !bypass) {
    return <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  // Bypass mode (simulator/emulator): never open the live camera — the simulator either
  // shows a checkered/black placeholder that prevents real testing, or worse, a "granted"
  // permission with no working capture path. Show a dedicated picker screen instead.
  if (bypass) {
    return (
      <View style={styles.permissionBox}>
        <Ionicons name="images-outline" size={48} color={COLORS.primary} />
        <Text style={styles.permissionTitle}>{t('merchAudit.qg.bypassTitle')}</Text>
        <Text style={styles.permissionText}>{t('merchAudit.qg.bypassPickHint')}</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={handlePickFromLibrary} disabled={busy}>
          {busy ? <ActivityIndicator color={COLORS.white} /> : (
            <View style={styles.permissionBtnInner}>
              <Ionicons name="images" size={18} color={COLORS.white} />
              <Text style={styles.permissionBtnText}>{t('merchAudit.qg.pickFromLibrary')}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.permissionCancel}>
          <Text style={styles.permissionCancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.permissionBox}>
        <Ionicons name="camera-outline" size={48} color={COLORS.tabBarInactive} />
        <Text style={styles.permissionText}>{t('merchAudit.qg.cameraNeeded')}</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>{t('merchAudit.qg.grantPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" enableTorch={false}>
        <QualityGateOverlay photoType={photoType} />
      </CameraView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footerBtn} hitSlop={8}>
          <Ionicons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCapture} disabled={busy} style={styles.shutter}>
          {busy ? <ActivityIndicator color={COLORS.primary} /> : <View style={styles.shutterInner} />}
        </TouchableOpacity>

        <View style={styles.footerBtn}>
          {lastQg?.passed != null && (
            <Ionicons
              name={lastQg.passed ? 'checkmark-circle' : 'warning'}
              size={28}
              color={lastQg.passed ? COLORS.success : COLORS.accent}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function photoRowFromResult(result, visitId, questionId, photoType) {
  return {
    id: result.id,
    visit_report_id: visitId,
    question_id: questionId,
    photo_type: photoType || null,
    uri_original: result.uri_original,
    uri_compressed: result.uri_compressed,
    qg_passed: result.qg?.passed === true ? 1 : result.qg?.passed === false ? 0 : null,
    upload_status: 'pending',
    hash_sha256: result.hash_sha256,
  };
}

async function safeCurrentPosition() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy_m: pos.coords.accuracy };
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.background },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12, textAlign: 'center' },
  permissionText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginVertical: 12 },
  permissionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8, minWidth: 220, alignItems: 'center' },
  permissionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  permissionBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  permissionCancel: { marginTop: 16, padding: 8 },
  permissionCancelText: { color: COLORS.textSecondary, fontSize: 14 },
  camera: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#000', padding: 24 },
  footerBtn: { width: 48, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: COLORS.accent },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white },
});
