import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../constants/colors';
import { SCREEN_NAMES } from '../../../constants/screens';
import useAuditStore from '../store/auditStore';
import { saveAnswer } from '../services/auditService';
import { removeAuditPhoto } from '../services/photoService';
import QuestionRenderer from '../components/QuestionRenderer';
import { ANSWER_SOURCES } from '../../../constants/merchAudit';

const SAVE_DEBOUNCE_MS = 350;

// Single-question editor. In-memory state updates immediately (UI stays responsive);
// the SQLite write is debounced so rapid typing doesn't queue dozens of awaited
// inserts that block navigation transitions on the way back.
export default function QuestionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { visitId, questionId } = route.params || {};

  // Slice subscriptions — avoid re-rendering on every photo or template field change.
  const template = useAuditStore((s) => s.template);
  const answers = useAuditStore((s) => s.answers);
  const photosByQuestion = useAuditStore((s) => s.photosByQuestion);
  const setAnswer = useAuditStore((s) => s.setAnswer);
  const removePhotoFromQuestion = useAuditStore((s) => s.removePhotoFromQuestion);

  const question = useMemo(() => {
    if (!template?.questions) return null;
    return template.questions.find((q) => q.id === questionId);
  }, [template, questionId]);

  const [local, setLocal] = useState(answers[questionId] || {});

  // Reset local state when navigating between different questions, but ignore
  // changes from our own debounced saves (which would otherwise overwrite typing).
  useEffect(() => {
    setLocal(answers[questionId] || {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  // Debounced DB writer.
  const saveTimerRef = useRef(null);
  const pendingValueRef = useRef(null);

  const flushSave = useCallback(async () => {
    if (!pendingValueRef.current || !question) return;
    const patch = pendingValueRef.current;
    pendingValueRef.current = null;
    try {
      await saveAnswer({
        visitId,
        question,
        answerPatch: { ...patch, source: patch.source || ANSWER_SOURCES.SURVEY },
      });
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  }, [visitId, question, t]);

  // Flush pending save on unmount / blur so a half-typed answer is not lost.
  useEffect(() => {
    const blurUnsub = navigation.addListener('blur', () => {
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
      flushSave();
    });
    return () => {
      blurUnsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flushSave();
    };
  }, [navigation, flushSave]);

  if (!question) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: COLORS.error }}>{t('merchAudit.question.notFound')}</Text>
      </View>
    );
  }

  const handleChange = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    setAnswer(questionId, next);
    pendingValueRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  };

  const handleCapturePhoto = () => {
    navigation.navigate(SCREEN_NAMES.MERCH_PHOTO_CAPTURE, {
      visitId, questionId, photoType: question.photo_type || null,
    });
  };

  const handleRemovePhoto = async (photo) => {
    try {
      await removeAuditPhoto(photo);
      removePhotoFromQuestion(questionId, photo.id);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <QuestionRenderer
        question={question}
        answer={local}
        onChange={handleChange}
        photos={photosByQuestion[questionId] || []}
        onCapturePhoto={handleCapturePhoto}
        onRemovePhoto={handleRemovePhoto}
      />

      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="checkmark" size={20} color={COLORS.white} />
        <Text style={styles.doneBtnText}>{t('merchAudit.question.done')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: 14, borderRadius: 10, marginTop: 8 },
  doneBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
});
