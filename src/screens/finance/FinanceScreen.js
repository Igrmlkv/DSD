import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomerDebt } from '../../database';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

function formatMoney(v) {
  return Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' R';
}

export default function FinanceScreen() {
  const { t } = useTranslation();
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const data = await getCustomerDebt();
      setDebtors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const totalDebt = debtors.reduce((s, d) => s + d.debt_amount, 0);
  const totalLimit = debtors.reduce((s, d) => s + d.credit_limit, 0);

  function renderDebtor({ item }) {
    const ratio = item.credit_limit > 0 ? item.debt_amount / item.credit_limit : 0;
    const barColor = ratio > 0.8 ? COLORS.error : ratio > 0.5 ? COLORS.accent : '#4CAF50';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.city}>{item.city}</Text>
          </View>
          <View style={styles.cardAmount}>
            <Text style={[styles.amount, { color: barColor }]}>{formatMoney(item.debt_amount)}</Text>
            <Text style={styles.paymentTerms}>
              {item.payment_terms === 'credit' ? t('financeScreen.credit') : t('financeScreen.cash')}
            </Text>
          </View>
        </View>
        {item.credit_limit > 0 && (
          <View style={styles.barContainer}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: barColor }]} />
            </View>
            <View style={styles.barLabels}>
              <Text style={styles.barLabel}>{t('financeScreen.used', { percent: Math.round(ratio * 100) })}</Text>
              <Text style={styles.barLabel}>{t('financeScreen.limit')}: {formatMoney(item.credit_limit)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="trending-down" size={22} color={COLORS.error} />
          <Text style={styles.summaryAmount}>{formatMoney(totalDebt)}</Text>
          <Text style={styles.summaryLabel}>{t('financeScreen.receivables')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.secondary} />
          <Text style={styles.summaryAmount}>{formatMoney(totalLimit)}</Text>
          <Text style={styles.summaryLabel}>{t('financeScreen.creditLimit')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="people-outline" size={22} color={COLORS.info} />
          <Text style={styles.summaryAmount}>{debtors.length}</Text>
          <Text style={styles.summaryLabel}>{t('financeScreen.debtorsCount')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('financeScreen.receivablesTitle')}</Text>

      <FlatList
        data={debtors}
        keyExtractor={(item) => item.id}
        renderItem={renderDebtor}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
            <Text style={styles.emptyText}>{t('financeScreen.noDebts')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: {
    flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 4,
  },
  summaryAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  summaryLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  list: { padding: 12, paddingTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  city: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardAmount: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '700' },
  paymentTerms: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  barContainer: { marginTop: 10 },
  barTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barLabel: { fontSize: 10, color: COLORS.textSecondary },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
