import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

export default function CashCheckInStep({ data, onUpdate, readOnly, expectedAmount }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(data?.actualAmount ?? data?.amount ?? '');
  const [notes, setNotes] = useState(data?.notes || '');

  const expected = expectedAmount || 0;

  const handleChange = (text) => {
    if (readOnly) return;
    const cleaned = text.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
    const val = parseFloat(cleaned);
    const disc = isNaN(val) ? 0 : val - expected;
    onUpdate({
      expectedAmount: expected,
      actualAmount: cleaned,
      value: isNaN(val) ? null : val,
      discrepancy: isNaN(val) ? null : disc,
      notes,
    });
  };

  const handleNotesChange = (text) => {
    if (readOnly) return;
    setNotes(text);
    const val = parseFloat(amount);
    const disc = isNaN(val) ? 0 : val - expected;
    onUpdate({
      expectedAmount: expected,
      actualAmount: amount,
      value: isNaN(val) ? null : val,
      discrepancy: isNaN(val) ? null : disc,
      notes: text,
    });
  };

  const actualVal = parseFloat(amount);
  const discrepancy = isNaN(actualVal) ? null : actualVal - expected;
  const hasDisc = discrepancy != null && discrepancy !== 0;

  const formatMoney = (val) =>
    Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={32} color={COLORS.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.title}>{t('cashCheckIn.title')}</Text>
          <Text style={styles.subtitle}>{t('cashCheckIn.subtitle')}</Text>
        </View>
      </View>

      {/* Expected amount */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('cashCheckIn.expectedAmount')}</Text>
        <Text style={styles.expectedValue}>{formatMoney(expected)}</Text>
      </View>

      {/* Actual amount input */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('cashCheckIn.actualAmount')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, readOnly && styles.readOnlyInput]}
            value={String(amount)}
            onChangeText={handleChange}
            placeholder={t('cashCheckIn.placeholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            keyboardType="decimal-pad"
            returnKeyType="done"
            editable={!readOnly}
          />
          <Text style={styles.unit}>₽</Text>
        </View>
      </View>

      {/* Discrepancy display */}
      <View style={[
        styles.discCard,
        hasDisc ? styles.discCardWarn : styles.discCardOk,
      ]}>
        <Ionicons
          name={hasDisc ? 'alert-circle' : 'checkmark-circle'}
          size={22}
          color={hasDisc ? COLORS.error : COLORS.success}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.discLabel}>{t('cashCheckIn.discrepancy')}</Text>
          <Text style={[
            styles.discValue,
            { color: hasDisc ? COLORS.error : COLORS.success },
          ]}>
            {discrepancy != null ? formatMoney(discrepancy) : t('cashCheckIn.noDiscrepancy')}
          </Text>
        </View>
      </View>

      <Text style={styles.hint}>{t('cashCheckIn.hint')}</Text>

      <TextInput
        style={[styles.notesInput, readOnly && styles.readOnlyInput]}
        value={notes}
        onChangeText={handleNotesChange}
        placeholder={t('cashCheckIn.notesPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        multiline
        numberOfLines={3}
        editable={!readOnly}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  expectedValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center',
  },
  unit: { fontSize: 20, color: COLORS.textSecondary, fontWeight: '600' },
  discCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 12,
  },
  discCardOk: { backgroundColor: COLORS.success + '12' },
  discCardWarn: { backgroundColor: COLORS.error + '12' },
  discLabel: { fontSize: 12, color: COLORS.textSecondary },
  discValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  hint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 12 },
  notesInput: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, marginTop: 4,
    minHeight: 80, textAlignVertical: 'top',
  },
  readOnlyInput: { opacity: 0.6, backgroundColor: '#F0F0F0' },
});
