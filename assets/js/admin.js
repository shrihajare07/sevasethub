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
    if (target === 'dispatchers') loadAdminDispatchers();
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
   * Show a non-blocking Bootstrap toast notification
   * @param {string} message - Message text to display
   * @param {'success'|'danger'|'info'|'warning'} type - Bootstrap color type
   */
  function showToast(message, type = 'success') {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;min-width:280px;max-width:400px;';
      document.body.appendChild(container);
    }
    const bgMap = { success: 'bg-success', danger: 'bg-danger', info: 'bg-info', warning: 'bg-warning text-dark' };
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white ${bgMap[type] || 'bg-secondary'} border-0 show`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-semibold" style="font-size:0.9rem;">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    container.appendChild(toastEl);
    toastEl.querySelector('[data-bs-dismiss="toast"]').addEventListener('click', () => toastEl.remove());
    setTimeout(() => { toastEl.classList.remove('show'); setTimeout(() => toastEl.remove(), 300); }, 4000);
  }

  /**
   * Load High-Level Dashboard Metrics &amp; Charts
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
        let cleanDate = r.PreferredDate || 'Immediate';
        if (cleanDate.includes('T')) {
          try {
            const d = new Date(cleanDate);
            if (!isNaN(d.getTime())) {
              cleanDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            } else {
              cleanDate = cleanDate.slice(0, 10);
            }
          } catch(e) {
            cleanDate = cleanDate.slice(0, 10);
          }
        }

        const row = `
          <tr>
            <td><strong>#${r.RequestId}</strong></td>
            <td>
              <strong>${r.CustomerName}</strong><br>
              <small class="text-muted">${r.CustomerMobile}</small>
            </td>
            <td>${r.ServiceName}</td>
            <td>${cleanDate} <small class="text-muted d-block">(${r.PreferredTimeSlot || 'Standard Slot'})</small></td>
            <td><span class="badge ${getStatusClass(r.Status)}">${r.Status}</span></td>
            <td>${r.Priority === 'High' ? '<span class="badge bg-danger">High</span>' : '<span class="badge bg-secondary">Normal</span>'}</td>
            <td>
              <div class="dropdown">
                <button class="btn btn-sm btn-light border dropdown-toggle" data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-expanded="false">
                  <i class="bi bi-three-dots-vertical me-1"></i>Actions
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                  <li><a class="dropdown-item btn-action-estimate" href="#" data-id="${r.RequestId}" data-name="${r.CustomerName}" data-service="${r.ServiceName}"><i class="bi bi-calculator text-primary me-2"></i> Create Estimate</a></li>
                  <li><a class="dropdown-item btn-action-assign" href="#" data-id="${r.RequestId}"><i class="bi bi-person-check text-success me-2"></i> Assign Technician</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger btn-action-cancel" href="#" data-id="${r.RequestId}"><i class="bi bi-x-circle me-2"></i> Cancel Request</a></li>
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

  const TIME_SLOTS = [
    { index: 0, label: '09:00 AM - 11:00 AM', shortTime: '09:00 AM' },
    { index: 1, label: '11:00 AM - 01:00 PM', shortTime: '11:00 AM' },
    { index: 2, label: '01:00 PM - 03:00 PM', shortTime: '01:00 PM' },
    { index: 3, label: '03:00 PM - 05:00 PM', shortTime: '03:00 PM' },
    { index: 4, label: '05:00 PM - 07:00 PM', shortTime: '05:00 PM' }
  ];

  function mapTimeToSlotIndex(timeStr) {
    if (!timeStr) return 0;
    const str = timeStr.toUpperCase();

    if (str.includes('SLOT 1') || str.includes('09:00') || str.includes('10:00') || str.includes('9:00') || str.includes('10:30')) return 0;
    if (str.includes('SLOT 2') || str.includes('11:00') || str.includes('12:00') || str.includes('11:30') || str.includes('12:30')) return 1;
    if (str.includes('SLOT 3') || str.includes('01:00') || str.includes('02:00') || str.includes('1:00') || str.includes('2:00') || str.includes('13:') || str.includes('14:')) return 2;
    if (str.includes('SLOT 4') || str.includes('03:00') || str.includes('04:00') || str.includes('3:00') || str.includes('4:00') || str.includes('03:30') || str.includes('15:') || str.includes('16:')) return 3;
    if (str.includes('SLOT 5') || str.includes('05:00') || str.includes('06:00') || str.includes('5:00') || str.includes('6:00') || str.includes('17:') || str.includes('18:') || str.includes('19:')) return 4;

    const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const ampm = (match[3] || '').toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;

      if (h >= 8 && h < 11) return 0;
      if (h >= 11 && h < 13) return 1;
      if (h >= 13 && h < 15) return 2;
      if (h >= 15 && h < 17) return 3;
      if (h >= 17) return 4;
    }
    return 0;
  }

  /**
   * Assign Technician Modal
   */
  async function openAssignModal(reqId, preselectedTechId, preselectedSlot) {
    const techs = await api.getTechnicians();
    const reqs = await api.getServiceRequests();
    const targetReq = (reqs || []).find(r => r.RequestId === reqId);

    const $techSelect = $('#assign-modal-tech');
    $techSelect.empty().append('<option value="">-- Choose Certified Technician --</option>');

    techs.forEach(t => {
      const isSelected = preselectedTechId && preselectedTechId === t.TechnicianId ? 'selected' : '';
      $techSelect.append(`<option value="${t.TechnicianId}" data-name="${t.FullName}" ${isSelected}>${t.FullName} (${t.Specialization} - ${t.Status})</option>`);
    });

    $('#assign-modal-req-id').val(reqId || '');
    if (targetReq) {
      $('#assign-modal-request-info').html(`<strong>Request #${targetReq.RequestId}</strong>: ${targetReq.ServiceName} for ${targetReq.CustomerName} (${targetReq.City || 'Kolhapur'})`).show();
    } else {
      $('#assign-modal-request-info').hide();
    }

    const currentDateVal = $('#dispatch-filter-date').val() || new Date().toISOString().slice(0, 10);
    $('#assign-modal-date').val(targetReq && targetReq.PreferredDate ? targetReq.PreferredDate : currentDateVal);

    if (preselectedSlot) {
      $('#assign-modal-time').val(preselectedSlot);
    }

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
      const wo = await api.createWorkOrder({
        requestId: reqId,
        technicianId: techId,
        technicianName: techName,
        scheduledDate: date,
        startTime: time
      });

      alert(`Technician ${techName} scheduled successfully for Work Order #${wo.WorkOrderId}`);
      bootstrap.Modal.getInstance(document.getElementById('modalAssignTech')).hide();
      loadAdminRequests();
      loadDispatchBoardData();
    } catch (err) {
      alert('Assignment failed: ' + err.message);
    }
  });

  /**
   * Interactive Real-Time Dispatch Board
   */
  let _dispatchDateFilterMode = 'single'; // 'single' or 'all'

  function initDispatchBoard() {
    const todayStr = new Date().toISOString().slice(0, 10);
    $('#dispatch-filter-date').val(todayStr);
    $('#assign-modal-date').val(todayStr);
    $('#quick-dispatch-date').val(todayStr);

    // Date Navigation Controls
    $('#btn-dispatch-prev-day').on('click', function() {
      _dispatchDateFilterMode = 'single';
      const cur = new Date($('#dispatch-filter-date').val() || new Date());
      cur.setDate(cur.getDate() - 1);
      $('#dispatch-filter-date').val(cur.toISOString().slice(0, 10));
      loadDispatchBoardData();
    });

    $('#btn-dispatch-next-day').on('click', function() {
      _dispatchDateFilterMode = 'single';
      const cur = new Date($('#dispatch-filter-date').val() || new Date());
      cur.setDate(cur.getDate() + 1);
      $('#dispatch-filter-date').val(cur.toISOString().slice(0, 10));
      loadDispatchBoardData();
    });

    $('#btn-dispatch-today').on('click', function() {
      _dispatchDateFilterMode = 'single';
      $('#dispatch-filter-date').val(new Date().toISOString().slice(0, 10));
      loadDispatchBoardData();
    });

    $('#btn-dispatch-all-dates').on('click', function() {
      _dispatchDateFilterMode = 'all';
      loadDispatchBoardData();
    });

    $('#dispatch-filter-date').on('change', function() {
      _dispatchDateFilterMode = 'single';
      loadDispatchBoardData();
    });

    $('#dispatch-filter-spec, #dispatch-filter-status').on('change', function() {
      loadDispatchBoardData();
    });

    // Refresh Board Button
    $('#btn-refresh-dispatch').on('click', function() {
      const $btn = $(this);
      $btn.find('i').addClass('spinner-border spinner-border-sm border-0').removeClass('bi-arrow-clockwise');
      loadDispatchBoardData().finally(() => {
        setTimeout(() => {
          $btn.find('i').removeClass('spinner-border spinner-border-sm border-0').addClass('bi-arrow-clockwise');
        }, 400);
      });
    });

    // Quick Dispatch Trigger
    $('#btn-open-quick-dispatch').on('click', async function() {
      await openQuickDispatchModal();
    });

    $('#btn-confirm-quick-dispatch').on('click', async function() {
      const reqId = $('#quick-dispatch-req-select').val();
      const techId = $('#quick-dispatch-tech-select').val();
      const techName = $('#quick-dispatch-tech-select option:selected').data('name');
      const date = $('#quick-dispatch-date').val();
      const time = $('#quick-dispatch-time').val();

      if (!reqId) {
        alert('Please select a service request.');
        return;
      }
      if (!techId) {
        alert('Please select a certified technician.');
        return;
      }

      try {
        const wo = await api.createWorkOrder({
          requestId: reqId,
          technicianId: techId,
          technicianName: techName,
          scheduledDate: date,
          startTime: time
        });

        alert(`Work order #${wo.WorkOrderId} dispatched to ${techName}!`);
        bootstrap.Modal.getInstance(document.getElementById('modalQuickDispatch')).hide();
        loadDispatchBoardData();
        loadAdminRequests();
      } catch (err) {
        alert('Quick dispatch failed: ' + err.message);
      }
    });

    // Reassign handler from Work Order details modal
    $('#btn-wo-modal-reassign').on('click', async function() {
      const woId = $('#wo-modal-current-wo-id').val();
      const newTechId = $('#wo-modal-reassign-tech').val();
      const newTechName = $('#wo-modal-reassign-tech option:selected').data('name');

      if (!woId || !newTechId) return;

      try {
        await api.assignTechnician({
          workOrderId: woId,
          technicianId: newTechId,
          technicianName: newTechName
        });
        alert(`Job reassigned to ${newTechName}.`);
        bootstrap.Modal.getInstance(document.getElementById('modalDispatchWorkOrderDetails')).hide();
        loadDispatchBoardData();
      } catch (err) {
        alert('Reassign failed: ' + err.message);
      }
    });

    // Status change handler from Work Order details modal
    $('.btn-wo-change-status').on('click', async function() {
      const woId = $('#wo-modal-current-wo-id').val();
      const newStatus = $(this).data('status');

      if (!woId || !newStatus) return;

      try {
        if (newStatus === 'Completed') {
          await api.completeWorkOrder({ workOrderId: woId });
        } else {
          await api.updateJobStatus({ workOrderId: woId, status: newStatus });
        }
        alert(`Work Order #${woId} status updated to '${newStatus}'.`);
        bootstrap.Modal.getInstance(document.getElementById('modalDispatchWorkOrderDetails')).hide();
        loadDispatchBoardData();
        loadAdminRequests();
      } catch (err) {
        alert('Status update failed: ' + err.message);
      }
    });

    // Auto-refresh polling every 20 seconds when Dispatch section is visible
    setInterval(() => {
      if (!$('#section-dispatch').hasClass('d-none')) {
        loadDispatchBoardData(true);
      }
    }, 20000);

    loadDispatchBoardData();
  }

  async function openQuickDispatchModal(preselectedTechId, preselectedSlot) {
    const reqs = await api.getServiceRequests();
    const techs = await api.getTechnicians();

    const $reqSelect = $('#quick-dispatch-req-select');
    $reqSelect.empty().append('<option value="">-- Choose Pending Service Request --</option>');

    (reqs || []).forEach(r => {
      $reqSelect.append(`<option value="${r.RequestId}">#${r.RequestId} - ${r.ServiceName} (${r.CustomerName}, ${r.City || 'Kolhapur'} - ${r.Status})</option>`);
    });

    const $techSelect = $('#quick-dispatch-tech-select');
    $techSelect.empty().append('<option value="">-- Choose Certified Technician --</option>');

    (techs || []).forEach(t => {
      const isSelected = preselectedTechId && preselectedTechId === t.TechnicianId ? 'selected' : '';
      $techSelect.append(`<option value="${t.TechnicianId}" data-name="${t.FullName}" ${isSelected}>${t.FullName} (${t.Specialization} - ${t.Status})</option>`);
    });

    const currentDateVal = $('#dispatch-filter-date').val() || new Date().toISOString().slice(0, 10);
    $('#quick-dispatch-date').val(currentDateVal);

    if (preselectedSlot) {
      $('#quick-dispatch-time').val(preselectedSlot);
    }

    const modal = new bootstrap.Modal(document.getElementById('modalQuickDispatch'));
    modal.show();
  }

  async function openWorkOrderInspector(workOrder, matchingTech) {
    $('#wo-modal-current-wo-id').val(workOrder.WorkOrderId);
    $('#wo-modal-id').text(`#${workOrder.WorkOrderId}`);

    const req = workOrder.serviceRequest || {};
    $('#wo-modal-service-title').text(req.ServiceName || workOrder.ServiceName || 'Technical Field Service');
    $('#wo-modal-customer-name').text(req.CustomerName || workOrder.CustomerName || 'Valued Customer');
    $('#wo-modal-customer-address').html(`<i class="bi bi-geo-alt me-1"></i>${req.Address || 'Kolhapur Central'}, ${req.City || 'Kolhapur'}`);

    const phone = req.CustomerMobile || workOrder.CustomerMobile || '9890123456';
    $('#wo-modal-customer-phone').text(phone);
    $('#wo-modal-btn-call').attr('href', `tel:${phone}`);
    $('#wo-modal-btn-whatsapp').attr('href', `https://wa.me/91${phone}?text=Hello%20${encodeURIComponent(req.CustomerName || 'Customer')},%20regarding%20your%20SevaSetuHub%20service%20booking%20#${workOrder.WorkOrderId}`);

    $('#wo-modal-date').text(workOrder.ScheduledDate || 'Today');
    $('#wo-modal-time').text(workOrder.StartTime || '09:00 AM – 11:00 AM');
    $('#wo-modal-priority').text(workOrder.Priority || 'Normal').removeClass('bg-danger bg-warning bg-secondary').addClass(workOrder.Priority === 'High' ? 'bg-danger' : 'bg-primary');

    const statusBadge = $('#wo-modal-status-badge');
    statusBadge.text(workOrder.Status || 'Assigned');
    statusBadge.removeClass('bg-success bg-warning bg-primary bg-secondary bg-purple text-dark text-white');
    if (workOrder.Status === 'Completed') statusBadge.addClass('bg-success text-white');
    else if (workOrder.Status === 'In Progress') statusBadge.addClass('bg-warning text-dark');
    else if (workOrder.Status === 'En Route') statusBadge.addClass('bg-info text-dark');
    else statusBadge.addClass('bg-primary text-white');

    const techName = workOrder.TechnicianName || (matchingTech ? matchingTech.FullName : 'Technician');
    const initials = techName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    $('#wo-modal-tech-avatar').text(initials);
    $('#wo-modal-tech-name').text(techName);
    $('#wo-modal-tech-spec').text(matchingTech ? matchingTech.Specialization : 'Certified Technician');

    // Populate reassign dropdown
    const techs = await api.getTechnicians();
    const $reassign = $('#wo-modal-reassign-tech');
    $reassign.empty();
    techs.forEach(t => {
      const sel = t.TechnicianId === workOrder.TechnicianId ? 'selected' : '';
      $reassign.append(`<option value="${t.TechnicianId}" data-name="${t.FullName}" ${sel}>${t.FullName} (${t.Specialization})</option>`);
    });

    const modal = new bootstrap.Modal(document.getElementById('modalDispatchWorkOrderDetails'));
    modal.show();
  }

  async function loadDispatchBoardData(isSilent) {
    try {
      const techs = await api.getTechnicians();
      const workOrders = await api.getWorkOrders();

      const selectedDate = $('#dispatch-filter-date').val() || new Date().toISOString().slice(0, 10);
      const selectedSpec = $('#dispatch-filter-spec').val() || 'all';
      const selectedStatus = $('#dispatch-filter-status').val() || 'all';

      // Update KPI Statistics
      const activeTechsCount = (techs || []).length;
      const availableTechsCount = (techs || []).filter(t => t.Status === 'Available').length;
      const busyTechsCount = (techs || []).filter(t => t.Status === 'Busy').length;

      const dateFilteredWos = _dispatchDateFilterMode === 'all'
        ? (workOrders || [])
        : (workOrders || []).filter(w => !w.ScheduledDate || w.ScheduledDate === selectedDate);

      $('#dispatch-kpi-total-techs').text(activeTechsCount);
      $('#dispatch-kpi-available-techs').text(availableTechsCount);
      $('#dispatch-kpi-busy-techs').text(busyTechsCount);
      $('#dispatch-kpi-scheduled-jobs').text(dateFilteredWos.length);

      const $tbody = $('#dispatch-board-body');
      $tbody.empty();

      // Filter Techs
      let filteredTechs = (techs || []);
      if (selectedSpec !== 'all') {
        filteredTechs = filteredTechs.filter(t => (t.Specialization || '').toLowerCase().includes(selectedSpec.toLowerCase()));
      }
      if (selectedStatus !== 'all') {
        filteredTechs = filteredTechs.filter(t => t.Status === selectedStatus);
      }

      if (filteredTechs.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-people text-muted fs-3 d-block mb-2"></i>No certified technicians match current filters.</td></tr>');
        return;
      }

      filteredTechs.forEach(t => {
        const initials = (t.FullName || 'T').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const statusBadge = t.Status === 'Available'
          ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-1.5" style="font-size:0.65rem;">Available</span>'
          : t.Status === 'Busy'
          ? '<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-1.5" style="font-size:0.65rem;">Busy</span>'
          : '<span class="badge bg-secondary-subtle text-secondary border px-1.5" style="font-size:0.65rem;">On-Leave</span>';

        // Sticky Technician Column
        let row = `
          <tr>
            <td>
              <div class="dispatch-tech-profile">
                <div class="dispatch-tech-avatar">${initials}</div>
                <div class="overflow-hidden">
                  <div class="d-flex align-items-center gap-1">
                    <strong class="text-dark small text-truncate d-block">${t.FullName}</strong>
                  </div>
                  <div class="text-muted" style="font-size:0.7rem;">${t.Specialization}</div>
                  <div class="d-flex align-items-center gap-1.5 mt-1">
                    ${statusBadge}
                    <span class="text-warning small fw-bold" style="font-size:0.68rem;"><i class="bi bi-star-fill"></i> ${t.Rating || '4.9'}</span>
                  </div>
                </div>
              </div>
            </td>
        `;

        // Technician's assigned jobs for the target date
        const assignedJobs = dateFilteredWos.filter(w => w.TechnicianId === t.TechnicianId || (w.TechnicianName && w.TechnicianName.includes(t.FullName.split(' ')[0])));

        // 5 Time Slots
        TIME_SLOTS.forEach(slot => {
          const matchingJob = assignedJobs.find(j => {
            const jobSlotIndex = mapTimeToSlotIndex(j.StartTime || j.ScheduledTime || (j.serviceRequest ? j.serviceRequest.PreferredTimeSlot : ''));
            return jobSlotIndex === slot.index;
          });

          if (matchingJob) {
            const rawStatus = matchingJob.Status || 'Assigned';
            const statusClass = 'status-' + rawStatus.replace(/\s+/g, '-');
            const badgeClass = rawStatus === 'Completed' ? 'bg-success'
              : rawStatus === 'In Progress' ? 'bg-warning text-dark'
              : rawStatus === 'En Route' ? 'bg-indigo text-white'
              : 'bg-primary';

            const req = matchingJob.serviceRequest || {};
            const srvName = req.ServiceName || matchingJob.ServiceName || 'Field Service';
            const custName = req.CustomerName || matchingJob.CustomerName || 'Customer';
            const city = req.City || matchingJob.City || 'Kolhapur';
            const priorityBadge = matchingJob.Priority === 'High' ? '<span class="badge bg-danger ms-1" style="font-size:0.6rem;">HIGH</span>' : '';

            row += `
              <td>
                <div class="dispatch-slot-card ${statusClass}" data-wo-id="${matchingJob.WorkOrderId}">
                  <div class="slot-time-badge">
                    <span><strong>#${matchingJob.WorkOrderId}</strong>${priorityBadge}</span>
                    <span class="badge ${badgeClass}" style="font-size:0.62rem;">${rawStatus}</span>
                  </div>
                  <div class="slot-service-name" title="${srvName}">${srvName}</div>
                  <div class="slot-customer-info">
                    <i class="bi bi-person-fill text-muted"></i> <span>${custName} · ${city}</span>
                  </div>
                  <div class="text-muted" style="font-size:0.65rem;">
                    <i class="bi bi-clock me-1"></i>${matchingJob.StartTime || slot.shortTime}
                  </div>
                </div>
              </td>
            `;
          } else {
            row += `
              <td>
                <div class="dispatch-slot-empty" data-tech-id="${t.TechnicianId}" data-tech-name="${t.FullName}" data-slot="${slot.label}">
                  <span class="empty-label"><i class="bi bi-check2 me-1"></i>Available</span>
                  <span class="btn-quick-slot-assign"><i class="bi bi-plus-circle me-1"></i>+ Dispatch</span>
                </div>
              </td>
            `;
          }
        });

        row += `</tr>`;
        $tbody.append(row);
      });

      // Bind slot card click event to open Work Order Details Inspector
      $('.dispatch-slot-card').off('click').on('click', function(e) {
        e.stopPropagation();
        const woId = $(this).data('wo-id');
        const wo = (workOrders || []).find(w => w.WorkOrderId === woId);
        if (wo) {
          const tech = (techs || []).find(t => t.TechnicianId === wo.TechnicianId);
          openWorkOrderInspector(wo, tech);
        }
      });

      // Bind empty slot click event to open quick dispatch pre-filled
      $('.dispatch-slot-empty').off('click').on('click', function() {
        const techId = $(this).data('tech-id');
        const slotLabel = $(this).data('slot');
        openQuickDispatchModal(techId, slotLabel);
      });

    } catch (e) {
      console.error('Failed to load dispatch board:', e);
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
                <button class="btn btn-sm btn-light border dropdown-toggle" data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-expanded="false">
                  <i class="bi bi-three-dots-vertical me-1"></i>Action
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                  <li><a class="dropdown-item btn-toggle-tech-status" href="#" data-id="${t.TechnicianId}" data-status="Available"><i class="bi bi-check2 text-success me-2"></i> Set Available</a></li>
                  <li><a class="dropdown-item btn-toggle-tech-status" href="#" data-id="${t.TechnicianId}" data-status="Busy"><i class="bi bi-clock text-warning me-2"></i> Set Busy</a></li>
                  <li><a class="dropdown-item btn-toggle-tech-status" href="#" data-id="${t.TechnicianId}" data-status="On-Leave"><i class="bi bi-pause text-secondary me-2"></i> Set On-Leave</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-primary btn-edit-tech" href="#" data-id="${t.TechnicianId}"><i class="bi bi-pencil-square me-2"></i> Edit Profile</a></li>
                  <li><a class="dropdown-item text-danger btn-delete-tech" href="#" data-id="${t.TechnicianId}" data-name="${t.FullName}"><i class="bi bi-trash me-2"></i> Soft Delete</a></li>
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
          await api.updateTechnician({ technicianId: techId, Status: newStatus, status: newStatus });
          showToast(`✅ Status updated to "${newStatus}".`, 'success');
          loadAdminTechnicians();
        } catch (err) {
          showToast('❌ Failed to update status: ' + err.message, 'danger');
        }
      });

      // Bind Edit handler - pre-fill and open modal
      $('.btn-edit-tech').on('click', async function(e) {
        e.preventDefault();
        const techId = $(this).data('id');
        const techs = await api.getTechnicians();
        const t = techs.find(tech => tech.TechnicianId === techId);
        if (!t) return;
        $('#edit-tech-id').val(t.TechnicianId);
        $('#edit-tech-fullname').val(t.FullName);
        $('#edit-tech-mobile').val(t.Mobile);
        $('#edit-tech-email').val(t.Email);
        $('#edit-tech-city').val(t.City);
        $('#edit-tech-password').val('');
        $('#edit-tech-specialization').val(t.Specialization);
        $('#edit-tech-status').val(t.Status);
        const modal = new bootstrap.Modal(document.getElementById('modalEditTechnician'));
        modal.show();
      });

      // Bind soft-delete handler
      $('.btn-delete-tech').on('click', async function(e) {
        e.preventDefault();
        const techId = $(this).data('id');
        const techName = $(this).data('name');
        if (confirm(`Soft-delete "${techName}" (${techId})? Their account will be deactivated but records will be preserved.`)) {
          try {
            await api.deleteTechnician({ technicianId: techId });
            showToast(`🗑️ Technician "${techName}" has been deactivated.`, 'warning');
            loadAdminTechnicians();
          } catch (err) {
            showToast('❌ Failed to remove technician: ' + err.message, 'danger');
          }
        }
      });

    } catch (err) {
      $tbody.html(`<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Error loading technicians: ${err.message}</td></tr>`);
    }
  }

  // Handle Edit Technician Form Submit
  $('#form-edit-technician').on('submit', async function(e) {
    e.preventDefault();
    const submitBtn = $('#btn-update-technician');
    submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Updating...');
    try {
      const techId = $('#edit-tech-id').val();
      const password = $('#edit-tech-password').val().trim();
      const payload = {
        technicianId: techId,
        FullName: $('#edit-tech-fullname').val().trim(),
        Mobile: $('#edit-tech-mobile').val().trim(),
        Email: $('#edit-tech-email').val().trim(),
        City: $('#edit-tech-city').val().trim(),
        Specialization: $('#edit-tech-specialization').val(),
        Status: $('#edit-tech-status').val()
      };
      if (password) payload.Password = password;
      await api.updateTechnician(payload);
      const modalEl = document.getElementById('modalEditTechnician');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      $('#form-edit-technician')[0].reset();
      $(modalEl).one('hidden.bs.modal', function() {
        showToast('✅ Technician profile updated successfully!', 'success');
        loadAdminTechnicians();
      });
    } catch (err) {
      showToast('❌ Error updating technician: ' + err.message, 'danger');
    } finally {
      submitBtn.prop('disabled', false).html('<i class="bi bi-check2-circle me-1"></i> Save Changes');
    }
  });

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

      // Hide modal & reset form
      const modalEl = document.getElementById('modalAddTechnician');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      $('#form-add-technician')[0].reset();
      $('#tech-password').val('TechPassword@2026');

      // Reload technicians table after modal closes fully (avoids animation race)
      $(modalEl).one('hidden.bs.modal', function() {
        showToast(`✅ Technician ${newTech.FullName || payload.fullName} (${newTech.TechnicianId || '—'}) registered successfully!`, 'success');
        loadAdminTechnicians();
      });
    } catch (err) {
      showToast('❌ Error adding technician: ' + err.message, 'danger');
    } finally {
      submitBtn.prop('disabled', false).html('<i class="bi bi-check2-circle me-1"></i> Register &amp; Activate Technician');
    }
  });

  /**
   * Dispatcher User Management (SuperAdmin only)
   */
  async function loadAdminDispatchers() {
    const $tbody = $('#dispatchers-table-body');
    $tbody.html('<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Fetching dispatchers...</td></tr>');
    try {
      const disps = await api.getDispatchers();
      $tbody.empty();

      if (!disps || disps.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-headset fs-4 d-block mb-1 text-muted"></i>No dispatchers found. Click "+ Add New Dispatcher" to register one.</td></tr>');
        return;
      }

      disps.forEach(d => {
        const initials = `${(d.FirstName || 'D')[0]}${(d.LastName || 'S')[0]}`.toUpperCase();
        $tbody.append(`
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;font-size:0.85rem;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0;">${initials}</div>
                <div>
                  <strong class="d-block text-dark">${d.FirstName} ${d.LastName}</strong>
                  <span class="badge bg-light text-primary border" style="font-size:0.7rem;">${d.UserId}</span>
                </div>
              </div>
            </td>
            <td><i class="bi bi-envelope text-muted me-1 small"></i>${d.Email}</td>
            <td><i class="bi bi-telephone text-muted me-1 small"></i><strong>${d.Mobile}</strong></td>
            <td><i class="bi bi-geo-alt text-danger me-1 small"></i>${d.City || 'Kolhapur'}</td>
            <td><span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Active</span></td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-primary btn-edit-disp" data-id="${d.UserId}" title="Edit">
                  <i class="bi bi-pencil-square"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete-disp" data-id="${d.UserId}" data-name="${d.FirstName} ${d.LastName}" title="Soft Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `);
      });

      // Edit dispatcher
      $('.btn-edit-disp').on('click', function() {
        const userId = $(this).data('id');
        const disp = disps.find(d => d.UserId === userId);
        if (!disp) return;
        $('#edit-disp-id').val(disp.UserId);
        $('#edit-disp-fullname').val(`${disp.FirstName} ${disp.LastName}`.trim());
        $('#edit-disp-mobile').val(disp.Mobile);
        $('#edit-disp-email').val(disp.Email);
        $('#edit-disp-city').val(disp.City || 'Kolhapur');
        $('#edit-disp-password').val('');
        const modal = new bootstrap.Modal(document.getElementById('modalEditDispatcher'));
        modal.show();
      });

      // Soft-delete dispatcher
      $('.btn-delete-disp').on('click', async function() {
        const userId = $(this).data('id');
        const name = $(this).data('name');
        if (confirm(`Soft-delete dispatcher "${name}"? Their login will be deactivated but records preserved.`)) {
          try {
            await api.deleteDispatcher({ userId });
            showToast(`🗑️ Dispatcher "${name}" has been deactivated.`, 'warning');
            loadAdminDispatchers();
          } catch (err) {
            showToast('❌ Failed to deactivate dispatcher: ' + err.message, 'danger');
          }
        }
      });

    } catch (err) {
      $tbody.html(`<tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Error: ${err.message}</td></tr>`);
    }
  }

  // Handle Add Dispatcher Form Submit
  $('#form-add-dispatcher').on('submit', async function(e) {
    e.preventDefault();
    const $btn = $('#btn-save-dispatcher');
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Registering...');
    try {
      const newDisp = await api.createDispatcher({
        fullName: $('#disp-fullname').val().trim(),
        mobile: $('#disp-mobile').val().trim(),
        email: $('#disp-email').val().trim(),
        password: $('#disp-password').val().trim() || 'DispPassword@2026',
        city: $('#disp-city').val().trim() || 'Kolhapur'
      });
      const modalEl = document.getElementById('modalAddDispatcher');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      $('#form-add-dispatcher')[0].reset();
      $('#disp-password').val('DispPassword@2026');
      $(modalEl).one('hidden.bs.modal', function() {
        showToast(`✅ Dispatcher ${newDisp.FirstName} ${newDisp.LastName} (${newDisp.UserId}) registered successfully!`, 'success');
        loadAdminDispatchers();
      });
    } catch (err) {
      showToast('❌ Error adding dispatcher: ' + err.message, 'danger');
    } finally {
      $btn.prop('disabled', false).html('<i class="bi bi-check2-circle me-1"></i> Register &amp; Activate Dispatcher');
    }
  });

  // Handle Edit Dispatcher Form Submit
  $('#form-edit-dispatcher').on('submit', async function(e) {
    e.preventDefault();
    const $btn = $('#btn-update-dispatcher');
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Saving...');
    try {
      const userId = $('#edit-disp-id').val();
      const password = $('#edit-disp-password').val().trim();
      const payload = {
        userId,
        fullName: $('#edit-disp-fullname').val().trim(),
        mobile: $('#edit-disp-mobile').val().trim(),
        email: $('#edit-disp-email').val().trim(),
        city: $('#edit-disp-city').val().trim()
      };
      if (password) payload.password = password;
      await api.updateDispatcher(payload);
      const modalEl = document.getElementById('modalEditDispatcher');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      loadAdminDispatchers();
    } catch (err) {
      alert('Error updating dispatcher: ' + err.message);
    } finally {
      $btn.prop('disabled', false).html('<i class="bi bi-check2-circle me-1"></i> Save Changes');
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
