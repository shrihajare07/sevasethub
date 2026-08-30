/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Coupon Validation & Management (Coupons.gs)
 * ============================================================================
 */

const CouponsModule = {
  /**
   * Get Active Coupons (Admin or public listing)
   */
  getCoupons: function(params) {
    const tenantId = (params && params.tenantId) ? params.tenantId : CONFIG.DEFAULT_TENANT_ID;
    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const allRows = Utils.getAllRows(SHEETS.COUPONS);

    const isAll = params && (params.all === 'true' || params.all === true || params.includeAll === 'true' || params.includeAll === true || params.token);

    if (isAll) {
      return allRows.map(c => this.normalizeCoupon(c));
    }

    return allRows.filter(c => {
      const status = String(c.Status || c.status || 'Active').trim().toLowerCase();
      const active = (status === 'active' || status === 'enabled' || status === '');
      const endStr = c.EndDate instanceof Date 
        ? Utilities.formatDate(c.EndDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') 
        : String(c.EndDate || '').slice(0, 10);
      const validDate = (!endStr || endStr >= todayStr);
      const tId = c.TenantId || c.tenantId;
      const tenantMatch = !tId || tId === tenantId || tId === CONFIG.DEFAULT_TENANT_ID;
      return active && validDate && tenantMatch;
    }).map(c => this.normalizeCoupon(c));
  },

  normalizeCoupon: function(c) {
    const code = c.CouponCode || c.couponCode || c.Code || c.code || c['Coupon Code'] || c.id || 'COUPON';
    const desc = c.Description || c.description || c.Title || c.title || 'Promotional Discount Coupon';
    const discType = c.DiscountType || c.discountType || c['Discount Type'] || (String(c.DiscountValue || '').includes('%') ? 'Percentage' : 'FixedAmount');
    const discVal = Number(String(c.DiscountValue || c.discountValue || c.Discount || c.discount || 0).replace(/[^0-9.]/g, '')) || 0;
    const minOrder = Number(c.MinimumOrderValue || c.minimumOrderValue || c['Min Order'] || c['Minimum Order Value'] || 0) || 0;
    const maxDisc = Number(c.MaximumDiscount || c.maximumDiscount || c['Max Discount'] || c['Maximum Discount'] || discVal) || discVal;
    const start = c.StartDate instanceof Date ? Utilities.formatDate(c.StartDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') : (c.StartDate || c.startDate || '');
    const end = c.EndDate instanceof Date ? Utilities.formatDate(c.EndDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') : (c.EndDate || c.endDate || '');
    const status = c.Status || c.status || 'Active';

    return {
      CouponId: c.CouponId || c.couponId || c.Id || c.id || ('CPN-' + code),
      TenantId: c.TenantId || c.tenantId || CONFIG.DEFAULT_TENANT_ID,
      CouponCode: String(code).toUpperCase().trim(),
      Description: desc,
      DiscountType: discType,
      DiscountValue: discVal,
      MinimumOrderValue: minOrder,
      MaximumDiscount: maxDisc,
      StartDate: String(start).slice(0, 10),
      EndDate: String(end).slice(0, 10),
      Status: status
    };
  },

  /**
   * Validate Coupon strictly on backend (Never trust client calculations!)
   */
  validateCoupon: function(payload) {
    const couponCode = (payload.couponCode || '').trim().toUpperCase();
    const serviceId = payload.serviceId || '';
    const orderAmount = Number(payload.orderAmount) || 0;
    const tenantId = payload.tenantId || CONFIG.DEFAULT_TENANT_ID;
    let userId = payload.userId;

    if (payload.token) {
      try {
        const session = AuthModule.validateSession(payload.token);
        userId = session.userId;
      } catch (e) {}
    }

    const result = this.validateCouponInternal(couponCode, userId, serviceId, orderAmount, tenantId);
    return result;
  },

  /**
   * Internal Validation Engine
   */
  validateCouponInternal: function(couponCode, userId, serviceId, orderAmount, tenantId) {
    if (!couponCode) throw new Error('Please provide a coupon code.');

    const coupon = Utils.findOne(SHEETS.COUPONS, 'CouponCode', couponCode);
    if (!coupon) {
      throw new Error(`Coupon '${couponCode}' is invalid.`);
    }

    if (coupon.Status !== 'Active') {
      throw new Error(`Coupon '${couponCode}' is no longer active.`);
    }

    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (coupon.StartDate && coupon.StartDate > todayStr) {
      throw new Error(`Coupon '${couponCode}' has not started yet.`);
    }
    if (coupon.EndDate && coupon.EndDate < todayStr) {
      throw new Error(`Coupon '${couponCode}' expired on ${coupon.EndDate}.`);
    }

    // Minimum Order Value check
    const minVal = Number(coupon.MinimumOrderValue) || 0;
    if (orderAmount > 0 && orderAmount < minVal) {
      throw new Error(`Minimum booking amount of ₹${minVal} is required to apply ${couponCode}.`);
    }

    // Service category applicability check
    if (coupon.ApplicableServices && coupon.ApplicableServices !== 'ALL' && serviceId) {
      const allowed = coupon.ApplicableServices.split(',').map(s => s.trim());
      if (!allowed.includes(serviceId)) {
        // Also check category match
        const srv = Utils.findOne(SHEETS.SERVICES, 'ServiceId', serviceId);
        if (!srv || !allowed.includes(srv.CategoryId)) {
          throw new Error(`Coupon '${couponCode}' is not applicable to the selected service.`);
        }
      }
    }

    // Usage Limit Check
    const usages = Utils.findRows(SHEETS.COUPON_USAGE, 'CouponCode', couponCode);
    const maxUsage = Number(coupon.UsageLimit) || 999999;
    if (usages.length >= maxUsage) {
      throw new Error(`Coupon '${couponCode}' usage limit has been reached.`);
    }

    // Per-User Limit Check
    if (userId) {
      const perUserMax = Number(coupon.PerUserLimit) || 1;
      const userUsages = usages.filter(u => u.UserId === userId);
      if (userUsages.length >= perUserMax) {
        throw new Error(`You have already used coupon '${couponCode}' the maximum allowed (${perUserMax}) times.`);
      }
    }

    // Calculate Discount Backend-Side
    let discount = 0;
    const discountVal = Number(coupon.DiscountValue) || 0;
    const maxDiscount = Number(coupon.MaximumDiscount) || 999999;

    if (coupon.DiscountType === 'Percentage') {
      discount = Math.round((orderAmount * discountVal) / 100);
      if (maxDiscount > 0 && discount > maxDiscount) {
        discount = maxDiscount;
      }
    } else {
      // Fixed Amount
      discount = discountVal;
      if (orderAmount > 0 && discount > orderAmount) {
        discount = orderAmount;
      }
    }

    return {
      valid: true,
      couponCode: couponCode,
      discount: discount,
      discountType: coupon.DiscountType,
      discountValue: discountVal,
      message: `Coupon '${couponCode}' applied! You saved ₹${discount}.`
    };
  },

  /**
   * Record Coupon Usage
   */
  recordCouponUsage: function(couponCode, userId, tenantId, requestId, discountAmount) {
    const coupon = Utils.findOne(SHEETS.COUPONS, 'CouponCode', couponCode);
    const usageObj = {
      UsageId: Utils.generateId('CPU'),
      CouponId: coupon ? coupon.CouponId : '',
      CouponCode: couponCode,
      UserId: userId || 'Guest',
      TenantId: tenantId || CONFIG.DEFAULT_TENANT_ID,
      RequestId: requestId,
      DiscountAmount: discountAmount,
      UsedAt: Utils.nowFormatted()
    };
    Utils.insertRow(SHEETS.COUPON_USAGE, usageObj);
    return usageObj;
  },

  /**
   * Create Coupon (Admin)
   */
  createCoupon: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const couponCode = (payload.couponCode || '').trim().toUpperCase();
    const couponId = Utils.generateId('CPN');

    const couponObj = {
      CouponId: couponId,
      TenantId: session.tenantId,
      CouponCode: couponCode,
      Description: payload.description || '',
      DiscountType: payload.discountType || 'FixedAmount',
      DiscountValue: Number(payload.discountValue) || 0,
      MinimumOrderValue: Number(payload.minimumOrderValue) || 0,
      MaximumDiscount: Number(payload.maximumDiscount) || 0,
      ApplicableServices: payload.applicableServices || 'ALL',
      StartDate: payload.startDate || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      EndDate: payload.endDate || '2026-12-31',
      UsageLimit: Number(payload.usageLimit) || 1000,
      PerUserLimit: Number(payload.perUserLimit) || 1,
      Status: 'Active',
      CreatedAt: Utils.nowFormatted()
    };

    Utils.insertRow(SHEETS.COUPONS, couponObj);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'COUPON_CREATED', 'Coupons', couponId, `Coupon ${couponCode} created.`);
    return couponObj;
  },

  /**
   * Update Coupon
   */
  updateCoupon: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const couponId = payload.couponId;
    const updates = { ...payload };
    delete updates.token;
    delete updates.action;

    const updated = Utils.updateRow(SHEETS.COUPONS, 'CouponId', couponId, updates);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'COUPON_UPDATED', 'Coupons', couponId, `Coupon ${couponId} updated.`);
    return updated;
  },

  /**
   * Delete Coupon
   */
  deleteCoupon: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin']);

    const couponId = payload.couponId;
    Utils.deleteRow(SHEETS.COUPONS, 'CouponId', couponId);
    NotificationsModule.logAudit(session.userId, session.tenantId, 'COUPON_DELETED', 'Coupons', couponId, `Coupon ${couponId} deleted.`);
    return { success: true, message: 'Coupon deleted successfully.' };
  }
};
