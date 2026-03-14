import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

export default function CheckOutCashStep({ data, onUpdate }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(data?.amount || '');

  const handleChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
    const val = parseFloat(cleaned);
    onUpdate({ amount: cleaned, value: isNaN(val) ? null : val });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={32} color={COLORS.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.title}>{t('checkoutCash.title')}</Text>
          <Text style={styles.subtitle}>{t('checkoutCash.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('checkoutCash.amount')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleChange}
            placeholder={t('checkoutCash.placeholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={styles.unit}>₽</Text>
        </View>
        <Text style={styles.hint}>{t('checkoutCash.hint')}</Text>
      </View>

      <View style={styles.iconWrap}>
        <Ionicons name="wallet-outline" size={80} color={COLORS.border} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, fontSize: 24, fontWeight: '700', color: COLORS.text, textAlign: 'center',
  },
  unit: { fontSize: 20, color: COLORS.textSecondary, fontWeight: '600' },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10, textAlign: 'center' },
  iconWrap: { alignItems: 'center', marginTop: 40, opacity: 0.3 },
});
