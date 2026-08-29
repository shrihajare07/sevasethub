/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Data Access Layer & Utilities (Utils.gs)
 * ============================================================================
 */

const Utils = {
  /**
   * Get configured Google Spreadsheet
   */
  getSpreadsheet: function() {
    if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== '') {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
    }
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (!active) {
      throw new Error("Cannot find target Google Sheet! Please paste your Google Spreadsheet ID in Code.gs inside CONFIG.SPREADSHEET_ID.");
    }
    return active;
  },

  /**
   * Get or create a sheet with specific name
   */
  getSheet: function(sheetName) {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    return sheet;
  },

  /**
   * Read all rows as an array of objects based on header row
   */
  getAllRows: function(sheetName) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => String(h).trim());
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Skip completely empty rows
      if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;

      const obj = { _rowIndex: i + 1 };
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (key) {
          obj[key] = row[j];
        }
      }
      rows.push(obj);
    }
    return rows;
  },

  /**
   * Find row by key and value
   */
  findOne: function(sheetName, key, value) {
    const rows = this.getAllRows(sheetName);
    return rows.find(r => String(r[key]) === String(value)) || null;
  },

  /**
   * Find all rows matching a filter predicate or key/value
   */
  findRows: function(sheetName, key, value) {
    const rows = this.getAllRows(sheetName);
    if (typeof key === 'function') {
      return rows.filter(key);
    }
    return rows.filter(r => String(r[key]) === String(value));
  },

  /**
   * Insert a new record into a sheet
   */
  insertRow: function(sheetName, record) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // 10s wait for concurrency safety

      const sheet = this.getSheet(sheetName);
      const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(h => String(h).trim());

      const rowValues = [];
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        const val = record[key];
        rowValues.push(val !== undefined && val !== null ? val : '');
      }

      sheet.appendRow(rowValues);
      SpreadsheetApp.flush();
      return record;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Update an existing row by match key
   */
  updateRow: function(sheetName, matchKey, matchValue, updates) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);

      const sheet = this.getSheet(sheetName);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return null;

      const headers = data[0].map(h => String(h).trim());
      const keyColIndex = headers.indexOf(matchKey);
      if (keyColIndex === -1) throw new Error(`Column ${matchKey} not found in ${sheetName}`);

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][keyColIndex]) === String(matchValue)) {
          const rowIndex = i + 1;
          for (let field in updates) {
            const colIndex = headers.indexOf(field);
            if (colIndex !== -1) {
              sheet.getRange(rowIndex, colIndex + 1).setValue(updates[field]);
            }
          }
          SpreadsheetApp.flush();
          return { ...this.getAllRows(sheetName).find(r => String(r[matchKey]) === String(matchValue)) };
        }
      }
      return null;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Delete a row by match key
   */
  deleteRow: function(sheetName, matchKey, matchValue) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const sheet = this.getSheet(sheetName);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return false;

      const headers = data[0].map(h => String(h).trim());
      const keyColIndex = headers.indexOf(matchKey);
      if (keyColIndex === -1) return false;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][keyColIndex]) === String(matchValue)) {
          sheet.deleteRow(i + 1);
          SpreadsheetApp.flush();
          return true;
        }
      }
      return false;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Thread-safe unique ID generator with prefix
   * Example: generateId('REQ') -> REQ-000101
   */
  generateId: function(prefix) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(5000);
      const now = new Date();
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const timePart = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyMMddHHmmss');
      return `${prefix}-${timePart}-${randomPart}`;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * SHA-256 Password Hash with Salt
   */
  hashPassword: function(password, salt) {
    const combined = password + ':' + salt;
    const rawDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined, Utilities.Charset.UTF_8);
    let hash = '';
    for (let i = 0; i < rawDigest.length; i++) {
      let byte = rawDigest[i];
      if (byte < 0) byte += 256;
      let hex = byte.toString(16);
      if (hex.length === 1) hex = '0' + hex;
      hash += hex;
    }
    return hash;
  },

  /**
   * Generate random salt
   */
  generateSalt: function() {
    return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
  },

  /**
   * Format Date to standard Indian timestamp
   */
  nowFormatted: function() {
    return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  }
};

