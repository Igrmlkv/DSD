export {
  // Core
  getDatabase,
  initDatabase,
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

  // Deliveries
  getDeliveries,
  getDeliveryByRoutePoint,
  getDeliveryItems,
  createDelivery,
  createDeliveryWithItems,
  updateDeliveryStatus,

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
} from './database';
