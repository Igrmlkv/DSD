export {
  // Core
  getDatabase,
  initDatabase,
  resetAndSeedDatabase,
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
  getOrdersByCustomer,
  getOrdersByRoutePoint,
  getOrderById,
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
  getVehicleStock,
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

  // Users (Admin)
  getAllUsers,
  getUserById,
  createUser,
  updateUser,

  // Supervisor Analytics
  getSupervisorStats,
  getExpeditorProgress,

  // Sync
  getSyncStats,
  getSyncConflicts,

  // Stats
  getDbStats,

  // Tour Check-in/Check-out
  createTourCheckin,
  updateTourCheckin,
  getTodayTourCheckin,
  getLastOdometerReading,
  saveVehicleCheckItems,
  getVehicleCheckItems,
  getOrCreateTodayCheckin,
  getOrCreateTodayEndCheckin,
  getTodayPaymentsTotal,

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

  // GPS Tracking
  insertGpsTrack,
  getGpsTracksByRoute,
  getLatestDriverPosition,
  getAllDriverPositions,
  updateRoutePointCoords,
  getGpsTrackStats,
} from './database';
