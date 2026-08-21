/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Services & Categories (Services.gs)
 * ============================================================================
 */

const ServicesModule = {
  /**
   * Get Active Service Categories
   */
  getServiceCategories: function(params) {
    const tenantId = (params && params.tenantId) ? params.tenantId : CONFIG.DEFAULT_TENANT_ID;
    const all = Utils.getAllRows(SHEETS.SERVICE_CATEGORIES);
    return all.filter(c => c.Status === 'Active' && (!c.TenantId || c.TenantId === tenantId || c.TenantId === CONFIG.DEFAULT_TENANT_ID))
      .sort((a, b) => (Number(a.DisplayOrder) || 99) - (Number(b.DisplayOrder) || 99));
  },

  /**
   * Get Active Services (optionally filtered by categoryId)
   */
  getServices: function(params) {
    const tenantId = (params && params.tenantId) ? params.tenantId : CONFIG.DEFAULT_TENANT_ID;
    const categoryId = params ? params.categoryId : null;

    let services = Utils.getAllRows(SHEETS.SERVICES).filter(s => s.Status === 'Active');

    if (tenantId) {
      services = services.filter(s => !s.TenantId || s.TenantId === tenantId || s.TenantId === CONFIG.DEFAULT_TENANT_ID);
    }
    if (categoryId) {
      services = services.filter(s => s.CategoryId === categoryId);
    }
    return services;
  },

  /**
   * Create New Service (Admin only)
   */
  createService: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const serviceId = Utils.generateId('SRV');
    const serviceObj = {
      ServiceId: serviceId,
      TenantId: session.tenantId,
      CategoryId: payload.categoryId,
      ServiceName: payload.serviceName,
      Description: payload.description || '',
      BasePrice: Number(payload.basePrice) || 0,
      EstimatedHours: Number(payload.estimatedHours) || 1,
      WarrantyMonths: Number(payload.warrantyMonths) || 0,
      Status: 'Active',
      Icon: payload.icon || 'bi-gear'
    };

    Utils.insertRow(SHEETS.SERVICES, serviceObj);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'SERVICE_CREATED', 'Services', serviceId, `Service created: ${payload.serviceName}`);
    return serviceObj;
  }
};
