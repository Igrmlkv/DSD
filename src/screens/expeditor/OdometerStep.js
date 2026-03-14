import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getLastOdometerReading } from '../../database';
import useAuthStore from '../../store/authStore';

export default function OdometerStep({ data, onUpdate, readOnly }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [reading, setReading] = useState(data?.reading || '');
  const [lastReading, setLastReading] = useState(null);

  useEffect(() => {
    getLastOdometerReading(user?.id).then((row) => {
      if (row?.odometer_reading) setLastReading(row.odometer_reading);
    }).catch(() => {});
  }, [user?.id]);

  const handleChange = (text) => {
    if (readOnly) return;
    const cleaned = text.replace(/[^0-9.]/g, '');
    setReading(cleaned);
    const val = parseFloat(cleaned);
    onUpdate({ reading: cleaned, value: isNaN(val) ? null : val });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="speedometer-outline" size={32} color={COLORS.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.title}>{t('odometerScreen.title')}</Text>
          <Text style={styles.subtitle}>{t('odometerScreen.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('odometerScreen.currentReading')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, readOnly && styles.readOnlyInput]}
            value={reading}
            onChangeText={handleChange}
            placeholder={t('odometerScreen.placeholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            keyboardType="numeric"
            returnKeyType="done"
            editable={!readOnly}
          />
          <Text style={styles.unit}>{t('tourConfirm.km')}</Text>
        </View>
        <Text style={styles.hint}>
          {lastReading != null
            ? t('odometerScreen.lastReading', { value: lastReading })
            : t('odometerScreen.noLastReading')}
        </Text>
      </View>

      <View style={styles.iconWrap}>
        <Ionicons name="analytics-outline" size={80} color={COLORS.border} />
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
  unit: { fontSize: 18, color: COLORS.textSecondary, fontWeight: '600' },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10, textAlign: 'center' },
  iconWrap: { alignItems: 'center', marginTop: 40, opacity: 0.3 },
  readOnlyInput: { opacity: 0.6, backgroundColor: '#F0F0F0' },
});
