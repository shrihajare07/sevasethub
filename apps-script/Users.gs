/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script User & RBAC Management (Users.gs)
 * ============================================================================
 */

const UsersModule = {
  /**
   * Enforce Role-Based Authorization
   */
  requireRole: function(session, allowedRoles) {
    if (!session || !session.role) {
      throw new Error('Unauthorized: Session not found.');
    }
    if (session.role === 'SuperAdmin') return true; // SuperAdmin has universal access

    if (Array.isArray(allowedRoles)) {
      if (!allowedRoles.includes(session.role)) {
        throw new Error(`Forbidden: Role '${session.role}' is not authorized to perform this operation.`);
      }
    } else if (session.role !== allowedRoles) {
      throw new Error(`Forbidden: Required role is '${allowedRoles}'.`);
    }
    return true;
  },

  /**
   * Get all Technicians (Admin / Dispatcher only)
   */
  getTechnicians: function(token) {
    const session = AuthModule.validateSession(token);
    this.requireRole(session, ['SuperAdmin', 'BusinessAdmin', 'Dispatcher']);

    const techs = Utils.getAllRows(SHEETS.TECHNICIANS);
    if (session.role === 'SuperAdmin') {
      return techs;
    }
    return techs.filter(t => t.TenantId === session.tenantId);
  },

  /**
   * Get all Customers (Admin / Dispatcher / Accountant only)
   */
  getCustomers: function(token) {
    const session = AuthModule.validateSession(token);
    this.requireRole(session, ['SuperAdmin', 'BusinessAdmin', 'Dispatcher', 'Accountant']);

    const customers = Utils.getAllRows(SHEETS.CUSTOMERS);
    if (session.role === 'SuperAdmin') {
      return customers;
    }
    return customers.filter(c => c.TenantId === session.tenantId);
  },

  /**
   * Update Technician Availability & GPS Coordinates
   */
  updateTechnicianLocation: function(techId, lat, lng, status) {
    const updates = {
      LastLocationUpdate: Utils.nowFormatted()
    };
    if (lat) updates.CurrentLat = lat;
    if (lng) updates.CurrentLng = lng;
    if (status) updates.Status = status;

    return Utils.updateRow(SHEETS.TECHNICIANS, 'TechnicianId', techId, updates);
  }
};
