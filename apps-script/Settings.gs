/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script GST & Tax Configuration Engine (Settings.gs)
 * ============================================================================
 */

const SettingsModule = {
  DEFAULT_GST_CONFIG: {
    gstin: '27AABCS1429B1Z5',
    legalName: 'SevaSetuHub Multi-Services Private Limited',
    tradeName: 'SevaSetuHub',
    panNumber: 'AABCS1429B',
    state: '27 - Maharashtra',
    stateCode: '27',
    registeredAddress: 'Shop No. 12, Commerce Plaza, Station Road, Kolhapur, Maharashtra - 416001',
    sacCode: '998714',
    defaultGstRate: 18,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    taxMode: 'Intra-State', // Intra-State / Inter-State / Auto
    isTaxInclusive: false,
    invoicePrefix: 'SSH/26-27/',
    invoiceTerms: 'Payment due upon service completion. All repairs carry a 6-month warranty on workmanship & parts.',
    declaration: 'We declare that this invoice shows the actual price of services described and all particulars are true and correct.',
    reverseCharge: 'No',
    updatedBy: 'Super Admin',
    updatedAt: '2026-08-30 12:00:00'
  },

  /**
   * Get Active GST Configuration
   */
  getGSTConfig: function(params) {
    const tenantId = (params && params.tenantId) ? params.tenantId : CONFIG.DEFAULT_TENANT_ID;
    const row = Utils.findOne(SHEETS.SETTINGS, 'SettingKey', 'GST_ACTIVE_CONFIG');
    if (row && row.SettingValue) {
      try {
        return JSON.parse(row.SettingValue);
      } catch (e) {
        return this.DEFAULT_GST_CONFIG;
      }
    }
    return this.DEFAULT_GST_CONFIG;
  },

  /**
   * Save / Update GST Configuration & Maintain Version History
   */
  saveGSTConfig: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const currentConfig = this.getGSTConfig({ tenantId: session.tenantId });
    const gstRate = Number(payload.defaultGstRate) || 18;
    const taxMode = payload.taxMode || 'Intra-State';
    const isIntra = taxMode === 'Intra-State';

    const newConfig = {
      gstin: (payload.gstin || currentConfig.gstin || '').toUpperCase().trim(),
      legalName: payload.legalName || currentConfig.legalName,
      tradeName: payload.tradeName || currentConfig.tradeName,
      panNumber: (payload.panNumber || (payload.gstin ? payload.gstin.slice(2, 12) : currentConfig.panNumber)).toUpperCase(),
      state: payload.state || currentConfig.state,
      stateCode: payload.stateCode || (payload.state ? String(payload.state).slice(0, 2) : '27'),
      registeredAddress: payload.registeredAddress || currentConfig.registeredAddress,
      sacCode: payload.sacCode || currentConfig.sacCode,
      defaultGstRate: gstRate,
      cgstRate: isIntra ? gstRate / 2 : 0,
      sgstRate: isIntra ? gstRate / 2 : 0,
      igstRate: isIntra ? 0 : gstRate,
      taxMode: taxMode,
      isTaxInclusive: !!payload.isTaxInclusive,
      invoicePrefix: payload.invoicePrefix || currentConfig.invoicePrefix,
      invoiceTerms: payload.invoiceTerms || currentConfig.invoiceTerms,
      declaration: payload.declaration || currentConfig.declaration,
      reverseCharge: payload.reverseCharge || 'No',
      updatedBy: session.fullName || session.email || 'Super Admin',
      updatedAt: Utils.nowFormatted()
    };

    // Save to SETTINGS sheet
    const existing = Utils.findOne(SHEETS.SETTINGS, 'SettingKey', 'GST_ACTIVE_CONFIG');
    if (existing) {
      Utils.updateRow(SHEETS.SETTINGS, 'SettingKey', 'GST_ACTIVE_CONFIG', {
        SettingValue: JSON.stringify(newConfig),
        Description: 'Active GST Tax Profile & Rate Configuration',
        UpdatedAt: Utils.nowFormatted()
      });
    } else {
      Utils.insertRow(SHEETS.SETTINGS, {
        SettingKey: 'GST_ACTIVE_CONFIG',
        SettingValue: JSON.stringify(newConfig),
        Description: 'Active GST Tax Profile & Rate Configuration',
        UpdatedAt: Utils.nowFormatted()
      });
    }

    // Record History Audit in GSTHistory Sheet
    const historyVersionId = Utils.generateId('GST-V');
    const historyObj = {
      VersionId: historyVersionId,
      TenantId: session.tenantId,
      EffectiveFrom: payload.effectiveFrom || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      GSTIN: newConfig.gstin,
      LegalName: newConfig.legalName,
      DefaultGSTRate: newConfig.defaultGstRate,
      CGSTRate: newConfig.cgstRate,
      SGSTRate: newConfig.sgstRate,
      IGSTRate: newConfig.igstRate,
      SACCode: newConfig.sacCode,
      TaxMode: newConfig.taxMode,
      IsTaxInclusive: newConfig.isTaxInclusive ? 'Yes' : 'No',
      ChangeReason: payload.changeReason || 'GST tax rate & profile update',
      ChangedBy: newConfig.updatedBy,
      Timestamp: Utils.nowFormatted()
    };

    Utils.insertRow(SHEETS.GST_HISTORY, historyObj);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'GST_CONFIG_UPDATED', 'Settings', historyVersionId, `GST configuration updated to ${gstRate}% (${taxMode}) by ${newConfig.updatedBy}.`);

    return { success: true, config: newConfig, historyRecord: historyObj };
  },

  /**
   * Get GST Configuration Version History
   */
  getGSTConfigHistory: function(params) {
    const session = AuthModule.validateSession(params.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const history = Utils.getAllRows(SHEETS.GST_HISTORY);
    return history.sort((a, b) => (b._rowIndex || 0) - (a._rowIndex || 0));
  },

  /**
   * Calculate dynamic GST breakdown for any amount
   */
  calculateTax: function(taxableAmount, tenantId, customerState) {
    const config = this.getGSTConfig({ tenantId });
    const amount = Number(taxableAmount) || 0;
    const rate = Number(config.defaultGstRate) || 18;

    let isIntra = config.taxMode === 'Intra-State';
    if (config.taxMode === 'Auto' && customerState) {
      isIntra = customerState.includes(config.stateCode) || customerState.toLowerCase().includes('maharashtra');
    }

    let cgstRate = 0, cgstAmount = 0;
    let sgstRate = 0, sgstAmount = 0;
    let igstRate = 0, igstAmount = 0;

    if (isIntra) {
      cgstRate = rate / 2;
      sgstRate = rate / 2;
      cgstAmount = Math.round(amount * (cgstRate / 100) * 100) / 100;
      sgstAmount = Math.round(amount * (sgstRate / 100) * 100) / 100;
    } else {
      igstRate = rate;
      igstAmount = Math.round(amount * (igstRate / 100) * 100) / 100;
    }

    const taxTotal = Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100;
    const grandTotal = Math.round(amount + taxTotal);

    return {
      taxableAmount: amount,
      gstRate: rate,
      cgstRate: cgstRate,
      cgstAmount: cgstAmount,
      sgstRate: sgstRate,
      sgstAmount: sgstAmount,
      igstRate: igstRate,
      igstAmount: igstAmount,
      taxTotal: taxTotal,
      grandTotal: grandTotal,
      sacCode: config.sacCode,
      gstin: config.gstin,
      legalName: config.legalName,
      taxMode: isIntra ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'
    };
  }
};
