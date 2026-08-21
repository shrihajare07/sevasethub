/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Estimates Engine (Estimates.gs)
 * ============================================================================
 */

const EstimatesModule = {
  /**
   * Create an Estimate for a Service Request (Admin / Dispatcher)
   */
  createEstimate: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin', 'Dispatcher']);

    const requestId = payload.requestId;
    const req = Utils.findOne(SHEETS.SERVICE_REQUESTS, 'RequestId', requestId);
    if (!req) throw new Error('Service Request not found.');

    const estimateId = Utils.generateId('EST');
    const estimateNumber = 'EST-2026-' + Math.floor(1000 + Math.random() * 9000);

    const labour = Number(payload.labourAmount) || 0;
    const material = Number(payload.materialAmount) || 0;
    const discount = Number(payload.discountAmount) || 0;
    const couponDiscount = Number(req.CouponDiscount) || 0;
    const subtotal = Math.max(0, labour + material - discount - couponDiscount);
    const taxRate = 0.18; // 18% GST standard
    const tax = Math.round(subtotal * taxRate);
    const grandTotal = subtotal + tax;

    const validity = payload.validityDate || Utilities.formatDate(new Date(Date.now() + 7 * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');

    const estimateObj = {
      EstimateId: estimateId,
      TenantId: req.TenantId || session.tenantId,
      RequestId: requestId,
      CustomerId: req.CustomerId,
      EstimateNumber: estimateNumber,
      LabourAmount: labour,
      MaterialAmount: material,
      DiscountAmount: discount,
      CouponDiscount: couponDiscount,
      TaxAmount: tax,
      GrandTotal: grandTotal,
      ValidityDate: validity,
      Notes: payload.notes || 'Includes standard manufacturer warranty for replaced parts.',
      Status: 'Pending', // Pending, Approved, Rejected
      CreatedAt: Utils.nowFormatted(),
      ApprovedAt: ''
    };

    Utils.insertRow(SHEETS.ESTIMATES, estimateObj);

    // Save line items if provided
    if (payload.items && Array.isArray(payload.items)) {
      payload.items.forEach(it => {
        Utils.insertRow(SHEETS.ESTIMATE_ITEMS, {
          ItemId: Utils.generateId('ITM'),
          EstimateId: estimateId,
          ItemName: it.itemName || 'Service Item',
          Type: it.type || 'Labour', // Labour / Material
          Quantity: Number(it.quantity) || 1,
          UnitPrice: Number(it.unitPrice) || 0,
          TotalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)
        });
      });
    }

    // Update Request status
    Utils.updateRow(SHEETS.SERVICE_REQUESTS, 'RequestId', requestId, {
      Status: 'Estimate Sent',
      UpdatedAt: Utils.nowFormatted()
    });

    // Notify Customer
    const cust = Utils.findOne(SHEETS.CUSTOMERS, 'CustomerId', req.CustomerId);
    if (cust && cust.UserId) {
      NotificationsModule.createNotification(cust.UserId, req.TenantId, 'Customer', 'Estimate Received', `Estimate #${estimateNumber} for ₹${grandTotal} is ready for your review.`, `#/customer/estimates/${estimateId}`);
    }

    NotificationsModule.logAudit(session.userId, session.tenantId, 'ESTIMATE_CREATED', 'Estimates', estimateId, `Estimate #${estimateNumber} generated for ₹${grandTotal}`);
    return estimateObj;
  },

  /**
   * Customer Approves Estimate -> Automatically Triggers Work Order creation
   */
  approveEstimate: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const estimateId = payload.estimateId;
    const est = Utils.findOne(SHEETS.ESTIMATES, 'EstimateId', estimateId);
    if (!est) throw new Error('Estimate not found.');

    const now = Utils.nowFormatted();
    Utils.updateRow(SHEETS.ESTIMATES, 'EstimateId', estimateId, {
      Status: 'Approved',
      ApprovedAt: now
    });

    // Update Request Status
    Utils.updateRow(SHEETS.SERVICE_REQUESTS, 'RequestId', est.RequestId, {
      Status: 'Approved',
      UpdatedAt: now
    });

    // Automatically Create Draft Work Order
    const workOrder = WorkOrdersModule.createWorkOrderInternal({
      requestId: est.RequestId,
      estimateId: estimateId,
      customerId: est.CustomerId,
      tenantId: est.TenantId
    });

    NotificationsModule.logAudit(session.userId, session.tenantId, 'ESTIMATE_APPROVED', 'Estimates', estimateId, `Estimate approved by customer. Work order #${workOrder.WorkOrderId} created.`);
    return {
      success: true,
      estimate: est,
      workOrder: workOrder,
      message: 'Estimate approved successfully! Work order generated.'
    };
  },

  /**
   * Customer Rejects Estimate
   */
  rejectEstimate: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const estimateId = payload.estimateId;
    const reason = payload.reason || 'Price or timing disagreement';

    const est = Utils.findOne(SHEETS.ESTIMATES, 'EstimateId', estimateId);
    if (!est) throw new Error('Estimate not found.');

    Utils.updateRow(SHEETS.ESTIMATES, 'EstimateId', estimateId, {
      Status: 'Rejected',
      Notes: (est.Notes || '') + ` | Rejection Reason: ${reason}`
    });

    Utils.updateRow(SHEETS.SERVICE_REQUESTS, 'RequestId', est.RequestId, {
      Status: 'Rejected',
      UpdatedAt: Utils.nowFormatted()
    });

    NotificationsModule.logAudit(session.userId, session.tenantId, 'ESTIMATE_REJECTED', 'Estimates', estimateId, `Customer rejected estimate. Reason: ${reason}`);
    return { success: true, message: 'Estimate rejected.' };
  }
};
