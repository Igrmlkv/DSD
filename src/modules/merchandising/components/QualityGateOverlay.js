import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';

// Translucent overlay shown over the camera preview with framing hints.
// Spec §4.4: rect frame, distance indicator, tilt, exposure cue.
// Lightweight: actual measurements happen on captured photo (qualityGate.runQualityGate).
export default function QualityGateOverlay({ photoType }) {
  const { t } = useTranslation();
  const hintKey = photoType ? `merchAudit.qg.hint.${photoType}` : 'merchAudit.qg.hint.default';
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.frame} />
      <View style={styles.hintBox}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.white} />
        <Text style={styles.hintText}>{t(hintKey, { defaultValue: t('merchAudit.qg.hint.default') })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '85%', height: '60%', borderWidth: 2, borderColor: COLORS.accent, borderRadius: 12 },
  hintBox: { position: 'absolute', bottom: 24, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  hintText: { color: COLORS.white, fontSize: 12, flex: 1 },
});
