/**
 * ============================================================================
 * SevaSetuHub – Direct Service Booking & Registration Controller (book.js)
 * ============================================================================
 */

const DEFAULT_CATEGORIES = [
  { CategoryId: 'CAT-AC', Name: 'AC Service & Repair', Slug: 'ac-service', Icon: 'bi-snow2', Description: 'Precision cooling, foam jet wash, gas refill, repair & AMC' },
  { CategoryId: 'CAT-CLN', Name: 'Deep Cleaning', Slug: 'cleaning', Icon: 'bi-stars', Description: 'Full home deep sanitization, kitchen chimney & bathroom scrubbing' },
  { CategoryId: 'CAT-PLM', Name: 'Plumbing Services', Slug: 'plumbing', Icon: 'bi-droplet-half', Description: 'Pipe leakage, fixture replacements, sanitary fittings & drain unblocking' },
  { CategoryId: 'CAT-ELE', Name: 'Electrical Repairs', Slug: 'electrical', Icon: 'bi-lightning-charge-fill', Description: 'Switchboard repair, MCB wiring, appliance fault fixes & lighting' },
  { CategoryId: 'CAT-PST', Name: 'Pest Control', Slug: 'pest-control', Icon: 'bi-shield-check', Description: '100% odourless herbal termite, cockroach & bedbug management' },
  { CategoryId: 'CAT-FAB', Name: 'Fabrication & Welding', Slug: 'fabrication', Icon: 'bi-tools', Description: 'Custom gates, safety grills, structural welding & metal fabrication' },
  { CategoryId: 'CAT-MNT', Name: 'General Maintenance', Slug: 'maintenance', Icon: 'bi-gear-fill', Description: 'Complete home maintenance, carpentry & mounting fixes' }
];