/**
 * DATABASE INITIALIZATION
 * Creates all required sheets, columns, and initial seed data
 */
function initializeDatabase() {
  const ss = Utils.getSpreadsheet();

  const sheetDefinitions = [
    {
      name: SHEETS.USERS,
      headers: ['UserId', 'TenantId', 'Email', 'Mobile', 'PasswordHash', 'PasswordSalt', 'FirstName', 'LastName', 'Role', 'Status', 'CreatedAt', 'LastLogin']
    },
    {
      name: SHEETS.SESSIONS,
      headers: ['SessionId', 'UserId', 'Role', 'TenantId', 'ExpiresAt', 'CreatedAt', 'IpAddress']
    },
    {
      name: SHEETS.ROLES,
      headers: ['RoleId', 'RoleName', 'Description', 'Permissions']
    },
    {
      name: SHEETS.CUSTOMERS,
      headers: ['CustomerId', 'UserId', 'TenantId', 'FullName', 'Mobile', 'Email', 'Address', 'City', 'State', 'Pincode', 'CreatedAt']
    },
    {
      name: SHEETS.TECHNICIANS,
      headers: ['TechnicianId', 'UserId', 'TenantId', 'FullName', 'Mobile', 'Email', 'Specialization', 'City', 'Rating', 'Status', 'CurrentLat', 'CurrentLng', 'LastLocationUpdate', 'IsDeleted', 'CreatedAt']
    },
    {
      name: SHEETS.SERVICE_CATEGORIES,
      headers: ['CategoryId', 'TenantId', 'Name', 'Slug', 'Icon', 'Description', 'DisplayOrder', 'Status']
    },
    {
      name: SHEETS.SERVICES,
      headers: ['ServiceId', 'TenantId', 'CategoryId', 'ServiceName', 'Description', 'BasePrice', 'EstimatedHours', 'WarrantyMonths', 'Status', 'Icon']
    },
    {
      name: SHEETS.SERVICE_REQUESTS,
      headers: ['RequestId', 'TenantId', 'CustomerId', 'CustomerName', 'CustomerMobile', 'CustomerEmail', 'CategoryId', 'ServiceId', 'ServiceName', 'IssueDescription', 'Address', 'City', 'Pincode', 'PreferredDate', 'PreferredTimeSlot', 'CouponCode', 'CouponDiscount', 'Status', 'Priority', 'CreatedAt', 'UpdatedAt']
    },
    {
      name: SHEETS.ESTIMATES,
      headers: ['EstimateId', 'TenantId', 'RequestId', 'CustomerId', 'EstimateNumber', 'LabourAmount', 'MaterialAmount', 'DiscountAmount', 'CouponDiscount', 'TaxAmount', 'GrandTotal', 'ValidityDate', 'Notes', 'Status', 'CreatedAt', 'ApprovedAt']
    },
    {
      name: SHEETS.ESTIMATE_ITEMS,
      headers: ['ItemId', 'EstimateId', 'ItemName', 'Type', 'Quantity', 'UnitPrice', 'TotalPrice']
    },
    {
      name: SHEETS.WORK_ORDERS,
      headers: ['WorkOrderId', 'TenantId', 'RequestId', 'EstimateId', 'CustomerId', 'TechnicianId', 'TechnicianName', 'ScheduledDate', 'StartTime', 'EndTime', 'TripStartedAt', 'CheckInAt', 'CompletedAt', 'TripStartLat', 'TripStartLng', 'Priority', 'Status', 'CreatedAt']
    },
    {
      name: SHEETS.CHECKLISTS,
      headers: ['ChecklistId', 'WorkOrderId', 'ServiceId', 'ItemTitle', 'Status', 'Notes', 'UpdatedAt']
    },
    {
      name: SHEETS.WORK_NOTES,
      headers: ['NoteId', 'WorkOrderId', 'TechnicianId', 'PreWorkNotes', 'WorkPerformed', 'AdditionalFindings', 'Recommendations', 'CreatedAt']
    },
    {
      name: SHEETS.PHOTOS,
      headers: ['PhotoId', 'TenantId', 'WorkOrderId', 'RequestId', 'Stage', 'DriveFileId', 'ViewUrl', 'Description', 'UploadedAt']
    },
    {
      name: SHEETS.MATERIALS,
      headers: ['MaterialId', 'WorkOrderId', 'MaterialName', 'PartNumber', 'Quantity', 'Cost', 'CreatedAt']
    },
    {
      name: SHEETS.SERVICE_REPORTS,
      headers: ['ReportId', 'WorkOrderId', 'RequestId', 'CustomerId', 'TechnicianId', 'Summary', 'CustomerSignatureUrl', 'CustomerName', 'SignedAt', 'ReportFileUrl', 'CreatedAt']
    },
    {
      name: SHEETS.INVOICES,
      headers: ['InvoiceId', 'TenantId', 'InvoiceNumber', 'RequestId', 'WorkOrderId', 'CustomerId', 'LabourTotal', 'MaterialTotal', 'TaxTotal', 'DiscountTotal', 'GrandTotal', 'PaymentStatus', 'DueDate', 'CreatedAt']
    },
    {
      name: SHEETS.PAYMENTS,
      headers: ['PaymentId', 'TenantId', 'InvoiceId', 'CustomerId', 'Amount', 'PaymentMethod', 'TransactionId', 'Status', 'ReceiptUrl', 'PaidAt']
    },
    {
      name: SHEETS.FEEDBACK,
      headers: ['FeedbackId', 'TenantId', 'RequestId', 'WorkOrderId', 'CustomerId', 'TechnicianId', 'OverallRating', 'TechnicianRating', 'ServiceRating', 'Comments', 'CreatedAt']
    },
    {
      name: SHEETS.OFFERS,
      headers: ['OfferId', 'TenantId', 'OfferCode', 'Title', 'Description', 'DiscountType', 'DiscountValue', 'MinimumOrderValue', 'MaximumDiscount', 'ApplicableCategories', 'StartDate', 'EndDate', 'UsageLimit', 'Status', 'CreatedAt']
    },
    {
      name: SHEETS.COUPONS,
      headers: ['CouponId', 'TenantId', 'CouponCode', 'Description', 'DiscountType', 'DiscountValue', 'MinimumOrderValue', 'MaximumDiscount', 'ApplicableServices', 'StartDate', 'EndDate', 'UsageLimit', 'PerUserLimit', 'Status', 'CreatedAt']
    },
    {
      name: SHEETS.COUPON_USAGE,
      headers: ['UsageId', 'CouponId', 'CouponCode', 'UserId', 'TenantId', 'RequestId', 'DiscountAmount', 'UsedAt']
    },
    {
      name: SHEETS.NOTIFICATIONS,
      headers: ['NotificationId', 'TenantId', 'UserId', 'Role', 'Title', 'Message', 'Link', 'IsRead', 'CreatedAt']
    },
    {
      name: SHEETS.AMC,
      headers: ['AMCId', 'TenantId', 'CustomerId', 'EquipmentName', 'ContractNumber', 'StartDate', 'EndDate', 'TotalVisits', 'CompletedVisits', 'Amount', 'Status', 'CreatedAt']
    },
    {
      name: SHEETS.EQUIPMENT,
      headers: ['EquipmentId', 'TenantId', 'CustomerId', 'EquipmentType', 'Brand', 'ModelNumber', 'SerialNumber', 'InstallDate', 'LocationNotes']
    },
    {
      name: SHEETS.AUDIT_LOGS,
      headers: ['LogId', 'TenantId', 'UserId', 'Action', 'Entity', 'EntityId', 'Description', 'Timestamp', 'IpAddress']
    },
    {
      name: SHEETS.SETTINGS,
      headers: ['SettingKey', 'SettingValue', 'Description', 'UpdatedAt']
    }
  ];

  let createdCount = 0;
  sheetDefinitions.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#0d9488').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      createdCount++;
      Logger.log("✅ Created sheet: " + def.name);
    } else {
      // Ensure headers exist
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(def.headers);
        sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#0d9488').setFontColor('#ffffff');
        sheet.setFrozenRows(1);
        Logger.log("ℹ️ Added headers to: " + def.name);
      } else {
        Logger.log("ℹ️ Sheet already exists: " + def.name);
      }
    }
  });

  SpreadsheetApp.flush();

  // Seed Default Categories & Services if empty
  seedDefaultData();
  Logger.log("🌱 Seeded categories, services, offers & coupons");

  // Create Default Super Admin if not exists
  seedSuperAdmin();
  Logger.log("👤 Seeded SuperAdmin and Technician accounts");

  SpreadsheetApp.flush();
  Logger.log(`🎉 Finished! Created ${createdCount} sheets in: ${ss.getName()} (URL: ${ss.getUrl()})`);

  return {
    success: true,
    message: `Database initialized successfully. ${createdCount} new sheets created in ${ss.getName()}. Initial data seeded.`,
    sheetsCount: sheetDefinitions.length
  };
}

