import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';
import { SCREEN_NAMES } from '../../../constants/screens';
import useAuditStore from '../store/auditStore';
import { loadDraftAudit } from '../services/auditService';
import { getQuestions, getMissingRequired, isQuestionAnswered } from '../services/templateService';
import { listAuditPhotos } from '../../../database';

// Compact list of all questions in the active template, grouped by block.
// Tapping a question navigates to QuestionScreen for focused entry.
// Photos for photo-typed questions are also visible inline.
export default function AuditScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { visitId, resume } = route.params || {};
  const [loading, setLoading] = useState(true);

  // Subscribe to slices, not the whole state — prevents the entire screen from
  // re-rendering on every keystroke in QuestionScreen / on photo additions.
  const template = useAuditStore((s) => s.template);
  const answers = useAuditStore((s) => s.answers);
  const photosByQuestion = useAuditStore((s) => s.photosByQuestion);

  // Resume draft if needed (mount-only).
  useEffect(() => {
    let mounted = true;
    (async () => {
      const store = useAuditStore.getState();
      if (resume || !store.template) {
        const draft = await loadDraftAudit(visitId);
        if (mounted && draft) {
          store.loadDraft({
            visit: draft.visit,
            template: draft.template,
            answers: draft.answers,
            photosByQuestion: draft.photosByQuestion,
          });
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId]);

  // Re-fetch photos when returning from PhotoCaptureScreen.
  // Skips the store update when nothing changed (cheap shallow equality on per-question
  // counts + IDs) so subscribed components don't re-render on every back-navigation.
  useEffect(() => {
    const refreshPhotos = async () => {
      if (!visitId) return;
      try {
        const all = await listAuditPhotos(visitId);
        const grouped = {};
        for (const p of all) {
          const qid = p.question_id || '__no_question__';
          if (!grouped[qid]) grouped[qid] = [];
          grouped[qid].push(p);
        }
        const store = useAuditStore.getState();
        if (!photoMapsEqual(store.photosByQuestion, grouped)) {
          store.setPhotosByQuestion(grouped);
        }
      } catch { /* best effort */ }
    };
    const unsub = navigation.addListener('focus', refreshPhotos);
    return unsub;
  }, [navigation, visitId]);

  // Derived values — must run on every render to satisfy the Rules of Hooks,
  // even when `template` is null (the early return below would otherwise skip them).
  const questions = useMemo(() => getQuestions(template), [template]);
  const grouped = useMemo(() => groupByBlock(questions), [questions]);
  const missing = useMemo(
    () => (template ? getMissingRequired(template, answers, photosByQuestion) : []),
    [template, answers, photosByQuestion],
  );
  // Progress counts every answered question (required + optional). Don't derive from `missing`,
  // because that excludes optional questions and inflates the "done" count on an empty form.
  const answeredCount = useMemo(
    () => questions.filter((q) => isQuestionAnswered(q, answers, photosByQuestion)).length,
    [questions, answers, photosByQuestion],
  );

  if (loading || !template) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const handleQuestionTap = (q) => {
    navigation.navigate(SCREEN_NAMES.MERCH_QUESTION, { visitId, questionId: q.id });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{template.name}</Text>
          <Text style={styles.headerSub}>
            {t('merchAudit.audit.outletType', { type: t(`merchAudit.outletType.${template.outlet_type}`) })}
          </Text>
          <Text style={styles.headerProgress}>
            {t('merchAudit.audit.progress', {
              done: answeredCount,
              total: questions.length,
            })}
          </Text>
        </View>

        {Object.entries(grouped).map(([block, qs]) => (
          <View key={block} style={styles.blockSection}>
            <Text style={styles.blockTitle}>{t(`merchAudit.block.${block}`, { defaultValue: block })}</Text>
            {qs.map((q) => {
              const answered = isQuestionAnswered(q, answers, photosByQuestion);
              return (
                <TouchableOpacity key={q.id} style={styles.row} onPress={() => handleQuestionTap(q)}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.statusDot, answered && styles.statusDotDone]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{q.title}</Text>
                      {q.required && !answered && (
                        <Text style={styles.rowRequired}>{t('merchAudit.audit.requiredLabel')}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.tabBarInactive} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, missing.length > 0 && styles.submitBtnWarn]}
          onPress={() => navigation.navigate(SCREEN_NAMES.MERCH_AUDIT_SUMMARY, { visitId })}
        >
          <Text style={styles.submitBtnText}>
            {missing.length > 0
              ? t('merchAudit.audit.continueMissing', { count: missing.length })
              : t('merchAudit.audit.toSummary')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function groupByBlock(qs) {
  const out = {};
  for (const q of qs) {
    const key = q.block || 'other';
    if (!out[key]) out[key] = [];
    out[key].push(q);
  }
  return out;
}

// Shallow equality for photosByQuestion maps — checks the three fields rendered by
// PhotoThumb (id + qg_passed + upload_status). Misses changes to other audit_photos
// fields, but those flow through dedicated store actions (capture, upload-status
// update), not via the focus-refresh path this guard protects.
function photoMapsEqual(a, b) {
  const ka = Object.keys(a || {});
  const kb = Object.keys(b || {});
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    const al = a[k]; const bl = b[k];
    if (!bl || al.length !== bl.length) return false;
    for (let i = 0; i < al.length; i++) {
      if (al[i].id !== bl[i].id) return false;
      if (al[i].qg_passed !== bl[i].qg_passed) return false;
      if (al[i].upload_status !== bl[i].upload_status) return false;
    }
  }
  return true;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 24 },
  headerCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  headerProgress: { fontSize: 13, color: COLORS.primary, marginTop: 8, fontWeight: '500' },
  blockSection: { backgroundColor: COLORS.white, borderRadius: 14, padding: 12, marginBottom: 12 },
  blockTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  statusDotDone: { backgroundColor: COLORS.success },
  rowTitle: { fontSize: 14, color: COLORS.text },
  rowRequired: { fontSize: 11, color: COLORS.error, marginTop: 2 },
  footer: { padding: 16, backgroundColor: COLORS.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  submitBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnWarn: { backgroundColor: COLORS.accent },
  submitBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
});
