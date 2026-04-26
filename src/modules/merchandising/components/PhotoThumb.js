import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

// Thumbnail with QG status badge and delete affordance.
// QG state: 1 → green check, 0 → orange warning, null → grey clock (server-side QC pending).
export default function PhotoThumb({ photo, onPress, onRemove }) {
  const qg = photo.qg_passed;
  const badgeColor = qg === 1 ? COLORS.success : qg === 0 ? COLORS.accent : COLORS.tabBarInactive;
  const badgeIcon = qg === 1 ? 'checkmark' : qg === 0 ? 'warning' : 'time-outline';
  const upload = photo.upload_status;
  const uri = photo.uri_compressed || photo.uri_original;
  return (
    <TouchableOpacity style={styles.thumb} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri }} style={styles.image} />
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Ionicons name={badgeIcon} size={10} color={COLORS.white} />
      </View>
      {upload === 'failed' && (
        <View style={[styles.badge, styles.badgeBottom, { backgroundColor: COLORS.error }]}>
          <Ionicons name="cloud-offline-outline" size={10} color={COLORS.white} />
        </View>
      )}
      {upload === 'done' && (
        <View style={[styles.badge, styles.badgeBottom, { backgroundColor: COLORS.success }]}>
          <Ionicons name="cloud-done-outline" size={10} color={COLORS.white} />
        </View>
      )}
      {onRemove && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 96, height: 96, borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: COLORS.background },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 4, left: 4, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  badgeBottom: { top: undefined, bottom: 4, left: 4 },
  removeBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: COLORS.white, borderRadius: 12 },
});
