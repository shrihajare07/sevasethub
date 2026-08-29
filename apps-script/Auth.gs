/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Authentication & Session Engine (Auth.gs)
 * ============================================================================
 */

const AuthModule = {
  /**
   * User Registration (Customer by default)
   */
  register: function(data) {
    const email = (data.email || '').trim().toLowerCase();
    const mobile = (data.mobile || '').trim();
    const password = data.password || '';
    const firstName = (data.firstName || '').trim();
    const lastName = (data.lastName || '').trim();
    const address = data.address || '';
    const city = data.city || '';
    const state = data.state || 'Maharashtra';
    const pincode = data.pincode || '';
    const tenantId = data.tenantId || CONFIG.DEFAULT_TENANT_ID;

    // Validation
    if (!email || !mobile || !password || !firstName) {
      throw new Error('Please provide all required fields: Email, Mobile, Password, First Name.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Check duplicate user
    const existingUsers = Utils.getAllRows(SHEETS.USERS);
    const dup = existingUsers.find(u => u.Email.toLowerCase() === email || u.Mobile === mobile);
    if (dup) {
      throw new Error('An account with this email or mobile number already exists.');
    }

    const salt = Utils.generateSalt();
    const hash = Utils.hashPassword(password, salt);
    const userId = Utils.generateId('USR');
    const customerId = Utils.generateId('CUS');

    // 1. Create User
    Utils.insertRow(SHEETS.USERS, {
      UserId: userId,
      TenantId: tenantId,
      Email: email,
      Mobile: mobile,
      PasswordHash: hash,
      PasswordSalt: salt,
      FirstName: firstName,
      LastName: lastName,
      Role: 'Customer',
      Status: 'Active',
      CreatedAt: Utils.nowFormatted(),
      LastLogin: Utils.nowFormatted()
    });

    // 2. Create Customer Profile
    Utils.insertRow(SHEETS.CUSTOMERS, {
      CustomerId: customerId,
      UserId: userId,
      TenantId: tenantId,
      FullName: `${firstName} ${lastName}`.trim(),
      Mobile: mobile,
      Email: email,
      Address: address,
      City: city,
      State: state,
      Pincode: pincode,
      CreatedAt: Utils.nowFormatted()
    });

    // 3. Create Session Token
    const session = this.createSession(userId, 'Customer', tenantId);

    // 4. Audit Log
    NotificationsModule.logAudit(userId, tenantId, 'USER_REGISTERED', 'Users', userId, `New customer registered: ${firstName} ${lastName}`);

    return {
      token: session.SessionId,
      user: {
        userId: userId,
        customerId: customerId,
        firstName: firstName,
        lastName: lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email: email,
        mobile: mobile,
        role: 'Customer',
        tenantId: tenantId
      }
    };
  },

  /**
   * User Login with Email/Mobile & Password
   */
  login: function(emailOrMobile, password) {
    if (!emailOrMobile || !password) {
      throw new Error('Email/Mobile and Password are required.');
    }

    const query = String(emailOrMobile).trim().toLowerCase();
    const queryDigits = query.replace(/\D/g, '');
    const users = Utils.getAllRows(SHEETS.USERS);
    const user = users.find(u => {
      const uEmail = (u.Email || '').toLowerCase().trim();
      const uMobile = String(u.Mobile || '').trim();
      const uMobileDigits = uMobile.replace(/\D/g, '');
      return (uEmail && uEmail === query) ||
             (uMobile && (uMobile === query || (queryDigits.length >= 10 && uMobileDigits.endsWith(queryDigits.slice(-10)))));
    });

    if (!user) {
      throw new Error('Invalid email/mobile or password.');
    }

    if (user.Status !== 'Active') {
      throw new Error('Your account is inactive or suspended. Please contact support.');
    }

    // Verify Password Hash
    const calculatedHash = Utils.hashPassword(password, user.PasswordSalt);
    if (calculatedHash !== user.PasswordHash) {
      throw new Error('Invalid email/mobile or password.');
    }

    // Update Last Login
    Utils.updateRow(SHEETS.USERS, 'UserId', user.UserId, { LastLogin: Utils.nowFormatted() });

    // Create Session
    const session = this.createSession(user.UserId, user.Role, user.TenantId);

    // Profile detail lookup
    let profileData = {};
    if (user.Role === 'Customer') {
      const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', user.UserId);
      if (cust) profileData.customerId = cust.CustomerId;
    } else if (user.Role === 'Technician') {
      const tech = Utils.findOne(SHEETS.TECHNICIANS, 'UserId', user.UserId);
      if (tech) {
        profileData.technicianId = tech.TechnicianId;
        profileData.specialization = tech.Specialization;
      }
    }

    // Audit Log
    NotificationsModule.logAudit(user.UserId, user.TenantId, 'USER_LOGIN', 'Users', user.UserId, `User ${user.Email} logged in successfully.`);

    return {
      token: session.SessionId,
      user: {
        userId: user.UserId,
        firstName: user.FirstName,
        lastName: user.LastName,
        fullName: `${user.FirstName} ${user.LastName}`.trim(),
        email: user.Email,
        mobile: user.Mobile,
        role: user.Role,
        tenantId: user.TenantId,
        ...profileData
      }
    };
  },

  /**
   * Create Session in Sessions sheet
   */
  createSession: function(userId, role, tenantId) {
    const sessionId = 'SES-' + Utilities.getUuid().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + CONFIG.SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const sessionObj = {
      SessionId: sessionId,
      UserId: userId,
      Role: role,
      TenantId: tenantId,
      ExpiresAt: expiresAt,
      CreatedAt: Utils.nowFormatted(),
      IpAddress: ''
    };

    Utils.insertRow(SHEETS.SESSIONS, sessionObj);
    return sessionObj;
  },

  /**
   * Validate Session Token & Return Session Context
   */
  validateSession: function(token) {
    if (!token) throw new Error('Authorization token missing. Please log in.');

    const session = Utils.findOne(SHEETS.SESSIONS, 'SessionId', token);
    if (!session) throw new Error('Invalid or expired session. Please log in again.');

    if (new Date(session.ExpiresAt).getTime() < Date.now()) {
      Utils.deleteRow(SHEETS.SESSIONS, 'SessionId', token);
      throw new Error('Session expired. Please log in again.');
    }

    const user = Utils.findOne(SHEETS.USERS, 'UserId', session.UserId);
    if (!user || user.Status !== 'Active') {
      throw new Error('User account is invalid or deactivated.');
    }

    return {
      sessionId: session.SessionId,
      userId: user.UserId,
      email: user.Email,
      mobile: user.Mobile,
      firstName: user.FirstName,
      lastName: user.LastName,
      fullName: `${user.FirstName} ${user.LastName}`.trim(),
      role: user.Role,
      tenantId: user.TenantId
    };
  },

  /**
   * Logout user by removing session token
   */
  logout: function(token) {
    if (token) {
      Utils.deleteRow(SHEETS.SESSIONS, 'SessionId', token);
    }
    return { success: true, message: 'Logged out successfully.' };
  },

  /**
   * Get Current User by Token
   */
  getCurrentUser: function(token) {
    const session = this.validateSession(token);
    let profile = {};
    if (session.role === 'Customer') {
      profile = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', session.userId) || {};
    } else if (session.role === 'Technician') {
      profile = Utils.findOne(SHEETS.TECHNICIANS, 'UserId', session.userId) || {};
    }
    return {
      ...session,
      profile: profile
    };
  },

  /**
   * Request Password Reset
   */
  forgotPassword: function(emailOrMobile) {
    const query = String(emailOrMobile).trim().toLowerCase();
    const user = Utils.getAllRows(SHEETS.USERS).find(u => u.Email.toLowerCase() === query || String(u.Mobile) === query);
    if (!user) {
      return { success: true, message: 'If the account exists, password reset instructions have been sent.' };
    }
    // Simulation / Notification log
    NotificationsModule.createNotification(user.UserId, user.TenantId, user.Role, 'Password Reset Request', 'A password reset request was initiated for your account.', '#');
    return { success: true, message: 'Password reset code has been sent to your registered mobile and email.' };
  },

  /**
   * Reset Password
   */
  resetPassword: function(data) {
    const emailOrMobile = (data.emailOrMobile || '').trim().toLowerCase();
    const newPassword = data.newPassword || '';
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const user = Utils.getAllRows(SHEETS.USERS).find(u => u.Email.toLowerCase() === emailOrMobile || String(u.Mobile) === emailOrMobile);
    if (!user) throw new Error('Account not found.');

    const newSalt = Utils.generateSalt();
    const newHash = Utils.hashPassword(newPassword, newSalt);

    Utils.updateRow(SHEETS.USERS, 'UserId', user.UserId, {
      PasswordHash: newHash,
      PasswordSalt: newSalt
    });

    return { success: true, message: 'Password updated successfully. Please log in with your new password.' };
  }
};
