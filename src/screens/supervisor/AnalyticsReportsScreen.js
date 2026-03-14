import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSupervisorStats, getExpeditorProgress, getCustomerDebt } from '../../database';

export default function AnalyticsReportsScreen() {
  const { t } = useTranslation();

  const PERIODS = [
    { key: 'day', label: t('analyticsScreen.periods.day') },
    { key: 'week', label: t('analyticsScreen.periods.week') },
    { key: 'month', label: t('analyticsScreen.periods.month') },
  ];
  const [period, setPeriod] = useState('day');
  const [stats, setStats] = useState(null);
  const [expeditors, setExpeditors] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, exp, debt] = await Promise.all([
        getSupervisorStats(),
        getExpeditorProgress(),
        getCustomerDebt(),
      ]);
      setStats(s);
      setExpeditors(exp);
      setDebtors(debt.slice(0, 10)); // Топ-10
    } catch (e) { console.error('Analytics load:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const formatMoney = (v) => (v || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
    >
      {/* Период */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI */}
      {stats && (
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats.completedPoints}/{stats.totalPoints}</Text>
            <Text style={styles.kpiLabel}>{t('analyticsScreen.pointsVisited')}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{formatMoney(stats.totalPayments)}</Text>
            <Text style={styles.kpiLabel}>{t('analyticsScreen.paymentsToday')}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats.pendingReturns}</Text>
            <Text style={styles.kpiLabel}>{t('analyticsScreen.pendingApproval')}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{formatMoney(stats.pendingReturnsAmount)}</Text>
            <Text style={styles.kpiLabel}>{t('analyticsScreen.returnsAmount')}</Text>
          </View>
        </View>
      )}

      {/* Производительность экспедиторов */}
      <Text style={styles.sectionTitle}>{t('analyticsScreen.expeditorPerformance')}</Text>
      {expeditors.map((exp) => {
        const pct = exp.total_points > 0 ? Math.round((exp.completed_points / exp.total_points) * 100) : 0;
        return (
          <View key={exp.id + exp.route_id} style={styles.expRow}>
            <Text style={styles.expName}>{exp.full_name}</Text>
            <View style={styles.expBar}>
              <View style={[styles.expFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.expPct}>{pct}%</Text>
          </View>
        );
      })}

      {/* Топ дебиторов */}
      <Text style={styles.sectionTitle}>{t('analyticsScreen.topDebtors')}</Text>
      {debtors.map((d, i) => (
        <View key={d.id} style={styles.debtRow}>
          <Text style={styles.debtRank}>{i + 1}</Text>
          <View style={styles.debtInfo}>
            <Text style={styles.debtName} numberOfLines={1}>{d.name}</Text>
            <Text style={styles.debtCity}>{d.city}</Text>
          </View>
          <Text style={styles.debtAmount}>{formatMoney(d.debt_amount)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  periodActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  periodTextActive: { color: COLORS.white },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  kpiValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  expName: { width: 120, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  expBar: { flex: 1, height: 8, backgroundColor: COLORS.border + '60', borderRadius: 4 },
  expFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  expPct: { width: 36, fontSize: 13, fontWeight: '600', color: COLORS.primary, textAlign: 'right' },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 4 },
  debtRank: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  debtCity: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  debtAmount: { fontSize: 15, fontWeight: '700', color: COLORS.error },
});
