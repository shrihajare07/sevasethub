/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Offers Engine (Offers.gs)
 * ============================================================================
 */

const OffersModule = {
  /**
   * Get Active Offers for Landing & Customer Portals
   */
  getOffers: function(params) {
    const tenantId = (params && params.tenantId) ? params.tenantId : CONFIG.DEFAULT_TENANT_ID;
    const now = new Date().toISOString().slice(0, 10);

    const offers = Utils.getAllRows(SHEETS.OFFERS).filter(o => {
      const active = o.Status === 'Active';
      const validDate = (!o.EndDate || o.EndDate >= now);
      const tenantMatch = !o.TenantId || o.TenantId === tenantId || o.TenantId === CONFIG.DEFAULT_TENANT_ID;
      return active && validDate && tenantMatch;
    });

    return offers;
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
