import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSyncConflicts } from '../../database';

export default function ConflictResolutionScreen() {
  const { t } = useTranslation();
  const [conflicts, setConflicts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getSyncConflicts();
      setConflicts(data);
    } catch (e) { console.error('ConflictResolution load:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const handleResolve = (conflict, choice) => {
    const label = choice === 'server' ? t('conflictResolution.serverVersion') : t('conflictResolution.mobileVersion');
    Alert.alert(
      t('conflictResolution.resolveConflict'),
      t('conflictResolution.keepVersion', { version: label }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
            Alert.alert(t('common.done'), t('conflictResolution.conflictResolved'));
          },
        },
      ]
    );
  };

  const renderConflict = ({ item }) => {
    return (
      <View style={styles.card}>
        {/* Заголовок */}
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Ionicons name="git-compare" size={16} color={COLORS.accent} />
            <Text style={styles.typeText}>{t('conflictResolution.entityTypes.' + item.entity_type) || item.entity_type}</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        </View>

        <Text style={styles.cardDescription}>
          ID: {item.entity_id?.slice(0, 8)}... • {item.description || t('conflictResolution.syncConflict')}
        </Text>

        {/* Сравнение */}
        <View style={styles.compareRow}>
          {/* Серверная версия */}
          <View style={styles.compareBox}>
            <View style={styles.compareHeader}>
              <Ionicons name="cloud" size={14} color={COLORS.secondary} />
              <Text style={styles.compareTitle}>{t('conflictResolution.server')}</Text>
            </View>
            <Text style={styles.compareValue} numberOfLines={3}>
              {item.server_value || t('conflictResolution.noData')}
            </Text>
            <Text style={styles.compareDate}>{formatDate(item.server_updated_at)}</Text>
          </View>

          <View style={styles.compareDivider}>
            <Ionicons name="swap-horizontal" size={18} color={COLORS.tabBarInactive} />
          </View>

          {/* Мобильная версия */}
          <View style={styles.compareBox}>
            <View style={styles.compareHeader}>
              <Ionicons name="phone-portrait" size={14} color={COLORS.info} />
              <Text style={styles.compareTitle}>{t('conflictResolution.device')}</Text>
            </View>
            <Text style={styles.compareValue} numberOfLines={3}>
              {item.mobile_value || t('conflictResolution.noData')}
            </Text>
            <Text style={styles.compareDate}>{formatDate(item.mobile_updated_at)}</Text>
          </View>
        </View>

        {/* Кнопки принятия */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.serverBtn]}
            onPress={() => handleResolve(item, 'server')}
          >
            <Ionicons name="cloud-done" size={16} color={COLORS.secondary} />
            <Text style={[styles.actionText, { color: COLORS.secondary }]}>{t('conflictResolution.acceptServer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.mobileBtn]}
            onPress={() => handleResolve(item, 'mobile')}
          >
            <Ionicons name="phone-portrait" size={16} color={COLORS.info} />
            <Text style={[styles.actionText, { color: COLORS.info }]}>{t('conflictResolution.acceptMobile')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={conflicts}
      keyExtractor={(item) => item.id}
      renderItem={renderConflict}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
      ListHeaderComponent={
        conflicts.length > 0 ? (
          <View style={styles.headerBanner}>
            <Ionicons name="information-circle" size={18} color={COLORS.info} />
            <Text style={styles.headerText}>
              {t('conflictResolution.conflictsToResolve', { count: conflicts.length })}
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
          <Text style={styles.emptyText}>{t('conflictResolution.noConflicts')}</Text>
          <Text style={styles.emptySubtext}>{t('conflictResolution.allSynced')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 32 },
  headerBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.info + '10', padding: 12, borderRadius: 10, marginBottom: 12 },
  headerText: { fontSize: 14, fontWeight: '500', color: COLORS.info },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  cardDate: { fontSize: 11, color: COLORS.tabBarInactive },
  cardDescription: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  compareRow: { flexDirection: 'row', alignItems: 'stretch', gap: 0, marginBottom: 12 },
  compareBox: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, padding: 10 },
  compareHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  compareTitle: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  compareValue: { fontSize: 12, color: COLORS.text, lineHeight: 18 },
  compareDate: { fontSize: 10, color: COLORS.tabBarInactive, marginTop: 4 },
  compareDivider: { justifyContent: 'center', paddingHorizontal: 6 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  serverBtn: { borderColor: COLORS.secondary + '40', backgroundColor: COLORS.secondary + '08' },
  mobileBtn: { borderColor: COLORS.info + '40', backgroundColor: COLORS.info + '08' },
  actionText: { fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
