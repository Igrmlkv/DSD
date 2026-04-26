import {
  createAuditVisit, updateAuditVisit, getAuditVisit,
  upsertAuditAnswer, listAuditAnswers, listAuditPhotos,
  submitAuditVisit, saveKpiResult, clearKpiResults,
} from '../../../database';
import { computeLocalKpis, classifyStatus } from './kpiEngine';
import { loadTemplateForOutlet, loadTemplateById } from './templateService';
import useSettingsStore from '../../../store/settingsStore';
import useAuthStore from '../../../store/authStore';
import {
  KPI_ENGINE_MODES, ANSWER_SOURCES, ML_STATUSES, VISIT_AUDIT_STATUS,
} from '../../../constants/merchAudit';
import { logInfo } from '../../../services/loggerService';
import { safeParse } from '../../../utils/json';

const TAG = 'merch.auditService';

// Marker stored in visit_reports.notes for audits started from the test-bypass entry.
// Filtered out by findAuditByPointAndStatus so production "resume draft" / "report
// already submitted" lookups never see a fake audit.
export const TEST_AUDIT_NOTES_MARKER = '[TEST]';

// Creates a draft audit_visit and returns a hydrated state object for the auditStore.
export async function startAudit({ outletType, customer, routePoint, testMode = false }) {
  const tpl = await loadTemplateForOutlet(outletType);
  if (!tpl) throw new Error(`No active template for outlet_type=${outletType}`);
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('No authenticated user');

  const visitId = await createAuditVisit({
    route_point_id: routePoint?.id,
    route_id: routePoint?.route_id || null,
    customer_id: customer?.id || null,
    user_id: user.id,
    outlet_type: outletType,
    template_id: tpl.id,
    template_version: tpl.version,
    status: VISIT_AUDIT_STATUS.DRAFT,
    ml_status: ML_STATUSES.SURVEY_ONLY,
    checklist: {},
    notes: testMode ? TEST_AUDIT_NOTES_MARKER : null,
  });

  logInfo(TAG, `Audit started: visit=${visitId} template=${tpl.id} v${tpl.version}`);

  return {
    visitId,
    template: tpl,
    outletType,
    routePointId: routePoint?.id,
    customerId: customer?.id || null,
  };
}

// Loads a draft audit back into auditStore-compatible shape.
export async function loadDraftAudit(visitId) {
  const visit = await getAuditVisit(visitId);
  if (!visit) return null;
  const tpl = await loadTemplateById(visit.template_id);
  const answersRows = await listAuditAnswers(visitId);
  const photoRows = await listAuditPhotos(visitId);

  const answers = {};
  for (const row of answersRows) {
    answers[row.question_id] = {
      value_text: row.value_text,
      value_number: row.value_number,
      value_bool: row.value_bool != null ? !!row.value_bool : null,
      value_json: safeParse(row.value_json),
      ml_value: row.ml_value,
      discrepancy: !!row.discrepancy,
      source: row.source,
      confidence: row.confidence,
    };
  }

  const photosByQuestion = {};
  for (const p of photoRows) {
    const qid = p.question_id || '__no_question__';
    if (!photosByQuestion[qid]) photosByQuestion[qid] = [];
    photosByQuestion[qid].push(p);
  }

  return { visit, template: tpl, answers, photosByQuestion };
}

// Persists a single answer for a question.
export async function saveAnswer({ visitId, question, answerPatch }) {
  const row = {
    visit_report_id: visitId,
    question_id: question.id,
    kpi_codes: question.kpi_codes || [],
    source: answerPatch.source || ANSWER_SOURCES.SURVEY,
    confidence: answerPatch.confidence != null ? answerPatch.confidence : null,
    ml_value: answerPatch.ml_value != null ? answerPatch.ml_value : null,
    discrepancy: !!answerPatch.discrepancy,
    value_text: answerPatch.value_text,
    value_number: answerPatch.value_number,
    value_bool: answerPatch.value_bool,
    value_json: answerPatch.value_json,
  };
  await upsertAuditAnswer(row);
}

// Submits the audit:
//   - marks visit as 'submitted'
//   - in dual mode: computes local KPIs and persists them with source='survey' (or mixed).
//     Server values arriving later overwrite by source — local rows have source='survey'.
//   - logs to sync_log via submitAuditVisit (sync push picks it up).
export async function submitAudit({ visitId, template, answers, photosByQuestion }) {
  let localKpis = null;
  let pss = null;
  const mode = useSettingsStore.getState().kpiEngineMode;
  if (mode === KPI_ENGINE_MODES.DUAL) {
    const out = computeLocalKpis(template, answers, photosByQuestion);
    localKpis = out.kpis;
    pss = out.pss;
    // Persist local KPI rows for the result screen to read (will be replaced when server returns its own).
    await clearKpiResults(visitId, ANSWER_SOURCES.SURVEY);
    for (const k of localKpis) {
      await saveKpiResult({ ...k, visit_report_id: visitId });
    }
  }

  await submitAuditVisit(
    visitId,
    localKpis ? { kpis: localKpis, pss } : null,
    pss != null ? pss : null,
  );

  return { localKpis, pss };
}

// Updates ml_status (used by future v2 flow).
export async function setVisitMlStatus(visitId, mlStatus) {
  await updateAuditVisit(visitId, { ml_status: mlStatus });
}