/**
 * Seed Initial Categories, Services, Offers & Coupons
 */
function seedDefaultData() {
  const catSheet = Utils.getSheet(SHEETS.SERVICE_CATEGORIES);
  if (catSheet.getLastRow() <= 1) {
    const categories = [
      ['CAT-AC', CONFIG.DEFAULT_TENANT_ID, 'AC Service & Repair', 'ac-service', 'bi-snow', 'Complete cooling solutions, repair, gas charge & AMC', 1, 'Active'],
      ['CAT-CLN', CONFIG.DEFAULT_TENANT_ID, 'Deep Cleaning', 'cleaning', 'bi-stars', 'Home deep cleaning, kitchen, bathroom & commercial', 2, 'Active'],
      ['CAT-PLM', CONFIG.DEFAULT_TENANT_ID, 'Plumbing Services', 'plumbing', 'bi-droplet-fill', 'Pipes, leakage repair, tap fitting, sanitary install', 3, 'Active'],
      ['CAT-ELE', CONFIG.DEFAULT_TENANT_ID, 'Electrical Work', 'electrical', 'bi-lightning-charge-fill', 'Wiring, switchboards, MCB, appliance repair', 4, 'Active'],
      ['CAT-PST', CONFIG.DEFAULT_TENANT_ID, 'Pest Control', 'pest-control', 'bi-shield-check', 'Termite, cockroach, bedbug and general pest treatment', 5, 'Active'],
      ['CAT-FAB', CONFIG.DEFAULT_TENANT_ID, 'Fabrication & Welding', 'fabrication', 'bi-tools', 'Gates, grills, structural welding, custom fabrication', 6, 'Active']
    ];
    categories.forEach(c => catSheet.appendRow(c));
  }

  const srvSheet = Utils.getSheet(SHEETS.SERVICES);
  if (srvSheet.getLastRow() <= 1) {
    const services = [
      ['SRV-AC-01', CONFIG.DEFAULT_TENANT_ID, 'CAT-AC', 'Split AC Regular Service (Jet Pump)', 'Thorough foam & jet pump cleaning of indoor & outdoor unit', 599, 1.5, 3, 'Active', 'bi-snow'],
      ['SRV-AC-02', CONFIG.DEFAULT_TENANT_ID, 'CAT-AC', 'AC Gas Refilling / Leak Fix', 'Complete gas leak inspection, brazing & refrigerant top-up', 2499, 2.0, 6, 'Active', 'bi-snow2'],
      ['SRV-AC-03', CONFIG.DEFAULT_TENANT_ID, 'CAT-AC', 'AC Installation & Uninstallation', 'Precision mounting, core drilling, piping & vacuum testing', 1499, 2.5, 12, 'Active', 'bi-gear-wide-connected'],
      ['SRV-CLN-01', CONFIG.DEFAULT_TENANT_ID, 'CAT-CLN', 'Full Home Deep Cleaning (2 BHK)', 'Floor scrubbing, bathroom descaling, kitchen degreasing', 2999, 4.0, 1, 'Active', 'bi-house-check'],
      ['SRV-CLN-02', CONFIG.DEFAULT_TENANT_ID, 'CAT-CLN', 'Kitchen & Bathroom Intense Clean', 'Deep chemical stain removal, tile grouting, chimney cleaning', 1599, 2.5, 1, 'Active', 'bi-magic'],
      ['SRV-PLM-01', CONFIG.DEFAULT_TENANT_ID, 'CAT-PLM', 'Water Leakage & Pipe Repair', 'Concealed leak detection, joint replacement, tap fixing', 449, 1.0, 3, 'Active', 'bi-droplet-half'],
      ['SRV-ELE-01', CONFIG.DEFAULT_TENANT_ID, 'CAT-ELE', 'Full House Electrical Inspection & Repair', 'Safety check, MCB tripping fix, faulty switchboard replacement', 499, 1.5, 3, 'Active', 'bi-lightning'],
      ['SRV-PST-01', CONFIG.DEFAULT_TENANT_ID, 'CAT-PST', 'Kitchen Cockroach Herbal Gel Treatment', 'Odourless herbal gel placement, eco-friendly warranty', 899, 1.0, 6, 'Active', 'bi-shield-shaded']
    ];
    services.forEach(s => srvSheet.appendRow(s));
  }

  const ofrSheet = Utils.getSheet(SHEETS.OFFERS);
  if (ofrSheet.getLastRow() <= 1) {
    const offers = [
      ['OFR-001', CONFIG.DEFAULT_TENANT_ID, 'SUMMERCOOL20', 'Summer AC Super Saver', 'Get 20% OFF on all AC servicing & repairs across Maharashtra', 'Percentage', 20, 500, 1000, 'CAT-AC', '2026-03-01', '2026-10-31', 500, 'Active', Utils.nowFormatted()],
      ['OFR-002', CONFIG.DEFAULT_TENANT_ID, 'DEEPFEST300', 'Festive Home Cleaning Flat ₹300 OFF', 'Flat ₹300 discount on 2BHK/3BHK Full Home Deep Cleaning', 'FixedAmount', 300, 1500, 300, 'CAT-CLN', '2026-01-01', '2026-12-31', 200, 'Active', Utils.nowFormatted()]
    ];
    offers.forEach(o => ofrSheet.appendRow(o));
  }

  const cpnSheet = Utils.getSheet(SHEETS.COUPONS);
  if (cpnSheet.getLastRow() <= 1) {
    const coupons = [
      ['CPN-001', CONFIG.DEFAULT_TENANT_ID, 'WELCOME100', 'Flat ₹100 OFF on your first booking', 'FixedAmount', 100, 399, 100, 'ALL', '2026-01-01', '2026-12-31', 1000, 1, 'Active', Utils.nowFormatted()],
      ['CPN-002', CONFIG.DEFAULT_TENANT_ID, 'SEVASETU20', 'Special 20% Discount on Plumbing & Electricals', 'Percentage', 20, 499, 500, 'CAT-PLM,CAT-ELE', '2026-01-01', '2026-12-31', 500, 2, 'Active', Utils.nowFormatted()],
      ['CPN-003', CONFIG.DEFAULT_TENANT_ID, 'CLEAN500', 'Save ₹500 on Premium Full House Cleaning', 'FixedAmount', 500, 2500, 500, 'CAT-CLN', '2026-01-01', '2026-12-31', 250, 1, 'Active', Utils.nowFormatted()]
    ];
    coupons.forEach(c => cpnSheet.appendRow(c));
  }
}

