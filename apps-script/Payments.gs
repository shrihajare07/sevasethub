/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Invoicing & Payment Processing (Payments.gs)
 * ============================================================================
 */

const PaymentsModule = {
  /**
   * Internal creation of Invoice from Request & Estimate
   */
  createInvoiceInternal: function(requestId, workOrderId, customerId, tenantId) {
    const est = Utils.findOne(SHEETS.ESTIMATES, 'RequestId', requestId);
    const req = Utils.findOne(SHEETS.SERVICE_REQUESTS, 'RequestId', requestId);
    const invoiceId = Utils.generateId('INV');
    const invoiceNumber = 'INV-2026-' + Math.floor(1000 + Math.random() * 9000);

    const labourTotal = est ? Number(est.LabourAmount) : (req ? Number(req.BasePrice || 599) : 599);
    const materialTotal = est ? Number(est.MaterialAmount) : 0;
    const discountTotal = (est ? Number(est.DiscountAmount) : 0) + (req ? Number(req.CouponDiscount || 0) : 0);
    const subtotal = Math.max(0, labourTotal + materialTotal - discountTotal);
    
    const gstCalc = SettingsModule.calculateTax(subtotal, tenantId, req ? (req.City || '') : '');
    const taxTotal = gstCalc.taxTotal;
    const grandTotal = gstCalc.grandTotal;

    const invoiceObj = {
      InvoiceId: invoiceId,
      TenantId: tenantId || CONFIG.DEFAULT_TENANT_ID,
      InvoiceNumber: invoiceNumber,
      RequestId: requestId,
      WorkOrderId: workOrderId || '',
      CustomerId: customerId,
      LabourTotal: labourTotal,
      MaterialTotal: materialTotal,
      TaxableTotal: subtotal,
      GSTRate: gstCalc.gstRate,
      CGSTRate: gstCalc.cgstRate,
      CGSTAmount: gstCalc.cgstAmount,
      SGSTRate: gstCalc.sgstRate,
      SGSTAmount: gstCalc.sgstAmount,
      IGSTRate: gstCalc.igstRate,
      IGSTAmount: gstCalc.igstAmount,
      TaxTotal: taxTotal,
      DiscountTotal: discountTotal,
      GrandTotal: grandTotal,
      SACCode: gstCalc.sacCode,
      GSTIN: gstCalc.gstin,
      PaymentStatus: 'Pending', // Pending, Paid, Partially Paid, Refunded
      DueDate: Utilities.formatDate(new Date(Date.now() + 3 * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      CreatedAt: Utils.nowFormatted()
    };

    Utils.insertRow(SHEETS.INVOICES, invoiceObj);

    // Notify Customer
    const cust = Utils.findOne(SHEETS.CUSTOMERS, 'CustomerId', customerId);
    if (cust && cust.UserId) {
      NotificationsModule.createNotification(cust.UserId, tenantId, 'Customer', 'Invoice Generated', `Invoice #${invoiceNumber} for ₹${grandTotal} is ready for payment.`, `#/customer/invoices/${invoiceId}`);
    }

    return invoiceObj;
  },

  /**
   * Get Invoices (Scoped by User / Role)
   */
  getInvoices: function(params) {
    const session = AuthModule.validateSession(params.token);
    const all = Utils.getAllRows(SHEETS.INVOICES);

    let filtered = all;
    if (session.role === 'Customer') {
      const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', session.userId);
      const custId = cust ? cust.CustomerId : '';
      filtered = all.filter(inv => inv.CustomerId === custId);
    } else if (session.role !== 'SuperAdmin') {
      filtered = all.filter(inv => inv.TenantId === session.tenantId);
    }

    // Attach request data
    const requests = Utils.getAllRows(SHEETS.SERVICE_REQUESTS);
    return filtered.map(inv => {
      const req = requests.find(r => r.RequestId === inv.RequestId) || {};
      const payments = Utils.findRows(SHEETS.PAYMENTS, 'InvoiceId', inv.InvoiceId);
      return {
        ...inv,
        serviceName: req.ServiceName || 'Service Execution',
        customerName: req.CustomerName || 'Valued Customer',
        payments: payments
      };
    }).sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
  },

  /**
   * Process Customer Payment (Simulated / Payment Gateway Ready)
   */
  createPayment: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const invoiceId = payload.invoiceId;
    const amount = Number(payload.amount);
    const method = payload.paymentMethod || 'UPI'; // UPI, Card, NetBanking, Cash
    const transactionId = payload.transactionId || 'TXN-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    const inv = Utils.findOne(SHEETS.INVOICES, 'InvoiceId', invoiceId);
    if (!inv) throw new Error('Invoice not found.');

    const paymentId = Utils.generateId('PAY');
    const now = Utils.nowFormatted();

    const paymentObj = {
      PaymentId: paymentId,
      TenantId: inv.TenantId,
      InvoiceId: invoiceId,
      CustomerId: inv.CustomerId,
      Amount: amount || inv.GrandTotal,
      PaymentMethod: method,
      TransactionId: transactionId,
      Status: 'Successful', // Successful, Pending, Failed, Refunded
      ReceiptUrl: '#',
      PaidAt: now
    };

    Utils.insertRow(SHEETS.PAYMENTS, paymentObj);

    // Update Invoice Status
    Utils.updateRow(SHEETS.INVOICES, 'InvoiceId', invoiceId, {
      PaymentStatus: 'Paid'
    });

    // Notify Customer & Accountant
    NotificationsModule.createNotification(session.userId, session.tenantId, 'Customer', 'Payment Successful', `Payment of ₹${paymentObj.Amount} for Invoice #${inv.InvoiceNumber} received. Thank you!`, `#/customer/invoices/${invoiceId}`);
    NotificationsModule.createRoleNotification(inv.TenantId, 'Accountant', 'Payment Received', `Received ₹${paymentObj.Amount} for Invoice #${inv.InvoiceNumber} via ${method}.`, `#/admin/invoices`);

    NotificationsModule.logAudit(session.userId, session.tenantId, 'PAYMENT_RECEIVED', 'Payments', paymentId, `₹${paymentObj.Amount} paid via ${method} (${transactionId})`);
    return {
      success: true,
      payment: paymentObj,
      message: 'Payment completed successfully. Receipt generated.'
    };
  },

  /**
   * Submit Customer Feedback & Star Ratings
   */
  submitFeedback: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const requestId = payload.requestId;
    const workOrderId = payload.workOrderId || '';
    const overallRating = Number(payload.overallRating) || 5;
    const technicianRating = Number(payload.technicianRating) || 5;
    const serviceRating = Number(payload.serviceRating) || 5;
    const comments = payload.comments || '';

    const req = Utils.findOne(SHEETS.SERVICE_REQUESTS, 'RequestId', requestId);
    const wo = workOrderId ? Utils.findOne(SHEETS.WORK_ORDERS, 'WorkOrderId', workOrderId) : null;
    const techId = wo ? wo.TechnicianId : '';

    const feedbackId = Utils.generateId('FDB');
    const feedbackObj = {
      FeedbackId: feedbackId,
      TenantId: session.tenantId,
      RequestId: requestId,
      WorkOrderId: workOrderId,
      CustomerId: req ? req.CustomerId : '',
      TechnicianId: techId,
      OverallRating: overallRating,
      TechnicianRating: technicianRating,
      ServiceRating: serviceRating,
      Comments: comments,
      CreatedAt: Utils.nowFormatted()
    };

    Utils.insertRow(SHEETS.FEEDBACK, feedbackObj);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'FEEDBACK_SUBMITTED', 'Feedback', feedbackId, `Customer rated service ${overallRating} Stars.`);
    return { success: true, message: 'Thank you for your valuable feedback!' };
  }
};
