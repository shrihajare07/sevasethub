/**
 * ============================================================================
 * SevaSetuHub – Customer Portal Controller (customer.js)
 * End-to-End Service Booking, Tracking, Direct Invoicing & Instant Payment
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
  let currentRequestFilter = 'all';
  let selectedRating = 5;

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

    if (targetSection === 'dashboard') loadCustomerDashboard();
    if (targetSection === 'requests') loadCustomerRequests(currentRequestFilter);
    if (targetSection === 'invoices') loadCustomerInvoices();
    if (targetSection === 'amc') loadCustomerAMC();
    if (targetSection === 'notifications') loadCustomerNotifications();
  });

  // Request filter buttons in My Requests tab
  $(document).on('click', '.btn-req-filter', function() {
    $('.btn-req-filter').removeClass('active');
    $(this).addClass('active');
    currentRequestFilter = $(this).data('filter');
    loadCustomerRequests(currentRequestFilter);
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
   * 1. Load Dashboard Stats & Overview
   */
  async function loadCustomerDashboard() {
    try {
      const requests = await api.getServiceRequests();
      const invoices = await api.getInvoices();

      const activeReqs = requests.filter(r => r.Status !== 'Completed' && r.Status !== 'Cancelled').length;
      const pendingInvs = invoices.filter(i => i.PaymentStatus === 'Pending').length;

      $('#stat-active-requests').text(activeReqs);
      $('#stat-pending-estimates').text(requests.filter(r => r.Status === 'Estimate Sent').length);
      $('#stat-upcoming-jobs').text(requests.filter(r => r.Status === 'Assigned' || r.Status === 'Scheduled' || r.Status === 'In Progress').length);
      $('#stat-pending-payments').text(pendingInvs);

      renderRecentRequestsTable(requests.slice(0, 5), invoices);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }

  /**
   * 2. Render Recent Requests Table on Dashboard
   */
  function renderRecentRequestsTable(reqs, invoices) {
    const $tbody = $('#table-recent-requests tbody');
    $tbody.empty();

    if (!reqs || reqs.length === 0) {
      $tbody.html('<tr><td colspan="6" class="text-center py-4 text-muted">No service requests yet. Click "Book New Service" to get started!</td></tr>');
      return;
    }

    reqs.forEach(r => {
      const statusBadge = getStatusBadge(r.Status);
      const inv = invoices ? invoices.find(i => i.RequestId === r.RequestId) : null;
      
      let actionButtons = '';
      if (r.Status === 'Completed') {
        if (!inv || inv.PaymentStatus === 'Pending') {
          const payAmt = inv ? inv.GrandTotal : (Number(r.BasePrice || 599) - Number(r.CouponDiscount || 0));
          actionButtons = `
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-success fw-bold btn-pay-direct" data-invid="${inv ? inv.InvoiceId : ''}" data-reqid="${r.RequestId}" data-amount="${payAmt}" data-service="${r.ServiceName}">
                <i class="bi bi-credit-card-fill"></i> Pay ₹${payAmt}
              </button>
              <button class="btn btn-sm btn-outline-primary btn-view-request" data-id="${r.RequestId}" title="View Details">
                <i class="bi bi-eye"></i>
              </button>
            </div>
          `;
        } else {
          actionButtons = `
            <div class="d-flex gap-1 align-items-center">
              <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-check-circle-fill me-1"></i>Paid</span>
              <button class="btn btn-sm btn-outline-primary btn-view-request" data-id="${r.RequestId}" title="Track & Receipt">
                <i class="bi bi-eye"></i> View
              </button>
            </div>
          `;
        }
      } else {
        actionButtons = `
          <button class="btn btn-sm btn-outline-primary btn-view-request" data-id="${r.RequestId}">
            <i class="bi bi-eye"></i> Track
          </button>
        `;
      }

      const row = `
        <tr>
          <td><strong>#${r.RequestId}</strong></td>
          <td>${r.ServiceName}</td>
          <td>${r.PreferredDate} <small class="text-muted">(${r.PreferredTimeSlot || 'Standard'})</small></td>
          <td>${statusBadge}</td>
          <td>${r.CouponDiscount ? '<span class="text-success fw-semibold">Saved ₹' + r.CouponDiscount + '</span>' : '<span class="text-muted">Standard</span>'}</td>
          <td>${actionButtons}</td>
        </tr>
      `;
      $tbody.append(row);
    });

    bindRequestTableEvents();
  }

  /**
   * 3. Load All Customer Requests with Filters (My Requests Tab)
   */
  async function loadCustomerRequests(filter = 'all') {
    const $tbody = $('#table-all-requests tbody');
    $tbody.html('<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Loading your service requests...</td></tr>');

    try {
      const allReqs = await api.getServiceRequests();
      const allInvs = await api.getInvoices();

      let filtered = allReqs;
      if (filter === 'active') {
        filtered = allReqs.filter(r => r.Status !== 'Completed' && r.Status !== 'Cancelled');
      } else if (filter === 'completed') {
        filtered = allReqs.filter(r => r.Status === 'Completed');
      }

      $tbody.empty();
      if (filtered.length === 0) {
        $tbody.html(`<tr><td colspan="6" class="text-center py-4 text-muted">No ${filter === 'all' ? '' : filter} service requests found.</td></tr>`);
        return;
      }

      filtered.forEach(r => {
        const statusBadge = getStatusBadge(r.Status);
        const inv = allInvs.find(i => i.RequestId === r.RequestId);

        let invoicePaymentCol = '<span class="text-muted small">Not generated</span>';
        let actionCol = '';

        if (r.Status === 'Completed') {
          if (!inv || inv.PaymentStatus === 'Pending') {
            const payAmt = inv ? inv.GrandTotal : (Number(r.BasePrice || 599) - Number(r.CouponDiscount || 0));
            invoicePaymentCol = `<span class="badge bg-warning text-dark"><i class="bi bi-clock-history me-1"></i>Payment Due: ₹${payAmt}</span>`;
            actionCol = `
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-success fw-bold btn-pay-direct" data-invid="${inv ? inv.InvoiceId : ''}" data-reqid="${r.RequestId}" data-amount="${payAmt}" data-service="${r.ServiceName}">
                  <i class="bi bi-credit-card-fill"></i> Pay ₹${payAmt}
                </button>
                <button class="btn btn-sm btn-outline-primary btn-view-request" data-id="${r.RequestId}">
                  <i class="bi bi-eye"></i> Track
                </button>
              </div>
            `;
          } else {
            invoicePaymentCol = `
              <div>
                <span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>Paid ₹${inv.GrandTotal}</span>
                <div class="small text-muted font-monospace">${inv.InvoiceNumber}</div>
              </div>
            `;
            actionCol = `
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-success btn-view-receipt-row" data-invid="${inv.InvoiceId}" title="View Receipt">
                  <i class="bi bi-receipt"></i> Receipt
                </button>
                <button class="btn btn-sm btn-outline-primary btn-view-request" data-id="${r.RequestId}">
                  <i class="bi bi-eye"></i> Track
                </button>
              </div>
            `;
          }
        } else {
          if (r.Status === 'Estimate Sent') {
            invoicePaymentCol = '<span class="badge bg-info text-dark">Estimate Pending</span>';
          } else {
            invoicePaymentCol = '<span class="badge bg-secondary">Job In Progress</span>';
          }
          actionCol = `
            <button class="btn btn-sm btn-outline-primary btn-view-request" data-id="${r.RequestId}">
              <i class="bi bi-eye"></i> Track Job
            </button>
          `;
        }

        const row = `
          <tr>
            <td><strong>#${r.RequestId}</strong></td>
            <td>
              <div class="fw-semibold">${r.ServiceName}</div>
              <small class="text-muted">${r.Address || 'Kolhapur'}</small>
            </td>
            <td>${r.PreferredDate}<br><small class="text-muted">${r.PreferredTimeSlot || 'Standard'}</small></td>
            <td>${statusBadge}</td>
            <td>${invoicePaymentCol}</td>
            <td>${actionCol}</td>
          </tr>
        `;
        $tbody.append(row);
      });

      bindRequestTableEvents();
    } catch (err) {
      $tbody.html(`<tr><td colspan="6" class="text-center py-4 text-danger">Failed to load requests: ${err.message}</td></tr>`);
    }
  }

  /**
   * Bind dynamic table button events
   */
  function bindRequestTableEvents() {
    $('.btn-view-request').off('click').on('click', function() {
      const reqId = $(this).data('id');
      viewRequestDetails(reqId);
    });

    $('.btn-pay-direct').off('click').on('click', function() {
      const invId = $(this).data('invid');
      const reqId = $(this).data('reqid');
      const amount = $(this).data('amount');
      const service = $(this).data('service');
      openPaymentModal(invId, reqId, amount, service);
    });

    $('.btn-view-receipt-row').off('click').on('click', async function() {
      const invId = $(this).data('invid');
      try {
        const invs = await api.getInvoices();
        const targetInv = invs.find(i => i.InvoiceId === invId);
        if (targetInv) {
          openReceiptModal(targetInv);
        } else {
          alert('Invoice receipt not found.');
        }
      } catch (e) {
        alert('Failed to load receipt: ' + e.message);
      }
    });
  }

  /**
   * 4. View Request Timeline & Dedicated Invoice Payment Card
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

      // Render Invoice & Payment Section inside Track Modal
      const $invContainer = $('#modal-track-invoice-section');
      $invContainer.empty();

      if (req.Status === 'Completed' || (details.invoices && details.invoices.length > 0)) {
        const inv = (details.invoices && details.invoices.length > 0) ? details.invoices[0] : {
          InvoiceId: 'INV-AUTO-' + req.RequestId,
          InvoiceNumber: 'INV-2026-' + Math.floor(1000 + Math.random() * 9000),
          RequestId: req.RequestId,
          LabourTotal: Number(req.BasePrice || 599),
          MaterialTotal: 0,
          DiscountTotal: Number(req.CouponDiscount || 0),
          TaxTotal: Math.round((Math.max(0, Number(req.BasePrice || 599) - Number(req.CouponDiscount || 0))) * 0.18),
          GrandTotal: Math.round((Math.max(0, Number(req.BasePrice || 599) - Number(req.CouponDiscount || 0))) * 1.18),
          PaymentStatus: 'Pending'
        };

        const isPaid = inv.PaymentStatus === 'Paid';

        $invContainer.html(`
          <div class="card p-3 border-2 ${isPaid ? 'border-success' : 'border-warning'}" style="background: ${isPaid ? 'rgba(16,185,129,0.04)' : 'rgba(245,158,11,0.04)'}; border-radius: var(--radius-lg);">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <span class="badge ${isPaid ? 'bg-success' : 'bg-warning text-dark'} me-2">
                  <i class="bi ${isPaid ? 'bi-check-circle-fill' : 'bi-clock-history'} me-1"></i> ${isPaid ? 'Paid' : 'Payment Due'}
                </span>
                <span class="fw-bold text-dark font-monospace">${inv.InvoiceNumber || 'INV-2026'}</span>
              </div>
              <h5 class="fw-bold text-primary mb-0">₹${inv.GrandTotal}</h5>
            </div>

            <div class="bg-white p-2 rounded-2 border mb-3 small">
              <div class="d-flex justify-content-between text-muted">
                <span>Labour / Inspection:</span>
                <span>₹${inv.LabourTotal || 599}</span>
              </div>
              ${inv.MaterialTotal ? `
                <div class="d-flex justify-content-between text-muted">
                  <span>Materials / Spares:</span>
                  <span>₹${inv.MaterialTotal}</span>
                </div>
              ` : ''}
              ${inv.DiscountTotal ? `
                <div class="d-flex justify-content-between text-success">
                  <span>Promotional Discount:</span>
                  <span>-₹${inv.DiscountTotal}</span>
                </div>
              ` : ''}
              <div class="d-flex justify-content-between text-muted">
                <span>GST (18% Service Tax):</span>
                <span>₹${inv.TaxTotal || 90}</span>
              </div>
              <hr class="my-1">
              <div class="d-flex justify-content-between fw-bold text-dark">
                <span>Final Payable:</span>
                <span class="text-primary">₹${inv.GrandTotal}</span>
              </div>
            </div>

            ${!isPaid ? `
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted"><i class="bi bi-shield-check text-success me-1"></i>Verified service complete. Pay online now.</small>
                <button class="btn btn-success fw-bold px-4 btn-pay-from-modal" data-invid="${inv.InvoiceId}" data-reqid="${req.RequestId}" data-amount="${inv.GrandTotal}" data-service="${req.ServiceName}">
                  <i class="bi bi-credit-card-2-front-fill me-1"></i> Pay ₹${inv.GrandTotal} Now
                </button>
              </div>
            ` : `
              <div class="d-flex justify-content-between align-items-center">
                <div class="small text-success fw-semibold"><i class="bi bi-patch-check-fill me-1"></i>Payment Received & Verified</div>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary btn-rate-service-modal" data-reqid="${req.RequestId}" data-service="${req.ServiceName}">
                    <i class="bi bi-star me-1"></i> Rate Service
                  </button>
                  <button class="btn btn-sm btn-success btn-view-receipt-modal" data-invid="${inv.InvoiceId}">
                    <i class="bi bi-receipt me-1"></i> View Receipt
                  </button>
                </div>
              </div>
            `}
          </div>
        `);

        $('.btn-pay-from-modal').on('click', function() {
          const trackModal = bootstrap.Modal.getInstance(document.getElementById('modalTrackRequest'));
          if (trackModal) trackModal.hide();
          openPaymentModal($(this).data('invid'), $(this).data('reqid'), $(this).data('amount'), $(this).data('service'));
        });

        $('.btn-view-receipt-modal').on('click', function() {
          const trackModal = bootstrap.Modal.getInstance(document.getElementById('modalTrackRequest'));
          if (trackModal) trackModal.hide();
          openReceiptModal(inv);
        });

        $('.btn-rate-service-modal').on('click', function() {
          const trackModal = bootstrap.Modal.getInstance(document.getElementById('modalTrackRequest'));
          if (trackModal) trackModal.hide();
          openFeedbackModal($(this).data('reqid'), $(this).data('service'));
        });
      }

      // Render Estimates if any
      const $estContainer = $('#modal-track-estimates');
      $estContainer.empty();
      if (details.estimates && details.estimates.length > 0) {
        $('#modal-track-estimates-section').removeClass('d-none');
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
        if (req.Status === 'Completed') {
          $('#modal-track-estimates-section').addClass('d-none');
        } else {
          $('#modal-track-estimates-section').removeClass('d-none');
          $estContainer.html('<p class="text-muted small">No estimate required or pending review from team.</p>');
        }
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
   * 5. Open Payment Modal with Dynamic UPI QR Code
   */
  function openPaymentModal(invId, reqId, amount, serviceName) {
    const finalAmount = Number(amount) || 599;
    $('#pay-modal-invoice-id').val(invId || ('INV-PAY-' + Date.now()));
    $('#pay-modal-req-id').val(reqId || '');
    $('#pay-modal-amount').text('₹' + finalAmount);
    $('#pay-modal-breakdown').text(`Service: ${serviceName || 'On-Demand Service'} (Verified & Complete)`);

    // Generate dynamic UPI QR URL
    const upiUri = `upi://pay?pa=sevasetuhub@icici&pn=SevaSetuHub&am=${finalAmount}&cu=INR&tn=Invoice-${invId || reqId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;
    $('#upi-qr-img').attr('src', qrUrl);

    // Reset tabs
    $('#tab-upi-btn').tab('show');

    const payModal = new bootstrap.Modal(document.getElementById('modalPayment'));
    payModal.show();
  }

  // Copy UPI ID helper
  $('#btn-copy-upi').on('click', function() {
    const upiId = $('#upi-id-display').val();
    navigator.clipboard.writeText(upiId).then(() => {
      $(this).html('<i class="bi bi-check2"></i> Copied!').addClass('btn-success').removeClass('btn-outline-secondary');
      setTimeout(() => {
        $('#btn-copy-upi').html('<i class="bi bi-clipboard"></i> Copy').addClass('btn-outline-secondary').removeClass('btn-success');
      }, 2000);
    });
  });

  // Handle Payment Submit
  $('#btn-confirm-payment').on('click', async function() {
    const invId = $('#pay-modal-invoice-id').val();
    const reqId = $('#pay-modal-req-id').val();
    const activeTabId = $('#payMethodTabs .nav-link.active').attr('id');
    let method = 'UPI';
    if (activeTabId === 'tab-card-btn') method = 'Card';
    if (activeTabId === 'tab-cash-btn') method = 'Cash';

    const $btn = $(this);
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span> Processing Secure Payment...');

    try {
      const res = await api.createPayment({
        invoiceId: invId,
        paymentMethod: method,
        amount: 0 // Pay full
      });

      // Hide payment modal
      const payModal = bootstrap.Modal.getInstance(document.getElementById('modalPayment'));
      if (payModal) payModal.hide();

      // Refresh background data
      loadCustomerDashboard();
      if (!$('#section-requests').hasClass('d-none')) loadCustomerRequests(currentRequestFilter);
      if (!$('#section-invoices').hasClass('d-none')) loadCustomerInvoices();

      // Open tax receipt modal
      if (res && res.invoice) {
        openReceiptModal(res.invoice);
      } else {
        alert('Payment Successful! Thank you for choosing SevaSetuHub.');
      }
    } catch (err) {
      alert('Payment failed: ' + err.message);
    } finally {
      $btn.prop('disabled', false).html('<i class="bi bi-shield-check me-2"></i>Pay &amp; Generate Receipt');
    }
  });

  /**
   * 6. Open Tax Receipt Modal
   */
  function openReceiptModal(inv) {
    const user = api.getStoredUser() || {};
    const dateStr = inv.PaidAt || inv.CreatedAt || new Date().toLocaleString('en-IN');
    const grandTotal = Number(inv.GrandTotal || 599);
    const labour = Number(inv.LabourTotal || 599);
    const parts = Number(inv.MaterialTotal || 0);
    const disc = Number(inv.DiscountTotal || 0);
    const tax = Number(inv.TaxTotal || Math.round(grandTotal * 0.18 / 1.18));

    $('#receipt-invoice-num').text('#' + (inv.InvoiceNumber || 'INV-2026-0001'));
    $('#receipt-date').text('Date: ' + dateStr.slice(0, 10));
    $('#receipt-customer-name').text(inv.customerName || user.fullName || 'Suresh Kadam');
    $('#receipt-customer-phone').text('+91 ' + (inv.customerMobile || user.mobile || '9890123456'));
    $('#receipt-customer-addr').text(inv.address || user.address || 'Kolhapur, Maharashtra');
    $('#receipt-request-id').text('Request #' + (inv.RequestId || 'REQ-104928'));
    $('#receipt-service-name').text(inv.serviceName || 'Split AC Power Jet Deep Service');
    $('#receipt-txn-id').text('Txn ID: ' + (inv.TransactionId || ('TXN-' + Math.floor(100000 + Math.random() * 900000))));

    $('#receipt-labour').text('₹' + labour);
    $('#receipt-materials').text('₹' + parts);
    $('#receipt-discount').text('-₹' + disc);
    $('#receipt-tax').text('₹' + tax);
    $('#receipt-grand-total').text('₹' + grandTotal);
    $('#receipt-payment-method').text(inv.PaymentMethod || 'UPI / Online');

    $('#btn-give-feedback-from-receipt').data('reqid', inv.RequestId).data('service', inv.serviceName);

    const receiptModal = new bootstrap.Modal(document.getElementById('modalReceipt'));
    receiptModal.show();
  }

  // Print Receipt Button
  $('#btn-print-receipt-modal').on('click', function() {
    window.print();
  });

  // Give Feedback from Receipt
  $('#btn-give-feedback-from-receipt').on('click', function() {
    const receiptModal = bootstrap.Modal.getInstance(document.getElementById('modalReceipt'));
    if (receiptModal) receiptModal.hide();
    openFeedbackModal($(this).data('reqid'), $(this).data('service'));
  });

  /**
   * 7. Open Service Rating & Feedback Modal
   */
  function openFeedbackModal(requestId, serviceName) {
    $('#feedback-request-id').val(requestId || '');
    $('#feedback-service-title').text(serviceName || 'Service Execution');
    $('#feedback-comments').val('');
    setStarRating(5);

    const feedbackModal = new bootstrap.Modal(document.getElementById('modalFeedback'));
    feedbackModal.show();
  }

  // Star Rating Interaction
  $('.star-item').on('click', function() {
    const rating = Number($(this).data('rating'));
    setStarRating(rating);
  });

  function setStarRating(rating) {
    selectedRating = rating;
    const labels = {
      1: '1 Star – Poor Experience',
      2: '2 Stars – Needs Improvement',
      3: '3 Stars – Average Service',
      4: '4 Stars – Good Job!',
      5: '5 Stars – Excellent Service!'
    };
    $('#feedback-rating-label').text(labels[rating] || (rating + ' Stars'));

    $('.star-item').each(function() {
      const r = Number($(this).data('rating'));
      if (r <= rating) {
        $(this).removeClass('bi-star').addClass('bi-star-fill text-warning');
      } else {
        $(this).removeClass('bi-star-fill text-warning').addClass('bi-star text-muted');
      }
    });
  }

  // Submit Feedback
  $('#btn-submit-feedback').on('click', async function() {
    const reqId = $('#feedback-request-id').val();
    const comments = $('#feedback-comments').val();
    const $btn = $(this);

    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Submitting...');
    try {
      await api.submitFeedback({
        requestId: reqId,
        overallRating: selectedRating,
        comments: comments
      });

      alert('Thank you for rating! Your feedback helps us maintain verified service excellence.');
      const feedbackModal = bootstrap.Modal.getInstance(document.getElementById('modalFeedback'));
      if (feedbackModal) feedbackModal.hide();
    } catch (e) {
      alert('Error submitting feedback: ' + e.message);
    } finally {
      $btn.prop('disabled', false).html('<i class="bi bi-send-fill me-1"></i> Submit Feedback');
    }
  });

  /**
   * 8. Load Invoices & Payment Handler
   */
  async function loadCustomerInvoices() {
    try {
      const invoices = await api.getInvoices();
      const $tbody = $('#table-customer-invoices tbody');
      $tbody.empty();

      if (invoices.length === 0) {
        $tbody.html('<tr><td colspan="6" class="text-center py-4 text-muted">No invoices generated yet. Invoices appear automatically after job completion.</td></tr>');
        return;
      }

      invoices.forEach(inv => {
        const isPaid = inv.PaymentStatus === 'Paid';
        const row = `
          <tr>
            <td><strong>#${inv.InvoiceNumber}</strong></td>
            <td>${inv.serviceName || 'Service Execution'}</td>
            <td>${inv.CreatedAt ? String(inv.CreatedAt).slice(0, 10) : '2026-08-22'}</td>
            <td><strong>₹${inv.GrandTotal}</strong></td>
            <td><span class="badge ${isPaid ? 'bg-success' : 'bg-danger'}">${inv.PaymentStatus}</span></td>
            <td>
              ${!isPaid ? `
                <button class="btn btn-sm btn-primary btn-pay-invoice" data-id="${inv.InvoiceId}" data-reqid="${inv.RequestId}" data-amount="${inv.GrandTotal}" data-service="${inv.serviceName}">
                  <i class="bi bi-credit-card"></i> Pay Now
                </button>
              ` : `
                <button class="btn btn-sm btn-outline-secondary btn-print-receipt-row" data-id="${inv.InvoiceId}">
                  <i class="bi bi-receipt"></i> Tax Receipt
                </button>
              `}
            </td>
          </tr>
        `;
        $tbody.append(row);
      });

      $('.btn-pay-invoice').on('click', function() {
        const invId = $(this).data('id');
        const reqId = $(this).data('reqid');
        const amount = $(this).data('amount');
        const service = $(this).data('service');
        openPaymentModal(invId, reqId, amount, service);
      });

      $('.btn-print-receipt-row').on('click', function() {
        const invId = $(this).data('id');
        const target = invoices.find(i => i.InvoiceId === invId);
        if (target) openReceiptModal(target);
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 9. Load AMC Contracts
   */
  function loadCustomerAMC() {
    // Already statically formatted in HTML card with live counters
  }

  /**
   * 10. Load Customer Notifications
   */
  function loadCustomerNotifications() {
    const $container = $('#notifications-list-container');
    const user = api.getStoredUser() || {};
    const notifs = [
      {
        title: 'Job Completed & Invoice Generated',
        msg: 'Split AC Power Jet Deep Service was completed by Technician Mahesh Patil. Tax invoice #INV-2026-8819 for ₹589 is ready for payment.',
        time: 'Today, 11:30 AM',
        icon: 'bi-receipt-cutoff text-success',
        unread: true
      },
      {
        title: 'Technician Assigned',
        msg: 'Technician Mahesh Patil (+91 9822001122) assigned to your AC Service request #REQ-104928.',
        time: 'Today, 09:15 AM',
        icon: 'bi-person-check text-primary',
        unread: false
      },
      {
        title: 'Service Booking Confirmed',
        msg: 'Your booking for Split AC Power Jet Deep Service is confirmed. Estimated Slot: Morning 10 AM - 1 PM.',
        time: 'Yesterday, 10:15 AM',
        icon: 'bi-check2-circle text-info',
        unread: false
      }
    ];

    $container.empty();
    notifs.forEach(n => {
      $container.append(`
        <div class="p-3 mb-2 rounded-3 border ${n.unread ? 'bg-light border-primary' : 'bg-white'}" style="transition:all .2s ease;">
          <div class="d-flex align-items-start gap-3">
            <div style="font-size:1.4rem;" class="${n.icon}"><i class="bi ${n.icon}"></i></div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <h6 class="fw-bold mb-0 text-dark" style="font-size:0.92rem;">${n.title}</h6>
                <small class="text-muted" style="font-size:0.75rem;">${n.time}</small>
              </div>
              <p class="text-muted mb-0 small">${n.msg}</p>
            </div>
            ${n.unread ? '<span class="badge bg-primary rounded-pill">New</span>' : ''}
          </div>
        </div>
      `);
    });

    $('#btn-clear-notifications').off('click').on('click', function() {
      $container.find('.border-primary').removeClass('border-primary bg-light').addClass('bg-white');
      $container.find('.badge.bg-primary').remove();
    });
  }

  /**
   * 11. Load Catalog for Booking Wizard
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
