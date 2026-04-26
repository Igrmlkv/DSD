import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';
import { QUESTION_TYPES } from '../../../constants/merchAudit';
import { getMmlProducts } from '../../../database';
import PhotoThumb from './PhotoThumb';

// Renders a single question of any of the 9 supported types (spec §4.2).
// Props:
//   question: { id, type, title, hint, required, options?, min/max?, sub?, kpi_codes? }
//   answer: { value_text, value_number, value_bool, value_json, ml_value, confidence, source }
//   onChange: (patch) => void
//   photos: array of audit_photos rows for photo/photo_required types
//   onCapturePhoto: () => void
//   onRemovePhoto: (photo) => void
export default function QuestionRenderer({
  question, answer, onChange, photos, onCapturePhoto, onRemovePhoto,
}) {
  const { t } = useTranslation();

  const value = answer || {};
  const hasMlValue = value.ml_value != null && value.source !== 'survey';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {question.title}
          {question.required && <Text style={styles.required}> *</Text>}
        </Text>
        {hasMlValue && (
          <View style={styles.mlBadge}>
            <Ionicons name="sparkles-outline" size={12} color={COLORS.info} />
            <Text style={styles.mlBadgeText}>
              ML: {String(value.ml_value)}
              {value.confidence != null && ` (${Math.round(value.confidence * 100)}%)`}
            </Text>
          </View>
        )}
      </View>
      {!!question.hint && <Text style={styles.hint}>{question.hint}</Text>}

      {renderBody(question, value, onChange, photos, onCapturePhoto, onRemovePhoto, t)}

      {Array.isArray(question.kpi_codes) && question.kpi_codes.length > 0 && (
        <Text style={styles.kpiCodes}>KPI: {question.kpi_codes.join(', ')}</Text>
      )}
    </View>
  );
}

function renderBody(q, value, onChange, photos, onCapturePhoto, onRemovePhoto, t) {
  switch (q.type) {
    case QUESTION_TYPES.BOOL: return renderBool(value, onChange, t);
    case QUESTION_TYPES.INT: return renderNumeric(q, value, onChange, true);
    case QUESTION_TYPES.DECIMAL: return renderNumeric(q, value, onChange, false);
    case QUESTION_TYPES.SELECT: return renderSelect(q, value, onChange);
    case QUESTION_TYPES.MULTISELECT: return renderMultiSelect(q, value, onChange);
    case QUESTION_TYPES.TEXT: return renderText(value, onChange, t);
    case QUESTION_TYPES.PHOTO:
    case QUESTION_TYPES.PHOTO_REQUIRED:
      return renderPhoto(q, photos, onCapturePhoto, onRemovePhoto, t);
    case QUESTION_TYPES.COMPOSITE: return renderComposite(q, value, onChange, t);
    default:
      return <Text style={styles.unsupported}>{t('merchAudit.question.unsupported', { type: q.type })}</Text>;
  }
}

