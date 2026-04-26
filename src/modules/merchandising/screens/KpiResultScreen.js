import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';
import { SCREEN_NAMES } from '../../../constants/screens';
import { getAuditVisit, listKpiResults } from '../../../database';
import { KPI_CODES, ANSWER_SOURCES, ML_STATUSES } from '../../../constants/merchAudit';
import { returnToVisit } from '../navigation/returnToVisit';

const STATUS_COLOR = {
  green: COLORS.success,
  yellow: COLORS.accent,
  red: COLORS.error,
};

function pssSubtitleKey(visit, pssRow) {
  if (visit?.ml_status === ML_STATUSES.PENDING_ML) return 'merchAudit.kpi.pendingMl';
  if (pssRow?.source === ANSWER_SOURCES.SURVEY) return 'merchAudit.kpi.localPreview';
  if (pssRow?.source) return 'merchAudit.kpi.serverComputed';
  return 'merchAudit.kpi.notYet';
}

// Renders KPI results for a submitted visit.
// In dual mode, local-source rows are present immediately; server-source rows
// arrive after the next sync pull and replace the local view (we prefer non-survey source).
export default function KpiResultScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { visitId } = route.params || {};
  const [visit, setVisit] = useState(null);
  const [results, setResults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchedAtRef = useRef(0);

  // Throttle ~5s so app foreground/background swaps don't re-fetch — `load` is also
  // called by useFocusEffect (every navigation focus). Pull-to-refresh and the
  // initial mount go through `forceLoad` to bypass the guard.
  const load = useCallback(async ({ force = false } = {}) => {
    if (!visitId) return;
    if (!force && Date.now() - lastFetchedAtRef.current < 5000) return;
    lastFetchedAtRef.current = Date.now();
    const v = await getAuditVisit(visitId);
    setVisit(v);
    const rows = await listKpiResults(visitId);
    const byCode = new Map();
    for (const r of rows) {
      const cur = byCode.get(r.kpi_code);
      if (!cur) { byCode.set(r.kpi_code, r); continue; }
      const prefServer = r.source && r.source !== ANSWER_SOURCES.SURVEY && r.created_at >= cur.created_at;
      if (prefServer) byCode.set(r.kpi_code, r);
    }
    setResults([...byCode.values()]);
  }, [visitId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pssRow = results.find((r) => r.kpi_code === KPI_CODES.PSS);
  const others = results.filter((r) => r.kpi_code !== KPI_CODES.PSS);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load({ force: true }); setRefreshing(false); }}
          colors={[COLORS.primary]}
        />
      }
    >
      <View style={styles.pssCard}>
        <Text style={styles.pssLabel}>Perfect Store Score</Text>
        <Text style={[styles.pssValue, { color: pssRow?.status ? STATUS_COLOR[pssRow.status] : COLORS.text }]}>
          {pssRow?.value != null ? Math.round(pssRow.value) : '—'}
        </Text>
        <Text style={styles.pssSub}>{t(pssSubtitleKey(visit, pssRow))}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('merchAudit.kpi.byCode')}</Text>
      <View style={styles.list}>
        {others.length === 0 && (
          <Text style={styles.empty}>{t('merchAudit.kpi.empty')}</Text>
        )}
        {others.map((r) => (
          <View key={r.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLOR[r.status] || COLORS.border }]} />
            <Text style={styles.rowCode}>{r.kpi_code}</Text>
            <Text style={styles.rowValue}>{r.value != null ? Math.round(r.value) : '—'}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => returnToVisit(navigation)}
      >
        <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        <Text style={styles.backBtnText}>{t('merchAudit.kpi.backToVisit')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  pssCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 16 },
  pssLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  pssValue: { fontSize: 56, fontWeight: '800', marginVertical: 8 },
  pssSub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  list: { backgroundColor: COLORS.white, borderRadius: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowCode: { flex: 1, fontSize: 14, color: COLORS.text },
  rowValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  empty: { padding: 16, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  backBtnText: { color: COLORS.primary, fontWeight: '600' },
});