const DEFAULT_SERVICES = [
  // AC & HVAC
  { ServiceId: 'SRV-AC-01', CategoryId: 'CAT-AC', ServiceName: 'Split AC Power Jet Deep Service', Description: 'Complete indoor foam wash, outdoor condenser jet cleaning, filter wash & airflow check', BasePrice: 599, EstimatedHours: 1.5, Icon: 'bi-snow2' },
  { ServiceId: 'SRV-AC-02', CategoryId: 'CAT-AC', ServiceName: 'Window AC Complete Servicing', Description: 'Deep chemical wash of condenser and cooling coils, tray cleaning & pressure check', BasePrice: 499, EstimatedHours: 1.0, Icon: 'bi-snow' },
  { ServiceId: 'SRV-AC-03', CategoryId: 'CAT-AC', ServiceName: 'AC Refrigerant Gas Refilling & Top-up', Description: 'Vacuum leak pressure test, copper joint brazing and original refrigerant charge', BasePrice: 1499, EstimatedHours: 2.0, Icon: 'bi-snow2' },
  { ServiceId: 'SRV-AC-04', CategoryId: 'CAT-AC', ServiceName: 'AC Installation & Uninstallation', Description: 'Heavy-duty wall bracket mounting, core wall drilling, copper pipe flare & wiring', BasePrice: 899, EstimatedHours: 2.5, Icon: 'bi-gear-wide-connected' },
  { ServiceId: 'SRV-AC-05', CategoryId: 'CAT-AC', ServiceName: 'PCB Circuit Repair & Diagnostics', Description: 'Inverter PCB troubleshooting, sensor replacement & display module fix', BasePrice: 799, EstimatedHours: 1.5, Icon: 'bi-cpu' },
  // Cleaning
  { ServiceId: 'SRV-CLN-01', CategoryId: 'CAT-CLN', ServiceName: '2 BHK Full Home Deep Cleaning', Description: 'Machine floor scrubbing, kitchen tile degreasing, bathroom descaling & window cleaning', BasePrice: 1999, EstimatedHours: 4.0, Icon: 'bi-house-check' },
  { ServiceId: 'SRV-CLN-02', CategoryId: 'CAT-CLN', ServiceName: '3 BHK Premium Villa Cleaning', Description: 'Complete deep cleaning of all bedrooms, living area, balconies & high dusting', BasePrice: 2899, EstimatedHours: 5.5, Icon: 'bi-stars' },
  { ServiceId: 'SRV-CLN-03', CategoryId: 'CAT-CLN', ServiceName: 'Kitchen Deep Scrub & Degreasing', Description: 'Heavy oil removal from tiles, sink sanitization, exhaust & chimney cleaning', BasePrice: 899, EstimatedHours: 2.5, Icon: 'bi-magic' },
  { ServiceId: 'SRV-CLN-04', CategoryId: 'CAT-CLN', ServiceName: 'Bathroom & Tile Descaling', Description: 'Acid-free tile grout stain removal, WC disinfection, mirror & tap buffing', BasePrice: 499, EstimatedHours: 1.5, Icon: 'bi-droplet' },
  { ServiceId: 'SRV-CLN-05', CategoryId: 'CAT-CLN', ServiceName: 'Sofa & Carpet Shampooing', Description: 'Deep vacuuming, organic foam extraction shampoo & moisture suction', BasePrice: 699, EstimatedHours: 2.0, Icon: 'bi-brush' },
  // Plumbing
  { ServiceId: 'SRV-PLM-01', CategoryId: 'CAT-PLM', ServiceName: 'Water Leakage & Pipe Repair', Description: 'Acoustic leakage diagnosis, joint solder, angle valve & tap replace', BasePrice: 299, EstimatedHours: 1.0, Icon: 'bi-droplet-half' },
  { ServiceId: 'SRV-PLM-02', CategoryId: 'CAT-PLM', ServiceName: 'Tap, Shower & Faucet Replacement', Description: 'Kitchen mixer, diverter, overhead shower installation & sealing', BasePrice: 199, EstimatedHours: 0.5, Icon: 'bi-water' },
  { ServiceId: 'SRV-PLM-03', CategoryId: 'CAT-PLM', ServiceName: 'Drain Clog & Blockage Clearance', Description: 'Heavy rotary snake rod machine clearing of choked bathroom and kitchen drains', BasePrice: 399, EstimatedHours: 1.0, Icon: 'bi-dash-circle' },
  { ServiceId: 'SRV-PLM-04', CategoryId: 'CAT-PLM', ServiceName: 'Overhead Water Tank Deep Cleaning', Description: 'High pressure mechanized cleaning, sludge suction & UV disinfectant treatment', BasePrice: 599, EstimatedHours: 2.0, Icon: 'bi-database' },
  { ServiceId: 'SRV-PLM-05', CategoryId: 'CAT-PLM', ServiceName: 'Motor Pump & Valve Fitting', Description: 'Centrifugal pump installation, non-return valve check & piping bypass', BasePrice: 499, EstimatedHours: 1.5, Icon: 'bi-plug' },
  // Electrical
  { ServiceId: 'SRV-ELE-01', CategoryId: 'CAT-ELE', ServiceName: 'Switchboard, MCB & Fuse Repairs', Description: 'Safety voltage check, MCB tripping repair, loose terminal tightening', BasePrice: 249, EstimatedHours: 1.0, Icon: 'bi-lightning' },
  { ServiceId: 'SRV-ELE-02', CategoryId: 'CAT-ELE', ServiceName: 'Ceiling Fan Installation & Servicing', Description: 'Downrod assembly, canopy fixing, regulator tuning & noise elimination', BasePrice: 199, EstimatedHours: 0.5, Icon: 'bi-arrow-repeat' },
  { ServiceId: 'SRV-ELE-03', CategoryId: 'CAT-ELE', ServiceName: 'Inverter & Battery Wiring Setup', Description: 'Pure sine wave inverter connection, battery terminal grease & load balancing', BasePrice: 599, EstimatedHours: 2.0, Icon: 'bi-battery-charging' },
  { ServiceId: 'SRV-ELE-04', CategoryId: 'CAT-ELE', ServiceName: 'Full House Short Circuit Inspection', Description: 'Megger earth resistance check, phase detection & wiring fault localization', BasePrice: 499, EstimatedHours: 1.5, Icon: 'bi-exclamation-triangle' },
  { ServiceId: 'SRV-ELE-05', CategoryId: 'CAT-ELE', ServiceName: 'Geyser & Water Heater Repair', Description: 'Thermostat heating element replacement, pressure release valve check', BasePrice: 399, EstimatedHours: 1.0, Icon: 'bi-thermometer-half' },
  // Pest Control
  { ServiceId: 'SRV-PST-01', CategoryId: 'CAT-PST', ServiceName: 'Complete Cockroach Gel Treatment', Description: 'Govt. approved non-toxic Bayer gel application in cabinets, drains and appliances', BasePrice: 799, EstimatedHours: 1.0, Icon: 'bi-shield-shaded' },
  { ServiceId: 'SRV-PST-02', CategoryId: 'CAT-PST', ServiceName: 'Termite Protection & Wood Shield', Description: 'Drill-fill-seal subterranean termite treatment with 1-year service warranty', BasePrice: 1899, EstimatedHours: 3.0, Icon: 'bi-shield-check' },
  { ServiceId: 'SRV-PST-03', CategoryId: 'CAT-PST', ServiceName: 'Bed Bug Eradication 2-Visit Plan', Description: 'Super-heated steam spray + chemical residual treatment of mattresses and beds', BasePrice: 1299, EstimatedHours: 2.5, Icon: 'bi-bug' },
  { ServiceId: 'SRV-PST-04', CategoryId: 'CAT-PST', ServiceName: 'Mosquito & Fly Thermal Fogging', Description: 'Outdoor and duct fogging for complete elimination of dengue & malaria vectors', BasePrice: 699, EstimatedHours: 1.0, Icon: 'bi-cloud-haze' },
  // Fabrication
  { ServiceId: 'SRV-FAB-01', CategoryId: 'CAT-FAB', ServiceName: 'Safety Door & Gate Welding Repair', Description: 'On-site electric arc welding, latch alignment, hinge reinforcement & primer', BasePrice: 599, EstimatedHours: 2.0, Icon: 'bi-tools' },
  { ServiceId: 'SRV-FAB-02', CategoryId: 'CAT-FAB', ServiceName: 'Window Grill & Shed Fabrication', Description: 'Custom MS square pipe grill cutting, welding, polishing & rust-proof coat', BasePrice: 1499, EstimatedHours: 3.5, Icon: 'bi-grid-3x3' },
  { ServiceId: 'SRV-FAB-03', CategoryId: 'CAT-FAB', ServiceName: 'Balcony Railing Fitting', Description: 'Stainless steel / MS safety railing installation with expansion anchor bolts', BasePrice: 899, EstimatedHours: 2.5, Icon: 'bi-shield-fill' },
  // Maintenance
  { ServiceId: 'SRV-MNT-01', CategoryId: 'CAT-MNT', ServiceName: 'Annual Home Maintenance Inspection', Description: 'Comprehensive 40-point health audit of electrical, plumbing and AC systems', BasePrice: 999, EstimatedHours: 3.0, Icon: 'bi-clipboard-check' },
  { ServiceId: 'SRV-MNT-02', CategoryId: 'CAT-MNT', ServiceName: 'Furniture Minor Repairs & Carpentry', Description: 'Drawer slide fixing, cabinet door hinge adjustment, table leg repair', BasePrice: 399, EstimatedHours: 1.0, Icon: 'bi-hammer' },
  { ServiceId: 'SRV-MNT-03', CategoryId: 'CAT-MNT', ServiceName: 'Wall Drilling & TV / Mirror Mounting', Description: 'Precision spirit-level wall mounting of LED TV, heavy mirrors, paintings & shelves', BasePrice: 249, EstimatedHours: 0.5, Icon: 'bi-display' }
];

