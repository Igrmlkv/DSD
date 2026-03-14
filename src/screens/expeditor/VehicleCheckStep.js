import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

const CHECKLIST_KEYS = [
  'tires', 'brakes', 'lights', 'mirrors', 'fluids', 'documents', 'cleanliness', 'cargo',
];

export default function VehicleCheckStep({ data, onUpdate }) {
  const { t } = useTranslation();
  const [checks, setChecks] = useState(data?.checks || CHECKLIST_KEYS.map((k) => ({ key: k, checked: false })));
  const [notes, setNotes] = useState(data?.notes || '');

  const toggleCheck = (index) => {
    const updated = checks.map((c, i) => i === index ? { ...c, checked: !c.checked } : c);
    setChecks(updated);
    onUpdate({ checks: updated, notes });
  };

  const handleNotesChange = (text) => {
    setNotes(text);
    onUpdate({ checks, notes: text });
  };

  const checkedCount = checks.filter((c) => c.checked).length;
  const allChecked = checkedCount === checks.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="car-sport-outline" size={32} color={COLORS.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.title}>{t('vehicleCheck.title')}</Text>
          <Text style={styles.subtitle}>{t('vehicleCheck.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${(checkedCount / checks.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {allChecked
            ? t('vehicleCheck.allChecked')
            : t('vehicleCheck.itemsRemaining', { count: checks.length - checkedCount })}
        </Text>
      </View>

      {checks.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.checkItem, item.checked && styles.checkItemDone]}
          onPress={() => toggleCheck(index)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={item.checked ? '#34C759' : COLORS.border}
          />
          <Text style={[styles.checkText, item.checked && styles.checkTextDone]}>
            {t(`vehicleCheck.${item.key}`)}
          </Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={handleNotesChange}
        placeholder={t('vehicleCheck.notesPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        multiline
        numberOfLines={3}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  progressRow: { marginBottom: 16 },
  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 6 },
  progressFill: { height: 6, backgroundColor: '#34C759', borderRadius: 3 },
  progressText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    marginBottom: 8,
  },
  checkItemDone: { backgroundColor: '#34C75908' },
  checkText: { fontSize: 15, color: COLORS.text, flex: 1 },
  checkTextDone: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  notesInput: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, marginTop: 12,
    minHeight: 80, textAlignVertical: 'top',
  },
});
