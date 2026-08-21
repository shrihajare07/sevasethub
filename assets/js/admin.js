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
    if (target === 'offers') loadAdminOffers();
    if (target === 'coupons') loadAdminCoupons();
    if (target === 'invoices') loadAdminInvoices();
    if (target === 'audit') loadAuditLogs();
  });

  // Mobile sidebar toggle
  $('#sidebar-toggle').on('click', function() {
    $('.app-sidebar').toggleClass('show');
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
   * Load Audit Logs
   */
  async function loadAuditLogs() {
    const logs = await api.getAuditLogs();
    const $tbody = $('#table-admin-audit tbody');
    $tbody.empty();

    logs.forEach(l => {
      $tbody.append(`
        <tr>
          <td>${l.Timestamp}</td>
          <td><span class="badge bg-secondary">${l.Action}</span></td>
          <td>${l.Entity}</td>
          <td>${l.Description}</td>
        </tr>
      `);
    });
  }

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
