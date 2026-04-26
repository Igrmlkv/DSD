import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';
import { SCREEN_NAMES } from '../../../constants/screens';
import useAuditStore from '../store/auditStore';
import { submitAudit } from '../services/auditService';
import { processPendingUploads } from '../services/photoUploader';
import { getMissingRequired, countAnswered } from '../services/templateService';

export default function AuditSummaryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { visitId } = route.params || {};
  const template = useAuditStore((s) => s.template);
  const answers = useAuditStore((s) => s.answers);
  const photosByQuestion = useAuditStore((s) => s.photosByQuestion);
  const clear = useAuditStore((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);

  const missing = template ? getMissingRequired(template, answers, photosByQuestion) : [];
  const totalQuestions = template?.questions?.length || 0;
  const answeredCount = template ? countAnswered(template, answers, photosByQuestion) : 0;
  const totalPhotos = Object.values(photosByQuestion).reduce((acc, arr) => acc + arr.length, 0);

  const handleSubmit = async () => {
    if (missing.length > 0) {
      Alert.alert(
        t('merchAudit.summary.missingTitle'),
        t('merchAudit.summary.missingMsg', { count: missing.length }),
      );
      return;
    }
    setSubmitting(true);
    try {
      await submitAudit({ visitId, template, answers, photosByQuestion });
      // Kick off upload pump (best-effort; uploads continue in background).
      processPendingUploads({ batchSize: 10 }).catch(() => {});
      clear();
      // Reset the merch chain (Audit → Question* → Summary) so KpiResult sits
      // directly on top of PresellerVisit. OS back / button-back both lead the
      // merchandiser to the visit screen with the "Complete Visit" CTA.
      const navState = navigation.getState();
      const routes = navState?.routes || [];
      const visitIdx = [...routes].reverse().findIndex((r) => r.name === SCREEN_NAMES.PRESELLER_VISIT);
      if (visitIdx >= 0) {
        const absoluteIdx = routes.length - 1 - visitIdx;
        const preserved = routes.slice(0, absoluteIdx + 1);
        navigation.dispatch(
          CommonActions.reset({
            index: preserved.length,
            routes: [
              ...preserved,
              { name: SCREEN_NAMES.MERCH_KPI_RESULT, params: { visitId } },
            ],
          })
        );
      } else {
        // No PresellerVisit in stack (test bypass entry from PresellerHome) —
        // best we can do is replace AuditSummary with KpiResult.
        navigation.replace(SCREEN_NAMES.MERCH_KPI_RESULT, { visitId });
      }
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{template?.name || ''}</Text>
          <Text style={styles.cardSub}>
            {t('merchAudit.summary.questions', {
              answered: answeredCount,
              total: totalQuestions,
            })}
          </Text>
          <Text style={styles.cardSub}>
            {t('merchAudit.summary.photos', { count: totalPhotos })}
          </Text>
        </View>

        {missing.length > 0 ? (
          <View style={[styles.card, styles.warnCard]}>
            <View style={styles.warnHeader}>
              <Ionicons name="warning" size={18} color={COLORS.error} />
              <Text style={styles.warnTitle}>
                {t('merchAudit.summary.missingHeader', { count: missing.length })}
              </Text>
            </View>
            {missing.map((q) => (
              <Text key={q.id} style={styles.warnItem}>• {q.title}</Text>
            ))}
          </View>
        ) : (
          <View style={[styles.card, styles.okCard]}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.okText}>{t('merchAudit.summary.allRequired')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, missing.length > 0 && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || missing.length > 0}
        >
          {submitting
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitBtnText}>{t('merchAudit.summary.submit')}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  warnCard: { borderWidth: 1, borderColor: COLORS.error + '40' },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  warnTitle: { fontSize: 14, fontWeight: '600', color: COLORS.error },
  warnItem: { fontSize: 13, color: COLORS.text, marginVertical: 2 },
  okCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  okText: { fontSize: 14, color: COLORS.success, fontWeight: '500' },
  footer: { padding: 16, backgroundColor: COLORS.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  submitBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: COLORS.tabBarInactive },
  submitBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
});
