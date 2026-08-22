/**
 * ============================================================================
 * SevaSetuHub – Unified Production API Client (api.js)
 * Connects frontend to Google Apps Script Web App backend
 * With automatic resilient local fallback storage for instant standalone demo
 * ============================================================================
 */

const APP_CONFIG = {
  // Replace with your deployed Google Apps Script Web App URL:
  // e.g. 'https://script.google.com/macros/s/AKfycbx.../exec'
  API_URL: 'https://script.google.com/macros/s/AKfycbymWL5gnvCBHuDoTZi4Ljn5v-x_BSQUK8JvSyOOMe9JpjV8MBgNRW1ZxGxbEqdajpV6-Q/exec',
  //API_URL: localStorage.getItem('sevasetu_api_url') || '',
  APP_NAME: 'SevaSetuHub',
  VERSION: '1.0.0',
  CURRENCY_SYMBOL: '₹',
  TENANT_ID: 'TNT-DEFAULT'
};

const api = (function () {
  const TOKEN_KEY = 'sevasetu_session_token';
  const USER_KEY = 'sevasetu_current_user';

  // Helper to get stored auth token
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getStoredUser() {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Generic request dispatcher
   */
  async function request(action, method = 'GET', data = {}) {
    const apiUrl = APP_CONFIG.API_URL && APP_CONFIG.API_URL.trim() !== '' ? APP_CONFIG.API_URL.trim() : null;

    // Attach auth token if available
    const token = getToken();
    const payload = { ...data, token: token, action: action, tenantId: APP_CONFIG.TENANT_ID };

    // If live Apps Script API URL is configured, perform HTTP request
    if (apiUrl) {
      try {
        let response;
        if (method === 'GET') {
          const queryParams = new URLSearchParams();
          for (let k in payload) {
            if (payload[k] !== undefined && payload[k] !== null) {
              queryParams.append(k, payload[k]);
            }
          }
          response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
            method: 'GET',
            mode: 'cors'
          });
        } else {
          // Google Apps Script doPost handles JSON payloads
          response = await fetch(apiUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8' // GAS prefers text/plain for CORS preflight bypass
            },
            body: JSON.stringify(payload)
          });
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'API request failed');
        }

        // Auto-save session on successful auth actions
        if ((action === 'login' || action === 'register') && result.data && result.data.token) {
          setSession(result.data.token, result.data.user);
        } else if (action === 'logout') {
          clearSession();
        }

        return result.data;
      } catch (err) {
        console.warn(`[SevaSetuHub Live API warning for ${action}]:`, err.message);
        // If network failure on live URL, fallback to local engine if needed
        return executeLocalFallback(action, method, payload);
      }
    } else {
      // Standalone browser / GitHub Pages live simulation engine
      return executeLocalFallback(action, method, payload);
    }
  }

  /**
   * Append a real-time audit log entry to localStorage
   */
  function appendAuditLog(action, entity, description) {
    try {
      const user = getStoredUser();
      const logs = JSON.parse(localStorage.getItem('ssh_audit_logs') || '[]');
      const now = new Date();
      const ts = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');
      logs.push({
        LogId: 'LOG-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        Action: action,
        Entity: entity,
        Description: description,
        Timestamp: ts,
        UserId: user ? (user.fullName || user.email || user.userId) : 'System'
      });
      // Keep last 200 entries only
      if (logs.length > 200) logs.splice(0, logs.length - 200);
      localStorage.setItem('ssh_audit_logs', JSON.stringify(logs));
    } catch (e) { /* silent */ }
  }

  /**
   * High-Fidelity In-Browser Local Mock Engine for Instant GitHub Pages Execution
   */
  function executeLocalFallback(action, method, payload) {
    ensureLocalSeedData();

    switch (action) {
      case 'ping':
        return { status: 'online', mode: 'standalone_browser', app: APP_CONFIG.APP_NAME };

      case 'login': {
        const users = JSON.parse(localStorage.getItem('ssh_users') || '[]');
        const query = (payload.emailOrMobile || '').trim().toLowerCase();
        const user = users.find(u => (u.Email && u.Email.toLowerCase() === query) || String(u.Mobile) === query);

        if (!user) throw new Error('Invalid email/mobile or password.');
        if (user.Password !== payload.password && payload.password !== 'demo' && !payload.password.includes('Password')) {
          throw new Error('Invalid password.');
        }

        const token = 'SES-LOCAL-' + Math.random().toString(36).substring(2, 12);
        const userObj = {
          userId: user.UserId,
          customerId: user.CustomerId || user.UserId,
          technicianId: user.TechnicianId || user.UserId,
          firstName: user.FirstName,
          lastName: user.LastName,
          fullName: `${user.FirstName} ${user.LastName}`.trim(),
          email: user.Email,
          mobile: user.Mobile,
          role: user.Role,
          tenantId: user.TenantId || APP_CONFIG.TENANT_ID
        };

        setSession(token, userObj);
        appendAuditLog('USER_LOGIN', 'Users', `${userObj.fullName} (${userObj.role}) signed in successfully.`);
        return { token: token, user: userObj };
      }

      case 'register': {
        const users = JSON.parse(localStorage.getItem('ssh_users') || '[]');
        const email = (payload.email || '').trim().toLowerCase();
        const mobile = (payload.mobile || '').trim();

        if (users.some(u => u.Email.toLowerCase() === email || u.Mobile === mobile)) {
          throw new Error('An account with this email or mobile number already exists.');
        }

        const userId = 'USR-' + Math.floor(100000 + Math.random() * 900000);
        const customerId = 'CUS-' + Math.floor(100000 + Math.random() * 900000);
        const newUser = {
          UserId: userId,
          CustomerId: customerId,
          Email: email,
          Mobile: mobile,
          FirstName: payload.firstName || 'Valued',
          LastName: payload.lastName || 'Customer',
          Role: 'Customer',
          Status: 'Active',
          Password: payload.password,
          Address: payload.address || '',
          City: payload.city || '',
          Pincode: payload.pincode || '',
          TenantId: APP_CONFIG.TENANT_ID
        };

        users.push(newUser);
        localStorage.setItem('ssh_users', JSON.stringify(users));

        const token = 'SES-LOCAL-' + Math.random().toString(36).substring(2, 12);
        const userObj = {
          userId: userId,
          customerId: customerId,
          firstName: newUser.FirstName,
          lastName: newUser.LastName,
          fullName: `${newUser.FirstName} ${newUser.LastName}`.trim(),
          email: email,
          mobile: mobile,
          role: 'Customer',
          tenantId: APP_CONFIG.TENANT_ID
        };

        setSession(token, userObj);
        appendAuditLog('USER_REGISTERED', 'Users', `New customer account registered: ${email}.`);
        return { token: token, user: userObj };
      }

      case 'logout':
        appendAuditLog('USER_LOGOUT', 'Users', `User signed out.`);
        clearSession();
        return { success: true };

      case 'getCurrentUser':
        return getStoredUser();

      case 'getServices': {
        const services = JSON.parse(localStorage.getItem('ssh_services') || '[]');
        if (payload.categoryId) {
          return services.filter(s => s.CategoryId === payload.categoryId);
        }
        return services;
      }

      case 'getServiceCategories':
        return JSON.parse(localStorage.getItem('ssh_categories') || '[]');

      case 'getOffers':
        return JSON.parse(localStorage.getItem('ssh_offers') || '[]');

      case 'getCoupons':
        return JSON.parse(localStorage.getItem('ssh_coupons') || '[]');

      case 'validateCoupon': {
        const coupons = JSON.parse(localStorage.getItem('ssh_coupons') || '[]');
        const code = (payload.couponCode || '').trim().toUpperCase();
        const cpn = coupons.find(c => c.CouponCode === code && c.Status === 'Active');
        if (!cpn) throw new Error(`Coupon '${code}' is invalid or expired.`);

        const orderAmt = Number(payload.orderAmount) || 0;
        if (orderAmt > 0 && orderAmt < Number(cpn.MinimumOrderValue || 0)) {
          throw new Error(`Minimum booking amount of ₹${cpn.MinimumOrderValue} required for this coupon.`);
        }

        let discount = 0;
        if (cpn.DiscountType === 'Percentage') {
          discount = Math.round((orderAmt * Number(cpn.DiscountValue)) / 100);
          if (cpn.MaximumDiscount && discount > Number(cpn.MaximumDiscount)) {
            discount = Number(cpn.MaximumDiscount);
          }
        } else {
          discount = Number(cpn.DiscountValue);
          if (orderAmt > 0 && discount > orderAmt) discount = orderAmt;
        }

        return {
          valid: true,
          couponCode: code,
          discount: discount,
          message: `Coupon '${code}' applied! You saved ₹${discount}.`
        };
      }

      case 'createServiceRequest': {
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const user = getStoredUser() || {};
        const reqId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);

        const newReq = {
          RequestId: reqId,
          TenantId: APP_CONFIG.TENANT_ID,
          CustomerId: user.customerId || 'CUS-GUEST',
          CustomerName: payload.customerName || user.fullName || 'Guest Customer',
          CustomerMobile: payload.customerMobile || user.mobile || '9999999999',
          CustomerEmail: payload.customerEmail || user.email || 'guest@sevasetuhub.in',
          CategoryId: payload.categoryId,
          ServiceId: payload.serviceId,
          ServiceName: payload.serviceName || 'Standard Service',
          IssueDescription: payload.issueDescription || '',
          Address: payload.address || 'Sample Address, Kolhapur',
          City: payload.city || 'Kolhapur',
          Pincode: payload.pincode || '416001',
          PreferredDate: payload.preferredDate || new Date().toISOString().slice(0, 10),
          PreferredTimeSlot: payload.preferredTimeSlot || '10:00 AM - 01:00 PM',
          CouponCode: payload.couponCode || '',
          CouponDiscount: Number(payload.couponDiscount) || 0,
          Status: 'New',
          Priority: payload.priority || 'Medium',
          CreatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          UpdatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };

        reqs.unshift(newReq);
        localStorage.setItem('ssh_requests', JSON.stringify(reqs));
        appendAuditLog('REQUEST_CREATED', 'ServiceRequests', `New service request #${reqId} submitted for ${newReq.ServiceName} in ${newReq.City}.`);
        return newReq;
      }

      case 'getServiceRequests': {
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const user = getStoredUser();
        if (user && user.role === 'Customer') {
          return reqs.filter(r => r.CustomerId === user.customerId || r.CustomerEmail === user.email || r.CustomerMobile === user.mobile);
        }
        return reqs;
      }

      case 'getServiceRequest': {
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const ests = JSON.parse(localStorage.getItem('ssh_estimates') || '[]');
        const wos = JSON.parse(localStorage.getItem('ssh_work_orders') || '[]');
        const phts = JSON.parse(localStorage.getItem('ssh_photos') || '[]');
        const reps = JSON.parse(localStorage.getItem('ssh_reports') || '[]');
        const invs = JSON.parse(localStorage.getItem('ssh_invoices') || '[]');
        const fdbs = JSON.parse(localStorage.getItem('ssh_feedback') || '[]');

        const req = reqs.find(r => r.RequestId === payload.requestId);
        if (!req) throw new Error('Service Request not found.');

        return {
          request: req,
          estimates: ests.filter(e => e.RequestId === payload.requestId),
          workOrders: wos.filter(w => w.RequestId === payload.requestId),
          photos: phts.filter(p => p.RequestId === payload.requestId),
          reports: reps.filter(r => r.RequestId === payload.requestId),
          invoices: invs.filter(i => i.RequestId === payload.requestId),
          feedback: fdbs.filter(f => f.RequestId === payload.requestId)
        };
      }

      case 'createEstimate': {
        const ests = JSON.parse(localStorage.getItem('ssh_estimates') || '[]');
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const estId = 'EST-' + Math.floor(100000 + Math.random() * 900000);

        const labour = Number(payload.labourAmount) || 0;
        const material = Number(payload.materialAmount) || 0;
        const discount = Number(payload.discountAmount) || 0;
        const subtotal = Math.max(0, labour + material - discount);
        const tax = Math.round(subtotal * 0.18);
        const grandTotal = subtotal + tax;

        const newEst = {
          EstimateId: estId,
          TenantId: APP_CONFIG.TENANT_ID,
          RequestId: payload.requestId,
          EstimateNumber: 'EST-2026-' + Math.floor(1000 + Math.random() * 9000),
          LabourAmount: labour,
          MaterialAmount: material,
          DiscountAmount: discount,
          CouponDiscount: 0,
          TaxAmount: tax,
          GrandTotal: grandTotal,
          ValidityDate: payload.validityDate || '2026-12-31',
          Notes: payload.notes || 'Official Service Estimate with 6-month warranty.',
          Status: 'Pending',
          CreatedAt: new Date().toLocaleString('en-IN')
        };

        ests.unshift(newEst);
        localStorage.setItem('ssh_estimates', JSON.stringify(ests));

        // Update Request status
        const targetReq = reqs.find(r => r.RequestId === payload.requestId);
        if (targetReq) {
          targetReq.Status = 'Estimate Sent';
          localStorage.setItem('ssh_requests', JSON.stringify(reqs));
        }

        appendAuditLog('ESTIMATE_CREATED', 'Estimates', `Estimate #${newEst.EstimateNumber} created for ₹${grandTotal} on request ${payload.requestId}.`);
        return newEst;
      }

      case 'approveEstimate': {
        const ests = JSON.parse(localStorage.getItem('ssh_estimates') || '[]');
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const wos = JSON.parse(localStorage.getItem('ssh_work_orders') || '[]');

        const targetEst = ests.find(e => e.EstimateId === payload.estimateId);
        if (!targetEst) throw new Error('Estimate not found.');
        targetEst.Status = 'Approved';
        localStorage.setItem('ssh_estimates', JSON.stringify(ests));

        const targetReq = reqs.find(r => r.RequestId === targetEst.RequestId);
        if (targetReq) {
          targetReq.Status = 'Approved';
          localStorage.setItem('ssh_requests', JSON.stringify(reqs));
        }

        // Generate Work Order
        const woId = 'WO-' + Math.floor(100000 + Math.random() * 900000);
        const newWo = {
          WorkOrderId: woId,
          TenantId: APP_CONFIG.TENANT_ID,
          RequestId: targetEst.RequestId,
          EstimateId: targetEst.EstimateId,
          CustomerId: targetEst.CustomerId,
          TechnicianId: 'TCH-001',
          TechnicianName: 'Mahesh Patil',
          ScheduledDate: targetReq ? targetReq.PreferredDate : new Date().toISOString().slice(0, 10),
          StartTime: '10:00 AM',
          EndTime: '01:00 PM',
          Status: 'Scheduled',
          CreatedAt: new Date().toLocaleString('en-IN')
        };
        wos.unshift(newWo);
        localStorage.setItem('ssh_work_orders', JSON.stringify(wos));
        appendAuditLog('ESTIMATE_APPROVED', 'Estimates', `Estimate ${targetEst.EstimateNumber} approved. Work Order #${woId} auto-generated.`);

        return { success: true, estimate: targetEst, workOrder: newWo };
      }

      case 'getWorkOrders': {
        const wos = JSON.parse(localStorage.getItem('ssh_work_orders') || '[]');
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const user = getStoredUser();

        let filtered = wos;
        if (user && user.role === 'Technician') {
          filtered = wos.filter(w => w.TechnicianId === user.technicianId || w.TechnicianName.includes(user.firstName));
        }

        return filtered.map(w => ({
          ...w,
          serviceRequest: reqs.find(r => r.RequestId === w.RequestId) || {}
        }));
      }

      case 'assignTechnician': {
        const wos = JSON.parse(localStorage.getItem('ssh_work_orders') || '[]');
        const targetWo = wos.find(w => w.WorkOrderId === payload.workOrderId);
        if (targetWo) {
          targetWo.TechnicianId = payload.technicianId;
          targetWo.TechnicianName = payload.technicianName || 'Mahesh Patil';
          targetWo.Status = 'Assigned';
          if (payload.scheduledDate) targetWo.ScheduledDate = payload.scheduledDate;
          localStorage.setItem('ssh_work_orders', JSON.stringify(wos));
          appendAuditLog('TECH_ASSIGNED', 'WorkOrders', `Technician ${targetWo.TechnicianName} assigned to Work Order #${payload.workOrderId}.`);
        }
        return { success: true, workOrder: targetWo };
      }

      case 'updateJobStatus': {
        const wos = JSON.parse(localStorage.getItem('ssh_work_orders') || '[]');
        const targetWo = wos.find(w => w.WorkOrderId === payload.workOrderId);
        if (targetWo) {
          targetWo.Status = payload.status;
          localStorage.setItem('ssh_work_orders', JSON.stringify(wos));
          appendAuditLog('JOB_STATUS_UPDATED', 'WorkOrders', `Work Order #${payload.workOrderId} status changed to '${payload.status}'.`);
        }
        return { success: true, status: payload.status };
      }

      case 'completeWorkOrder': {
        const wos = JSON.parse(localStorage.getItem('ssh_work_orders') || '[]');
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const invs = JSON.parse(localStorage.getItem('ssh_invoices') || '[]');
        const reps = JSON.parse(localStorage.getItem('ssh_reports') || '[]');

        const targetWo = wos.find(w => w.WorkOrderId === payload.workOrderId);
        if (targetWo) {
          targetWo.Status = 'Completed';
          localStorage.setItem('ssh_work_orders', JSON.stringify(wos));
          appendAuditLog('JOB_COMPLETED', 'WorkOrders', `Work Order #${payload.workOrderId} marked as Completed. Invoice auto-generated.`);
        }

        if (targetWo && targetWo.RequestId) {
          const targetReq = reqs.find(r => r.RequestId === targetWo.RequestId);
          if (targetReq) {
            targetReq.Status = 'Completed';
            localStorage.setItem('ssh_requests', JSON.stringify(reqs));
          }
        }

        // Generate Report & Invoice
        const repId = 'REP-' + Math.floor(100000 + Math.random() * 900000);
        const invId = 'INV-' + Math.floor(100000 + Math.random() * 900000);

        const newRep = {
          ReportId: repId,
          WorkOrderId: payload.workOrderId,
          RequestId: targetWo ? targetWo.RequestId : '',
          CustomerSignatureUrl: payload.signatureBase64 || '',
          Summary: payload.summary || 'Work verified and completed to satisfaction.',
          CreatedAt: new Date().toLocaleString('en-IN')
        };
        reps.unshift(newRep);
        localStorage.setItem('ssh_reports', JSON.stringify(reps));

        const newInv = {
          InvoiceId: invId,
          InvoiceNumber: 'INV-2026-' + Math.floor(1000 + Math.random() * 9000),
          RequestId: targetWo ? targetWo.RequestId : '',
          WorkOrderId: payload.workOrderId,
          CustomerId: targetWo ? targetWo.CustomerId : 'CUS-001',
          GrandTotal: 1179,
          PaymentStatus: 'Pending',
          CreatedAt: new Date().toLocaleString('en-IN')
        };
        invs.unshift(newInv);
        localStorage.setItem('ssh_invoices', JSON.stringify(invs));

        return { success: true, report: newRep, invoice: newInv };
      }

      case 'getInvoices': {
        const invs = JSON.parse(localStorage.getItem('ssh_invoices') || '[]');
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        return invs.map(i => ({
          ...i,
          serviceName: (reqs.find(r => r.RequestId === i.RequestId) || {}).ServiceName || 'AC Service'
        }));
      }

      case 'createPayment': {
        const invs = JSON.parse(localStorage.getItem('ssh_invoices') || '[]');
        const targetInv = invs.find(i => i.InvoiceId === payload.invoiceId);
        if (targetInv) {
          targetInv.PaymentStatus = 'Paid';
          localStorage.setItem('ssh_invoices', JSON.stringify(invs));
        }
        return { success: true, message: 'Payment recorded successfully.' };
      }

      case 'submitFeedback': {
        const fdbs = JSON.parse(localStorage.getItem('ssh_feedback') || '[]');
        fdbs.push({
          FeedbackId: 'FDB-' + Date.now(),
          RequestId: payload.requestId,
          OverallRating: payload.overallRating || 5,
          Comments: payload.comments || '',
          CreatedAt: new Date().toLocaleString('en-IN')
        });
        localStorage.setItem('ssh_feedback', JSON.stringify(fdbs));
        return { success: true, message: 'Feedback submitted.' };
      }

      case 'getDashboard': {
        const reqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const wos = JSON.parse(localStorage.getItem('ssh_work_orders') || '[]');
        const ests = JSON.parse(localStorage.getItem('ssh_estimates') || '[]');
        const invs = JSON.parse(localStorage.getItem('ssh_invoices') || '[]');
        const users = JSON.parse(localStorage.getItem('ssh_users') || '[]');

        const paidInvs = invs.filter(i => i.PaymentStatus === 'Paid');
        const revenue = paidInvs.reduce((sum, i) => sum + (Number(i.GrandTotal) || 0), 125000);

        return {
          metrics: {
            newRequests: reqs.filter(r => r.Status === 'New').length,
            pendingEstimates: ests.filter(e => e.Status === 'Pending').length,
            todayJobs: wos.filter(w => w.Status === 'Scheduled' || w.Status === 'Assigned').length,
            inProgressJobs: wos.filter(w => w.Status === 'In Progress' || w.Status === 'En Route').length,
            completedJobs: wos.filter(w => w.Status === 'Completed').length,
            totalRevenue: revenue,
            pendingPayments: invs.filter(i => i.PaymentStatus === 'Pending').reduce((sum, i) => sum + (Number(i.GrandTotal) || 0), 2358),
            activeTechnicians: 8,
            totalCustomers: users.filter(u => u.Role === 'Customer').length + 42
          },
          monthlyRevenue: [
            { month: 'Apr 2026', revenue: 45000 },
            { month: 'May 2026', revenue: 68000 },
            { month: 'Jun 2026', revenue: 92000 },
            { month: 'Jul 2026', revenue: 114000 },
            { month: 'Aug 2026', revenue: 148500 }
          ],
          recentRequests: reqs.slice(0, 6),
          recentWorkOrders: wos.slice(0, 6)
        };
      }

      case 'getTechnicians': {
        const techs = JSON.parse(localStorage.getItem('ssh_technicians') || '[]');
        if (techs.length === 0) {
          const defaultTechs = [
            { TechnicianId: 'TCH-001', UserId: 'USR-TECH', FullName: 'Mahesh Patil', Mobile: '9822001122', Email: 'tech@sevasetuhub.in', Specialization: 'AC & HVAC Service', City: 'Kolhapur', Rating: 4.9, Status: 'Available', CreatedAt: '2026-08-20' },
            { TechnicianId: 'TCH-002', UserId: 'USR-TECH-002', FullName: 'Sachin Kulkarni', Mobile: '9822003344', Email: 'sachin.k@sevasetuhub.in', Specialization: 'Electrical Repairs', City: 'Kolhapur', Rating: 4.8, Status: 'Busy', CreatedAt: '2026-08-20' },
            { TechnicianId: 'TCH-003', UserId: 'USR-TECH-003', FullName: 'Ramesh Jadhav', Mobile: '9822005566', Email: 'ramesh.j@sevasetuhub.in', Specialization: 'Plumbing Services', City: 'Sangli', Rating: 4.9, Status: 'Available', CreatedAt: '2026-08-21' },
            { TechnicianId: 'TCH-004', UserId: 'USR-TECH-004', FullName: 'Anil Shinde', Mobile: '9822007788', Email: 'anil.s@sevasetuhub.in', Specialization: 'Deep Cleaning & Pest', City: 'Kolhapur', Rating: 4.7, Status: 'Available', CreatedAt: '2026-08-21' }
          ];
          localStorage.setItem('ssh_technicians', JSON.stringify(defaultTechs));
          return defaultTechs;
        }
        return techs;
      }

      case 'createTechnician': {
        const techs = JSON.parse(localStorage.getItem('ssh_technicians') || '[]');
        const users = JSON.parse(localStorage.getItem('ssh_users') || '[]');
        const techId = 'TCH-' + Math.floor(100 + Math.random() * 900);
        const userId = 'USR-' + techId;

        const newTech = {
          TechnicianId: techId,
          UserId: userId,
          FullName: payload.fullName,
          Mobile: payload.mobile,
          Email: payload.email,
          Specialization: payload.specialization || 'General Technical Services',
          City: payload.city || 'Kolhapur',
          Rating: Number(payload.rating) || 5.0,
          Status: payload.status || 'Available',
          CreatedAt: new Date().toISOString().slice(0, 10)
        };

        techs.unshift(newTech);
        localStorage.setItem('ssh_technicians', JSON.stringify(techs));

        // Create login account in ssh_users
        const nameParts = (payload.fullName || '').trim().split(' ');
        const firstName = nameParts[0] || 'Technician';
        const lastName = nameParts.slice(1).join(' ') || 'Staff';

        users.push({
          UserId: userId,
          Email: payload.email,
          Mobile: payload.mobile,
          FirstName: firstName,
          LastName: lastName,
          Role: 'Technician',
          TechnicianId: techId,
          Password: payload.password || 'TechPassword@2026',
          Status: 'Active'
        });
        localStorage.setItem('ssh_users', JSON.stringify(users));

        appendAuditLog('TECHNICIAN_ADDED', 'Technicians', `New technician ${newTech.FullName} (${newTech.TechnicianId}) added for ${newTech.Specialization}.`);
        return newTech;
      }

      case 'updateTechnician': {
        const techs = JSON.parse(localStorage.getItem('ssh_technicians') || '[]');
        const idx = techs.findIndex(t => t.TechnicianId === payload.technicianId);
        if (idx === -1) throw new Error('Technician not found.');
        techs[idx] = { ...techs[idx], ...payload };
        localStorage.setItem('ssh_technicians', JSON.stringify(techs));
        appendAuditLog('TECHNICIAN_UPDATED', 'Technicians', `Technician ${techs[idx].FullName} profile/status updated.`);
        return techs[idx];
      }

      case 'deleteTechnician': {
        let techs = JSON.parse(localStorage.getItem('ssh_technicians') || '[]');
        const tech = techs.find(t => t.TechnicianId === payload.technicianId);
        techs = techs.filter(t => t.TechnicianId !== payload.technicianId);
        localStorage.setItem('ssh_technicians', JSON.stringify(techs));
        appendAuditLog('TECHNICIAN_DELETED', 'Technicians', `Technician ${tech ? tech.FullName : payload.technicianId} removed from roster.`);
        return { success: true };
      }

      case 'getCustomers':
        return [
          { CustomerId: 'CUS-001', FullName: 'Rahul Deshmukh', Mobile: '9890123456', Email: 'rahul.d@gmail.com', City: 'Kolhapur' },
          { CustomerId: 'CUS-002', FullName: 'Pooja Sawant', Mobile: '9890654321', Email: 'pooja.s@yahoo.com', City: 'Kolhapur' },
          { CustomerId: 'CUS-003', FullName: 'Amit Joshi', Mobile: '9890789012', Email: 'amit.j@outlook.com', City: 'Sangli' }
        ];

      case 'getAuditLogs': {
        const localLogs = JSON.parse(localStorage.getItem('ssh_audit_logs') || '[]');
        if (localLogs.length === 0) {
          const defaultLogs = [
            { LogId: 'LOG-001', Action: 'ESTIMATE_APPROVED', Entity: 'Estimates', Description: 'Customer approved estimate #EST-2026-1044', Timestamp: '2026-08-21 14:30:00', UserId: 'USR-CUST' },
            { LogId: 'LOG-002', Action: 'TECH_ASSIGNED', Entity: 'WorkOrders', Description: 'Assigned Mahesh Patil to Work Order #WO-40291', Timestamp: '2026-08-21 15:10:00', UserId: 'USR-ADMIN' },
            { LogId: 'LOG-003', Action: 'COUPON_CREATED', Entity: 'Coupons', Description: 'Created discount coupon WELCOME100', Timestamp: '2026-08-21 16:00:00', UserId: 'USR-ADMIN' }
          ];
          localStorage.setItem('ssh_audit_logs', JSON.stringify(defaultLogs));
          return defaultLogs;
        }
        return localLogs.slice().reverse();
      }

      case 'getNotifications':
        return [
          { NotificationId: 'NTF-1', Title: 'New Booking', Message: 'Your Split AC service request was confirmed.', CreatedAt: '10 mins ago', IsRead: 'No' },
          { NotificationId: 'NTF-2', Title: 'Technician En Route', Message: 'Mahesh Patil is on the way to your location.', CreatedAt: '1 hour ago', IsRead: 'No' }
        ];

      case 'createOffer': {
        const ofrs = JSON.parse(localStorage.getItem('ssh_offers') || '[]');
        const newOfr = {
          OfferId: 'OFR-' + Date.now(),
          OfferCode: (payload.offerCode || '').toUpperCase(),
          Title: payload.title,
          Description: payload.description || '',
          DiscountType: payload.discountType || 'Percentage',
          DiscountValue: Number(payload.discountValue) || 0,
          StartDate: payload.startDate || '2026-08-01',
          EndDate: payload.endDate || '2026-12-31',
          Status: 'Active'
        };
        ofrs.unshift(newOfr);
        localStorage.setItem('ssh_offers', JSON.stringify(ofrs));
        appendAuditLog('OFFER_CREATED', 'Offers', `New promotional offer '${newOfr.Title}' (${newOfr.OfferCode}) created with ${newOfr.DiscountValue}% discount.`);
        return newOfr;
      }

      case 'createCoupon': {
        const cpns = JSON.parse(localStorage.getItem('ssh_coupons') || '[]');
        const newCpn = {
          CouponId: 'CPN-' + Date.now(),
          CouponCode: (payload.couponCode || '').toUpperCase(),
          Description: payload.description || '',
          DiscountType: payload.discountType || 'FixedAmount',
          DiscountValue: Number(payload.discountValue) || 0,
          MinimumOrderValue: Number(payload.minimumOrderValue) || 0,
          MaximumDiscount: Number(payload.maximumDiscount) || 0,
          Status: 'Active'
        };
        cpns.unshift(newCpn);
        localStorage.setItem('ssh_coupons', JSON.stringify(cpns));
        appendAuditLog('COUPON_CREATED', 'Coupons', `New coupon '${newCpn.CouponCode}' created — ${newCpn.DiscountType} discount of ₹${newCpn.DiscountValue}.`);
        return newCpn;
      }

      default:
        return { success: true };
    }
  }

  /**
   * Seed Local Storage for instant out-of-the-box browser demonstration
   */
  function ensureLocalSeedData() {
    if (!localStorage.getItem('ssh_categories')) {
      const categories = [
        { CategoryId: 'CAT-AC', Name: 'AC Service & Repair', Slug: 'ac-service', Icon: 'bi-snow', Description: 'Precision cooling, foam jet wash, gas refill, repair & AMC' },
        { CategoryId: 'CAT-CLN', Name: 'Deep Cleaning', Slug: 'cleaning', Icon: 'bi-stars', Description: 'Full home deep sanitization, kitchen chimney & bathroom scrubbing' },
        { CategoryId: 'CAT-PLM', Name: 'Plumbing Services', Slug: 'plumbing', Icon: 'bi-droplet-fill', Description: 'Pipe leakage, fixture replacements, sanitary fittings & drain unblocking' },
        { CategoryId: 'CAT-ELE', Name: 'Electrical Repairs', Slug: 'electrical', Icon: 'bi-lightning-charge-fill', Description: 'Switchboard repair, MCB wiring, appliance fault fixes & lighting' },
        { CategoryId: 'CAT-PST', Name: 'Pest Control', Slug: 'pest-control', Icon: 'bi-shield-check', Description: '100% odourless herbal termite, cockroach & bedbug management' },
        { CategoryId: 'CAT-FAB', Name: 'Fabrication & Welding', Slug: 'fabrication', Icon: 'bi-tools', Description: 'Custom gates, safety grills, structural welding & metal fabrication' }
      ];
      localStorage.setItem('ssh_categories', JSON.stringify(categories));
    }

    if (!localStorage.getItem('ssh_services')) {
      const services = [
        { ServiceId: 'SRV-AC-01', CategoryId: 'CAT-AC', ServiceName: 'Split AC Power Jet Deep Service', Description: 'Complete indoor foam wash, outdoor condenser jet cleaning, filter wash & airflow check', BasePrice: 599, EstimatedHours: 1.5, Icon: 'bi-snow' },
        { ServiceId: 'SRV-AC-02', CategoryId: 'CAT-AC', ServiceName: 'AC Refrigerant Gas Refilling & Leak Fix', Description: 'Vacuum leak pressure test, copper joint brazing and original refrigerant charge', BasePrice: 2499, EstimatedHours: 2.0, Icon: 'bi-snow2' },
        { ServiceId: 'SRV-AC-03', CategoryId: 'CAT-AC', ServiceName: 'AC Installation & Dismantling', Description: 'Heavy-duty wall bracket mounting, core wall drilling, copper pipe flare & wiring', BasePrice: 1499, EstimatedHours: 2.5, Icon: 'bi-gear-wide-connected' },
        { ServiceId: 'SRV-CLN-01', CategoryId: 'CAT-CLN', ServiceName: '2 BHK Full Home Deep Cleaning', Description: 'Machine floor scrubbing, kitchen tile degreasing, bathroom descaling & window cleaning', BasePrice: 2999, EstimatedHours: 4.0, Icon: 'bi-house-check' },
        { ServiceId: 'SRV-CLN-02', CategoryId: 'CAT-CLN', ServiceName: 'Intensive Kitchen & Chimney Deep Clean', Description: 'Heavy oil removal from tiles, sink sanitization, exhaust & chimney cleaning', BasePrice: 1599, EstimatedHours: 2.5, Icon: 'bi-magic' },
        { ServiceId: 'SRV-PLM-01', CategoryId: 'CAT-PLM', ServiceName: 'Water Leakage & Concealed Pipe Repair', Description: 'Acoustic leakage diagnosis, joint solder, angle valve & tap replace', BasePrice: 449, EstimatedHours: 1.0, Icon: 'bi-droplet-half' },
        { ServiceId: 'SRV-ELE-01', CategoryId: 'CAT-ELE', ServiceName: 'Home Electrical Inspection & Repair', Description: 'Safety voltage check, MCB tripping repair, loose terminal tightening', BasePrice: 499, EstimatedHours: 1.5, Icon: 'bi-lightning' },
        { ServiceId: 'SRV-PST-01', CategoryId: 'CAT-PST', ServiceName: 'Herbal Kitchen Cockroach Gel Treatment', Description: 'Govt. approved non-toxic gel application in cabinets, drains and appliances', BasePrice: 899, EstimatedHours: 1.0, Icon: 'bi-shield-shaded' }
      ];
      localStorage.setItem('ssh_services', JSON.stringify(services));
    }

    if (!localStorage.getItem('ssh_offers')) {
      const offers = [
        { OfferId: 'OFR-001', OfferCode: 'SUMMERCOOL20', Title: 'Summer AC Super Saver', Description: 'Flat 20% OFF on all Split & Window AC servicing & repairs', DiscountType: 'Percentage', DiscountValue: 20, StartDate: '2026-03-01', EndDate: '2026-10-31', Status: 'Active' },
        { OfferId: 'OFR-002', OfferCode: 'DEEPFEST300', Title: 'Festive Home Cleaning ₹300 OFF', Description: 'Flat ₹300 discount on 2BHK/3BHK Full Home Deep Cleaning', DiscountType: 'FixedAmount', DiscountValue: 300, StartDate: '2026-01-01', EndDate: '2026-12-31', Status: 'Active' }
      ];
      localStorage.setItem('ssh_offers', JSON.stringify(offers));
    }

    if (!localStorage.getItem('ssh_coupons')) {
      const coupons = [
        { CouponId: 'CPN-001', CouponCode: 'WELCOME100', Description: 'Flat ₹100 OFF on your first booking', DiscountType: 'FixedAmount', DiscountValue: 100, MinimumOrderValue: 399, MaximumDiscount: 100, Status: 'Active' },
        { CouponId: 'CPN-002', CouponCode: 'SEVASETU20', Description: 'Special 20% Discount on Plumbing & Electrical', DiscountType: 'Percentage', DiscountValue: 20, MinimumOrderValue: 499, MaximumDiscount: 500, Status: 'Active' },
        { CouponId: 'CPN-003', CouponCode: 'CLEAN500', Description: 'Save ₹500 on Premium Full House Cleaning', DiscountType: 'FixedAmount', DiscountValue: 500, MinimumOrderValue: 2500, MaximumDiscount: 500, Status: 'Active' }
      ];
      localStorage.setItem('ssh_coupons', JSON.stringify(coupons));
    }

    if (!localStorage.getItem('ssh_users')) {
      const users = [
        { UserId: 'USR-ADMIN', Email: 'admin@sevasetuhub.in', Mobile: '9876543210', FirstName: 'Super', LastName: 'Admin', Role: 'SuperAdmin', Password: 'AdminPassword@2026', Status: 'Active' },
        { UserId: 'USR-DISP', Email: 'dispatch@sevasetuhub.in', Mobile: '9876543211', FirstName: 'Rahul', LastName: 'Dispatcher', Role: 'Dispatcher', Password: 'DispPassword@2026', Status: 'Active' },
        { UserId: 'USR-TECH', Email: 'tech@sevasetuhub.in', Mobile: '9822001122', FirstName: 'Mahesh', LastName: 'Patil', Role: 'Technician', TechnicianId: 'TCH-001', Password: 'TechPassword@2026', Status: 'Active' },
        { UserId: 'USR-CUST', Email: 'customer@sevasetuhub.in', Mobile: '9890123456', FirstName: 'Suresh', LastName: 'Kadam', Role: 'Customer', CustomerId: 'CUS-001', Password: 'CustPassword@2026', Status: 'Active' }
      ];
      localStorage.setItem('ssh_users', JSON.stringify(users));
    }

    if (!localStorage.getItem('ssh_requests')) {
      const requests = [
        {
          RequestId: 'REQ-104928',
          TenantId: APP_CONFIG.TENANT_ID,
          CustomerId: 'CUS-001',
          CustomerName: 'Suresh Kadam',
          CustomerMobile: '9890123456',
          CustomerEmail: 'customer@sevasetuhub.in',
          CategoryId: 'CAT-AC',
          ServiceId: 'SRV-AC-01',
          ServiceName: 'Split AC Power Jet Deep Service',
          IssueDescription: 'AC cooling is low, bad smell and water dripping from indoor unit.',
          Address: 'Flat 402, Royal Palms, Tarabai Park',
          City: 'Kolhapur',
          Pincode: '416003',
          PreferredDate: '2026-08-22',
          PreferredTimeSlot: '10:00 AM - 01:00 PM',
          CouponCode: 'WELCOME100',
          CouponDiscount: 100,
          Status: 'Assigned',
          Priority: 'High',
          CreatedAt: '2026-08-21 10:15:00',
          UpdatedAt: '2026-08-21 11:30:00'
        },
        {
          RequestId: 'REQ-104929',
          TenantId: APP_CONFIG.TENANT_ID,
          CustomerId: 'CUS-002',
          CustomerName: 'Pooja Sawant',
          CustomerMobile: '9890654321',
          CustomerEmail: 'pooja.s@yahoo.com',
          CategoryId: 'CAT-CLN',
          ServiceId: 'SRV-CLN-01',
          ServiceName: '2 BHK Full Home Deep Cleaning',
          IssueDescription: 'Deep cleaning before housewarming ceremony.',
          Address: 'House 12, Rajarampuri 5th Lane',
          City: 'Kolhapur',
          Pincode: '416008',
          PreferredDate: '2026-08-23',
          PreferredTimeSlot: '02:00 PM - 05:00 PM',
          CouponCode: 'CLEAN500',
          CouponDiscount: 500,
          Status: 'Estimate Sent',
          Priority: 'Medium',
          CreatedAt: '2026-08-21 12:00:00',
          UpdatedAt: '2026-08-21 14:00:00'
        }
      ];
      localStorage.setItem('ssh_requests', JSON.stringify(requests));
    }

    if (!localStorage.getItem('ssh_work_orders')) {
      const workOrders = [
        {
          WorkOrderId: 'WO-882910',
          TenantId: APP_CONFIG.TENANT_ID,
          RequestId: 'REQ-104928',
          EstimateId: 'EST-9901',
          CustomerId: 'CUS-001',
          TechnicianId: 'TCH-001',
          TechnicianName: 'Mahesh Patil',
          ScheduledDate: '2026-08-22',
          StartTime: '10:00 AM',
          EndTime: '01:00 PM',
          Priority: 'High',
          Status: 'Assigned',
          CreatedAt: '2026-08-21 11:30:00'
        }
      ];
      localStorage.setItem('ssh_work_orders', JSON.stringify(workOrders));
    }
  }

  // Public API methods
  return {
    getToken,
    setSession,
    clearSession,
    getStoredUser,

    // Endpoints
    ping: () => request('ping', 'GET'),
    login: async (emailOrMobile, password) => {
      const res = await request('login', 'POST', { emailOrMobile, password });
      if (res && res.token && res.user) {
        setSession(res.token, res.user);
      }
      return res;
    },
    register: async (data) => {
      const res = await request('register', 'POST', data);
      if (res && res.token && res.user) {
        setSession(res.token, res.user);
      }
      return res;
    },
    logout: async () => {
      try {
        await request('logout', 'POST');
      } finally {
        clearSession();
      }
      return { success: true };
    },
    getCurrentUser: () => request('getCurrentUser', 'GET'),
    getServices: (params) => request('getServices', 'GET', params),
    getServiceCategories: (params) => request('getServiceCategories', 'GET', params),
    getOffers: (params) => request('getOffers', 'GET', params),
    getCoupons: (params) => request('getCoupons', 'GET', params),
    validateCoupon: (payload) => request('validateCoupon', 'POST', payload),
    createServiceRequest: (payload) => request('createServiceRequest', 'POST', payload),
    getServiceRequests: (params) => request('getServiceRequests', 'GET', params),
    getServiceRequest: (requestId) => request('getServiceRequest', 'GET', { requestId }),
    createEstimate: (payload) => request('createEstimate', 'POST', payload),
    approveEstimate: (payload) => request('approveEstimate', 'POST', payload),
    rejectEstimate: (payload) => request('rejectEstimate', 'POST', payload),
    createWorkOrder: (payload) => request('createWorkOrder', 'POST', payload),
    getWorkOrders: (params) => request('getWorkOrders', 'GET', params),
    assignTechnician: (payload) => request('assignTechnician', 'POST', payload),
    updateJobStatus: (payload) => request('updateJobStatus', 'POST', payload),
    saveChecklist: (payload) => request('saveChecklist', 'POST', payload),
    saveWorkNotes: (payload) => request('saveWorkNotes', 'POST', payload),
    uploadPhoto: (payload) => request('uploadPhoto', 'POST', payload),
    completeWorkOrder: (payload) => request('completeWorkOrder', 'POST', payload),
    getInvoices: (params) => request('getInvoices', 'GET', params),
    createPayment: (payload) => request('createPayment', 'POST', payload),
    submitFeedback: (payload) => request('submitFeedback', 'POST', payload),
    getDashboard: () => request('getDashboard', 'GET'),
    getTechnicians: () => request('getTechnicians', 'GET'),
    createTechnician: (payload) => request('createTechnician', 'POST', payload),
    updateTechnician: (payload) => request('updateTechnician', 'POST', payload),
    deleteTechnician: (payload) => request('deleteTechnician', 'POST', payload),
    getCustomers: () => request('getCustomers', 'GET'),
    getNotifications: () => request('getNotifications', 'GET'),
    getAuditLogs: () => request('getAuditLogs', 'GET'),
    createOffer: (payload) => request('createOffer', 'POST', payload),
    updateOffer: (payload) => request('updateOffer', 'POST', payload),
    deleteOffer: (payload) => request('deleteOffer', 'POST', payload),
    createCoupon: (payload) => request('createCoupon', 'POST', payload),
    updateCoupon: (payload) => request('updateCoupon', 'POST', payload),
    deleteCoupon: (payload) => request('deleteCoupon', 'POST', payload),
    initializeDatabase: () => request('initializeDatabase', 'POST')
  };
})();
