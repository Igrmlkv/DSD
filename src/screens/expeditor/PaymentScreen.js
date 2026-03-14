import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getCustomerById, createPayment } from '../../database';

export default function PaymentScreen({ route }) {
  const { t } = useTranslation();
  const { pointId, customerId, customerName, readOnly } = route.params || {};

  const PAYMENT_TYPES = [
    { key: 'cash', label: t('paymentScreen.types.cash'), icon: 'cash-outline' },
    { key: 'card', label: t('paymentScreen.types.card'), icon: 'card-outline' },
    { key: 'qr', label: t('paymentScreen.types.qr'), icon: 'qr-code-outline' },
    { key: 'transfer', label: t('paymentScreen.types.transfer'), icon: 'swap-horizontal-outline' },
  ];
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [customer, setCustomer] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(useCallback(() => {
    if (customerId) {
      getCustomerById(customerId).then((c) => {
        setCustomer(c);
        if (c?.debt_amount > 0) setAmount(String(c.debt_amount));
      });
    }
  }, [customerId]));

  const amountNum = parseFloat(amount) || 0;
  const receivedNum = parseFloat(receivedAmount) || 0;
  const change = paymentType === 'cash' && receivedNum > amountNum ? receivedNum - amountNum : 0;

  const handleSubmit = () => {
    if (amountNum <= 0) {
      Alert.alert('', t('paymentScreen.specifyAmount'));
      return;
    }
    Alert.alert(t('paymentScreen.acceptPayment'), `${amountNum.toLocaleString()} ₽ (${PAYMENT_TYPES.find((t_) => t_.key === paymentType)?.label})`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('paymentScreen.accept'), onPress: async () => {
          try {
            await createPayment({
              customer_id: customerId, user_id: user.id,
              route_point_id: pointId, amount: amountNum, payment_type: paymentType, notes,
            });
            Alert.alert(t('common.done'), t('paymentScreen.receiptCreated', { amount: amountNum.toLocaleString() }));
            navigation.goBack();
          } catch (e) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyText}>{t('shipmentScreen.processedViewOnly')}</Text>        </View>
      )}
      <Text style={styles.customer}>{customerName}</Text>

      {/* Задолженность */}
      {customer?.debt_amount > 0 && (
        <View style={styles.debtCard}>
          <Ionicons name="alert-circle" size={24} color={COLORS.error} />
          <View style={styles.debtInfo}>
            <Text style={styles.debtLabel}>{t('paymentScreen.debtLabel')}</Text>
            <Text style={styles.debtAmount}>{customer.debt_amount.toLocaleString()} ₽</Text>
          </View>
          {!readOnly && (
            <TouchableOpacity
              style={styles.payAllBtn}
              onPress={() => setAmount(String(customer.debt_amount))}
            >
              <Text style={styles.payAllText}>{t('paymentScreen.payAll')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Сумма */}
      <Text style={styles.label}>{t('paymentScreen.amountLabel')}</Text>
      <View style={styles.amountInput}>
        <TextInput
          style={styles.amountField}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={COLORS.tabBarInactive}
          editable={!readOnly}
        />
        <Text style={styles.currency}>₽</Text>
      </View>

      {/* Тип оплаты */}
      <Text style={styles.label}>{t('paymentScreen.methodLabel')}</Text>
      <View style={styles.payTypes}>
        {PAYMENT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.payType, paymentType === t.key && styles.payTypeActive]}
            onPress={() => !readOnly && setPaymentType(t.key)}
            disabled={readOnly}
          >
            <Ionicons name={t.icon} size={22} color={paymentType === t.key ? COLORS.white : COLORS.primary} />
            <Text style={[styles.payTypeLabel, paymentType === t.key && styles.payTypeLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Расчёт сдачи (для наличных) */}
      {paymentType === 'cash' && (
        <>
          <Text style={styles.label}>{t('paymentScreen.receivedFromClient')}</Text>
          <View style={styles.amountInput}>
            <TextInput
              style={styles.amountField}
              value={receivedAmount}
              onChangeText={setReceivedAmount}
              keyboardType="numeric"
              placeholder={amount || '0'}
              placeholderTextColor={COLORS.tabBarInactive}
              editable={!readOnly}
            />
            <Text style={styles.currency}>₽</Text>
          </View>
          {change > 0 && (
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>{t('paymentScreen.change')}</Text>
              <Text style={styles.changeValue}>{change.toLocaleString()} ₽</Text>
            </View>
          )}
        </>
      )}

      {/* Комментарий */}
      <TextInput
        style={styles.notesInput}
        placeholder={t('paymentScreen.commentPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        value={notes}
        onChangeText={setNotes}
        editable={!readOnly}
      />

      {!readOnly && (
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="wallet" size={22} color={COLORS.white} />
          <Text style={styles.submitText}>{t('paymentScreen.submitPayment')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, borderRadius: 10, padding: 10, marginBottom: 16,
  },
  readOnlyText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  customer: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  debtCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.error + '10', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  debtInfo: { flex: 1 },
  debtLabel: { fontSize: 13, color: COLORS.error },
  debtAmount: { fontSize: 22, fontWeight: '700', color: COLORS.error },
  payAllBtn: { backgroundColor: COLORS.error, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  payAllText: { color: COLORS.white, fontWeight: '600', fontSize: 12 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  amountInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14 },
  amountField: { flex: 1, fontSize: 28, fontWeight: '700', color: COLORS.text },
  currency: { fontSize: 24, fontWeight: '600', color: COLORS.textSecondary },
  payTypes: { flexDirection: 'row', gap: 8 },
  payType: {
    flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 12,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  payTypeActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  payTypeLabel: { fontSize: 11, fontWeight: '500', color: COLORS.text },
  payTypeLabelActive: { color: COLORS.white },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.accent + '15', borderRadius: 10, padding: 12, marginTop: 8 },
  changeLabel: { fontSize: 15, color: COLORS.text },
  changeValue: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  notesInput: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginTop: 16, fontSize: 14, color: COLORS.text },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 12, padding: 16, marginTop: 24,
  },
  submitText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
