import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getPayments, getRoutesByDate, createCashCollection } from '../../database';

export default function CashCollectionScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [payments, setPayments] = useState([]);
  const [routeId, setRouteId] = useState(null);
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const routes = await getRoutesByDate(today, user.id);
        if (routes.length > 0) setRouteId(routes[0].id);
        const allPayments = await getPayments(user.id);
        const todayPayments = allPayments.filter((p) => p.payment_date?.startsWith(today));
        setPayments(todayPayments);
        const total = todayPayments.reduce((s, p) => s + p.amount, 0);
        setActualAmount(String(total));
      } catch (e) { console.error('CashCollection load:', e); }
    })();
  }, [user.id]));

  const expectedAmount = payments.reduce((s, p) => s + p.amount, 0);
  const actual = parseFloat(actualAmount) || 0;
  const discrepancy = actual - expectedAmount;

  const handleSubmit = () => {
    Alert.alert(t('cashCollection.confirmCollection'),
      `${t('cashCollection.expectedLabel')}: ${expectedAmount.toLocaleString()} ₽\n${t('cashCollection.factLabel')}: ${actual.toLocaleString()} ₽\n${t('cashCollection.discrepancyLabel')}: ${discrepancy.toLocaleString()} ₽`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cashCollection.processButton'), onPress: async () => {
            try {
              await createCashCollection({
                driver_id: user.id, route_id: routeId,
                expected_amount: expectedAmount, actual_amount: actual, notes,
              });
              Alert.alert(t('common.done'), t('cashCollection.actCreated'));
              navigation.goBack();
            } catch (e) { Alert.alert(t('common.error'), e.message); }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Сумма за рейс */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t('cashCollection.receivedForTrip')}</Text>
        <Text style={styles.summaryAmount}>{expectedAmount.toLocaleString()} ₽</Text>
        <Text style={styles.summaryCount}>{t('cashCollection.paymentsCount', { count: payments.length })}</Text>
      </View>

      {/* Детализация */}
      <Text style={styles.sectionTitle}>{t('cashCollection.detailByPoints')}</Text>
      {payments.map((p) => (
        <View key={p.id} style={styles.paymentRow}>
          <View>
            <Text style={styles.paymentCustomer}>{p.customer_name}</Text>
            <Text style={styles.paymentType}>
              {p.payment_type === 'cash' ? t('paymentScreen.types.cash') : p.payment_type === 'card' ? t('paymentScreen.types.card') : p.payment_type}
            </Text>
          </View>
          <Text style={styles.paymentAmount}>{p.amount.toLocaleString()} ₽</Text>
        </View>
      ))}

      {/* Факт сдачи */}
      <Text style={styles.sectionTitle}>{t('cashCollection.actualAmountLabel')}</Text>
      <View style={styles.amountRow}>
        <TextInput
          style={styles.amountInput}
          value={actualAmount}
          onChangeText={setActualAmount}
          keyboardType="numeric"
        />
        <Text style={styles.currency}>₽</Text>
      </View>

      {discrepancy !== 0 && (
        <View style={[styles.discrepancyCard, discrepancy < 0 ? styles.negative : styles.positive]}>
          <Ionicons name={discrepancy < 0 ? 'alert-circle' : 'information-circle'} size={20} color={discrepancy < 0 ? COLORS.error : COLORS.success} />
          <Text style={[styles.discrepancyText, { color: discrepancy < 0 ? COLORS.error : COLORS.success }]}>
            {t('cashCollection.discrepancyLine', { amount: (discrepancy > 0 ? '+' : '') + discrepancy.toLocaleString() })}
          </Text>
        </View>
      )}

      <TextInput
        style={styles.notesInput}
        placeholder={t('cashCollection.commentPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Ionicons name="cash" size={22} color={COLORS.white} />
        <Text style={styles.submitText}>{t('cashCollection.submitCollection')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 20 },
  summaryLabel: { color: COLORS.white + 'BB', fontSize: 14 },
  summaryAmount: { color: COLORS.white, fontSize: 32, fontWeight: '700', marginTop: 4 },
  summaryCount: { color: COLORS.white + '99', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 12 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 4 },
  paymentCustomer: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  paymentType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  paymentAmount: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', color: COLORS.text },
  currency: { fontSize: 20, fontWeight: '600', color: COLORS.textSecondary },
  discrepancyCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginTop: 10 },
  negative: { backgroundColor: COLORS.error + '10' },
  positive: { backgroundColor: COLORS.success + '10' },
  discrepancyText: { fontSize: 14, fontWeight: '600' },
  notesInput: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginTop: 16, fontSize: 14, color: COLORS.text },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, marginTop: 24 },
  submitText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
