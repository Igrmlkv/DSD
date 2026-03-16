import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { createVisitReport, getVisitReportByPoint } from '../../database';
import useAuthStore from '../../store/authStore';

const CHECKLIST_KEYS = [
  'shelfAvailability',
  'priceTagsCorrect',
  'posPlacement',
  'facingCompliance',
  'stockLevel',
  'expiryDatesChecked',
  'competitorActivity',
  'cleanlinessDisplay',
];

export default function VisitReportScreen({ route }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { customerId, customerName, pointId, routeId } = route.params || {};

  const [checklist, setChecklist] = useState(
    Object.fromEntries(CHECKLIST_KEYS.map((k) => [k, false]))
  );
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [reportDate, setReportDate] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          if (!pointId) { setLoading(false); return; }
          const existing = await getVisitReportByPoint(pointId);
          if (existing && active) {
            setChecklist(existing.checklist || {});
            setNotes(existing.notes || '');
            setPhotos(existing.photos || []);
            setReportDate(existing.visit_date);
            if (existing.status === 'submitted') {
              setReadOnly(true);
            }
          }
        } catch (e) {
          console.warn('Failed to load visit report:', e);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [pointId])
  );

  function toggleItem(key) {
    if (readOnly) return;
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function pickPhoto() {
    if (readOnly) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', t('visitReport.cameraPermission'));
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (e) {
      Alert.alert('', t('visitReport.cameraUnavailable'));
      return;
    }
  }

  async function pickFromGallery() {
    if (readOnly) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', t('visitReport.galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function removePhoto(idx) {
    if (readOnly) return;
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await createVisitReport({
        routePointId: pointId,
        routeId,
        customerId,
        userId: user?.id,
        checklist,
        notes,
        photos,
      });
      Alert.alert(t('common.done'), t('visitReport.saved'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Customer */}
      <View style={styles.customerBar}>
        <Ionicons name="storefront" size={20} color={COLORS.primary} />
        <Text style={styles.customerName} numberOfLines={1}>{customerName || '—'}</Text>
      </View>

      {/* Read-only banner */}
      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyText}>
            {t('visitReport.readOnly')}{reportDate ? ` — ${new Date(reportDate).toLocaleString()}` : ''}
          </Text>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(completedCount / CHECKLIST_KEYS.length) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {t('visitReport.progress', { done: completedCount, total: CHECKLIST_KEYS.length })}
      </Text>

      {/* Checklist */}
      <Text style={styles.sectionTitle}>{t('visitReport.checklistTitle')}</Text>
      {CHECKLIST_KEYS.map((key) => (
        <TouchableOpacity key={key} style={styles.checkRow} onPress={() => toggleItem(key)} disabled={readOnly}>
          <View style={[styles.checkbox, checklist[key] && styles.checkboxActive]}>
            {checklist[key] && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
          </View>
          <Text style={[styles.checkLabel, checklist[key] && styles.checkLabelDone]}>
            {t(`visitReport.items.${key}`)}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Notes */}
      <Text style={styles.sectionTitle}>{t('visitReport.notesTitle')}</Text>
      <TextInput
        style={[styles.notesInput, readOnly && styles.notesReadOnly]}
        placeholder={t('visitReport.notesPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!readOnly}
      />

      {/* Photos */}
      <Text style={styles.sectionTitle}>{t('visitReport.photosTitle')} ({photos.length})</Text>
      {!readOnly && (
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
            <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
            <Text style={styles.photoBtnText}>{t('visitReport.takePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={22} color={COLORS.primary} />
            <Text style={styles.photoBtnText}>{t('visitReport.fromGallery')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photoThumb} />
              {!readOnly && (
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                  <Ionicons name="close-circle" size={22} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Save */}
      {!readOnly && (
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={COLORS.white} />
              <Text style={styles.saveBtnText}>{t('visitReport.save')}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  customerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 12,
  },
  customerName: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  readOnlyText: { fontSize: 13, color: COLORS.white, flex: 1 },
  progressBar: {
    height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 10, padding: 14, marginBottom: 6,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel: { fontSize: 14, color: COLORS.text, flex: 1 },
  checkLabelDone: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  notesInput: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, minHeight: 100,
  },
  notesReadOnly: { backgroundColor: COLORS.background, color: COLORS.textSecondary },
  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed',
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  photoScroll: { marginBottom: 16 },
  photoWrapper: { marginRight: 10, position: 'relative' },
  photoThumb: { width: 100, height: 100, borderRadius: 10 },
  photoRemove: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.white, borderRadius: 11 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, marginTop: 20,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
