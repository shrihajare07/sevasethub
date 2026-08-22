/**
 * ============================================================================
 * SevaSetuHub – Admin & Dispatcher SaaS Dashboard (admin.js)
 * ============================================================================
 */

$(document).ready(function() {
  if (!AuthGuard.protectRoute(['SuperAdmin', 'BusinessAdmin', 'Dispatcher', 'Accountant'])) return;
  AuthGuard.renderUserHeader();

  const currentUser = api.getStoredUser() || {};

  // Role-based UI customizations
  if (currentUser.role === 'Dispatcher') {
    $('.brand-badge').text('DISPATCHER').css('background', 'linear-gradient(135deg, #0284c7, #0369a1)');
    $('.admin-only-section').addClass('d-none');
    $('header.app-topbar h5').text('Field Operations & Dispatch Desk');
  } else if (currentUser.role === 'SuperAdmin') {
    $('.brand-badge').text('SUPERADMIN').css('background', 'linear-gradient(135deg, #dc2626, #991b1b)');
    $('.admin-only-section').removeClass('d-none');
    $('header.app-topbar h5').text('Platform Operations & SaaS Suite');
  }

  let revenueChart = null;
  let categoryChart = null;

  // Initialize
  loadDashboardData();
  initDispatchBoard();

  // Navigation tab switcher
  $('.admin-nav-link').on('click', function(e) {
    e.preventDefault();
    const target = $(this).data('target');
    $('.admin-nav-link').removeClass('active');
    $(this).addClass('active');

    $('.admin-section').addClass('d-none');
    $(`#section-${target}`).removeClass('d-none');

    if (target === 'requests') loadAdminRequests();
    if (target === 'dispatch') loadDispatchBoardData();
    if (target === 'technicians') loadAdminTechnicians();
    if (target === 'offers') loadAdminOffers();
    if (target === 'coupons') loadAdminCoupons();
    if (target === 'invoices') loadAdminInvoices();
    if (target === 'audit') loadAuditLogs();
  });

  // Mobile sidebar toggle
  $('#sidebar-toggle').on('click', function() {
    $('.app-sidebar').toggleClass('show');
  });
  $('#sidebar-close-btn').on('click', function() {
    $('.app-sidebar').removeClass('show');
  });

  // Logout
  $('.btn-logout').on('click', function(e) {
    e.preventDefault();
    AuthGuard.logout();
  });

  /**
   * Load High-Level Dashboard Metrics & Charts
   */
  async function loadDashboardData() {
    try {
      const data = await api.getDashboard();
      const m = data.metrics || {};

      $('#stat-admin-new-reqs').text(m.newRequests || 0);
      $('#stat-admin-pending-ests').text(m.pendingEstimates || 0);
      $('#stat-admin-today-jobs').text(m.todayJobs || 0);
      $('#stat-admin-revenue').text('₹' + (m.totalRevenue ? m.totalRevenue.toLocaleString('en-IN') : '0'));

      renderRevenueChart(data.monthlyRevenue || []);
      loadAdminRequests();
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  }

  function renderRevenueChart(monthlyData) {
    const ctx = document.getElementById('chart-revenue');
    if (!ctx) return;

    if (revenueChart) revenueChart.destroy();

    const labels = monthlyData.map(d => d.month);
    const amounts = monthlyData.map(d => d.revenue);

    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue (₹)',
          data: amounts,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#0d9488'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  /**
   * Load Service Requests List for Admin
   */
  async function loadAdminRequests() {
    try {
      const reqs = await api.getServiceRequests();
      const $tbody = $('#table-admin-requests tbody');
      $tbody.empty();

      if (reqs.length === 0) {
        $tbody.html('<tr><td colspan="7" class="text-center py-4 text-muted">No requests found.</td></tr>');
        return;
      }

      reqs.forEach(r => {
        const row = `
          <tr>
            <td><strong>#${r.RequestId}</strong></td>
            <td>
              <strong>${r.CustomerName}</strong><br>
              <small class="text-muted">${r.CustomerMobile}</small>
            </td>
            <td>${r.ServiceName}</td>
            <td>${r.PreferredDate} (${r.PreferredTimeSlot || 'Standard'})</td>
            <td><span class="badge ${getStatusClass(r.Status)}">${r.Status}</span></td>
            <td>${r.Priority === 'High' ? '<span class="badge bg-danger">High</span>' : '<span class="badge bg-secondary">Normal</span>'}</td>
            <td>
              <div class="dropdown">
                <button class="btn btn-sm btn-light border dropdown-toggle" data-bs-toggle="dropdown">Actions</button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item btn-action-estimate" href="#" data-id="${r.RequestId}" data-name="${r.CustomerName}" data-service="${r.ServiceName}"><i class="bi bi-calculator"></i> Create Estimate</a></li>
                  <li><a class="dropdown-item btn-action-assign" href="#" data-id="${r.RequestId}"><i class="bi bi-person-check"></i> Assign Technician</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger btn-action-cancel" href="#" data-id="${r.RequestId}"><i class="bi bi-x-circle"></i> Cancel</a></li>
                </ul>
              </div>
            </td>
          </tr>
        `;
        $tbody.append(row);
      });

      // Bind Estimate Creator Trigger
      $('.btn-action-estimate').on('click', function(e) {
        e.preventDefault();
        const reqId = $(this).data('id');
        const custName = $(this).data('name');
        const srvName = $(this).data('service');

        $('#est-modal-req-id').val(reqId);
        $('#est-modal-customer-info').text(`${custName} - ${srvName} (#${reqId})`);
        const modal = new bootstrap.Modal(document.getElementById('modalCreateEstimate'));
        modal.show();
      });

      // Bind Assign Tech Trigger
      $('.btn-action-assign').on('click', function(e) {
        e.preventDefault();
        const reqId = $(this).data('id');
        openAssignModal(reqId);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Submit Estimate
  $('#btn-save-estimate').on('click', async function() {
    const reqId = $('#est-modal-req-id').val();
    const labour = Number($('#est-modal-labour').val()) || 0;
    const material = Number($('#est-modal-material').val()) || 0;
    const discount = Number($('#est-modal-discount').val()) || 0;
    const notes = $('#est-modal-notes').val();

    $(this).prop('disabled', true).text('Creating...');

    try {
      const res = await api.createEstimate({
        requestId: reqId,
        labourAmount: labour,
        materialAmount: material,
        discountAmount: discount,
        notes: notes
      });

      alert(`Estimate #${res.EstimateNumber} generated for ₹${res.GrandTotal} and sent to customer.`);
      bootstrap.Modal.getInstance(document.getElementById('modalCreateEstimate')).hide();
      loadAdminRequests();
    } catch (err) {
      alert('Failed to generate estimate: ' + err.message);
    } finally {
      $(this).prop('disabled', false).text('Generate & Send Estimate');
    }
  });

  /**
   * Assign Technician Modal
   */
  async function openAssignModal(reqId) {
    const techs = await api.getTechnicians();
    const $techSelect = $('#assign-modal-tech');
    $techSelect.empty().append('<option value="">-- Choose Technician --</option>');

    techs.forEach(t => {
      $techSelect.append(`<option value="${t.TechnicianId}" data-name="${t.FullName}">${t.FullName} (${t.Specialization} - ${t.Status})</option>`);
    });

    $('#assign-modal-req-id').val(reqId);
    const modal = new bootstrap.Modal(document.getElementById('modalAssignTech'));
    modal.show();
  }

  // Submit Assignment
  $('#btn-confirm-assign').on('click', async function() {
    const reqId = $('#assign-modal-req-id').val();
    const techId = $('#assign-modal-tech').val();
    const techName = $('#assign-modal-tech option:selected').data('name');
    const date = $('#assign-modal-date').val();
    const time = $('#assign-modal-time').val();

    if (!techId) {
      alert('Please select a technician.');
      return;
    }

    try {
      // Find or create Work Order
      const wo = await api.createWorkOrder({
        requestId: reqId,
        technicianId: techId,
        technicianName: techName,
        scheduledDate: date,
        startTime: time
      });

      alert(`Technician ${techName} assigned to Work Order #${wo.WorkOrderId}`);
      bootstrap.Modal.getInstance(document.getElementById('modalAssignTech')).hide();
      loadAdminRequests();
    } catch (err) {
      alert('Assignment failed: ' + err.message);
    }
  });

  /**
   * Interactive Dispatch Board
   */
  function initDispatchBoard() {
    loadDispatchBoardData();
  }

  async function loadDispatchBoardData() {
    try {
      const techs = await api.getTechnicians();
      const workOrders = await api.getWorkOrders();
      const $tbody = $('#dispatch-board-body');
      $tbody.empty();

      techs.forEach(t => {
        const assignedJobs = workOrders.filter(w => w.TechnicianId === t.TechnicianId);

        let row = `<tr><td><strong>${t.FullName}</strong><br><small class="text-muted">${t.Specialization}</small></td>`;
        const timeSlots = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];

        timeSlots.forEach(slot => {
          const matchingJob = assignedJobs.find(j => (j.StartTime || '').includes(slot.slice(0, 2)));
          if (matchingJob) {
            row += `
              <td>
                <div class="dispatch-slot-card">
                  <strong>#${matchingJob.WorkOrderId}</strong><br>
                  <span>${matchingJob.serviceRequest ? matchingJob.serviceRequest.ServiceName : 'Service'}</span>
                </div>
              </td>
            `;
          } else {
            row += `<td><span class="text-muted small" style="opacity:0.4;">Available</span></td>`;
          }
        });

        row += `</tr>`;
        $tbody.append(row);
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Certified Technicians Roster Management
   */
  async function loadAdminTechnicians() {
    const $tbody = $('#technicians-table-body');
    $tbody.html('<tr><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Fetching technicians roster...</td></tr>');

    try {
      const techs = await api.getTechnicians();
      $tbody.empty();

      if (!techs || techs.length === 0) {
        $tbody.html('<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-person-x text-muted fs-4 d-block mb-1"></i>No field technicians found. Click "+ Add New Technician" to register one.</td></tr>');
        return;
      }

      techs.forEach(t => {
        const initials = (t.FullName || 'T').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const statusBadge = t.Status === 'Available'
          ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Available</span>'
          : t.Status === 'Busy'
          ? '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>Busy</span>'
          : '<span class="badge bg-secondary"><i class="bi bi-dash-circle me-1"></i>On-Leave</span>';

        const row = `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="user-avatar-circle" style="width:36px;height:36px;background:var(--gradient-brand);color:#fff;font-size:0.85rem;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:50%;">
                  ${initials}
                </div>
                <div>
                  <strong class="d-block text-dark">${t.FullName}</strong>
                  <span class="badge bg-light text-primary border" style="font-size:0.7rem;">${t.TechnicianId}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="badge bg-info-subtle text-info-emphasis border px-2 py-1">${t.Specialization || 'General Technical'}</span>
            </td>
            <td>
              <div><i class="bi bi-telephone text-muted me-1 small"></i><strong>${t.Mobile}</strong></div>
              <small class="text-muted"><i class="bi bi-envelope me-1"></i>${t.Email}</small>
            </td>
            <td>
              <span class="text-muted"><i class="bi bi-geo-alt me-1 text-danger"></i>${t.City || 'Kolhapur'}</span>
            </td>
            <td>
              <span class="fw-bold text-dark"><i class="bi bi-star-fill text-warning me-1"></i>${t.Rating ? Number(t.Rating).toFixed(1) : '5.0'}</span>
            </td>
            <td>
              ${statusBadge}
            </td>
            <td>
              <div class="dropdown">
                <button class="btn btn-sm btn-light border dropdown-toggle" data-bs-toggle="dropdown">Action</button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item btn-toggle-tech-status" href="#" data-id="${t.TechnicianId}" data-status="Available"><i class="bi bi-check2 text-success"></i> Set Available</a></li>
                  <li><a class="dropdown-item btn-toggle-tech-status" href="#" data-id="${t.TechnicianId}" data-status="Busy"><i class="bi bi-clock text-warning"></i> Set Busy</a></li>
                  <li><a class="dropdown-item btn-toggle-tech-status" href="#" data-id="${t.TechnicianId}" data-status="On-Leave"><i class="bi bi-pause text-secondary"></i> Set On-Leave</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger btn-delete-tech" href="#" data-id="${t.TechnicianId}" data-name="${t.FullName}"><i class="bi bi-trash"></i> Remove</a></li>
                </ul>
              </div>
            </td>
          </tr>
        `;
        $tbody.append(row);
      });

      // Bind status toggle handlers
      $('.btn-toggle-tech-status').on('click', async function(e) {
        e.preventDefault();
        const techId = $(this).data('id');
        const newStatus = $(this).data('status');
        try {
          await api.updateTechnician({ technicianId: techId, status: newStatus });
          loadAdminTechnicians();
        } catch (err) {
          alert('Failed to update status: ' + err.message);
        }
      });

      // Bind delete handler
      $('.btn-delete-tech').on('click', async function(e) {
        e.preventDefault();
        const techId = $(this).data('id');
        const techName = $(this).data('name');
        if (confirm(`Are you sure you want to remove technician "${techName}" (${techId}) from the active roster?`)) {
          try {
            await api.deleteTechnician({ technicianId: techId });
            loadAdminTechnicians();
          } catch (err) {
            alert('Failed to remove technician: ' + err.message);
          }
        }
      });

    } catch (err) {
      $tbody.html(`<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Error loading technicians: ${err.message}</td></tr>`);
    }
  }

  // Handle Add Technician Form Submit
  $('#form-add-technician').on('submit', async function(e) {
    e.preventDefault();
    const submitBtn = $('#btn-save-technician');
    submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Registering...');

    try {
      const payload = {
        fullName: $('#tech-fullname').val().trim(),
        mobile: $('#tech-mobile').val().trim(),
        email: $('#tech-email').val().trim(),
        password: $('#tech-password').val().trim() || 'TechPassword@2026',
        specialization: $('#tech-specialization').val(),
        city: $('#tech-city').val().trim() || 'Kolhapur',
        status: $('#tech-status').val() || 'Available'
      };

      const newTech = await api.createTechnician(payload);
      alert(`Success! Technician ${newTech.FullName} (${newTech.TechnicianId}) has been registered and activated.`);

      // Hide modal & reset form
      const modalEl = document.getElementById('modalAddTechnician');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      $('#form-add-technician')[0].reset();
      $('#tech-password').val('TechPassword@2026');

      // Reload technicians table
      loadAdminTechnicians();
    } catch (err) {
      alert('Error adding technician: ' + err.message);
    } finally {
      submitBtn.prop('disabled', false).html('<i class="bi bi-check2-circle me-1"></i> Register &amp; Activate Technician');
    }
  });

  /**
   * Offers CRUD Management
   */
  async function loadAdminOffers() {
    const offers = await api.getOffers();
    const $tbody = $('#table-admin-offers tbody');
    $tbody.empty();

    offers.forEach(o => {
      $tbody.append(`
        <tr>
          <td><strong>${o.OfferCode}</strong></td>
          <td>${o.Title}</td>
          <td>${o.DiscountType === 'Percentage' ? o.DiscountValue + '%' : '₹' + o.DiscountValue}</td>
          <td>${o.StartDate} to ${o.EndDate}</td>
          <td><span class="badge bg-success">${o.Status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-danger btn-del-offer" data-id="${o.OfferId}">Delete</button>
          </td>
        </tr>
      `);
    });

    $('.btn-del-offer').on('click', async function() {
      if (confirm('Delete this offer?')) {
        await api.deleteOffer({ offerId: $(this).data('id') });
        loadAdminOffers();
      }
    });
  }

  $('#btn-save-offer').on('click', async function() {
    try {
      await api.createOffer({
        offerCode: $('#offer-code').val(),
        title: $('#offer-title').val(),
        discountType: $('#offer-type').val(),
        discountValue: $('#offer-val').val(),
        startDate: $('#offer-start').val(),
        endDate: $('#offer-end').val()
      });
      alert('Offer created successfully!');
      bootstrap.Modal.getInstance(document.getElementById('modalCreateOffer')).hide();
      loadAdminOffers();
    } catch (e) {
      alert('Error creating offer: ' + e.message);
    }
  });

  /**
   * Coupons CRUD Management
   */
  async function loadAdminCoupons() {
    const coupons = await api.getCoupons();
    const $tbody = $('#table-admin-coupons tbody');
    $tbody.empty();

    coupons.forEach(c => {
      $tbody.append(`
        <tr>
          <td><strong>${c.CouponCode}</strong></td>
          <td>${c.Description}</td>
          <td>${c.DiscountType === 'Percentage' ? c.DiscountValue + '%' : '₹' + c.DiscountValue}</td>
          <td>Min: ₹${c.MinimumOrderValue || 0}</td>
          <td><span class="badge bg-success">${c.Status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-danger btn-del-coupon" data-id="${c.CouponId}">Delete</button>
          </td>
        </tr>
      `);
    });

    $('.btn-del-coupon').on('click', async function() {
      if (confirm('Delete this coupon?')) {
        await api.deleteCoupon({ couponId: $(this).data('id') });
        loadAdminCoupons();
      }
    });
  }

  $('#btn-save-coupon').on('click', async function() {
    try {
      await api.createCoupon({
        couponCode: $('#coupon-code').val(),
        description: $('#coupon-desc').val(),
        discountType: $('#coupon-type').val(),
        discountValue: $('#coupon-val').val(),
        minimumOrderValue: $('#coupon-min-order').val(),
        maximumDiscount: $('#coupon-max-disc').val()
      });
      alert('Coupon created successfully!');
      bootstrap.Modal.getInstance(document.getElementById('modalCreateCoupon')).hide();
      loadAdminCoupons();
    } catch (e) {
      alert('Error creating coupon: ' + e.message);
    }
  });

  /**
   * Load Invoices Ledger
   */
  async function loadAdminInvoices() {
    const invoices = await api.getInvoices();
    const $tbody = $('#table-admin-invoices tbody');
    $tbody.empty();

    invoices.forEach(i => {
      $tbody.append(`
        <tr>
          <td><strong>#${i.InvoiceNumber}</strong></td>
          <td>${i.customerName || 'Customer'}</td>
          <td>${i.serviceName || 'Service'}</td>
          <td><strong>₹${i.GrandTotal}</strong></td>
          <td><span class="badge ${i.PaymentStatus === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}">${i.PaymentStatus}</span></td>
          <td>${i.CreatedAt}</td>
        </tr>
      `);
    });
  }

  /**
   * Load Audit Logs (Real-time)
   */
  async function loadAuditLogs() {
    const $tbody = $('#table-admin-audit tbody');
    $tbody.html('<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Fetching real-time audit trail...</td></tr>');

    try {
      const logs = await api.getAuditLogs();
      $tbody.empty();

      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        $tbody.html('<tr><td colspan="5" class="text-center py-4 text-muted"><i class="bi bi-shield-check text-success fs-4 d-block mb-1"></i>No audit events recorded yet.</td></tr>');
        return;
      }

      logs.forEach(l => {
        const actionBadge = getAuditActionBadge(l.Action || 'ACTION');
        $tbody.append(`
          <tr>
            <td class="text-nowrap"><small class="text-muted"><i class="bi bi-clock me-1"></i>${l.Timestamp || 'N/A'}</small></td>
            <td>${actionBadge}</td>
            <td><span class="badge bg-light text-dark border">${l.Entity || 'System'}</span></td>
            <td>${l.Description || 'System operation executed.'}</td>
            <td><small class="text-muted">${l.UserId || 'Admin'}</small></td>
          </tr>
        `);
      });
    } catch (err) {
      $tbody.html(`<tr><td colspan="5" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load audit logs: ${err.message}</td></tr>`);
    }
  }

  function getAuditActionBadge(action) {
    if (action.includes('APPROVED') || action.includes('SUCCESS') || action.includes('COMPLETED')) {
      return `<span class="badge bg-success">${action}</span>`;
    } else if (action.includes('CREATED') || action.includes('REGISTERED')) {
      return `<span class="badge bg-primary">${action}</span>`;
    } else if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('CANCEL')) {
      return `<span class="badge bg-danger">${action}</span>`;
    } else if (action.includes('LOGIN') || action.includes('ASSIGNED')) {
      return `<span class="badge bg-info text-dark">${action}</span>`;
    }
    return `<span class="badge bg-secondary">${action}</span>`;
  }

  // Bind Refresh button for Audit Logs
  $('#btn-refresh-audit').on('click', function(e) {
    e.preventDefault();
    loadAuditLogs();
  });

  /**
   * Settings: Apps Script Web App URL Sync & Ping Test
   */
  $('#settings-api-url').val(APP_CONFIG.API_URL);

  $('#btn-save-api-url').on('click', function() {
    const url = $('#settings-api-url').val().trim();
    localStorage.setItem('sevasetu_api_url', url);
    APP_CONFIG.API_URL = url;
    alert('Google Apps Script Web App URL saved successfully!');
  });

  $('#btn-test-api-ping').on('click', async function() {
    $(this).prop('disabled', true).text('Pinging...');
    try {
      const res = await api.ping();
      alert(`API Connection Test Successful!\nStatus: ${res.status}\nApp: ${res.app}`);
    } catch (e) {
      alert(`Connection failed: ${e.message}`);
    } finally {
      $(this).prop('disabled', false).text('Test Connection');
    }
  });

  function getStatusClass(status) {
    const map = {
      'New': 'bg-info text-dark',
      'Estimate Sent': 'bg-warning text-dark',
      'Approved': 'bg-primary',
      'Assigned': 'bg-primary',
      'In Progress': 'bg-warning text-dark',
      'Completed': 'bg-success',
      'Cancelled': 'bg-danger'
    };
    return map[status] || 'bg-secondary';
  }
});
