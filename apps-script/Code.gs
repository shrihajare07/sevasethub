/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Backend (Code.gs)
 * Version: 1.0.0 (Production-Ready)
 * Tagline: Connecting You to Trusted Services
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// GLOBAL CONFIGURATION
// ----------------------------------------------------------------------------
const CONFIG = {
  SPREADSHEET_ID: '', // Leave blank to use SpreadsheetApp.getActiveSpreadsheet(), or enter Sheet ID
  TIMEZONE: 'Asia/Kolkata',
  APP_NAME: 'SevaSetuHub',
  APP_URL: 'https://www.sevasetuhub.in',
  DEFAULT_TENANT_ID: 'TNT-DEFAULT',
  DRIVE_ROOT_FOLDER: 'SevaSetuHub_Uploads',
  SESSION_EXPIRY_HOURS: 24,
  PASSWORD_SALT: 'SevaSetuHub_Secured_2026_Salt_#*99',
  SUPERADMIN_DEFAULT: {
    email: 'admin@sevasetuhub.in',
    mobile: '9876543210',
    password: 'AdminPassword@2026',
    firstName: 'Super',
    lastName: 'Admin'
  }
};

// ----------------------------------------------------------------------------
// SHEET NAMES (Constants to avoid hardcoding)
// ----------------------------------------------------------------------------
const SHEETS = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  ROLES: 'Roles',
  SERVICES: 'Services',
  SERVICE_CATEGORIES: 'ServiceCategories',
  CUSTOMERS: 'Customers',
  TECHNICIANS: 'Technicians',
  SERVICE_REQUESTS: 'ServiceRequests',
  ESTIMATES: 'Estimates',
  ESTIMATE_ITEMS: 'EstimateItems',
  WORK_ORDERS: 'WorkOrders',
  APPOINTMENTS: 'Appointments',
  CHECKLISTS: 'Checklists',
  WORK_NOTES: 'WorkNotes',
  PHOTOS: 'Photos',
  MATERIALS: 'Materials',
  SERVICE_REPORTS: 'ServiceReports',
  INVOICES: 'Invoices',
  PAYMENTS: 'Payments',
  FEEDBACK: 'Feedback',
  OFFERS: 'Offers',
  COUPONS: 'Coupons',
  COUPON_USAGE: 'CouponUsage',
  NOTIFICATIONS: 'Notifications',
  AMC: 'AMC',
  EQUIPMENT: 'Equipment',
  AUDIT_LOGS: 'AuditLogs',
  SETTINGS: 'Settings'
};

// ----------------------------------------------------------------------------
// HTTP ROUTING: doGet & doPost
// ----------------------------------------------------------------------------

