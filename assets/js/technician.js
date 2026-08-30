/**
 * ============================================================================
 * SevaSetuHub – Field Technician Mobile Operations Portal (technician.js)
 * ============================================================================
 */

$(document).ready(function() {
  if (!AuthGuard.protectRoute(['Technician', 'SuperAdmin'])) return;
  AuthGuard.renderUserHeader();

  let activeWorkOrder = null;
  let canvas, ctx, isDrawing = false;

  // Initialize
  loadTechnicianJobs();
  initSignatureCanvas();

  // Tab switcher
  $('.tech-tab-btn').on('click', function() {
    $('.tech-tab-btn').removeClass('active');
    $(this).addClass('active');
    const filter = $(this).data('filter');
    filterJobs(filter);
  });

  // Logout
  $('.btn-logout').on('click', function(e) {
    e.preventDefault();
    AuthGuard.logout();
  });

  /**
   * Load Jobs for Logged In Technician
   */
  async function loadTechnicianJobs() {
    try {
      const workOrders = await api.getWorkOrders();
      window._allTechJobs = workOrders;
      filterJobs('today');
    } catch (err) {
      console.error('Failed to load technician jobs:', err);
    }
  }

  function filterJobs(filter) {
    const jobs = window._allTechJobs || [];
    const $container = $('#tech-jobs-list');
    $container.empty();

    let filtered = jobs;
    const today = new Date().toISOString().slice(0, 10);

    if (filter === 'today') {
      filtered = jobs.filter(j => j.ScheduledDate === today || j.Status === 'In Progress' || j.Status === 'Assigned' || j.Status === 'En Route' || j.Status === 'Checked In');
    } else if (filter === 'in-progress') {
      filtered = jobs.filter(j => j.Status === 'In Progress' || j.Status === 'En Route' || j.Status === 'Checked In');
    } else if (filter === 'completed') {
      filtered = jobs.filter(j => j.Status === 'Completed');
    }

    if (filtered.length === 0) {
      $container.html('<div class="text-center py-5 text-muted"><i class="bi bi-calendar2-check display-4"></i><p class="mt-2">No jobs in this category.</p></div>');
      return;
    }

    filtered.forEach(j => {
      const req = j.serviceRequest || {};
      const card = `
        <div class="card job-card mb-3 border-0 shadow-sm">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge ${j.Priority === 'High' ? 'bg-danger' : 'bg-primary'}">${j.Priority || 'Normal'} Priority</span>
              <span class="badge ${j.Status === 'Completed' ? 'bg-success' : 'bg-warning text-dark'}">${j.Status}</span>
            </div>
            <h5 class="card-title mb-1">${req.ServiceName || 'Service Job'}</h5>
            <p class="text-muted small mb-2"><i class="bi bi-clock"></i> ${j.ScheduledDate} | ${j.StartTime || '10:00 AM'}</p>
            <div class="p-2 bg-light rounded mb-3 small">
              <div><strong><i class="bi bi-person"></i> ${req.CustomerName || 'Customer'}</strong> (${req.CustomerMobile || 'N/A'})</div>
              <div class="text-truncate text-muted"><i class="bi bi-geo-alt"></i> ${req.Address || 'Kolhapur'}</div>
            </div>
            <button class="btn btn-primary w-100 btn-open-job" data-id="${j.WorkOrderId}">
              <i class="bi bi-play-circle-fill me-1"></i> ${j.Status === 'Completed' ? 'View Report' : 'Execute Job'}
            </button>
          </div>
        </div>
      `;
      $container.append(card);
    });

    $('.btn-open-job').on('click', function() {
      const woId = $(this).data('id');
      openJobExecution(woId);
    });
  }

  /**
   * Open Mobile Job Execution Wizard
   */
  async function openJobExecution(woId) {
    const jobs = window._allTechJobs || [];
    activeWorkOrder = jobs.find(j => j.WorkOrderId === woId);
    if (!activeWorkOrder) return;

    const req = activeWorkOrder.serviceRequest || {};
    $('#exec-job-title').text(req.ServiceName || 'Field Job');
    $('#exec-job-wo-id').text('#' + activeWorkOrder.WorkOrderId);
    $('#exec-customer-name').text(req.CustomerName || 'Customer');
    $('#exec-customer-phone').attr('href', `tel:${req.CustomerMobile}`).text(req.CustomerMobile || 'Call Customer');
    $('#exec-customer-address').text(`${req.Address || ''}, ${req.City || 'Kolhapur'}`);
    $('#exec-issue-desc').text(req.IssueDescription || 'General servicing required.');

    // Switch view to execution screen
    $('#screen-jobs-list').addClass('d-none');
    $('#screen-job-execution').removeClass('d-none');

    // Update job stage steps
    updateJobWorkflowButtons(activeWorkOrder.Status);
  }

  // Back to jobs list
  $('#btn-back-to-jobs').on('click', function() {
    $('#screen-job-execution').addClass('d-none');
    $('#screen-jobs-list').removeClass('d-none');
    loadTechnicianJobs();
  });

  function updateJobWorkflowButtons(status) {
    $('#btn-start-trip').addClass('d-none');
    $('#btn-checkin').addClass('d-none');
    $('#job-work-sections').addClass('d-none');

    if (status === 'Assigned' || status === 'Scheduled') {
      $('#btn-start-trip').removeClass('d-none');
    } else if (status === 'En Route') {
      $('#btn-checkin').removeClass('d-none');
    } else {
      // In Progress / Completed
      $('#job-work-sections').removeClass('d-none');
    }
  }

  // Start Trip Action (Captures Geolocation)
  $('#btn-start-trip').on('click', function() {
    const $btn = $(this);
    SevaButton.setLoading($btn, true, 'Starting Trip...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await api.updateJobStatus({
              workOrderId: activeWorkOrder.WorkOrderId,
              status: 'En Route',
              latitude: position.coords.latitude.toFixed(6),
              longitude: position.coords.longitude.toFixed(6)
            });
            alert('Trip started! GPS coordinates recorded.');
            updateJobWorkflowButtons('En Route');
          } catch (e) {
            alert('Failed to update trip status: ' + e.message);
          } finally {
            SevaButton.setLoading($btn, false);
          }
        },
        async (err) => {
          try {
            // If GPS denied, continue gracefully
            await api.updateJobStatus({
              workOrderId: activeWorkOrder.WorkOrderId,
              status: 'En Route'
            });
            alert('Trip started!');
            updateJobWorkflowButtons('En Route');
          } catch (e) {
            alert('Failed to update trip status: ' + e.message);
          } finally {
            SevaButton.setLoading($btn, false);
          }
        }
      );
    } else {
      SevaButton.setLoading($btn, false);
      updateJobWorkflowButtons('En Route');
    }
  });

  // Check In Action
  $('#btn-checkin').on('click', async function() {
    const $btn = $(this);
    SevaButton.setLoading($btn, true, 'Checking In...');
    try {
      await api.updateJobStatus({
        workOrderId: activeWorkOrder.WorkOrderId,
        status: 'In Progress'
      });
      alert('Checked In at customer site! Ready to execute checklist.');
      updateJobWorkflowButtons('In Progress');
    } catch (e) {
      alert('Failed to check in: ' + e.message);
    } finally {
      SevaButton.setLoading($btn, false);
    }
  });

  // Image Upload Preview (Before & After photos)
  $('#input-before-photo, #input-after-photo').on('change', function(e) {
    const file = e.target.files[0];
    const previewTarget = $(this).data('preview');
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        $(`#${previewTarget}`).html(`<img src="${evt.target.result}" class="img-fluid rounded border shadow-sm" style="max-height: 180px;">`);
      };
      reader.readAsDataURL(file);
    }
  });

  /**
   * HTML5 Canvas Signature Pad Setup
   */
  function initSignatureCanvas() {
    canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    // Mouse drawing
    canvas.addEventListener('mousedown', (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    canvas.addEventListener('mousemove', (e) => { if (isDrawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
    canvas.addEventListener('mouseup', () => { isDrawing = false; });

    // Touch drawing for mobile screens
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    });
    canvas.addEventListener('touchend', () => { isDrawing = false; });

    $('#btn-clear-sig').on('click', function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }

  /**
   * Complete Job and Generate Official Service Report
   */
  $('#btn-complete-job').on('click', async function() {
    if (!confirm('Are you sure you want to finalize this job? This will issue the service report and invoice.')) return;

    const signatureData = canvas.toDataURL('image/png');
    const workPerformed = $('#tech-notes-performed').val();

    SevaButton.setLoading(this, true, 'Finalizing & Invoicing...');

    try {
      const res = await api.completeWorkOrder({
        workOrderId: activeWorkOrder.WorkOrderId,
        signatureBase64: signatureData,
        summary: workPerformed || 'Job completed adhering to standard technical procedures.',
        customerName: $('#tech-signatory-name').val() || 'Customer Sign-off'
      });

      alert('Work Order completed successfully! Service report & invoice generated.');
      $('#screen-job-execution').addClass('d-none');
      $('#screen-jobs-list').removeClass('d-none');
      loadTechnicianJobs();
    } catch (err) {
      alert('Error completing job: ' + err.message);
    } finally {
      SevaButton.setLoading(this, false);
    }
  });
});
