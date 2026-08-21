/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Notifications, Audit Logs & Metrics (Notifications.gs)
 * ============================================================================
 */

const NotificationsModule = {
  /**
   * Create User-specific Notification
   */
  createNotification: function(userId, tenantId, role, title, message, link) {
    const notifId = Utils.generateId('NTF');
    const notifObj = {
      NotificationId: notifId,
      TenantId: tenantId || CONFIG.DEFAULT_TENANT_ID,
      UserId: userId,
      Role: role || 'Customer',
      Title: title,
      Message: message,
      Link: link || '#',
      IsRead: 'No',
      CreatedAt: Utils.nowFormatted()
    };
    Utils.insertRow(SHEETS.NOTIFICATIONS, notifObj);
    return notifObj;
  },

  /**
   * Create Role-wide Notification (for all dispatchers or admins)
   */
  createRoleNotification: function(tenantId, role, title, message, link) {
    const users = Utils.getAllRows(SHEETS.USERS).filter(u => u.Role === role && (u.TenantId === tenantId || role === 'SuperAdmin'));
    users.forEach(u => {
      this.createNotification(u.UserId, tenantId, role, title, message, link);
    });
  },

  /**
   * Get Notifications for Current User
   */
  getNotifications: function(token) {
    const session = AuthModule.validateSession(token);
    const all = Utils.getAllRows(SHEETS.NOTIFICATIONS);
    return all.filter(n => n.UserId === session.userId || (n.Role === session.role && n.TenantId === session.tenantId))
      .sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime())
      .slice(0, 30);
  },

  /**
   * Mark Notification as Read
   */
  markAsRead: function(notificationId, token) {
    const session = AuthModule.validateSession(token);
    return Utils.updateRow(SHEETS.NOTIFICATIONS, 'NotificationId', notificationId, { IsRead: 'Yes' });
  },

  /**
   * Append Audit Log (Never log passwords or sensitive secrets)
   */
  logAudit: function(userId, tenantId, action, entity, entityId, description) {
    try {
      const logId = Utils.generateId('LOG');
      Utils.insertRow(SHEETS.AUDIT_LOGS, {
        LogId: logId,
        TenantId: tenantId || CONFIG.DEFAULT_TENANT_ID,
        UserId: userId || 'System',
        Action: action,
        Entity: entity,
        EntityId: entityId || '',
        Description: description,
        Timestamp: Utils.nowFormatted(),
        IpAddress: ''
      });
    } catch (e) {
      // Don't fail parent flow if audit log insert fails
    }
  },

  /**
   * Get Audit Logs (Admin only)
   */
  getAuditLogs: function(token) {
    const session = AuthModule.validateSession(token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);
    const all = Utils.getAllRows(SHEETS.AUDIT_LOGS);
    if (session.role === 'SuperAdmin') {
      return all.slice(-100).reverse();
    }
    return all.filter(l => l.TenantId === session.tenantId).slice(-100).reverse();
  }
};

/**
 * Executive Analytics & Dashboard Reporting Module
 */
const ReportsModule = {
  getDashboardMetrics: function(token) {
    const session = AuthModule.validateSession(token);

    const requests = Utils.getAllRows(SHEETS.SERVICE_REQUESTS);
    const workOrders = Utils.getAllRows(SHEETS.WORK_ORDERS);
    const estimates = Utils.getAllRows(SHEETS.ESTIMATES);
    const invoices = Utils.getAllRows(SHEETS.INVOICES);
    const technicians = Utils.getAllRows(SHEETS.TECHNICIANS);
    const customers = Utils.getAllRows(SHEETS.CUSTOMERS);

    // Tenant filter
    const tenantFilter = (row) => session.role === 'SuperAdmin' ? true : (row.TenantId === session.tenantId);

    const tRequests = requests.filter(tenantFilter);
    const tWorkOrders = workOrders.filter(tenantFilter);
    const tEstimates = estimates.filter(tenantFilter);
    const tInvoices = invoices.filter(tenantFilter);
    const tTechnicians = technicians.filter(tenantFilter);
    const tCustomers = customers.filter(tenantFilter);

    // Summary counts
    const newRequests = tRequests.filter(r => r.Status === 'New').length;
    const pendingEstimates = tEstimates.filter(e => e.Status === 'Pending').length;
    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const todayJobs = tWorkOrders.filter(w => w.ScheduledDate === todayStr).length;
    const inProgressJobs = tWorkOrders.filter(w => w.Status === 'In Progress' || w.Status === 'En Route' || w.Status === 'Checked In').length;
    const completedJobs = tWorkOrders.filter(w => w.Status === 'Completed').length;
    
    // Revenue calculations
    const paidInvoices = tInvoices.filter(i => i.PaymentStatus === 'Paid');
    const totalRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.GrandTotal) || 0), 0);
    const pendingPayments = tInvoices.filter(i => i.PaymentStatus === 'Pending').reduce((sum, i) => sum + (Number(i.GrandTotal) || 0), 0);
    const activeTechs = tTechnicians.filter(t => t.Status === 'Available' || t.Status === 'Busy').length;

    // Category breakdown
    const categoryCounts = {};
    tRequests.forEach(r => {
      const cat = r.ServiceName || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Monthly revenue simulation data for Chart.js
    const monthlyRevenue = [
      { month: 'Apr 2026', revenue: 45000 },
      { month: 'May 2026', revenue: 68000 },
      { month: 'Jun 2026', revenue: 92000 },
      { month: 'Jul 2026', revenue: 114000 },
      { month: 'Aug 2026', revenue: Math.max(135000, totalRevenue) }
    ];

    return {
      metrics: {
        newRequests: newRequests,
        pendingEstimates: pendingEstimates,
        todayJobs: todayJobs,
        inProgressJobs: inProgressJobs,
        completedJobs: completedJobs,
        totalRevenue: totalRevenue,
        pendingPayments: pendingPayments,
        activeTechnicians: activeTechs,
        totalCustomers: tCustomers.length
      },
      categoryCounts: categoryCounts,
      monthlyRevenue: monthlyRevenue,
      recentRequests: tRequests.slice(0, 8),
      recentWorkOrders: tWorkOrders.slice(0, 8)
    };
  }
};
