// =====================================================
// Payload builders for sync operations pushed to dsdMW
// Each builder normalizes data into the format expected
// by the middleware API contract.
// =====================================================

import { safeParse } from '../utils/json';
import { REPORT_KIND } from '../constants/merchAudit';

export function buildOrderPayload(order, items) {
  return { ...order, items };
}

export function buildDeliveryPayload(delivery, items) {
  return { ...delivery, items };
}

export function buildReturnPayload(ret, items) {
  return { ...ret, items };
}

export function buildPackagingReturnPayload(pr, items) {
  return { ...pr, items };
}

export function buildInventoryAdjustmentPayload(adj, items) {
  return { ...adj, items };
}

export function buildOnHandInventoryPayload(inv, items) {
  return { ...inv, items };
}

export function buildCashCollectionPayload(collection) {
  return { ...collection };
}

export function buildLoadingTripPayload(trip, items) {
  return { ...trip, items };
}

export function buildTourCheckinPayload(checkin, vehicleCheckItems) {
  return { ...checkin, vehicle_check_items: vehicleCheckItems || [] };
}

export function buildVisitReportPayload(report, photos) {
  return { ...report, photos: photos || [] };
}

export function buildExpensePayload(expense, attachments) {
  return { ...expense, attachments: attachments || [] };
}

export function buildGpsTrackBatchPayload(tracks) {
  return { tracks };
}

export function buildRouteStatusPayload(routeId, status) {
  return { route_id: routeId, status };
}

export function buildRoutePointStatusPayload(pointId, status, arrival, departure, coords) {
  return {
    route_point_id: pointId,
    status,
    actual_arrival: arrival || null,
    actual_departure: departure || null,
    ...coords,
  };
}

// =====================================================
// Merchandising Audit (spec §7.1)
// =====================================================

export function buildAuditVisitPayload(visit, answers, photos) {
  return {
    id: visit.id,
    report_kind: visit.report_kind || REPORT_KIND.MERCH_AUDIT,
    route_point_id: visit.route_point_id,
    route_id: visit.route_id || null,
    customer_id: visit.customer_id || null,
    user_id: visit.user_id,
    outlet_type: visit.outlet_type,
    template_id: visit.template_id,
    template_version: visit.template_version,
    started_at: visit.created_at,
    submitted_at: visit.updated_at,
    status: visit.status,
    ml_status: visit.ml_status || null,
    pss: visit.pss != null ? visit.pss : null,
    kpi_payload: visit.kpi_payload ? safeParse(visit.kpi_payload) : null,
    notes: visit.notes || null,
    answers: (answers || []).map(buildAuditAnswerPayload),
    photos: (photos || []).map(buildAuditPhotoPayload),
  };
}

export function buildAuditAnswerPayload(a) {
  return {
    id: a.id,
    visit_report_id: a.visit_report_id,
    question_id: a.question_id,
    kpi_codes: a.kpi_codes ? safeParse(a.kpi_codes) : null,
    value_text: a.value_text != null ? a.value_text : undefined,
    value_number: a.value_number != null ? a.value_number : undefined,
    value_bool: a.value_bool != null ? !!a.value_bool : undefined,
    value_json: a.value_json ? safeParse(a.value_json) : undefined,
    ml_value: a.ml_value || undefined,
    discrepancy: a.discrepancy ? 1 : 0,
    source: a.source,
    confidence: a.confidence != null ? a.confidence : undefined,
  };
}

export function buildAuditPhotoPayload(p) {
  return {
    id: p.id,
    visit_report_id: p.visit_report_id,
    question_id: p.question_id || null,
    photo_type: p.photo_type || null,
    hash_sha256: p.hash_sha256 || null,
    exif_json: p.exif_json ? safeParse(p.exif_json) : null,
    qg_passed: p.qg_passed != null ? !!p.qg_passed : null,
    qg_metrics: p.qg_metrics ? safeParse(p.qg_metrics) : null,
    upload_status: p.upload_status,
    remote_url: p.remote_url || null,
  };
}