function renderBool(value, onChange, t) {
  const v = value.value_bool;
  return (
    <View style={styles.boolRow}>
      <TouchableOpacity
        style={[styles.boolBtn, v === true && styles.boolBtnYes]}
        onPress={() => onChange({ value_bool: true })}
      >
        <Ionicons name="checkmark" size={20} color={v === true ? COLORS.white : COLORS.success} />
        <Text style={[styles.boolBtnText, v === true && styles.boolBtnTextActive]}>{t('common.yes')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.boolBtn, v === false && styles.boolBtnNo]}
        onPress={() => onChange({ value_bool: false })}
      >
        <Ionicons name="close" size={20} color={v === false ? COLORS.white : COLORS.error} />
        <Text style={[styles.boolBtnText, v === false && styles.boolBtnTextActive]}>{t('common.no')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function renderNumeric(q, value, onChange, isInt) {
  return (
    <TextInput
      style={styles.input}
      keyboardType={isInt ? 'number-pad' : 'decimal-pad'}
      value={value.value_number != null ? String(value.value_number) : ''}
      onChangeText={(txt) => {
        if (txt === '') {
          onChange({ value_number: null });
          return;
        }
        const n = isInt ? parseInt(txt, 10) : parseFloat(txt);
        if (!Number.isFinite(n)) return;
        if (q.min != null && n < q.min) return;
        if (q.max != null && n > q.max) return;
        onChange({ value_number: n });
      }}
      placeholder={q.placeholder || ''}
      placeholderTextColor={COLORS.tabBarInactive}
    />
  );
}

function renderText(value, onChange, t) {
  return (
    <TextInput
      style={[styles.input, styles.inputMultiline]}
      multiline
      numberOfLines={3}
      value={value.value_text || ''}
      onChangeText={(txt) => onChange({ value_text: txt })}
      placeholder={t('merchAudit.question.textPlaceholder')}
      placeholderTextColor={COLORS.tabBarInactive}
    />
  );
}

function renderSelect(q, value, onChange) {
  const options = q.options || [];
  return (
    <View style={styles.optList}>
      {options.map((o) => {
        const selected = value.value_text === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.optBtn, selected && styles.optBtnActive]}
            onPress={() => onChange({ value_text: o.value })}
          >
            <View style={styles.radio}>
              {selected && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.optText}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function renderMultiSelect(q, value, onChange) {
  const options = q.options || [];
  const current = Array.isArray(value.value_json) ? value.value_json : [];
  const toggle = (val) => {
    const next = current.includes(val)
      ? current.filter((x) => x !== val)
      : [...current, val];
    onChange({ value_json: next });
  };
  return (
    <View style={styles.optList}>
      {options.map((o) => {
        const selected = current.includes(o.value);
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.optBtn, selected && styles.optBtnActive]}
            onPress={() => toggle(o.value)}
          >
            <Ionicons
              name={selected ? 'checkbox' : 'square-outline'}
              size={20}
              color={selected ? COLORS.primary : COLORS.tabBarInactive}
            />
            <Text style={styles.optText}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function renderPhoto(q, photos, onCapturePhoto, onRemovePhoto, t) {
  const max = q.max_photos || 5;
  const min = q.min_photos != null ? q.min_photos : (q.type === QUESTION_TYPES.PHOTO_REQUIRED ? 1 : 0);
  const count = (photos || []).length;
  return (
    <View>
      <View style={styles.photoGrid}>
        {(photos || []).map((p) => (
          <PhotoThumb key={p.id} photo={p} onRemove={() => onRemovePhoto?.(p)} />
        ))}
        {count < max && (
          <TouchableOpacity style={styles.photoAddBtn} onPress={onCapturePhoto}>
            <Ionicons name="camera" size={28} color={COLORS.primary} />
            <Text style={styles.photoAddText}>{t('merchAudit.question.takePhoto')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.photoHint}>
        {t('merchAudit.question.photoCount', { count, min, max })}
      </Text>
    </View>
  );
}

function renderComposite(q, value, onChange, t) {
  const kind = q.sub?.kind;
  if (kind === 'mml_checklist') {
    return <MmlChecklist value={value} onChange={onChange} t={t} />;
  }
  if (kind === 'glassware_check') {
    return <GlasswareCheck value={value} onChange={onChange} t={t} />;
  }
  return <Text style={styles.unsupported}>{t('merchAudit.question.unsupportedComposite', { kind })}</Text>;
}

// MML composite: list of SKUs from the MML (Must-Must-List), each marked present/absent.
// Auto-loads items from `products WHERE is_mml = 1` on first render when the answer is empty.
// Once items exist in value_json, subsequent renders use them as the source of truth so the
// merchandiser's selections are preserved even if the MML on the server changes mid-visit.
function MmlChecklist({ value, onChange, t }) {
  const [loading, setLoading] = useState(false);
  const items = useMemo(() => {
    const v = value.value_json;
    if (Array.isArray(v?.items)) return v.items;
    return [];
  }, [value.value_json]);

  useEffect(() => {
    if (items.length > 0 || loading) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await getMmlProducts();
        if (cancelled) return;
        if (rows && rows.length > 0) {
          onChange({
            value_json: {
              items: rows.map((r) => ({
                sku_id: r.id,
                sku: r.sku,
                name: r.name,
                brand: r.brand,
                priority: r.mml_priority,
                present: null,
              })),
            },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && items.length === 0) {
    return (
      <View style={styles.placeholderBox}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    // No MML configured (rare — empty seed or server returned no MML for this outlet).
    return (
      <View style={styles.placeholderBox}>
        <Ionicons name="alert-circle-outline" size={20} color={COLORS.info} />
        <Text style={styles.placeholderText}>
          {t('merchAudit.question.mmlEmpty')}
        </Text>
      </View>
    );
  }

  const setPresent = (idx, present) => {
    const next = items.map((x, i) => (i === idx ? { ...x, present } : x));
    onChange({ value_json: { items: next } });
  };

  const presentCount = items.filter((i) => i.present === true).length;
  const totalCount = items.length;

  return (
    <View>
      <Text style={styles.mmlSummary}>
        {t('merchAudit.question.mmlSummary', { present: presentCount, total: totalCount })}
      </Text>
      {items.map((it, idx) => (
        <View key={it.sku_id} style={styles.compRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.compLabel}>
              {it.name || it.sku_id}
              {it.priority === 1 && <Text style={styles.mmlPriorityHigh}> ★</Text>}
            </Text>
            {!!it.brand && <Text style={styles.compBrand}>{it.brand}</Text>}
          </View>
          <View style={styles.boolMini}>
            <TouchableOpacity
              style={[styles.boolMiniBtn, it.present === true && styles.boolMiniYes]}
              onPress={() => setPresent(idx, true)}
            >
              <Ionicons name="checkmark" size={16} color={it.present === true ? COLORS.white : COLORS.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.boolMiniBtn, it.present === false && styles.boolMiniNo]}
              onPress={() => setPresent(idx, false)}
            >
              <Ionicons name="close" size={16} color={it.present === false ? COLORS.white : COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

function GlasswareCheck({ value, onChange, t }) {
  const items = Array.isArray(value.value_json?.items) ? value.value_json.items : [
    { id: 'g1', name: 'Бокал 1', branded: null },
    { id: 'g2', name: 'Бокал 2', branded: null },
    { id: 'g3', name: 'Стакан', branded: null },
  ];
  const setBranded = (idx, branded) => {
    const next = items.map((x, i) => (i === idx ? { ...x, branded } : x));
    onChange({ value_json: { items: next } });
  };
  return (
    <View>
      {items.map((it, idx) => (
        <View key={it.id} style={styles.compRow}>
          <Text style={styles.compLabel}>{it.name}</Text>
          <Switch
            value={it.branded === true}
            onValueChange={(v) => setBranded(idx, v)}
            trackColor={{ true: COLORS.primary }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  required: { color: COLORS.error },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 8 },
  kpiCodes: { fontSize: 11, color: COLORS.tabBarInactive, marginTop: 12 },
  unsupported: { color: COLORS.error, fontSize: 13, marginTop: 8 },
  mlBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.info + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mlBadgeText: { fontSize: 11, color: COLORS.info, fontWeight: '500' },

  boolRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  boolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  boolBtnYes: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  boolBtnNo: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  boolBtnText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  boolBtnTextActive: { color: COLORS.white },

  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.text, marginTop: 4 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

  optList: { gap: 6, marginTop: 4 },
  optBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  optBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  optText: { fontSize: 14, color: COLORS.text, flex: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.tabBarInactive, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  photoAddBtn: { width: 96, height: 96, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  photoAddText: { fontSize: 11, color: COLORS.primary, marginTop: 4 },
  photoHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },

  compRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, gap: 12 },
  compLabel: { fontSize: 14, color: COLORS.text },
  compBrand: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  mmlSummary: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '500' },
  mmlPriorityHigh: { color: COLORS.accent, fontWeight: '700' },
  boolMini: { flexDirection: 'row', gap: 6 },
  boolMiniBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  boolMiniYes: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  boolMiniNo: { backgroundColor: COLORS.error, borderColor: COLORS.error },

  placeholderBox: { backgroundColor: COLORS.background, padding: 12, borderRadius: 10, alignItems: 'center', gap: 6 },
  placeholderText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  linkBtn: { paddingVertical: 6 },
  linkBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
});