/**
 * Seed Initial SuperAdmin & Technician Accounts
 * - Updates existing old admin if found
 * - Creates new SuperAdmin if not present
 */
function seedSuperAdmin() {
  const users = Utils.getAllRows(SHEETS.USERS);

  // Check if the NEW superadmin email already exists
  const newAdminExists = users.some(u => u.Email === CONFIG.SUPERADMIN_DEFAULT.email);

  if (!newAdminExists) {
    // If the OLD admin@sevasetuhub.in record exists, update it to the new email
    const oldAdmin = users.find(u => u.Email === 'admin@sevasetuhub.in' && u.Role === 'SuperAdmin');
    if (oldAdmin) {
      const newSalt = Utils.generateSalt();
      const newHash = Utils.hashPassword(CONFIG.SUPERADMIN_DEFAULT.password, newSalt);
      Utils.updateRow(SHEETS.USERS, 'UserId', oldAdmin.UserId, {
        Email:        CONFIG.SUPERADMIN_DEFAULT.email,
        Mobile:       CONFIG.SUPERADMIN_DEFAULT.mobile,
        PasswordHash: newHash,
        PasswordSalt: newSalt,
        FirstName:    CONFIG.SUPERADMIN_DEFAULT.firstName,
        LastName:     CONFIG.SUPERADMIN_DEFAULT.lastName
      });
      Logger.log('✅ Updated existing SuperAdmin email to: ' + CONFIG.SUPERADMIN_DEFAULT.email);
    } else {
      // No admin at all – create a brand new SuperAdmin
      const salt   = Utils.generateSalt();
      const hash   = Utils.hashPassword(CONFIG.SUPERADMIN_DEFAULT.password, salt);
      const userId = Utils.generateId('USR');

      Utils.insertRow(SHEETS.USERS, {
        UserId:       userId,
        TenantId:     CONFIG.DEFAULT_TENANT_ID,
        Email:        CONFIG.SUPERADMIN_DEFAULT.email,
        Mobile:       CONFIG.SUPERADMIN_DEFAULT.mobile,
        PasswordHash: hash,
        PasswordSalt: salt,
        FirstName:    CONFIG.SUPERADMIN_DEFAULT.firstName,
        LastName:     CONFIG.SUPERADMIN_DEFAULT.lastName,
        Role:         'SuperAdmin',
        Status:       'Active',
        CreatedAt:    Utils.nowFormatted(),
        LastLogin:    ''
      });
      Logger.log('✅ Created new SuperAdmin: ' + CONFIG.SUPERADMIN_DEFAULT.email);
    }

    // Seed Demo Technician only if no technician exists yet
    const techExists = users.some(u => u.Role === 'Technician');
    if (!techExists) {
      const techSalt   = Utils.generateSalt();
      const techHash   = Utils.hashPassword('TechPassword@2026', techSalt);
      const techUserId = Utils.generateId('USR');
      const techId     = Utils.generateId('TCH');

      Utils.insertRow(SHEETS.USERS, {
        UserId:       techUserId,
        TenantId:     CONFIG.DEFAULT_TENANT_ID,
        Email:        'tech@sevasetuhub.in',
        Mobile:       '9822001122',
        PasswordHash: techHash,
        PasswordSalt: techSalt,
        FirstName:    'Mahesh',
        LastName:     'Patil',
        Role:         'Technician',
        Status:       'Active',
        CreatedAt:    Utils.nowFormatted(),
        LastLogin:    ''
      });

      Utils.insertRow(SHEETS.TECHNICIANS, {
        TechnicianId:       techId,
        UserId:             techUserId,
        TenantId:           CONFIG.DEFAULT_TENANT_ID,
        FullName:           'Mahesh Patil',
        Mobile:             '9822001122',
        Email:              'tech@sevasetuhub.in',
        Specialization:     'AC, Electrical, Refrigeration',
        Rating:             4.9,
        Status:             'Available',
        CurrentLat:         '16.7050',
        CurrentLng:         '74.2433',
        LastLocationUpdate: Utils.nowFormatted(),
        CreatedAt:          Utils.nowFormatted()
      });
    }
  } else {
    Logger.log('ℹ️ SuperAdmin already exists: ' + CONFIG.SUPERADMIN_DEFAULT.email);
  }
}
