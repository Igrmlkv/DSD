// =====================================================
// Payload builders for sync operations pushed to dsdMW
// Each builder normalizes data into the format expected
// by the middleware API contract.
// =====================================================

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
