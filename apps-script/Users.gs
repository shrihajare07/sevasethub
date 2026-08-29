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
    const activeTechs = techs.filter(t => !t.IsDeleted && String(t.IsDeleted).toLowerCase() !== 'true');
    if (session.role === 'SuperAdmin') {
      return activeTechs;
    }
    return activeTechs.filter(t => t.TenantId === session.tenantId);
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
  },

  /**
   * Create a new Technician record in the Technicians sheet
   */
  createTechnician: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    this.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const techId = 'TCH-' + Math.floor(100 + Math.random() * 900);
    const userId  = 'USR-' + techId;
    const nameParts = (payload.fullName || '').trim().split(' ');
    const firstName = nameParts[0] || 'Technician';
    const lastName  = nameParts.slice(1).join(' ') || 'Staff';

    const newTech = {
      TechnicianId:  techId,
      UserId:        userId,
      FullName:      payload.fullName || '',
      Mobile:        payload.mobile   || '',
      Email:         payload.email    || '',
      Specialization: payload.specialization || 'General Technical Services',
      City:          payload.city     || 'Kolhapur',
      Rating:        Number(payload.rating) || 5.0,
      Status:        payload.status   || 'Available',
      TenantId:      session.tenantId || 'TNT-DEFAULT',
      IsDeleted:     false,
      CreatedAt:     Utils.nowFormatted()
    };

    // Insert into Technicians sheet
    Utils.insertRow(SHEETS.TECHNICIANS, newTech);

    // Create login account in Users sheet (hash password properly)
    const salt = Utils.generateSalt();
    const hash = Utils.hashPassword(payload.password || 'TechPassword@2026', salt);
    Utils.insertRow(SHEETS.USERS, {
      UserId:       userId,
      TenantId:     session.tenantId || 'TNT-DEFAULT',
      Email:        payload.email  || '',
      Mobile:       payload.mobile || '',
      PasswordHash: hash,
      PasswordSalt: salt,
      FirstName:    firstName,
      LastName:     lastName,
      Role:         'Technician',
      Status:       'Active',
      CreatedAt:    Utils.nowFormatted(),
      LastLogin:    ''
    });

    return newTech;
  },

  /**
   * Update an existing Technician's profile / status
   */
  updateTechnician: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    this.requireRole(session, ['SuperAdmin', 'BusinessAdmin', 'Dispatcher']);

    const updates = {};
    if (payload.FullName)       updates.FullName        = payload.FullName;
    if (payload.Mobile)         updates.Mobile          = payload.Mobile;
    if (payload.Email)          updates.Email           = payload.Email;
    if (payload.City)           updates.City            = payload.City;
    if (payload.Specialization) updates.Specialization  = payload.Specialization;
    if (payload.Status)         updates.Status          = payload.status || payload.Status;
    if (payload.Rating)         updates.Rating          = payload.Rating;
    updates.UpdatedAt = Utils.nowFormatted();

    return Utils.updateRow(SHEETS.TECHNICIANS, 'TechnicianId', payload.technicianId, updates);
  },

  /**
   * Soft-delete a Technician (sets IsDeleted = true, Status = Inactive)
   */
  deleteTechnician: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    this.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    Utils.updateRow(SHEETS.TECHNICIANS, 'TechnicianId', payload.technicianId, {
      IsDeleted: true,
      Status:    'Inactive',
      DeletedAt: Utils.nowFormatted()
    });

    // Also deactivate the linked user account
    const techs = Utils.getAllRows(SHEETS.TECHNICIANS);
    const tech  = techs.find(t => t.TechnicianId === payload.technicianId);
    if (tech && tech.UserId) {
      Utils.updateRow(SHEETS.USERS, 'UserId', tech.UserId, { Status: 'Inactive' });
    }

    return { success: true };
  },

  /**
   * Get all Dispatchers (SuperAdmin / BusinessAdmin only)
   */
  getDispatchers: function(token) {
    const session = AuthModule.validateSession(token);
    this.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const users = Utils.getAllRows(SHEETS.USERS);
    return users.filter(u => u.Role === 'Dispatcher' && !u.IsDeleted);
  },

  /**
   * Create a new Dispatcher login account
   */
  createDispatcher: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    this.requireRole(session, ['SuperAdmin']);

    const nameParts = (payload.fullName || '').trim().split(' ');
    const firstName = nameParts[0] || 'Dispatcher';
    const lastName  = nameParts.slice(1).join(' ') || 'User';
    const userId    = Utils.generateId('DSP');

    // Hash password before storing
    const salt = Utils.generateSalt();
    const hash = Utils.hashPassword(payload.password || 'DispPassword@2026', salt);

    const newDisp = {
      UserId:       userId,
      TenantId:     session.tenantId || 'TNT-DEFAULT',
      Email:        payload.email    || '',
      Mobile:       payload.mobile   || '',
      PasswordHash: hash,
      PasswordSalt: salt,
      FirstName:    firstName,
      LastName:     lastName,
      Role:         'Dispatcher',
      Status:       'Active',
      CreatedAt:    Utils.nowFormatted(),
      LastLogin:    ''
    };

    Utils.insertRow(SHEETS.USERS, newDisp);
    return newDisp;
  },

  /**
   * Update a Dispatcher's profile
   */
  updateDispatcher: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    this.requireRole(session, ['SuperAdmin']);

    const updates = {};
    if (payload.fullName) {
      const parts = payload.fullName.trim().split(' ');
      updates.FirstName = parts[0] || '';
      updates.LastName  = parts.slice(1).join(' ') || '';
    }
    if (payload.mobile)   updates.Mobile   = payload.mobile;
    if (payload.email)    updates.Email    = payload.email;
    if (payload.city)     updates.City     = payload.city;
    if (payload.password) updates.Password = payload.password;
    updates.UpdatedAt = Utils.nowFormatted();

    return Utils.updateRow(SHEETS.USERS, 'UserId', payload.userId, updates);
  },

  /**
   * Soft-delete a Dispatcher account
   */
  deleteDispatcher: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    this.requireRole(session, ['SuperAdmin']);

    return Utils.updateRow(SHEETS.USERS, 'UserId', payload.userId, {
      IsDeleted: true,
      Status:    'Inactive',
      DeletedAt: Utils.nowFormatted()
    });
  }
};
