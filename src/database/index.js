export {
  // Core
  getDatabase,
  initDatabase,
  resetAndSeedDatabase,
  clearReferenceData,
  clearAllData,
  generateId,

  // Products
  getAllProducts,
  getProductsWithPrices,
  searchProductByBarcode,

  // Customers
  getAllCustomers,
  getCustomerById,
  getCustomerDebt,

  // Routes
  getRoutesByDate,
  getRoutePoints,
  updateRoutePointStatus,
  updateRouteStatus,
  getActiveVisitCustomer,

  // Orders
  getAllOrders,
  getTodayOrdersByUser,
  getOrdersByCustomer,
  getOrdersByRoutePoint,
  getOrdersByRoutes,
  getOrderById,
  searchOrderByCode,
  getOrderItems,
  createOrder,
  updateOrder,
  shipOrdersByRoutePoint,
  decreaseStock,
  increaseStock,
  deleteOrder,
  saveOrderItems,
  saveOrderWithItems,

  // Deliveries
  getDeliveries,
  getDeliveryByRoutePoint,
  getDeliveryItems,
  createDelivery,
  createDeliveryWithItems,
  updateDeliveryStatus,
  processShipmentDelivery,

  // Returns
  getReturns,
  getReturnsPendingApproval,
  getReturnById,
  getReturnItems,
  createReturn,
  approveReturn,
  rejectReturn,

  // Payments
  getPayments,
  createPayment,
  getPaymentsByRoute,

  // Stock & Warehouse
  getStockWithProducts,
  getVehicleByDriver,
  getActiveVehicles,
  assignVehicleToDriver,
  getVehicleStock,
  hasNonZeroVehicleStock,
  getAvailableVehicleStock,
  getUnloadingData,

  // Loading Trips
  hasVerifiedLoadingTrip,
  getLoadingTrips,
  getLoadingTripItems,
  updateLoadingTripItem,
  updateLoadingTripStatus,

  // Cash Collections
  getCashCollections,
  createCashCollection,

  // Packaging Returns
  getPackagingReturns,
  getPackagingReturnItems,
  createPackagingReturn,
  savePackagingReturnItems,

  // Notifications
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,

  // Devices (Admin)
  getDevices,
  getDeviceById,

  // Audit Log (Admin)
  getAuditLog,
  addAuditEntry,

  // Error Log (Structured Logging)
  getErrorLogs,
  addErrorLog,
  getErrorLogStats,
  getErrorLogSources,
  clearErrorLogs,

  // Users (Admin)
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  ensureUserInDb,

  // Supervisor Analytics
  getSupervisorStats,
  getExpeditorProgress,

  // Sync
  getSyncStats,
  getSyncConflicts,
  getSyncDashboardData,

  // Stats
  getDbStats,

  // Tour Check-in/Check-out
  createTourCheckin,
  updateTourCheckin,
  getTodayTourCheckin,
  getLastOdometerReading,
  saveVehicleCheckItems,
  getVehicleCheckItems,
  syncTourCheckin,
  getOrCreateTodayCheckin,
  getOrCreateTodayEndCheckin,
  getTodayPaymentsTotal,
  getTodayCashPaymentsTotal,

  // Expenses
  getExpenseTypes,
  ensureExpenseTypes,
  getTodayExpenses,
  getTodayExpensesTotal,
  createExpense,
  updateExpense,
  deleteExpense,
  createExpenseAttachment,
  getExpenseAttachments,
  deleteExpenseAttachment,
  deleteAllExpenseAttachments,

  // Visit Reports
  createVisitReport,
  getVisitReportByPoint,
  getVisitReportsByRoute,

  // Inventory Adjustments
  ensureAdjustmentReasons,
  getAdjustmentReasons,
  createInventoryAdjustment,
  getInventoryAdjustments,
  getInventoryAdjustmentItems,

  // On Hand Inventory
  createOnHandInventory,
  getOnHandInventory,
  getOnHandInventoryItems,
  getLatestOnHandForCustomer,
  discardOnHandInventory,
  cancelOnHandInventory,

  // Supervisor Auth
  verifySupervisorPassword,

  // Empties
  getEmptiesStock,
  getEmptyProducts,
  getProductEmpties,

  // GPS Tracking
  insertGpsTrack,
  getGpsTracksByRoute,
  getLatestDriverPosition,
  getAllDriverPositions,
  updateRoutePointCoords,
  getGpsTrackStats,
} from './database';
