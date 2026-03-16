import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

const CONDITIONS = ['good', 'damaged', 'expired'];

export default function MaterialCheckInStep({ data, onUpdate, readOnly, unloadingData }) {
  const { t } = useTranslation();

  const buildInitialItems = () => {
    if (data?.items?.length) return data.items;
    const remaining = unloadingData?.remaining || [];
    return remaining.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name || r.name,
      expected_qty: r.quantity,
      actual_qty: '',
      condition: 'good',
      reason_code: '',
    }));
  };

  const [items, setItems] = useState(buildInitialItems);
  const [notes, setNotes] = useState(data?.notes || '');

  const updateItem = (index, field, value) => {
    if (readOnly) return;
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    });
    setItems(updated);
    onUpdate({ items: updated, notes });
  };

  const handleNotesChange = (text) => {
    if (readOnly) return;
    setNotes(text);
    onUpdate({ items, notes: text });
  };

  const discrepancyCount = items.filter((item) => {
    const actual = parseFloat(item.actual_qty);
    return !isNaN(actual) && actual !== item.expected_qty;
  }).length;

  const conditionLabel = (c) => {
    switch (c) {
      case 'good': return t('materialCheckIn.conditionGood');
      case 'damaged': return t('materialCheckIn.conditionDamaged');
      case 'expired': return t('materialCheckIn.conditionExpired');
      default: return c;
    }
  };

  const conditionColor = (c) => {
    switch (c) {
      case 'good': return COLORS.success;
      case 'damaged': return COLORS.error;
      case 'expired': return '#FF9500';
      default: return COLORS.textSecondary;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="cube-outline" size={32} color={COLORS.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.title}>{t('materialCheckIn.title')}</Text>
          <Text style={styles.subtitle}>{t('materialCheckIn.subtitle')}</Text>
        </View>
      </View>

      {/* Summary badge */}
      <View style={[styles.badge, discrepancyCount > 0 ? styles.badgeWarn : styles.badgeOk]}>
        <Ionicons
          name={discrepancyCount > 0 ? 'alert-circle' : 'checkmark-circle'}
          size={18}
          color={discrepancyCount > 0 ? COLORS.error : COLORS.success}
        />
        <Text style={[styles.badgeText, { color: discrepancyCount > 0 ? COLORS.error : COLORS.success }]}>
          {discrepancyCount > 0
            ? t('materialCheckIn.itemsWithDiscrepancy', { count: discrepancyCount })
            : items.length > 0 ? t('materialCheckIn.allMatched') : t('materialCheckIn.noItems')}
        </Text>
      </View>

      {items.length === 0 && (
        <View style={styles.emptyWrap}>
          <Ionicons name="archive-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>{t('materialCheckIn.noItems')}</Text>
        </View>
      )}

      {items.map((item, index) => {
        const actual = parseFloat(item.actual_qty);
        const disc = !isNaN(actual) ? actual - item.expected_qty : 0;
        return (
          <View key={item.product_id || index} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.product_name}</Text>

            <View style={styles.row}>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>{t('materialCheckIn.expectedQty')}</Text>
                <Text style={styles.expectedValue}>{item.expected_qty}</Text>
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>{t('materialCheckIn.actualQty')}</Text>
                <TextInput
                  style={[styles.qtyInput, readOnly && styles.readOnlyInput]}
                  value={String(item.actual_qty)}
                  onChangeText={(text) => updateItem(index, 'actual_qty', text.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={COLORS.tabBarInactive}
                  keyboardType="numeric"
                  editable={!readOnly}
                />
              </View>
              {disc !== 0 && (
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>{t('materialCheckIn.discrepancy')}</Text>
                  <Text style={[styles.discValue, { color: disc < 0 ? COLORS.error : '#FF9500' }]}>
                    {disc > 0 ? `+${disc}` : disc}
                  </Text>
                </View>
              )}
            </View>

            {/* Condition selector */}
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{t('materialCheckIn.condition')}</Text>
            <View style={styles.conditionRow}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.conditionChip,
                    item.condition === c && { backgroundColor: conditionColor(c) + '18', borderColor: conditionColor(c) },
                  ]}
                  onPress={() => updateItem(index, 'condition', c)}
                  disabled={readOnly}
                >
                  <Text style={[
                    styles.conditionText,
                    item.condition === c && { color: conditionColor(c), fontWeight: '600' },
                  ]}>
                    {conditionLabel(c)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      <TextInput
        style={[styles.notesInput, readOnly && styles.readOnlyInput]}
        value={notes}
        onChangeText={handleNotesChange}
        placeholder={t('materialCheckIn.notesPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        multiline
        numberOfLines={3}
        editable={!readOnly}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 10, marginBottom: 16,
  },
  badgeOk: { backgroundColor: COLORS.success + '12' },
  badgeWarn: { backgroundColor: COLORS.error + '12' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },
  itemCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 10,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  fieldCol: { flex: 1 },
  fieldLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, fontWeight: '500' },
  expectedValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  qtyInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 8, fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center',
  },
  discValue: { fontSize: 16, fontWeight: '700' },
  conditionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  conditionChip: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  conditionText: { fontSize: 12, color: COLORS.textSecondary },
  notesInput: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, marginTop: 12,
    minHeight: 80, textAlignVertical: 'top',
  },
  readOnlyInput: { opacity: 0.6, backgroundColor: '#F0F0F0' },
});
