import {
  getActiveAuditTemplate,
  getAuditTemplateById,
  getAllActiveAuditTemplates,
} from '../../../database';
import { logWarning } from '../../../services/loggerService';
import { safeParse } from '../../../utils/json';
import { QUESTION_TYPES } from '../../../constants/merchAudit';

const TAG = 'merch.templateService';

// Loads the active template for an outlet type and returns it with questions/scoring parsed.
export async function loadTemplateForOutlet(outletType) {
  if (!outletType) return null;
  const row = await getActiveAuditTemplate(outletType);
  if (!row) {
    logWarning(TAG, `No active audit_template for outlet_type=${outletType}`);
    return null;
  }
  return parseTemplate(row);
}

export async function loadTemplateById(id) {
  const row = await getAuditTemplateById(id);
  return row ? parseTemplate(row) : null;
}

export async function loadAllActiveTemplates() {
  const rows = await getAllActiveAuditTemplates();
  return rows.map(parseTemplate);
}

function parseTemplate(row) {
  return {
    ...row,
    questions: safeParse(row.questions, []),
    scoring: safeParse(row.scoring, { blocks: {} }),
  };
}

// Returns the list of questions in the template flattened (preserves order).
export function getQuestions(template) {
  if (!template) return [];
  return Array.isArray(template.questions) ? template.questions : [];
}

// Required-question check for the summary screen: every required question
// must have an answer (and required photos must be present).
export function getMissingRequired(template, answers, photosByQuestion) {
  const out = [];
  for (const q of getQuestions(template)) {
    if (!q.required) continue;
    const ans = answers[q.id];
    if (q.type === QUESTION_TYPES.PHOTO || q.type === QUESTION_TYPES.PHOTO_REQUIRED) {
      const photos = photosByQuestion[q.id] || [];
      const min = q.min_photos != null ? q.min_photos : (q.type === QUESTION_TYPES.PHOTO_REQUIRED ? 1 : 0);
      if (photos.length < min) out.push(q);
      continue;
    }
    if (!ans || isEmpty(ans)) {
      out.push(q);
    }
  }
  return out;
}

function isEmpty(ans) {
  if (!ans) return true;
  if (ans.value_text != null && String(ans.value_text).length > 0) return false;
  if (ans.value_number != null) return false;
  if (ans.value_bool != null) return false;
  if (ans.value_json != null) {
    if (Array.isArray(ans.value_json) && ans.value_json.length > 0) return false;
    if (typeof ans.value_json === 'object' && Object.keys(ans.value_json).length > 0) return false;
  }
  return true;
}

// True if the question has a meaningful answer (or sufficient photos for photo-typed questions).
// Used by progress counters on AuditScreen / AuditSummaryScreen.
export function isQuestionAnswered(q, answers, photosByQuestion) {
  if (!q) return false;
  if (q.type === 'photo' || q.type === 'photo_required') {
    const photos = (photosByQuestion && photosByQuestion[q.id]) || [];
    const min = q.min_photos != null ? q.min_photos : (q.type === 'photo_required' ? 1 : 0);
    return photos.length >= Math.max(1, min);
  }
  return !isEmpty(answers && answers[q.id]);
}

// Counts how many questions in the template have a meaningful answer.
export function countAnswered(template, answers, photosByQuestion) {
  return getQuestions(template).filter((q) => isQuestionAnswered(q, answers, photosByQuestion)).length;
}
