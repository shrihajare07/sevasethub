/**
 * ============================================================================
 * SevaSetuHub – Direct Service Booking & Registration Controller (book.js)
 * ============================================================================
 */

$(document).ready(async function() {
  let allCategories = [];
  let allServices = [];
  let selectedService = null;
  let activeCoupon = null;
  let currentStep = 1;

  // Check if customer is already logged in
  const currentUser = api.getStoredUser();
  if (currentUser && currentUser.role === 'Customer') {
    $('#user-auth-status').html(`
      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
          <i class="bi bi-check-circle-fill me-1"></i> Logged in as ${currentUser.firstName || 'Customer'}
        </span>
        <a href="customer/index.html" class="btn btn-sm btn-primary fw-semibold" style="background:var(--gradient-brand);border:none;">
          <i class="bi bi-speedometer2 me-1"></i> Portal
        </a>
      </div>
    `);

    // Pre-fill customer registration fields
    $('#cust-fullname').val(currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim());
    $('#cust-mobile').val(currentUser.mobile || '');
    $('#cust-email').val(currentUser.email || '');
    if (currentUser.address) $('#input-address').val(currentUser.address);
    if (currentUser.city) $('#select-city').val(currentUser.city);
    if (currentUser.pincode) $('#input-pincode').val(currentUser.pincode);
  }

  // Set default appointment date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  $('#input-date').val(tomorrowStr).attr('min', todayStr);

  // Time slot buttons
  $('.time-slot-btn').on('click', function() {
    $('.time-slot-btn').removeClass('active');
    $(this).addClass('active');
    $('#input-timeslot').val($(this).data('slot'));
  });

  // Initialize catalog and query params
  await initCatalog();

  /**
   * Load Categories & Services
   */
  async function initCatalog() {
    try {
      allCategories = await api.getServiceCategories();
      allServices = await api.getServices();

      renderCategoryPills(allCategories);
      populateCategorySelect(allCategories);

      // Check URL parameters (e.g. ?category=CAT-AC&service=SRV-AC-01&coupon=WELCOME100&location=Kolhapur)
      const urlParams = new URLSearchParams(window.location.search);
      const paramCat = urlParams.get('category');
      const paramSrv = urlParams.get('service');
      const paramCoupon = urlParams.get('coupon');
      const paramLoc = urlParams.get('location');

      if (paramLoc) {
        $('#select-city').val(paramLoc);
      }

      if (paramCat) {
        selectCategory(paramCat);
        if (paramSrv) {
          setTimeout(() => {
            $('#select-service').val(paramSrv).trigger('change');
          }, 100);
        }
      } else if (paramSrv) {
        // Find service by name or id
        const matchSrv = allServices.find(s => s.ServiceId === paramSrv || (s.ServiceName && s.ServiceName.toLowerCase().includes(paramSrv.toLowerCase())));
        if (matchSrv) {
          selectCategory(matchSrv.CategoryId);
          setTimeout(() => {
            $('#select-service').val(matchSrv.ServiceId).trigger('change');
          }, 100);
        } else if (allCategories.length > 0) {
          selectCategory(allCategories[0].CategoryId);
        }
      } else if (allCategories.length > 0) {
        selectCategory(allCategories[0].CategoryId);
      }

      if (paramCoupon) {
        $('#input-coupon').val(paramCoupon);
        setTimeout(() => {
          $('#btn-apply-booking-coupon').trigger('click');
        }, 300);
      }

    } catch (e) {
      console.error('Failed to load catalog:', e);
    }
  }

  function renderCategoryPills(categories) {
    const $grid = $('#category-pills-grid');
    $grid.empty();

    const categoryIcons = {
      'CAT-AC': 'bi-snow2',
      'CAT-CLN': 'bi-stars',
      'CAT-PLM': 'bi-droplet-half',
      'CAT-ELE': 'bi-lightning-charge-fill',
      'CAT-PST': 'bi-shield-check',
      'CAT-FAB': 'bi-tools',
      'CAT-MNT': 'bi-gear-fill'
    };

    categories.forEach(c => {
      const icon = categoryIcons[c.CategoryId] || 'bi-wrench';
      const pill = `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="category-card-pill" data-cat-id="${c.CategoryId}">
            <div class="category-icon-box">
              <i class="bi ${icon}"></i>
            </div>
            <div class="overflow-hidden">
              <div class="text-truncate small fw-bold text-dark">${c.Name}</div>
              <div class="text-muted" style="font-size:0.7rem;">Verified Pros</div>
            </div>
          </div>
        </div>
      `;
      $grid.append(pill);
    });

    $('.category-card-pill').on('click', function() {
      const catId = $(this).data('cat-id');
      selectCategory(catId);
    });
  }

  function populateCategorySelect(categories) {
    const $catSelect = $('#select-category');
    $catSelect.empty().append('<option value="">-- Choose Category --</option>');
    categories.forEach(c => {
      $catSelect.append(`<option value="${c.CategoryId}">${c.Name}</option>`);
    });
  }

  function selectCategory(catId) {
    $('.category-card-pill').removeClass('selected');
    $(`.category-card-pill[data-cat-id="${catId}"]`).addClass('selected');
    $('#select-category').val(catId);

    const $srvSelect = $('#select-service');
    $srvSelect.empty().append('<option value="">-- Select Specific Service Package --</option>');

    const filtered = allServices.filter(s => s.CategoryId === catId);
    filtered.forEach((s, idx) => {
      $srvSelect.append(`<option value="${s.ServiceId}" data-price="${s.BasePrice}">${s.ServiceName} (₹${s.BasePrice})</option>`);
    });

    // Auto-select first service if available
    if (filtered.length > 0) {
      $srvSelect.val(filtered[0].ServiceId).trigger('change');
    }
  }

  // Category dropdown changed
  $('#select-category').on('change', function() {
    const catId = $(this).val();
    if (catId) selectCategory(catId);
  });

  // Service package dropdown changed
  $('#select-service').on('change', function() {
    const srvId = $(this).val();
    selectedService = allServices.find(s => s.ServiceId === srvId);
    updatePriceSummary();
  });

  /**
   * Price & Coupon Calculations
   */
  function updatePriceSummary() {
    const base = selectedService ? Number(selectedService.BasePrice) : 599;
    const serviceName = selectedService ? selectedService.ServiceName : 'On-Demand Doorstep Service';
    const discount = activeCoupon ? Number(activeCoupon.discount) : 0;
    const subtotal = Math.max(0, base - discount);
    const tax = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + tax;

    $('#summary-service-name').text(serviceName);
    $('#summary-base-price').text('₹' + base);
    $('#summary-tax-price').text('₹' + tax);

    if (discount > 0) {
      $('#summary-discount-row').show();
      $('#summary-discount-price').text('-₹' + discount);
    } else {
      $('#summary-discount-row').hide();
    }

    $('#summary-grand-total').text('₹' + grandTotal);
  }

  // Apply Coupon Handler
  $('#btn-apply-booking-coupon').on('click', async function() {
    const code = $('#input-coupon').val().trim();
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
      $('#booking-coupon-status').html(`<span class="text-success fw-semibold"><i class="bi bi-check-circle-fill"></i> ${res.message}</span>`);
      updatePriceSummary();
    } catch (err) {
      activeCoupon = null;
      $('#booking-coupon-status').html(`<span class="text-danger fw-semibold"><i class="bi bi-exclamation-triangle-fill"></i> ${err.message}</span>`);
      updatePriceSummary();
    }
  });

  /**
   * Wizard Step Navigation & Validation
   */
  $('.btn-step-next').on('click', function() {
    const nextStep = Number($(this).data('next'));

    if (nextStep === 2) {
      if (!$('#select-category').val() || !$('#select-service').val()) {
        alert('Please select both a service category and specific service package.');
        return;
      }
    }

    if (nextStep === 3) {
      const address = $('#input-address').val().trim();
      const pincode = $('#input-pincode').val().trim();
      const date = $('#input-date').val();

      if (!address) {
        alert('Please enter your doorstep service address.');
        $('#input-address').focus();
        return;
      }
      if (!pincode || pincode.length < 6) {
        alert('Please enter a valid 6-digit postal pincode.');
        $('#input-pincode').focus();
        return;
      }
      if (!date) {
        alert('Please select your preferred appointment date.');
        $('#input-date').focus();
        return;
      }
      updatePriceSummary();
    }

    goToStep(nextStep);
  });

  $('.btn-step-prev').on('click', function() {
    const prevStep = Number($(this).data('prev'));
    goToStep(prevStep);
  });

  function goToStep(step) {
    currentStep = step;
    $('.booking-step-pane').addClass('d-none');
    $(`#pane-step-${step}`).removeClass('d-none');

    // Update stepper navigation
    for (let i = 1; i <= 3; i++) {
      const $stepItem = $(`#step-nav-${i}`);
      $stepItem.removeClass('active completed');
      if (i < step) $stepItem.addClass('completed');
      if (i === step) $stepItem.addClass('active');
    }

    // Scroll to top of card on mobile
    window.scrollTo({ top: $('.booking-card-main').offset().top - 80, behavior: 'smooth' });
  }

  /**
   * Form Submission (Direct Booking + Automatic Registration)
   */
  $('#form-direct-booking').on('submit', async function(e) {
    e.preventDefault();

    const fullName = $('#cust-fullname').val().trim();
    const mobile = $('#cust-mobile').val().trim();
    const email = $('#cust-email').val().trim();
    const password = $('#cust-password').val().trim() || 'Customer@2026';

    if (!fullName) {
      alert('Please enter your full name.');
      $('#cust-fullname').focus();
      return;
    }
    if (!mobile || mobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      $('#cust-mobile').focus();
      return;
    }
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address.');
      $('#cust-email').focus();
      return;
    }

    const $submitBtn = $('#btn-submit-booking');
    $submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span> Booking Certified Service...');

    try {
      const payload = {
        customerName: fullName,
        customerMobile: mobile,
        customerEmail: email,
        password: password,
        categoryId: $('#select-category').val(),
        serviceId: selectedService ? selectedService.ServiceId : 'SRV-GEN-01',
        serviceName: selectedService ? selectedService.ServiceName : 'On-Demand Home Service',
        basePrice: selectedService ? selectedService.BasePrice : 599,
        issueDescription: $('#text-issue').val().trim(),
        address: $('#input-address').val().trim(),
        city: $('#select-city').val(),
        pincode: $('#input-pincode').val().trim(),
        preferredDate: $('#input-date').val(),
        preferredTimeSlot: $('#input-timeslot').val(),
        couponCode: activeCoupon ? activeCoupon.couponCode : '',
        couponDiscount: activeCoupon ? activeCoupon.discount : 0,
        priority: 'High'
      };

      const res = await api.createServiceRequest(payload);
      const reqId = res.RequestId || (res.request ? res.request.RequestId : 'REQ-104930');

      // Populate Success Modal
      $('#success-req-id').text('#' + reqId);
      $('#success-service-name').text(payload.serviceName);
      $('#success-schedule').text(`${payload.preferredDate} (${payload.preferredTimeSlot})`);
      $('#success-account').text(`Active (${fullName})`);

      const successModal = new bootstrap.Modal(document.getElementById('modalBookingSuccess'));
      successModal.show();

    } catch (err) {
      alert('Booking could not be processed: ' + err.message);
    } finally {
      $submitBtn.prop('disabled', false).html('<i class="bi bi-check-circle-fill me-1"></i> Confirm Booking &amp; Register');
    }
  });

});
