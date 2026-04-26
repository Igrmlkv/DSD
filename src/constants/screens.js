export const SCREEN_NAMES = {
  // Auth
  LOGIN: 'Login',
  PIN: 'Pin',

  // Tab names (top-level navigation per role)
  EXPEDITOR_HOME: 'ExpeditorHome',
  SUPERVISOR_HOME: 'SupervisorHome',
  ADMIN_HOME: 'AdminHome',
  ROUTE_TAB: 'RouteTab',
  WAREHOUSE_OPS_TAB: 'WarehouseOpsTab',
  PROFILE_TAB: 'ProfileTab',
  MONITORING_TAB: 'MonitoringTab',
  RETURNS_APPROVAL_TAB: 'ReturnsApprovalTab',
  ANALYTICS_TAB: 'AnalyticsTab',
  USERS_TAB: 'UsersTab',
  DEVICES_TAB: 'DevicesTab',
  SYNC_TAB: 'SyncTab',
  SETTINGS_TAB: 'SettingsTab',

  // Expeditor stack screens
  ROUTE_LIST: 'RouteList',
  ROUTE_MAP: 'RouteMap',
  VISIT: 'Visit',
  SHIPMENT: 'Shipment',
  RETURNS: 'Returns',
  PACKAGING_RETURNS: 'PackagingReturns',
  PAYMENT: 'Payment',
  LOADING_TRIP: 'LoadingTrip',
  INVENTORY_CHECK: 'InventoryCheck',
  CASH_COLLECTION: 'CashCollection',
  SIGNATURE: 'Signature',
  SCANNING: 'Scanning',
  VEHICLE_UNLOADING: 'VehicleUnloading',
  START_OF_DAY: 'StartOfDay',
  END_OF_DAY: 'EndOfDay',
  EXPENSES: 'Expenses',
  INVOICE_SUMMARY: 'InvoiceSummary',
  DOCUMENT_VIEW: 'DocumentView',
  PRINT_PREVIEW: 'PrintPreview',

  // Supervisor stack screens
  MONITORING_MAP: 'MonitoringMap',
  EXPEDITOR_ROUTE_DETAIL: 'ExpeditorRouteDetail',
  RETURN_APPROVAL_LIST: 'ReturnApprovalList',
  RETURN_APPROVAL_DETAIL: 'ReturnApprovalDetail',
  ANALYTICS_REPORTS: 'AnalyticsReports',

  // Admin stack screens
  USER_MANAGEMENT: 'UserManagement',
  USER_EDIT: 'UserEdit',
  DEVICE_MANAGEMENT: 'DeviceManagement',
  SYNC_MONITORING: 'SyncMonitoring',
  CONFLICT_RESOLUTION: 'ConflictResolution',
  AUDIT_LOG: 'AuditLog',
  ERROR_LOG: 'ErrorLog',
  SYSTEM_SETTINGS: 'SystemSettings',

  // Inventory extended
  ADJUST_INVENTORY: 'AdjustInventory',
  CAPTURE_ON_HAND: 'CaptureOnHand',

  // Preseller screens
  PRESELLER_HOME: 'PresellerHome',
  PRESELLER_VISIT: 'PresellerVisit',
  ORDER_CONFIRMATION: 'OrderConfirmation',
  VISIT_REPORT: 'VisitReport',

  // Order screens (shared)
  ORDERS_LIST: 'OrdersList',
  ORDER_EDIT: 'OrderEdit',

  // Customer / Material screens
  CUSTOMER_DETAIL: 'CustomerDetail',

  // Shared screens
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
  NOTIFICATIONS: 'Notifications',

  // Merchandising Audit (preseller, gated by settingsStore.merchandisingEnabled).
  // Screens live inside PresellerRouteStack, not a separate tab — when the flag is on,
  // the "Отчёт о визите" button on PresellerVisitScreen opens MERCH_AUDIT in place
  // of the legacy VISIT_REPORT screen.
  MERCH_AUDIT_LIST: 'MerchAuditList',
  MERCH_AUDIT: 'MerchAudit',
  MERCH_QUESTION: 'MerchQuestion',
  MERCH_PHOTO_CAPTURE: 'MerchPhotoCapture',
  MERCH_AUDIT_SUMMARY: 'MerchAuditSummary',
  MERCH_KPI_RESULT: 'MerchKpiResult',
};
