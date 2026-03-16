// Centralized status constants to avoid hardcoded strings

export const ORDER_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const ROUTE_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const VISIT_STATUS = {
  PENDING: 'pending',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
};

export const DELIVERY_STATUS = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  PARTIAL: 'partial',
  REJECTED: 'rejected',
};

export const RETURN_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSED: 'processed',
};

export const LOADING_TRIP_STATUS = {
  PLANNED: 'planned',
  LOADING: 'loading',
  LOADED: 'loaded',
  VERIFIED: 'verified',
};

export const PAYMENT_TYPE = {
  CASH: 'cash',
  CARD: 'card',
  QR: 'qr',
  TRANSFER: 'transfer',
};

export const TOUR_CHECKIN_TYPE = {
  START: 'start',
  END: 'end',
};

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

export const DELIVERY_NOTE_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
};

export const CASH_COLLECTION_STATUS = {
  PENDING: 'pending',
  COLLECTED: 'collected',
  VERIFIED: 'verified',
  DISCREPANCY: 'discrepancy',
};

export const PACKAGING_RETURN_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PROCESSED: 'processed',
};

export const ON_HAND_INVENTORY_STATUS = {
  DRAFT: 'draft',
  CAPTURED: 'captured',
  DISCARDED: 'discarded',
  CANCELLED: 'cancelled',
};

export const ADJUSTMENT_STATUS = {
  CONFIRMED: 'confirmed',
};

export const CHECKIN_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};