/**
 * Handle GET requests (API endpoints & Web App Ping)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'ping';

    let responseData;

    switch (action) {
      case 'ping':
        responseData = {
          status: 'online',
          app: CONFIG.APP_NAME,
          timestamp: new Date().toISOString()
        };
        break;

      case 'getServices':
        responseData = ServicesModule.getServices(params);
        break;

      case 'getServiceCategories':
        responseData = ServicesModule.getServiceCategories(params);
        break;

      case 'getOffers':
        responseData = OffersModule.getOffers(params);
        break;

      case 'getCoupons':
        responseData = CouponsModule.getCoupons(params);
        break;

      case 'getCurrentUser':
        responseData = AuthModule.getCurrentUser(params.token);
        break;

      case 'getDashboard':
        responseData = ReportsModule.getDashboardMetrics(params.token);
        break;

      case 'getServiceRequests':
        responseData = RequestsModule.getServiceRequests(params);
        break;

      case 'getServiceRequest':
        responseData = RequestsModule.getServiceRequest(params.requestId, params.token);
        break;

      case 'getWorkOrders':
        responseData = WorkOrdersModule.getWorkOrders(params);
        break;

      case 'getInvoices':
        responseData = PaymentsModule.getInvoices(params);
        break;

      case 'getTechnicians':
        responseData = UsersModule.getTechnicians(params.token);
        break;

      case 'getCustomers':
        responseData = UsersModule.getCustomers(params.token);
        break;

      case 'getNotifications':
        responseData = NotificationsModule.getNotifications(params.token);
        break;

      case 'getAuditLogs':
        responseData = NotificationsModule.getAuditLogs(params.token);
        break;

      case 'getAMC':
        responseData = WorkOrdersModule.getAMCList(params.token);
        break;

      case 'getServiceHistory':
        responseData = WorkOrdersModule.getServiceHistory(params);
        break;

      default:
        return createJsonResponse({
          success: false,
          message: 'Unknown GET action: ' + action,
          errorCode: 'INVALID_ACTION'
        });
    }

    return createJsonResponse({
      success: true,
      data: responseData,
      message: 'Operation completed successfully'
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      data: null,
      message: err.message || 'Internal Server Error',
      errorCode: err.code || 'SERVER_ERROR'
    });
  }
}

/**
 * Handle POST requests (Mutation endpoints)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (pErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || '';
    let responseData;

    switch (action) {
      // Auth Actions
      case 'register':
        responseData = AuthModule.register(payload);
        break;

      case 'login':
        responseData = AuthModule.login(payload.emailOrMobile, payload.password);
        break;

      case 'logout':
        responseData = AuthModule.logout(payload.token);
        break;

      case 'forgotPassword':
        responseData = AuthModule.forgotPassword(payload.emailOrMobile);
        break;

      case 'resetPassword':
        responseData = AuthModule.resetPassword(payload);
        break;

      // Service Requests
      case 'createServiceRequest':
        responseData = RequestsModule.createServiceRequest(payload);
        break;

      case 'updateRequestStatus':
        responseData = RequestsModule.updateStatus(payload);
        break;

      // Estimates
      case 'createEstimate':
        responseData = EstimatesModule.createEstimate(payload);
        break;

      case 'approveEstimate':
        responseData = EstimatesModule.approveEstimate(payload);
        break;

      case 'rejectEstimate':
        responseData = EstimatesModule.rejectEstimate(payload);
        break;

      // Work Orders & Dispatch
      case 'createWorkOrder':
        responseData = WorkOrdersModule.createWorkOrder(payload);
        break;

      case 'assignTechnician':
        responseData = WorkOrdersModule.assignTechnician(payload);
        break;

      case 'scheduleAppointment':
        responseData = WorkOrdersModule.scheduleAppointment(payload);
        break;

      case 'updateJobStatus':
        responseData = WorkOrdersModule.updateJobStatus(payload);
        break;

      case 'saveChecklist':
        responseData = WorkOrdersModule.saveChecklist(payload);
        break;

      case 'saveWorkNotes':
        responseData = WorkOrdersModule.saveWorkNotes(payload);
        break;

      case 'saveSignature':
        responseData = WorkOrdersModule.saveSignature(payload);
        break;

      case 'uploadPhoto':
        responseData = FilesModule.uploadPhoto(payload);
        break;

      case 'completeWorkOrder':
        responseData = WorkOrdersModule.completeWorkOrder(payload);
        break;

      // Offers & Coupons
      case 'validateCoupon':
        responseData = CouponsModule.validateCoupon(payload);
        break;

      case 'createOffer':
        responseData = OffersModule.createOffer(payload);
        break;

      case 'updateOffer':
        responseData = OffersModule.updateOffer(payload);
        break;

      case 'deleteOffer':
        responseData = OffersModule.deleteOffer(payload);
        break;

      case 'createCoupon':
        responseData = CouponsModule.createCoupon(payload);
        break;

      case 'updateCoupon':
        responseData = CouponsModule.updateCoupon(payload);
        break;

      case 'deleteCoupon':
        responseData = CouponsModule.deleteCoupon(payload);
        break;

      // Invoices & Payments
      case 'createInvoice':
        responseData = PaymentsModule.createInvoice(payload);
        break;

      case 'createPayment':
        responseData = PaymentsModule.createPayment(payload);
        break;

      case 'submitFeedback':
        responseData = PaymentsModule.submitFeedback(payload);
        break;

      // Notifications
      case 'markNotificationRead':
        responseData = NotificationsModule.markAsRead(payload.notificationId, payload.token);
        break;

      // Database Setup
      case 'initializeDatabase':
        responseData = initializeDatabase();
        break;

      default:
        return createJsonResponse({
          success: false,
          message: 'Unknown POST action: ' + action,
          errorCode: 'INVALID_ACTION'
        });
    }

    return createJsonResponse({
      success: true,
      data: responseData,
      message: 'Operation completed successfully'
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      data: null,
      message: err.message || 'Internal Server Error',
      errorCode: err.code || 'SERVER_ERROR'
    });
  }
}

/**
 * Standardized JSON Response Formatter with CORS Support
 */
function createJsonResponse(data) {
  const jsonString = JSON.stringify(data);
  return ContentService
    .createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}