$(document).ready(async function() {
  let allCategories = DEFAULT_CATEGORIES;
  let allServices = DEFAULT_SERVICES;
  let selectedService = null;
  let activeCoupon = null;

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

  // Time slot buttons interaction
  $('.time-slot-btn').on('click', function() {
    $('.time-slot-btn').removeClass('active');
    $(this).addClass('active');
    $('#input-timeslot').val($(this).data('slot'));
  });

  // Render initial categories immediately
  renderCategoryPills(allCategories);
  populateCategorySelect(allCategories);

  // Fetch updated catalog from backend
  try {
    const fetchedCats = await api.getServiceCategories();
    const fetchedSrvs = await api.getServices();
    if (fetchedCats && Array.isArray(fetchedCats) && fetchedCats.length > 0) {
      allCategories = fetchedCats;
      renderCategoryPills(allCategories);
      populateCategorySelect(allCategories);
    }
    if (fetchedSrvs && Array.isArray(fetchedSrvs) && fetchedSrvs.length > 0) {
      allServices = fetchedSrvs;
    }
  } catch (e) {
    console.warn('Using embedded service catalog fallback:', e.message);
  }

  // Handle URL Query Parameters (e.g., ?category=CAT-AC or ?category=ac or ?service=...&coupon=...)
  applyUrlParameters();

  function applyUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const rawCat = urlParams.get('category');
    const rawSrv = urlParams.get('service');
    const rawCoupon = urlParams.get('coupon');
    const rawLoc = urlParams.get('location');

    if (rawLoc) {
      $('#select-city').val(rawLoc);
    }

    const catAliasMap = {
      'ac': 'CAT-AC',
      'acservice': 'CAT-AC',
      'ac-service': 'CAT-AC',
      'cleaning': 'CAT-CLN',
      'deep-cleaning': 'CAT-CLN',
      'plumbing': 'CAT-PLM',
      'electrical': 'CAT-ELE',
      'pest': 'CAT-PST',
      'pest-control': 'CAT-PST',
      'fabrication': 'CAT-FAB',
      'maintenance': 'CAT-MNT'
    };

    let targetCatId = null;
    if (rawCat) {
      const lower = rawCat.toLowerCase();
      targetCatId = catAliasMap[lower] || rawCat;
    }

    if (targetCatId && allCategories.some(c => c.CategoryId === targetCatId)) {
      selectCategory(targetCatId);
      if (rawSrv) {
        setTimeout(() => {
          const matchSrv = allServices.find(s => s.ServiceId === rawSrv || (s.ServiceName && s.ServiceName.toLowerCase().includes(rawSrv.toLowerCase())));
          if (matchSrv) {
            $('#select-service').val(matchSrv.ServiceId).trigger('change');
          }
        }, 80);
      }
    } else if (rawSrv) {
      const matchSrv = allServices.find(s => s.ServiceId === rawSrv || (s.ServiceName && s.ServiceName.toLowerCase().includes(rawSrv.toLowerCase())));
      if (matchSrv) {
        selectCategory(matchSrv.CategoryId);
        setTimeout(() => {
          $('#select-service').val(matchSrv.ServiceId).trigger('change');
        }, 80);
      } else if (allCategories.length > 0) {
        selectCategory(allCategories[0].CategoryId);
      }
    } else if (allCategories.length > 0) {
      selectCategory(allCategories[0].CategoryId);
    }

    if (rawCoupon) {
      $('#input-coupon').val(rawCoupon);
      setTimeout(() => {
        $('#btn-apply-booking-coupon').trigger('click');
      }, 300);
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
      const icon = c.Icon || categoryIcons[c.CategoryId] || 'bi-tools';
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

    $('.category-card-pill').off('click').on('click', function() {
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
    if (filtered.length === 0) {
      // Fallback if specific category filter had no match
      $srvSelect.append(`<option value="SRV-CUSTOM" data-price="599">Standard Doorstep Inspection &amp; Servicing (₹599)</option>`);
    } else {
      filtered.forEach(s => {
        $srvSelect.append(`<option value="${s.ServiceId}" data-price="${s.BasePrice}">${s.ServiceName} (₹${s.BasePrice})</option>`);
      });
    }

    // Auto-select first service
    const firstOptionVal = $srvSelect.find('option:nth-child(2)').val();
    if (firstOptionVal) {
      $srvSelect.val(firstOptionVal).trigger('change');
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
    selectedService = allServices.find(s => s.ServiceId === srvId) || {
      ServiceId: srvId || 'SRV-CUSTOM',
      ServiceName: $('#select-service option:selected').text().split('(')[0].trim() || 'On-Demand Service',
      BasePrice: Number($('#select-service option:selected').data('price')) || 599
    };
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
    if ($('.booking-card-main').length) {
      window.scrollTo({ top: $('.booking-card-main').offset().top - 80, behavior: 'smooth' });
    }
  }

  /**
   * Real-time duplicate account detection on Step 3
   * Checks ssh_users on blur of mobile/email fields
   */
  let existingUserFoundByMobile = false;
  let existingUserFoundByEmail = false;

  function buildDuplicateHint(field, existingUser) {
    const loginUrl = `../frontend/login.html`;
    return `
      <div class="d-flex align-items-start gap-2 p-2 rounded-2 border" style="background:#fff3cd;border-color:#ffc107!important;">
        <i class="bi bi-exclamation-triangle-fill text-warning mt-1" style="font-size:0.85rem;flex-shrink:0;"></i>
        <div style="font-size:0.78rem;line-height:1.4;">
          <strong class="text-dark">Account already exists</strong> for this ${field}.<br>
          <span class="text-muted">Registered as <strong>${existingUser.FirstName} ${existingUser.LastName}</strong>. 
          You can <a href="login.html" class="text-primary fw-semibold">log in here</a> or continue to book with your existing account.</span>
        </div>
      </div>`;
  }

  function checkDuplicateByMobile(mobile) {
    if (!mobile || mobile.length < 10) {
      $('#hint-mobile').addClass('d-none').html('');
      existingUserFoundByMobile = false;
      return;
    }
    const users = JSON.parse(localStorage.getItem('ssh_users') || '[]');
    const found = users.find(u => u.Role === 'Customer' && String(u.Mobile).trim() === mobile && !u.IsDeleted);
    if (found) {
      existingUserFoundByMobile = true;
      $('#hint-mobile').removeClass('d-none').html(buildDuplicateHint('mobile number', found));
      $('#cust-mobile').addClass('is-invalid').removeClass('is-valid');
      // Auto-fill name if not already filled
      if (!$('#cust-fullname').val().trim()) {
        $('#cust-fullname').val(`${found.FirstName} ${found.LastName}`.trim());
      }
    } else {
      existingUserFoundByMobile = false;
      $('#hint-mobile').addClass('d-none').html('');
      $('#cust-mobile').removeClass('is-invalid').addClass('is-valid');
    }
  }

  function checkDuplicateByEmail(email) {
    if (!email || !email.includes('@')) {
      $('#hint-email').addClass('d-none').html('');
      existingUserFoundByEmail = false;
      return;
    }
    const users = JSON.parse(localStorage.getItem('ssh_users') || '[]');
    const found = users.find(u => u.Role === 'Customer' && u.Email && u.Email.toLowerCase() === email.toLowerCase() && !u.IsDeleted);
    if (found) {
      existingUserFoundByEmail = true;
      $('#hint-email').removeClass('d-none').html(buildDuplicateHint('email address', found));
      $('#cust-email').addClass('is-invalid').removeClass('is-valid');
      // Auto-fill name if not already filled
      if (!$('#cust-fullname').val().trim()) {
        $('#cust-fullname').val(`${found.FirstName} ${found.LastName}`.trim());
      }
    } else {
      existingUserFoundByEmail = false;
      $('#hint-email').addClass('d-none').html('');
      $('#cust-email').removeClass('is-invalid').addClass('is-valid');
    }
  }

  $('#cust-mobile').on('blur', function() {
    checkDuplicateByMobile($(this).val().trim());
  });

  $('#cust-email').on('blur', function() {
    checkDuplicateByEmail($(this).val().trim().toLowerCase());
  });

  // Clear validation state when user edits a field again
  $('#cust-mobile').on('input', function() {
    if (existingUserFoundByMobile) {
      $('#hint-mobile').addClass('d-none').html('');
      $(this).removeClass('is-invalid');
      existingUserFoundByMobile = false;
    }
  });
  $('#cust-email').on('input', function() {
    if (existingUserFoundByEmail) {
      $('#hint-email').addClass('d-none').html('');
      $(this).removeClass('is-invalid');
      existingUserFoundByEmail = false;
    }
  });

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
    if (password && password.length < 6) {
      alert('Account password must be at least 6 characters long.');
      $('#cust-password').focus();
      return;
    }

    const $submitBtn = $('#btn-submit-booking');
    $submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span> Booking Certified Service...');

    if (window.SevaLoader) {
      SevaLoader.show({
        title: 'Confirming Your Doorstep Booking',
        subtitle: `Assigning certified technician and registering your portal account for ${fullName}...`,
        statusText: 'Registering Customer Account',
        icon: 'bi-tools',
        progress: 25
      });
    }

    try {
      const payload = {
        customerName: fullName,
        customerMobile: mobile,
        customerEmail: email,
        password: password,
        categoryId: $('#select-category').val(),
        serviceId: selectedService ? selectedService.ServiceId : 'SRV-AC-01',
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

      if (window.SevaLoader) {
        SevaLoader.update({
          subtitle: 'Encrypting job notes and locking in preferred time slot...',
          statusText: 'Creating Service Request',
          progress: 60
        });
      }

      const res = await api.createServiceRequest(payload);
      const reqId = res.RequestId || (res.request ? res.request.RequestId : 'REQ-104930');

      if (window.SevaLoader) {
        SevaLoader.update({
          title: 'Booking Confirmed!',
          subtitle: `Request #${reqId} placed successfully. Preparing your customer tracker...`,
          statusText: 'Account & Booking Active',
          icon: 'bi-patch-check-fill',
          progress: 100
        });
      }

      // The session is already set inside api.createServiceRequest with the correct CustomerId
      // that matches the saved request. Do NOT generate new random IDs here.
      // If for any reason the session wasn't set (edge case), set it now using the form data.
      const currentUser = api.getStoredUser();
      if (!currentUser || currentUser.role !== 'Customer') {
        const nameParts = fullName.split(' ');
        const savedReqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        // Find the request that was just saved by email or mobile
        const savedReq = savedReqs.find(r =>
          (email && r.CustomerEmail && r.CustomerEmail.toLowerCase() === email.toLowerCase()) ||
          (mobile && String(r.CustomerMobile) === mobile)
        );
        if (savedReq) {
          const token = 'SES-LOCAL-' + Math.random().toString(36).substring(2, 12);
          const userObj = {
            userId: savedReq.CustomerId,
            customerId: savedReq.CustomerId,
            firstName: nameParts[0] || 'Customer',
            lastName: nameParts.slice(1).join(' ') || '',
            fullName: fullName,
            email: email,
            mobile: mobile,
            role: 'Customer',
            tenantId: 'TNT-DEFAULT'
          };
          api.setSession(token, userObj);
        }
      }

      // Populate Success Modal
      $('#success-req-id').text('#' + reqId);
      $('#success-service-name').text(payload.serviceName);
      $('#success-schedule').text(`${payload.preferredDate} (${payload.preferredTimeSlot})`);
      $('#success-account').text(`Active (${fullName})`);

      // Verify session is correctly set before showing modal
      const verifiedUser = api.getStoredUser();
      if (!verifiedUser || verifiedUser.role !== 'Customer') {
        // Last-resort session fix: read CustomerId from the just-saved request
        const savedReqs = JSON.parse(localStorage.getItem('ssh_requests') || '[]');
        const savedReq = savedReqs.find(r =>
          (email && r.CustomerEmail && r.CustomerEmail.toLowerCase() === email.toLowerCase()) ||
          (mobile && String(r.CustomerMobile) === mobile)
        );
        const nameParts = fullName.split(' ');
        const fixedCustId = savedReq ? savedReq.CustomerId : ('CUS-' + Math.floor(100000 + Math.random() * 900000));
        const fixedToken = 'SES-LOCAL-' + Math.random().toString(36).substring(2, 12);
        api.setSession(fixedToken, {
          userId: fixedCustId,
          customerId: fixedCustId,
          firstName: nameParts[0] || 'Customer',
          lastName: nameParts.slice(1).join(' ') || '',
          fullName: fullName,
          email: email,
          mobile: mobile,
          role: 'Customer',
          tenantId: 'TNT-DEFAULT'
        });
      }

      setTimeout(() => {
        if (window.SevaLoader) SevaLoader.hide();
        const successModal = new bootstrap.Modal(document.getElementById('modalBookingSuccess'));
        successModal.show();
      }, 500);

      // Wire the portal button — navigate only after session is confirmed in storage
      $('#btn-go-portal').off('click').on('click', function() {
        window.location.href = 'customer/index.html';
      });

      // Auto-redirect to Customer Portal after 6 seconds
      setTimeout(function() {
        const u = api.getStoredUser();
        if (u && u.role === 'Customer') {
          window.location.href = 'customer/index.html';
        }
      }, 6000);

    } catch (err) {
      if (window.SevaLoader) SevaLoader.hide();
      alert('Booking could not be processed: ' + err.message);
    } finally {
      $submitBtn.prop('disabled', false).html('<i class="bi bi-check-circle-fill me-1"></i> Confirm Booking &amp; Register');
    }
  });

});
