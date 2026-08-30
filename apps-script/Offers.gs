/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Offers Engine (Offers.gs)
 * ============================================================================
 */

const OffersModule = {
  /**
   * Get Active Offers for Landing & Customer Portals or All for Admin
   */
  getOffers: function(params) {
    const tenantId = (params && params.tenantId) ? params.tenantId : CONFIG.DEFAULT_TENANT_ID;
    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const allRows = Utils.getAllRows(SHEETS.OFFERS);

    // If admin token provided or includeAll / all requested, return all records
    const isAll = params && (params.all === 'true' || params.all === true || params.includeAll === 'true' || params.includeAll === true || params.token);

    if (isAll) {
      return allRows.map(o => this.normalizeOffer(o));
    }

    return allRows.filter(o => {
      const status = String(o.Status || o.status || 'Active').trim().toLowerCase();
      const active = (status === 'active' || status === 'enabled' || status === '');
      const endStr = o.EndDate instanceof Date 
        ? Utilities.formatDate(o.EndDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') 
        : String(o.EndDate || '').slice(0, 10);
      const validDate = (!endStr || endStr >= todayStr);
      const tId = o.TenantId || o.tenantId;
      const tenantMatch = !tId || tId === tenantId || tId === CONFIG.DEFAULT_TENANT_ID;
      return active && validDate && tenantMatch;
    }).map(o => this.normalizeOffer(o));
  },

  normalizeOffer: function(o) {
    const code = o.OfferCode || o.offerCode || o.Code || o.code || o['Offer Code'] || o.id || 'OFFER';
    const title = o.Title || o.title || o.Name || o.name || 'Promotional Campaign';
    const discType = o.DiscountType || o.discountType || o['Discount Type'] || (String(o.DiscountValue || '').includes('%') ? 'Percentage' : 'FixedAmount');
    const discVal = Number(String(o.DiscountValue || o.discountValue || o.Discount || o.discount || 0).replace(/[^0-9.]/g, '')) || 0;
    const start = o.StartDate instanceof Date ? Utilities.formatDate(o.StartDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') : (o.StartDate || o.startDate || o['Start Date'] || '');
    const end = o.EndDate instanceof Date ? Utilities.formatDate(o.EndDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') : (o.EndDate || o.endDate || o['End Date'] || '');
    const status = o.Status || o.status || 'Active';

    return {
      OfferId: o.OfferId || o.offerId || o.Id || o.id || ('OFR-' + code),
      TenantId: o.TenantId || o.tenantId || CONFIG.DEFAULT_TENANT_ID,
      OfferCode: String(code).toUpperCase().trim(),
      Title: title,
      Description: o.Description || o.description || o['Description'] || '',
      DiscountType: discType,
      DiscountValue: discVal,
      MinimumOrderValue: Number(o.MinimumOrderValue || o.minimumOrderValue || o['Min Order Value'] || 0) || 0,
      MaximumDiscount: Number(o.MaximumDiscount || o.maximumDiscount || o['Max Discount'] || discVal) || discVal,
      ApplicableCategories: o.ApplicableCategories || o.applicableCategories || 'ALL',
      StartDate: String(start).slice(0, 10),
      EndDate: String(end).slice(0, 10),
      Status: status
    };
  },

  /**
   * Create Offer (Admin only)
   */
  createOffer: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const offerId = Utils.generateId('OFR');
    const offerCode = (payload.offerCode || '').trim().toUpperCase();

    const offerObj = {
      OfferId: offerId,
      TenantId: session.tenantId,
      OfferCode: offerCode,
      Title: payload.title || 'Promotional Offer',
      Description: payload.description || '',
      DiscountType: payload.discountType || 'Percentage', // Percentage / FixedAmount
      DiscountValue: Number(payload.discountValue) || 0,
      MinimumOrderValue: Number(payload.minimumOrderValue) || 0,
      MaximumDiscount: Number(payload.maximumDiscount) || 0,
      ApplicableCategories: payload.applicableCategories || 'ALL',
      StartDate: payload.startDate || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      EndDate: payload.endDate || '2026-12-31',
      UsageLimit: Number(payload.usageLimit) || 500,
      Status: 'Active',
      CreatedAt: Utils.nowFormatted()
    };

    Utils.insertRow(SHEETS.OFFERS, offerObj);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'OFFER_CREATED', 'Offers', offerId, `Offer ${offerCode} created.`);
    return offerObj;
  },

  /**
   * Update Offer
   */
  updateOffer: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const offerId = payload.offerId;
    const updates = { ...payload };
    delete updates.token;
    delete updates.action;

    const updated = Utils.updateRow(SHEETS.OFFERS, 'OfferId', offerId, updates);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'OFFER_UPDATED', 'Offers', offerId, `Offer ${offerId} updated.`);
    return updated;
  },

  /**
   * Delete / Deactivate Offer
   */
  deleteOffer: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const offerId = payload.offerId;
    Utils.deleteRow(SHEETS.OFFERS, 'OfferId', offerId);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'OFFER_DELETED', 'Offers', offerId, `Offer ${offerId} deleted.`);
    return { success: true, message: 'Offer deleted successfully.' };
  }
};
