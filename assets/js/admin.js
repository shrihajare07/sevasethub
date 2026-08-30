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
   * Show a modern Toastr-style floating toast notification
   * @param {string} message - Message text to display
   * @param {'success'|'danger'|'info'|'warning'} type - Toast type
   * @param {string} title - Optional title (defaults based on type)
   */
  function showToast(message, type = 'success', title = '') {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;z-index:99999;display:flex;flex-direction:column;gap:0.75rem;min-width:320px;max-width:420px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const typeConfig = {
      success: {
        border: '#10b981',
        icon: '<i class="bi bi-check-circle-fill text-success" style="font-size:1.25rem;"></i>',
        defaultTitle: 'Success'
      },
      danger: {
        border: '#ef4444',
        icon: '<i class="bi bi-x-circle-fill text-danger" style="font-size:1.25rem;"></i>',
        defaultTitle: 'Error'
      },
      warning: {
        border: '#f59e0b',
        icon: '<i class="bi bi-exclamation-triangle-fill text-warning" style="font-size:1.25rem;"></i>',
        defaultTitle: 'Notice'
      },
      info: {
        border: '#0284c7',
        icon: '<i class="bi bi-info-circle-fill text-primary" style="font-size:1.25rem;"></i>',
        defaultTitle: 'Information'
      }
    };

    const cfg = typeConfig[type] || typeConfig.info;
    const toastEl = document.createElement('div');
    toastEl.className = 'custom-toastr-card';
    toastEl.style.cssText = `
      background: #ffffff;
      border-left: 5px solid ${cfg.border};
      border-radius: 10px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08);
      padding: 12px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      opacity: 0;
    `;

    toastEl.innerHTML = `
      <div style="flex-shrink:0;margin-top:1px;">${cfg.icon}</div>
      <div style="flex-grow:1;min-width:0;">
        <div style="font-weight:700;font-size:0.88rem;color:#0f172a;line-height:1.2;margin-bottom:2px;">${title || cfg.defaultTitle}</div>
        <div style="font-size:0.85rem;color:#475569;line-height:1.4;word-break:break-word;">${message}</div>
      </div>
      <button type="button" class="btn-close" style="font-size:0.75rem;margin-left:4px;flex-shrink:0;opacity:0.6;" aria-label="Close"></button>
    `;

    container.appendChild(toastEl);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
      toastEl.style.transform = 'translateX(0)';
      toastEl.style.opacity = '1';
    });

    function dismissToast() {
      toastEl.style.transform = 'translateX(120%)';
      toastEl.style.opacity = '0';
      setTimeout(() => toastEl.remove(), 300);
    }

    toastEl.querySelector('.btn-close').addEventListener('click', dismissToast);
    setTimeout(dismissToast, 4500);
  }

  /**
   * Top Progress Bar Loader helpers
   */
  function startLoader() {
    let bar = document.getElementById('top-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'top-progress-bar';
      document.body.appendChild(bar);
    }
    bar.style.opacity = '1';
    bar.style.width = '35%';
    setTimeout(() => {
      if (bar.style.opacity === '1') bar.style.width = '75%';
    }, 150);
  }

  function finishLoader() {
    let bar = document.getElementById('top-progress-bar');
    if (bar) {
      bar.style.width = '100%';
      setTimeout(() => {
        bar.style.opacity = '0';
        setTimeout(() => { bar.style.width = '0%'; }, 250);
      }, 150);
    }
  }

  function getTableLoaderHtml(cols, text = 'Loading latest records...') {
    if (window.SevaLoader) {
      return `<tr><td colspan="${cols}" class="p-0 border-0">${window.SevaLoader.getHtml({ title: text, subtitle: 'Syncing live dispatch ledger' })}</td></tr>`;
    }
    return `<tr><td colspan="${cols}" class="text-center py-5">
      <div class="table-loading-wrap">
        <div class="spinner-border text-primary" role="status" style="width:2.2rem;height:2.2rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-muted fw-semibold" style="font-size:0.88rem;">${text}</span>
      </div>
    </td></tr>`;
  }

  /**
   * Load High-Level Dashboard Metrics & Charts
   */
  async function loadDashboardData() {
    startLoader();
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
    } finally {
      finishLoader();
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
    const $tbody = $('#table-admin-requests tbody');
    $tbody.html(getTableLoaderHtml(7, 'Fetching service requests & dispatch ledger...'));
    startLoader();

    try {
      const reqs = await api.getServiceRequests();
      $tbody.empty();

      if (!reqs || reqs.length === 0) {
        $tbody.html('<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-inbox text-muted fs-3 d-block mb-1"></i>No service requests found.</td></tr>');
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
      $tbody.html(`<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Error loading service requests: ${err.message}</td></tr>`);
    } finally {
      finishLoader();
    }
  }

  // Submit Estimate
  $('#btn-save-estimate').on('click', async function() {
    const reqId = $('#est-modal-req-id').val();
    const labour = Number($('#est-modal-labour').val()) || 0;
    const material = Number($('#est-modal-material').val()) || 0;
    const discount = Number($('#est-modal-discount').val()) || 0;
    const notes = $('#est-modal-notes').val();

    SevaButton.setLoading(this, true, 'Generating & Sending...');

    try {
      const res = await api.createEstimate({
        requestId: reqId,
        labourAmount: labour,
        materialAmount: material,
        discountAmount: discount,
        notes: notes
      });

      showToast(`Estimate #${res.EstimateNumber} generated for ₹${res.GrandTotal} and sent to customer.`, 'success', 'Estimate Sent');
      bootstrap.Modal.getInstance(document.getElementById('modalCreateEstimate')).hide();
      loadAdminRequests();
    } catch (err) {
      showToast('Failed to generate estimate: ' + err.message, 'danger', 'Estimate Error');
    } finally {
      SevaButton.setLoading(this, false);
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
      showToast('Please select a certified technician.', 'warning', 'Selection Required');
      return;
    }

    SevaButton.setLoading(this, true, 'Dispatching...');

    try {
      const wo = await api.createWorkOrder({
        requestId: reqId,
        technicianId: techId,
        technicianName: techName,
        scheduledDate: date,
        startTime: time
      });

      showToast(`Technician ${techName} scheduled successfully for Work Order #${wo.WorkOrderId}`, 'success', 'Technician Assigned');
      bootstrap.Modal.getInstance(document.getElementById('modalAssignTech')).hide();
      loadAdminRequests();
      loadDispatchBoardData();
    } catch (err) {
      showToast('Assignment failed: ' + err.message, 'danger', 'Assignment Error');
    } finally {
      SevaButton.setLoading(this, false);
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

    $('#dispatch-filter-date, #dispatch-filter-spec, #dispatch-filter-status').on('change', function() {
      _dispatchDateFilterMode = 'single';
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
        showToast('Please select a service request.', 'warning', 'Selection Required');
        return;
      }
      if (!techId) {
        showToast('Please select a certified technician.', 'warning', 'Selection Required');
        return;
      }

      SevaButton.setLoading(this, true, 'Dispatching...');

      try {
        const wo = await api.createWorkOrder({
          requestId: reqId,
          technicianId: techId,
          technicianName: techName,
          scheduledDate: date,
          startTime: time
        });

        showToast(`Work order #${wo.WorkOrderId} dispatched to ${techName}!`, 'success', 'Job Dispatched');
        bootstrap.Modal.getInstance(document.getElementById('modalQuickDispatch')).hide();
        loadDispatchBoardData();
        loadAdminRequests();
      } catch (err) {
        showToast('Quick dispatch failed: ' + err.message, 'danger', 'Dispatch Error');
      } finally {
        SevaButton.setLoading(this, false);
      }
    });

    // Reassign handler from Work Order details modal
    $('#btn-wo-modal-reassign').on('click', async function() {
      const woId = $('#wo-modal-current-wo-id').val();
      const newTechId = $('#wo-modal-reassign-tech').val();
      const newTechName = $('#wo-modal-reassign-tech option:selected').data('name');

      if (!woId || !newTechId) return;

      SevaButton.setLoading(this, true, 'Reassigning...');

      try {
        await api.assignTechnician({
          workOrderId: woId,
          technicianId: newTechId,
          technicianName: newTechName
        });
        showToast(`Job reassigned to ${newTechName}.`, 'success', 'Job Reassigned');
        bootstrap.Modal.getInstance(document.getElementById('modalDispatchWorkOrderDetails')).hide();
        loadDispatchBoardData();
      } catch (err) {
        showToast('Reassign failed: ' + err.message, 'danger', 'Reassign Error');
      } finally {
        SevaButton.setLoading(this, false);
      }
    });

    // Status change handler from Work Order details modal
    $('.btn-wo-change-status').on('click', async function() {
      const woId = $('#wo-modal-current-wo-id').val();
      const newStatus = $(this).data('status');

      if (!woId || !newStatus) return;

      SevaButton.setLoading(this, true, 'Updating...');

      try {
        if (newStatus === 'Completed') {
          await api.completeWorkOrder({ workOrderId: woId });
        } else {
          await api.updateJobStatus({ workOrderId: woId, status: newStatus });
        }
        showToast(`Work Order #${woId} status updated to '${newStatus}'.`, 'success', 'Status Updated');
        bootstrap.Modal.getInstance(document.getElementById('modalDispatchWorkOrderDetails')).hide();
        loadDispatchBoardData();
        loadAdminRequests();
      } catch (err) {
        showToast('Status update failed: ' + err.message, 'danger', 'Status Error');
      } finally {
        SevaButton.setLoading(this, false);
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
    if (!isSilent) startLoader();
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
    } finally {
      if (!isSilent) finishLoader();
    }
  }

  /**
   * Certified Technicians Roster Management
   */
  async function loadAdminTechnicians() {
    const $tbody = $('#technicians-table-body');
    $tbody.html(getTableLoaderHtml(7, 'Fetching certified field technicians roster...'));
    startLoader();

    try {
      const techs = await api.getTechnicians();
      $tbody.empty();

      if (!techs || techs.length === 0) {
        $tbody.html('<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-person-x text-muted fs-3 d-block mb-1"></i>No field technicians found. Click "+ Add New Technician" to register one.</td></tr>');
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
        startLoader();
        try {
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
        } finally {
          finishLoader();
        }
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
    SevaButton.setLoading(submitBtn, true, 'Updating...');
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
      SevaButton.setLoading(submitBtn, false);
    }
  });

  // Handle Add Technician Form Submit
  $('#form-add-technician').on('submit', async function(e) {
    e.preventDefault();
    const submitBtn = $('#btn-save-technician');
    SevaButton.setLoading(submitBtn, true, 'Registering...');

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
      showToast('❌ Error registering technician: ' + err.message, 'danger');
    } finally {
      SevaButton.setLoading(submitBtn, false);
    }
  });

  /**
   * Dispatcher User Management (SuperAdmin only)
   */
  async function loadAdminDispatchers() {
    const $tbody = $('#dispatchers-table-body');
    $tbody.html(getTableLoaderHtml(6, 'Fetching dispatcher user accounts...'));
    startLoader();

    try {
      const disps = await api.getDispatchers();
      $tbody.empty();

      if (!disps || disps.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-headset fs-3 d-block mb-1 text-muted"></i>No dispatchers found. Click "+ Add New Dispatcher" to register one.</td></tr>');
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
    } finally {
      finishLoader();
    }
  }

  // Handle Add Dispatcher Form Submit
  $('#form-add-dispatcher').on('submit', async function(e) {
    e.preventDefault();
    const $btn = $('#btn-save-dispatcher');
    SevaButton.setLoading($btn, true, 'Registering...');
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
      SevaButton.setLoading($btn, false);
    }
  });

  // Handle Edit Dispatcher Form Submit
  $('#form-edit-dispatcher').on('submit', async function(e) {
    e.preventDefault();
    const $btn = $('#btn-update-dispatcher');
    SevaButton.setLoading($btn, true, 'Saving...');
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
      showToast('Error updating dispatcher: ' + err.message, 'danger', 'Update Error');
    } finally {
      SevaButton.setLoading($btn, false);
    }
  });

  /**
   * Offers CRUD Management
   */
  async function loadAdminOffers() {
    const $tbody = $('#table-admin-offers tbody');
    $tbody.html(getTableLoaderHtml(6, 'Fetching promotional marketing offers...'));
    startLoader();

    try {
      const offers = await api.getOffers();
      $tbody.empty();

      if (!offers || offers.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-tag text-muted fs-3 d-block mb-1"></i>No promotional offers created yet. Click "+ Create Offer" to add one.</td></tr>');
        return;
      }

      offers.forEach(o => {
        const code = o.OfferCode || o.offerCode || o.Code || o.code || o['Offer Code'] || 'OFFER';
        const title = o.Title || o.title || o.Name || o.name || 'Promotional Campaign';
        const desc = o.Description || o.description || o['Description'] || 'Special Promotional Offer';
        const discType = o.DiscountType || o.discountType || o['Discount Type'] || (String(o.DiscountValue || '').includes('%') ? 'Percentage' : 'FixedAmount');
        const discVal = Number(String(o.DiscountValue || o.discountValue || o.Discount || o.discount || 0).replace(/[^0-9.]/g, '')) || 0;
        const start = o.StartDate || o.startDate || o['Start Date'] || 'Active';
        const end = o.EndDate || o.endDate || o['End Date'] || 'Ongoing';
        const status = o.Status || o.status || 'Active';
        const offerId = o.OfferId || o.offerId || o.Id || o.id || ('OFR-' + code);

        const discountBadge = discType === 'Percentage'
          ? `<span class="badge bg-success-subtle text-success border border-success-subtle fw-bold">${discVal}% OFF</span>`
          : `<span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold">₹${discVal} OFF</span>`;

        $tbody.append(`
          <tr>
            <td>
              <span class="badge bg-light text-dark border font-monospace px-2 py-1" style="font-size:0.82rem;letter-spacing:0.04em;">${code}</span>
            </td>
            <td>
              <strong class="d-block text-dark">${title}</strong>
              <small class="text-muted">${desc}</small>
            </td>
            <td>${discountBadge}</td>
            <td>
              <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${start} to ${end}</small>
            </td>
            <td><span class="badge ${String(status).toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}"><i class="bi bi-check-circle me-1"></i>${status}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-danger btn-del-offer rounded-pill px-2.5" data-id="${offerId}" data-code="${code}" title="Delete Offer">
                <i class="bi bi-trash me-1"></i> Delete
              </button>
            </td>
          </tr>
        `);
      });

      $('.btn-del-offer').off('click').on('click', async function() {
        const offerId = $(this).data('id');
        const offerCode = $(this).data('code');
        if (confirm(`Delete promotional offer "${offerCode}"?`)) {
          startLoader();
          try {
            await api.deleteOffer({ offerId });
            showToast(`Promotional offer "${offerCode}" removed.`, 'warning', 'Offer Deleted');
            loadAdminOffers();
          } catch (err) {
            showToast('Failed to delete offer: ' + err.message, 'danger', 'Delete Error');
          } finally {
            finishLoader();
          }
        }
      });
    } catch (err) {
      $tbody.html(`<tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Error loading offers: ${err.message}</td></tr>`);
    } finally {
      finishLoader();
    }
  }

  $('#btn-save-offer').off('click').on('click', async function() {
    const $btn = $(this);
    const code = $('#offer-code').val().trim();
    const title = $('#offer-title').val().trim();
    const type = $('#offer-type').val();
    const val = Number($('#offer-val').val());
    const startDate = $('#offer-start').val();
    const endDate = $('#offer-end').val();

    if (!code) {
      showToast('Please enter an Offer Code (e.g. MONSOON20).', 'warning', 'Required Field');
      return;
    }
    if (!title) {
      showToast('Please enter an Offer Title.', 'warning', 'Required Field');
      return;
    }
    if (!val || val <= 0) {
      showToast('Please enter a valid Discount Value.', 'warning', 'Required Field');
      return;
    }

    SevaButton.setLoading($btn, true, 'Publishing...');

    try {
      await api.createOffer({
        offerCode: code,
        title: title,
        discountType: type,
        discountValue: val,
        startDate: startDate,
        endDate: endDate
      });

      showToast(`Promotional offer "${code}" created successfully!`, 'success', 'Offer Published');
      const modalEl = document.getElementById('modalCreateOffer');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();

      // Reset form
      $('#offer-code').val('');
      $('#offer-title').val('');
      $('#offer-val').val('');

      loadAdminOffers();
    } catch (e) {
      showToast('Error creating offer: ' + e.message, 'danger', 'Offer Error');
    } finally {
      SevaButton.setLoading($btn, false);
    }
  });

  /**
   * Coupons CRUD Management
   */
  async function loadAdminCoupons() {
    const $tbody = $('#table-admin-coupons tbody');
    $tbody.html(getTableLoaderHtml(6, 'Fetching discount coupons...'));
    startLoader();

    try {
      const coupons = await api.getCoupons();
      $tbody.empty();

      if (!coupons || coupons.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-percent text-muted fs-3 d-block mb-1"></i>No coupons available yet. Click "+ Create Coupon" to add one.</td></tr>');
        return;
      }

      coupons.forEach(c => {
        const code = c.CouponCode || c.couponCode || c.Code || c.code || c['Coupon Code'] || 'COUPON';
        const desc = c.Description || c.description || c.Title || c.title || 'Promotional Discount Coupon';
        const discType = c.DiscountType || c.discountType || c['Discount Type'] || (String(c.DiscountValue || '').includes('%') ? 'Percentage' : 'FixedAmount');
        const discVal = Number(String(c.DiscountValue || c.discountValue || c.Discount || c.discount || 0).replace(/[^0-9.]/g, '')) || 0;
        const minOrder = Number(c.MinimumOrderValue || c.minimumOrderValue || c['Min Order'] || c['Minimum Order Value'] || 0) || 0;
        const maxDisc = Number(c.MaximumDiscount || c.maximumDiscount || c['Max Discount'] || c['Maximum Discount'] || discVal) || discVal;
        const status = c.Status || c.status || 'Active';
        const couponId = c.CouponId || c.couponId || c.Id || c.id || ('CPN-' + code);

        const discountBadge = discType === 'Percentage'
          ? `<span class="badge bg-success-subtle text-success border border-success-subtle fw-bold">${discVal}% OFF</span>`
          : `<span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold">₹${discVal} OFF</span>`;

        $tbody.append(`
          <tr>
            <td>
              <span class="badge bg-light text-dark border font-monospace px-2 py-1" style="font-size:0.82rem;letter-spacing:0.04em;">${code}</span>
            </td>
            <td>
              <strong class="d-block text-dark">${desc}</strong>
              <small class="text-muted">Max Discount: ₹${maxDisc}</small>
            </td>
            <td>${discountBadge}</td>
            <td>
              <span class="text-muted fw-semibold">Min: ₹${minOrder}</span>
            </td>
            <td><span class="badge ${String(status).toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}"><i class="bi bi-check-circle me-1"></i>${status}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-danger btn-del-coupon rounded-pill px-2.5" data-id="${couponId}" data-code="${code}" title="Delete Coupon">
                <i class="bi bi-trash me-1"></i> Delete
              </button>
            </td>
          </tr>
        `);
      });

      $('.btn-del-coupon').off('click').on('click', async function() {
        const couponId = $(this).data('id');
        const couponCode = $(this).data('code');
        if (confirm(`Delete coupon "${couponCode}"?`)) {
          startLoader();
          try {
            await api.deleteCoupon({ couponId });
            showToast(`Coupon "${couponCode}" removed successfully.`, 'warning', 'Coupon Deleted');
            loadAdminCoupons();
          } catch (err) {
            showToast('Failed to delete coupon: ' + err.message, 'danger', 'Delete Error');
          } finally {
            finishLoader();
          }
        }
      });
    } catch (err) {
      $tbody.html(`<tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Error loading coupons: ${err.message}</td></tr>`);
    } finally {
      finishLoader();
    }
  }

  $('#btn-save-coupon').off('click').on('click', async function() {
    const $btn = $(this);
    const code = $('#coupon-code').val().trim();
    const desc = $('#coupon-desc').val().trim();
    const type = $('#coupon-type').val();
    const val = Number($('#coupon-val').val());
    const minOrder = Number($('#coupon-min-order').val()) || 0;
    const maxDisc = Number($('#coupon-max-disc').val()) || val;

    if (!code) {
      showToast('Please enter a Coupon Code (e.g. SAVE250).', 'warning', 'Required Field');
      return;
    }
    if (!val || val <= 0) {
      showToast('Please enter a valid Discount Value.', 'warning', 'Required Field');
      return;
    }

    SevaButton.setLoading($btn, true, 'Publishing...');

    try {
      await api.createCoupon({
        couponCode: code,
        description: desc || `Flat ₹${val} discount on service booking`,
        discountType: type,
        discountValue: val,
        minimumOrderValue: minOrder,
        maximumDiscount: maxDisc
      });

      showToast(`Discount coupon "${code}" published successfully!`, 'success', 'Coupon Published');
      const modalEl = document.getElementById('modalCreateCoupon');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();

      // Reset form
      $('#coupon-code').val('');
      $('#coupon-desc').val('');
      $('#coupon-val').val('');
      $('#coupon-min-order').val('');
      $('#coupon-max-disc').val('');

      loadAdminCoupons();
    } catch (e) {
      showToast('Error creating coupon: ' + e.message, 'danger', 'Coupon Error');
    } finally {
      SevaButton.setLoading($btn, false);
    }
  });

  /**
   * Load Invoices Ledger
   */
  async function loadAdminInvoices() {
    const $tbody = $('#table-admin-invoices tbody');
    $tbody.html(getTableLoaderHtml(6, 'Fetching customer invoices ledger...'));
    startLoader();

    try {
      const invoices = await api.getInvoices();
      $tbody.empty();

      if (!invoices || invoices.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-receipt text-muted fs-3 d-block mb-1"></i>No invoices recorded yet.</td></tr>');
        return;
      }

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
    } catch (err) {
      $tbody.html(`<tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Error: ${err.message}</td></tr>`);
    } finally {
      finishLoader();
    }
  }

  /**
   * Load Audit Logs (Real-time)
   */
  async function loadAuditLogs() {
    const $tbody = $('#table-admin-audit tbody');
    $tbody.html(getTableLoaderHtml(5, 'Fetching real-time audit trail...'));
    startLoader();

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
    } finally {
      finishLoader();
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
    showToast('Google Apps Script Web App URL saved successfully!', 'success', 'Settings Saved');
  });

  $('#btn-test-api-ping').on('click', async function() {
    SevaButton.setLoading(this, true, 'Testing Connection...');
    try {
      const res = await api.ping();
      showToast(`API Connection Test Successful! Status: ${res.status}, App: ${res.app}`, 'success', 'API Online');
    } catch (e) {
      showToast(`Connection failed: ${e.message}`, 'danger', 'API Offline');
    } finally {
      SevaButton.setLoading(this, false);
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
