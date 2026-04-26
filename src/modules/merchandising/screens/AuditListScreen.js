import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';
import { SCREEN_NAMES } from '../../../constants/screens';
import useAuthStore from '../../../store/authStore';
import { listAuditVisitsByUser, getRoutesByDate, getRoutePoints, getCustomerById, getAllCustomers } from '../../../database';
import { checkAuditPreconditions } from '../services/preconditions';
import { startAudit } from '../services/auditService';
import useAuditStore from '../store/auditStore';
import useSettingsStore from '../../../store/settingsStore';
import { VISIT_AUDIT_STATUS } from '../../../constants/merchAudit';
import { logError } from '../../../services/loggerService';

// Two sections:
//   1. "Доступные ТТ маршрута" — points where the merchandiser can start an audit
//   2. "Мои аудиты" — recent visits (drafts and submitted)
export default function AuditListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const userId = useAuthStore((s) => s.user?.id);
  const [available, setAvailable] = useState([]);
  const [recent, setRecent] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const bypass = useSettingsStore.getState().merchTestBypass;
    const today = new Date().toISOString().slice(0, 10);

    try {
      const [visits, routes] = await Promise.all([
        listAuditVisitsByUser(userId, 30),
        getRoutesByDate(today, userId),
      ]);
      setRecent(visits);

      const pointsArrays = await Promise.all(
        (routes || []).map((r) => getRoutePoints(r.id).then((ps) => (ps || []).map((p) => ({ ...p, route_id: r.id }))))
      );
      const flat = pointsArrays.flat().filter((p) => bypass || p.status === 'in_progress');
      const customers = await Promise.all(
        flat.map((p) => (p.customer_id ? getCustomerById(p.customer_id) : Promise.resolve(null)))
      );
      const points = flat.map((p, i) => ({
        ...p,
        customer_name: customers[i]?.name,
        address: customers[i]?.address,
      }));

      // Bypass + empty routes → synthesise points from first 5 seeded customers so QA isn't blocked.
      if (bypass && points.length === 0) {
        const allCustomers = await getAllCustomers();
        for (const c of (allCustomers || []).slice(0, 5)) {
          points.push({
            id: `fake-rp-${c.id}`,
            route_id: null,
            customer_id: c.id,
            status: 'in_progress',
            latitude: c.latitude,
            longitude: c.longitude,
            customer_name: c.name,
            address: c.address,
          });
        }
      }
      setAvailable(points);
    } catch {
      setAvailable([]);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleStart = async (point) => {
    try {
      const pre = await checkAuditPreconditions({
        routePoint: point,
        customerId: point.customer_id,
      });
      if (!pre.ok) {
        Alert.alert(
          t('merchAudit.precond.title'),
          pre.reasons.map((r) => t(r.label, r.extra || {})).join('\n'),
        );
        return;
      }
      const ctx = await startAudit({
        outletType: pre.outletType,
        customer: pre.customer,
        routePoint: point,
      });
      useAuditStore.getState().startAudit(ctx);
      navigation.navigate(SCREEN_NAMES.MERCH_AUDIT, { visitId: ctx.visitId });
    } catch (e) {
      logError('AuditListScreen', e.message);
      Alert.alert(t('common.error'), e.message);
    }
  };

  const renderAvailable = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleStart(item)}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle}>{item.customer_name || item.customer_id}</Text>
        <Text style={styles.cardSub}>{item.address || ''}</Text>
      </View>
      <Ionicons name="play-circle" size={28} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const renderRecent = ({ item }) => {
    const isDraft = item.status === VISIT_AUDIT_STATUS.DRAFT;
    const pssText = item.pss != null ? `PSS ${Math.round(item.pss)}` : '—';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (isDraft) {
            useAuditStore.getState().clear();
            navigation.navigate(SCREEN_NAMES.MERCH_AUDIT, { visitId: item.id, resume: true });
          } else {
            navigation.navigate(SCREEN_NAMES.MERCH_KPI_RESULT, { visitId: item.id });
          }
        }}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.customer_name || item.customer_id || '—'}</Text>
          <Text style={styles.cardSub}>{new Date(item.visit_date).toLocaleString('ru-RU')}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.statusBadge, isDraft ? styles.statusDraft : styles.statusDone]}>
            {isDraft ? t('merchAudit.list.draft') : pssText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={[]}
      ListHeaderComponent={
        <View style={styles.content}>
          <Text style={styles.section}>{t('merchAudit.list.availableTitle')}</Text>
          {available.length === 0 ? (
            <Text style={styles.empty}>{t('merchAudit.list.availableEmpty')}</Text>
          ) : (
            available.map((p) => <View key={p.id}>{renderAvailable({ item: p })}</View>)
          )}
          <Text style={[styles.section, { marginTop: 24 }]}>{t('merchAudit.list.recentTitle')}</Text>
          {recent.length === 0 ? (
            <Text style={styles.empty}>{t('merchAudit.list.recentEmpty')}</Text>
          ) : (
            recent.map((v) => <View key={v.id}>{renderRecent({ item: v })}</View>)
          )}
        </View>
      }
      renderItem={() => null}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          colors={[COLORS.primary]}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  section: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { fontSize: 13, color: COLORS.textSecondary, padding: 16, textAlign: 'center' },
  statusBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  statusDraft: { backgroundColor: COLORS.accent + '20', color: COLORS.accent },
  statusDone: { backgroundColor: COLORS.success + '20', color: COLORS.success },
});
