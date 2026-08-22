/**
 * ============================================================================
 * SevaSetuHub – Customer Portal Controller (customer.js)
 * ============================================================================
 */

$(document).ready(function() {
  // Enforce customer auth
  if (!AuthGuard.protectRoute(['Customer', 'SuperAdmin'])) return;
  AuthGuard.renderUserHeader();

  let allServices = [];
  let allCategories = [];
  let selectedService = null;
  let activeCoupon = null;

  // Initialize data
  loadCustomerDashboard();
  loadCatalogData();

  // Navigation tab switcher
  $('.portal-nav-link').on('click', function(e) {
    e.preventDefault();
    const targetSection = $(this).data('target');
    $('.portal-nav-link').removeClass('active');
    $(this).addClass('active');

    $('.portal-section').addClass('d-none');
    $(`#section-${targetSection}`).removeClass('d-none');

    if (targetSection === 'requests') loadCustomerRequests();
    if (targetSection === 'estimates') loadCustomerEstimates();
    if (targetSection === 'invoices') loadCustomerInvoices();
    if (targetSection === 'amc') loadCustomerAMC();
    if (targetSection === 'notifications') loadCustomerNotifications();
  });

  // Mobile sidebar toggle & close
  $('#sidebar-toggle').on('click', function() {
    $('.app-sidebar').toggleClass('show');
  });
  $('#sidebar-close-btn').on('click', function() {
    $('.app-sidebar').removeClass('show');
  });

  // Logout handler
  $('.btn-logout').on('click', function(e) {
    e.preventDefault();
    AuthGuard.logout();
  });

  /**
   * Load Dashboard Stats
   */
  async function loadCustomerDashboard() {
    try {
      const requests = await api.getServiceRequests();
      const estimates = await api.getServiceRequests(); // includes estimates
      const invoices = await api.getInvoices();

      const activeReqs = requests.filter(r => r.Status !== 'Completed' && r.Status !== 'Cancelled').length;
      const pendingInvs = invoices.filter(i => i.PaymentStatus === 'Pending').length;

      $('#stat-active-requests').text(activeReqs);
      $('#stat-pending-estimates').text(requests.filter(r => r.Status === 'Estimate Sent').length);
      $('#stat-upcoming-jobs').text(requests.filter(r => r.Status === 'Assigned' || r.Status === 'Scheduled').length);
      $('#stat-pending-payments').text(pendingInvs);

      renderRecentRequestsTable(requests.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }

  /**
   * Render Recent Requests Table
   */
  function renderRecentRequestsTable(reqs) {
    const $tbody = $('#table-recent-requests tbody');
    $tbody.empty();

    if (!reqs || reqs.length === 0) {
      $tbody.html('<tr><td colspan="6" class="text-center py-4 text-muted">No service requests yet. Click "Book New Service" to get started!</td></tr>');
      return;
    }

    reqs.forEach(r => {
      const statusBadge = getStatusBadge(r.Status);
      const row = `
        <tr>
          <td><strong>#${r.RequestId}</strong></td>
          <td>${r.ServiceName}</td>
          <td>${r.PreferredDate} (${r.PreferredTimeSlot || 'Standard'})</td>
          <td>${statusBadge}</td>
          <td>₹${r.CouponDiscount ? '<span class="text-success">Saved ₹' + r.CouponDiscount + '</span>' : 'Standard'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-view-request" data-id="${r.RequestId}">
              <i class="bi bi-eye"></i> Track
            </button>
          </td>
        </tr>
      `;
      $tbody.append(row);
    });

    $('.btn-view-request').on('click', function() {
      const reqId = $(this).data('id');
      viewRequestDetails(reqId);
    });
  }

  /**
   * Load Catalog for Booking Wizard
   */
  async function loadCatalogData() {
    try {
      allCategories = await api.getServiceCategories();
      allServices = await api.getServices();

      const $catSelect = $('#wizard-category');
      $catSelect.empty().append('<option value="">-- Select Service Category --</option>');
      allCategories.forEach(c => {
        $catSelect.append(`<option value="${c.CategoryId}">${c.Name}</option>`);
      });

      // Default date to today & prevent past dates
      const todayStr = new Date().toISOString().slice(0, 10);
      $('#wizard-date').val(todayStr).attr('min', todayStr);
    } catch (e) {
      console.error(e);
    }
  }

  // Category changed in wizard -> populate services
  $('#wizard-category').on('change', function() {
    const catId = $(this).val();
    const $srvSelect = $('#wizard-service');
    $srvSelect.empty().append('<option value="">-- Select Specific Service --</option>');

    const filtered = allServices.filter(s => s.CategoryId === catId);
    filtered.forEach(s => {
      $srvSelect.append(`<option value="${s.ServiceId}" data-price="${s.BasePrice}">${s.ServiceName} (₹${s.BasePrice})</option>`);
    });
  });

  // Service selected -> update price preview
  $('#wizard-service').on('change', function() {
    const srvId = $(this).val();
    selectedService = allServices.find(s => s.ServiceId === srvId);
    if (selectedService) {
      $('#wizard-base-price').text('₹' + selectedService.BasePrice);
      calculateWizardTotal();
    }
  });

  /**
   * Coupon Validation in Wizard
   */
  $('#btn-apply-coupon').on('click', async function() {
    const code = $('#wizard-coupon-input').val().trim();
    if (!code) {
      alert('Please enter a coupon code.');
      return;
    }

    const orderAmount = selectedService ? selectedService.BasePrice : 599;

    try {
      const res = await api.validateCoupon({
        couponCode: code,
        serviceId: selectedService ? selectedService.ServiceId : '',
        orderAmount: orderAmount
      });

      activeCoupon = res;
      $('#coupon-status-msg').html(`<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${res.message}</span>`);
      calculateWizardTotal();
    } catch (err) {
      activeCoupon = null;
      $('#coupon-status-msg').html(`<span class="text-danger"><i class="bi bi-exclamation-triangle-fill"></i> ${err.message}</span>`);
      calculateWizardTotal();
    }
  });

  function calculateWizardTotal() {
    const base = selectedService ? Number(selectedService.BasePrice) : 0;
    const discount = activeCoupon ? Number(activeCoupon.discount) : 0;
    const finalTotal = Math.max(0, base - discount);

    $('#wizard-discount-val').text('-₹' + discount);
    $('#wizard-total-val').text('₹' + finalTotal);
  }

  // Multi-step Wizard Next / Prev handlers
  $('.wizard-next-step').on('click', function() {
    const currentStep = $(this).closest('.wizard-step-pane').data('step');
    if (currentStep === 1) {
      if (!$('#wizard-service').val()) {
        alert('Please select a service category and specific service.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!$('#wizard-address').val() || !$('#wizard-pincode').val()) {
        alert('Please provide your service location address and pincode.');
        return;
      }
    }
    goToStep(currentStep + 1);
  });

  $('.wizard-prev-step').on('click', function() {
    const currentStep = $(this).closest('.wizard-step-pane').data('step');
    goToStep(currentStep - 1);
  });

  function goToStep(stepNumber) {
    $('.wizard-step-pane').addClass('d-none');
    $(`.wizard-step-pane[data-step="${stepNumber}"]`).removeClass('d-none');

    $('.stepper-item').removeClass('active completed');
    for (let i = 1; i <= stepNumber; i++) {
      if (i < stepNumber) $(`#step-indicator-${i}`).addClass('completed');
      if (i === stepNumber) $(`#step-indicator-${i}`).addClass('active');
    }
  }

  // Submit Service Request Form
  $('#form-book-service').on('submit', async function(e) {
    e.preventDefault();
    const submitBtn = $(this).find('button[type="submit"]');
    submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Submitting...');

    try {
      const payload = {
        categoryId: $('#wizard-category').val(),
        serviceId: selectedService ? selectedService.ServiceId : '',
        serviceName: selectedService ? selectedService.ServiceName : 'Service Booking',
        basePrice: selectedService ? selectedService.BasePrice : 0,
        issueDescription: $('#wizard-issue').val(),
        address: $('#wizard-address').val(),
        city: $('#wizard-city').val() || 'Kolhapur',
        pincode: $('#wizard-pincode').val(),
        preferredDate: $('#wizard-date').val(),
        preferredTimeSlot: $('#wizard-timeslot').val(),
        couponCode: activeCoupon ? activeCoupon.couponCode : '',
        couponDiscount: activeCoupon ? activeCoupon.discount : 0,
        priority: $('#wizard-priority').val() || 'Medium'
      };

      const result = await api.createServiceRequest(payload);
      alert(`Success! Your Service Request #${result.RequestId} has been submitted.`);
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalBookService'));
      if (modal) modal.hide();

      // Reset form
      $('#form-book-service')[0].reset();
      goToStep(1);
      loadCustomerDashboard();
    } catch (err) {
      alert('Error booking service: ' + err.message);
    } finally {
      submitBtn.prop('disabled', false).text('Confirm & Place Request');
    }
  });

  /**
   * View Request Timeline Details Modal
   */
  async function viewRequestDetails(reqId) {
    try {
      const details = await api.getServiceRequest(reqId);
      const req = details.request;

      $('#modal-track-req-id').text('#' + req.RequestId);
      $('#modal-track-service').text(req.ServiceName);
      $('#modal-track-date').text(`${req.PreferredDate} (${req.PreferredTimeSlot})`);
      $('#modal-track-address').text(`${req.Address}, ${req.City} - ${req.Pincode}`);
      $('#modal-track-issue').text(req.IssueDescription || 'General servicing required.');

      // Update Visual Timeline
      updateTimelineUI(req.Status);

      // Render Estimates if any
      const $estContainer = $('#modal-track-estimates');
      $estContainer.empty();
      if (details.estimates && details.estimates.length > 0) {
        details.estimates.forEach(est => {
          $estContainer.append(`
            <div class="card p-3 mb-2 border-primary">
              <div class="d-flex justify-content-between align-items-center">
                <h6>Estimate #${est.EstimateNumber}</h6>
                <span class="badge ${est.Status === 'Approved' ? 'bg-success' : 'bg-warning'}">${est.Status}</span>
              </div>
              <div class="my-2">
                <small>Labour: ₹${est.LabourAmount} | Parts: ₹${est.MaterialAmount} | Tax: ₹${est.TaxAmount}</small>
                <h5 class="text-primary mt-1">Total: ₹${est.GrandTotal}</h5>
              </div>
              ${est.Status === 'Pending' ? `
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-sm btn-success btn-approve-est" data-id="${est.EstimateId}">Approve Estimate</button>
                  <button class="btn btn-sm btn-outline-danger btn-reject-est" data-id="${est.EstimateId}">Reject</button>
                </div>
              ` : ''}
            </div>
          `);
        });

        $('.btn-approve-est').on('click', async function() {
          const estId = $(this).data('id');
          await api.approveEstimate({ estimateId: estId });
          alert('Estimate approved! Technician dispatch scheduled.');
          viewRequestDetails(reqId);
          loadCustomerDashboard();
        });

        $('.btn-reject-est').on('click', async function() {
          const estId = $(this).data('id');
          await api.rejectEstimate({ estimateId: estId });
          alert('Estimate rejected.');
          viewRequestDetails(reqId);
        });
      } else {
        $estContainer.html('<p class="text-muted small">No estimate required or pending review from team.</p>');
      }

      const modal = new bootstrap.Modal(document.getElementById('modalTrackRequest'));
      modal.show();
    } catch (err) {
      alert('Failed to fetch request details: ' + err.message);
    }
  }

  function updateTimelineUI(status) {
    const stages = ['New', 'Estimate Sent', 'Approved', 'Assigned', 'In Progress', 'Completed'];
    const currentIdx = stages.indexOf(status);

    stages.forEach((stage, idx) => {
      const stepEl = $(`#timeline-step-${idx + 1}`);
      stepEl.removeClass('active completed');
      if (idx < currentIdx) stepEl.addClass('completed');
      if (idx === currentIdx) stepEl.addClass('active');
    });
  }

  /**
   * Load Invoices & Payment Handler
   */
  async function loadCustomerInvoices() {
    try {
      const invoices = await api.getInvoices();
      const $tbody = $('#table-customer-invoices tbody');
      $tbody.empty();

      if (invoices.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-4 text-muted">No invoices generated yet.</td></tr>');
        return;
      }

      invoices.forEach(inv => {
        const isPaid = inv.PaymentStatus === 'Paid';
        const row = `
          <tr>
            <td><strong>#${inv.InvoiceNumber}</strong></td>
            <td>${inv.serviceName || 'Service Execution'}</td>
            <td>${inv.CreatedAt}</td>
            <td><strong>₹${inv.GrandTotal}</strong></td>
            <td><span class="badge ${isPaid ? 'bg-success' : 'bg-danger'}">${inv.PaymentStatus}</span></td>
            <td>
              ${!isPaid ? `
                <button class="btn btn-sm btn-primary btn-pay-invoice" data-id="${inv.InvoiceId}" data-amount="${inv.GrandTotal}">
                  <i class="bi bi-credit-card"></i> Pay Now
                </button>
              ` : `
                <button class="btn btn-sm btn-outline-secondary btn-print-receipt" data-id="${inv.InvoiceId}">
                  <i class="bi bi-printer"></i> Receipt
                </button>
              `}
            </td>
          </tr>
        `;
        $tbody.append(row);
      });

      $('.btn-pay-invoice').on('click', function() {
        const invId = $(this).data('id');
        const amount = $(this).data('amount');
        $('#pay-modal-invoice-id').val(invId);
        $('#pay-modal-amount').text('₹' + amount);
        const payModal = new bootstrap.Modal(document.getElementById('modalPayment'));
        payModal.show();
      });

      $('.btn-print-receipt').on('click', function() {
        window.print();
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Handle Payment Submit
  $('#btn-confirm-payment').on('click', async function() {
    const invId = $('#pay-modal-invoice-id').val();
    const method = $('input[name="payMethod"]:checked').val() || 'UPI';

    $(this).prop('disabled', true).text('Processing Payment...');

    try {
      await api.createPayment({
        invoiceId: invId,
        paymentMethod: method,
        amount: 0 // Pay full
      });

      alert('Payment Successful! Thank you for choosing SevaSetuHub.');
      bootstrap.Modal.getInstance(document.getElementById('modalPayment')).hide();
      loadCustomerInvoices();
      loadCustomerDashboard();
    } catch (err) {
      alert('Payment failed: ' + err.message);
    } finally {
      $(this).prop('disabled', false).text('Pay & Download Receipt');
    }
  });

  /**
   * Helper: Status Badges
   */
  function getStatusBadge(status) {
    const map = {
      'New': 'bg-info text-dark',
      'Under Review': 'bg-secondary',
      'Estimate Sent': 'bg-warning text-dark',
      'Approved': 'bg-primary',
      'Scheduled': 'bg-primary',
      'Assigned': 'bg-primary',
      'In Progress': 'bg-warning text-dark',
      'Completed': 'bg-success',
      'Cancelled': 'bg-danger'
    };
    return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`;
  }
});
