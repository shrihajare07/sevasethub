/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Service Requests (Requests.gs)
 * ============================================================================
 */

const RequestsModule = {
  /**
   * Create a Multi-Step Service Request (Customer or Guest with account)
   */
  createServiceRequest: function(payload) {
    let customerId = payload.customerId;
    let userId = payload.userId;
    let tenantId = payload.tenantId || CONFIG.DEFAULT_TENANT_ID;
    let customerName = payload.customerName || '';
    let customerMobile = payload.customerMobile || '';
    let customerEmail = payload.customerEmail || '';

    // If authenticated via token, extract verified session info
    if (payload.token) {
      const session = AuthModule.validateSession(payload.token);
      userId = session.userId;
      tenantId = session.tenantId;
      const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', session.userId);
      if (cust) {
        customerId = cust.CustomerId;
        customerName = cust.FullName;
        customerMobile = cust.Mobile;
        customerEmail = cust.Email;
      }
    }

    if (!customerId) {
      // Auto-register guest if not exists
      const existingUser = Utils.getAllRows(SHEETS.USERS).find(u => u.Email.toLowerCase() === (customerEmail || '').toLowerCase() || u.Mobile === customerMobile);
      if (existingUser) {
        userId = existingUser.UserId;
        const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', userId);
        if (cust) customerId = cust.CustomerId;
      } else {
        const regRes = AuthModule.register({
          email: customerEmail || `customer_${Date.now()}@sevasetuhub.in`,
          mobile: customerMobile || '9999999999',
          password: 'User@' + Math.floor(1000 + Math.random() * 9000),
          firstName: customerName || 'Valued',
          lastName: 'Customer',
          address: payload.address || '',
          city: payload.city || '',
          pincode: payload.pincode || '',
          tenantId: tenantId
        });
        userId = regRes.user.userId;
        customerId = regRes.user.customerId;
      }
    }

    // Validate Coupon if applied
    let couponDiscount = 0;
    let couponCode = payload.couponCode ? payload.couponCode.trim().toUpperCase() : '';
    if (couponCode) {
      try {
        const cpnRes = CouponsModule.validateCouponInternal(couponCode, userId, payload.serviceId, payload.basePrice || 0, tenantId);
        if (cpnRes.valid) {
          couponDiscount = cpnRes.discount;
        } else {
          couponCode = ''; // Invalidate if not matching
        }
      } catch (cErr) {
        couponCode = '';
      }
    }

    const requestId = Utils.generateId('REQ');
    const now = Utils.nowFormatted();

    const requestObj = {
      RequestId: requestId,
      TenantId: tenantId,
      CustomerId: customerId,
      CustomerName: customerName,
      CustomerMobile: customerMobile,
      CustomerEmail: customerEmail,
      CategoryId: payload.categoryId || '',
      ServiceId: payload.serviceId || '',
      ServiceName: payload.serviceName || 'Custom Service',
      IssueDescription: payload.issueDescription || '',
      Address: payload.address || '',
      City: payload.city || 'Kolhapur',
      Pincode: payload.pincode || '',
      PreferredDate: payload.preferredDate || Utilities.formatDate(new Date(Date.now() + 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      PreferredTimeSlot: payload.preferredTimeSlot || '10:00 AM - 01:00 PM',
      CouponCode: couponCode,
      CouponDiscount: couponDiscount,
      Status: 'New', // Lifecycle: New -> Under Review -> Estimate Sent -> Approved -> Scheduled -> Assigned -> In Progress -> Completed -> Cancelled
      Priority: payload.priority || 'Medium',
      CreatedAt: now,
      UpdatedAt: now
    };

    Utils.insertRow(SHEETS.SERVICE_REQUESTS, requestObj);

    // If coupon used, record usage
    if (couponCode && couponDiscount > 0) {
      CouponsModule.recordCouponUsage(couponCode, userId, tenantId, requestId, couponDiscount);
    }

    // Notify Customer & Dispatchers
    NotificationsModule.createNotification(userId, tenantId, 'Customer', 'Service Request Created', `Your request #${requestId} for ${requestObj.ServiceName} has been placed successfully.`, `#/customer/requests/${requestId}`);
    NotificationsModule.createRoleNotification(tenantId, 'Dispatcher', 'New Service Request', `New request #${requestId} from ${customerName} (${requestObj.ServiceName}).`, `#/admin/requests`);

    NotificationsModule.logAudit(userId, tenantId, 'REQUEST_CREATED', 'ServiceRequests', requestId, `Service request created by ${customerName}`);

    return requestObj;
  },

  /**
   * Get Service Requests (Scoped by Role & Tenant)
   */
  getServiceRequests: function(params) {
    const session = AuthModule.validateSession(params.token);
    const all = Utils.getAllRows(SHEETS.SERVICE_REQUESTS);

    let filtered = all;

    if (session.role === 'Customer') {
      const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', session.userId);
      const custId = cust ? cust.CustomerId : '';
      filtered = all.filter(r => r.CustomerId === custId || r.CustomerEmail === session.email || r.CustomerMobile === session.mobile);
    } else if (session.role === 'Technician') {
      const tech = Utils.findOne(SHEETS.TECHNICIANS, 'UserId', session.userId);
      const techId = tech ? tech.TechnicianId : '';
      const assignedWorkOrders = Utils.findRows(SHEETS.WORK_ORDERS, 'TechnicianId', techId);
      const reqIds = assignedWorkOrders.map(wo => wo.RequestId);
      filtered = all.filter(r => reqIds.includes(r.RequestId));
    } else if (session.role === 'BusinessAdmin' || session.role === 'Dispatcher' || session.role === 'Accountant') {
      filtered = all.filter(r => r.TenantId === session.tenantId);
    } // SuperAdmin sees all

    if (params.status && params.status !== 'All') {
      filtered = filtered.filter(r => r.Status.toLowerCase() === params.status.toLowerCase());
    }

    return filtered.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
  },

  /**
   * Get Detailed Service Request with Estimates, WorkOrders, Checklist, Photos
   */
  getServiceRequest: function(requestId, token) {
    const session = AuthModule.validateSession(token);
    const request = Utils.findOne(SHEETS.SERVICE_REQUESTS, 'RequestId', requestId);
    if (!request) throw new Error('Service request not found.');

    // RBAC validation
    if (session.role === 'Customer') {
      const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', session.userId);
      if (cust && cust.CustomerId !== request.CustomerId && request.CustomerEmail !== session.email) {
        throw new Error('Unauthorized to view this request.');
      }
    }

    const estimates = Utils.findRows(SHEETS.ESTIMATES, 'RequestId', requestId);
    const workOrders = Utils.findRows(SHEETS.WORK_ORDERS, 'RequestId', requestId);
    const photos = Utils.findRows(SHEETS.PHOTOS, 'RequestId', requestId);
    const reports = Utils.findRows(SHEETS.SERVICE_REPORTS, 'RequestId', requestId);
    const invoices = Utils.findRows(SHEETS.INVOICES, 'RequestId', requestId);
    const feedback = Utils.findRows(SHEETS.FEEDBACK, 'RequestId', requestId);

    return {
      request: request,
      estimates: estimates,
      workOrders: workOrders,
      photos: photos,
      reports: reports,
      invoices: invoices,
      feedback: feedback
    };
  },

  /**
   * Update Request Status
   */
  updateStatus: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin', 'Dispatcher']);

    const requestId = payload.requestId;
    const newStatus = payload.status;
    const notes = payload.notes || '';

    const req = Utils.findOne(SHEETS.SERVICE_REQUESTS, 'RequestId', requestId);
    if (!req) throw new Error('Request not found.');

    Utils.updateRow(SHEETS.SERVICE_REQUESTS, 'RequestId', requestId, {
      Status: newStatus,
      UpdatedAt: Utils.nowFormatted()
    });

    NotificationsModule.logAudit(session.userId, session.tenantId, 'STATUS_UPDATED', 'ServiceRequests', requestId, `Status changed to ${newStatus}. Notes: ${notes}`);
    return { success: true, requestId: requestId, status: newStatus };
  }
};
