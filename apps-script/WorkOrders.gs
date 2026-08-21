/**
 * ============================================================================
 * SevaSetuHub – Google Apps Script Work Orders & Field Operations (WorkOrders.gs)
 * ============================================================================
 */

const WorkOrdersModule = {
  /**
   * Internal Creation of Work Order upon estimate approval or direct dispatch
   */
  createWorkOrderInternal: function(data) {
    const workOrderId = Utils.generateId('WO');
    const now = Utils.nowFormatted();

    const req = Utils.findOne(SHEETS.SERVICE_REQUESTS, 'RequestId', data.requestId);

    const workOrderObj = {
      WorkOrderId: workOrderId,
      TenantId: data.tenantId || CONFIG.DEFAULT_TENANT_ID,
      RequestId: data.requestId,
      EstimateId: data.estimateId || '',
      CustomerId: data.customerId,
      TechnicianId: data.technicianId || '',
      TechnicianName: data.technicianName || 'Unassigned',
      ScheduledDate: data.scheduledDate || (req ? req.PreferredDate : ''),
      StartTime: data.startTime || '10:00 AM',
      EndTime: data.endTime || '01:00 PM',
      TripStartedAt: '',
      CheckInAt: '',
      CompletedAt: '',
      TripStartLat: '',
      TripStartLng: '',
      Priority: req ? req.Priority : 'Medium',
      Status: data.technicianId ? 'Assigned' : 'Scheduled', // Scheduled -> Assigned -> En Route -> In Progress -> Completed -> Cancelled
      CreatedAt: now
    };

    Utils.insertRow(SHEETS.WORK_ORDERS, workOrderObj);

    // Initialize Default Checklists for Service
    this.initChecklistForWorkOrder(workOrderId, req ? req.ServiceId : '');

    return workOrderObj;
  },

  /**
   * Admin/Dispatcher manual create work order
   */
  createWorkOrder: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin', 'Dispatcher']);
    const wo = this.createWorkOrderInternal(payload);
    return wo;
  },

  /**
   * Assign or Reassign Technician to Work Order
   */
  assignTechnician: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    UsersModule.requireRole(session, ['SuperAdmin', 'BusinessAdmin', 'Dispatcher']);

    const workOrderId = payload.workOrderId;
    const technicianId = payload.technicianId;
    const scheduledDate = payload.scheduledDate;
    const startTime = payload.startTime;
    const endTime = payload.endTime;

    const tech = Utils.findOne(SHEETS.TECHNICIANS, 'TechnicianId', technicianId);
    if (!tech) throw new Error('Technician not found.');

    const updates = {
      TechnicianId: technicianId,
      TechnicianName: tech.FullName,
      Status: 'Assigned'
    };
    if (scheduledDate) updates.ScheduledDate = scheduledDate;
    if (startTime) updates.StartTime = startTime;
    if (endTime) updates.EndTime = endTime;

    const updated = Utils.updateRow(SHEETS.WORK_ORDERS, 'WorkOrderId', workOrderId, updates);
    const wo = Utils.findOne(SHEETS.WORK_ORDERS, 'WorkOrderId', workOrderId);

    // Update Request status
    if (wo && wo.RequestId) {
      Utils.updateRow(SHEETS.SERVICE_REQUESTS, 'RequestId', wo.RequestId, {
        Status: 'Assigned',
        UpdatedAt: Utils.nowFormatted()
      });
    }

    // Notify Technician
    if (tech.UserId) {
      NotificationsModule.createNotification(tech.UserId, session.tenantId, 'Technician', 'New Job Assigned', `Work Order #${workOrderId} has been assigned to you for ${updates.ScheduledDate || wo.ScheduledDate}.`, `#/technician/jobs/${workOrderId}`);
    }

    NotificationsModule.logAudit(session.userId, session.tenantId, 'TECH_ASSIGNED', 'WorkOrders', workOrderId, `Assigned to ${tech.FullName}`);
    return updated;
  },

  /**
   * Get Work Orders scoped by Role & Technician
   */
  getWorkOrders: function(params) {
    const session = AuthModule.validateSession(params.token);
    const all = Utils.getAllRows(SHEETS.WORK_ORDERS);

    let filtered = all;
    if (session.role === 'Technician') {
      const tech = Utils.findOne(SHEETS.TECHNICIANS, 'UserId', session.userId);
      const techId = tech ? tech.TechnicianId : '';
      filtered = all.filter(wo => wo.TechnicianId === techId);
    } else if (session.role === 'Customer') {
      const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', session.userId);
      const custId = cust ? cust.CustomerId : '';
      filtered = all.filter(wo => wo.CustomerId === custId);
    } else if (session.role !== 'SuperAdmin') {
      filtered = all.filter(wo => wo.TenantId === session.tenantId);
    }

    // Attach request details for rich UI cards
    const requests = Utils.getAllRows(SHEETS.SERVICE_REQUESTS);
    const enriched = filtered.map(wo => {
      const req = requests.find(r => r.RequestId === wo.RequestId) || {};
      const checklists = Utils.findRows(SHEETS.CHECKLISTS, 'WorkOrderId', wo.WorkOrderId);
      const notes = Utils.findOne(SHEETS.WORK_NOTES, 'WorkOrderId', wo.WorkOrderId);
      const photos = Utils.findRows(SHEETS.PHOTOS, 'WorkOrderId', wo.WorkOrderId);
      return {
        ...wo,
        serviceRequest: req,
        checklists: checklists,
        notes: notes,
        photos: photos
      };
    });

    return enriched.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
  },

  /**
   * Update Job Status (Start Trip, Check In, Start Work, Pause, Complete)
   */
  updateJobStatus: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const workOrderId = payload.workOrderId;
    const status = payload.status; // 'En Route', 'Checked In', 'In Progress', 'Completed'
    const lat = payload.latitude || '';
    const lng = payload.longitude || '';

    const wo = Utils.findOne(SHEETS.WORK_ORDERS, 'WorkOrderId', workOrderId);
    if (!wo) throw new Error('Work Order not found.');

    const now = Utils.nowFormatted();
    const updates = { Status: status };

    if (status === 'En Route') {
      updates.TripStartedAt = now;
      if (lat) updates.TripStartLat = lat;
      if (lng) updates.TripStartLng = lng;
    } else if (status === 'Checked In') {
      updates.CheckInAt = now;
    } else if (status === 'Completed') {
      updates.CompletedAt = now;
    }

    Utils.updateRow(SHEETS.WORK_ORDERS, 'WorkOrderId', workOrderId, updates);

    // Sync status with parent Service Request
    let reqStatus = status;
    if (status === 'En Route' || status === 'Checked In') reqStatus = 'In Progress';
    if (wo.RequestId) {
      Utils.updateRow(SHEETS.SERVICE_REQUESTS, 'RequestId', wo.RequestId, {
        Status: reqStatus,
        UpdatedAt: now
      });
    }

    // Update tech location if available
    if (wo.TechnicianId && lat && lng) {
      UsersModule.updateTechnicianLocation(wo.TechnicianId, lat, lng, status === 'Completed' ? 'Available' : 'Busy');
    }

    NotificationsModule.logAudit(session.userId, session.tenantId, 'JOB_STATUS_UPDATED', 'WorkOrders', workOrderId, `Job status updated to ${status}`);
    return { success: true, workOrderId: workOrderId, status: status };
  },

  /**
   * Initialize Dynamic Service Checklists
   */
  initChecklistForWorkOrder: function(workOrderId, serviceId) {
    const defaultChecklists = [
      'Pre-work power & safety isolation check',
      'Physical inspection for existing cracks/damage',
      'Operating pressure & ampere current testing',
      'Filter & coil deep chemical jet cleaning',
      'Drainage slope and pipe condensation check',
      'Electrical connection tightening & grounding check',
      'Post-service cooling & sound verification'
    ];

    defaultChecklists.forEach(item => {
      Utils.insertRow(SHEETS.CHECKLISTS, {
        ChecklistId: Utils.generateId('CHK'),
        WorkOrderId: workOrderId,
        ServiceId: serviceId || 'SRV-GEN',
        ItemTitle: item,
        Status: 'Pending', // Pass / Fail / NA / Pending
        Notes: '',
        UpdatedAt: Utils.nowFormatted()
      });
    });
  },

  /**
   * Save Checklist Results
   */
  saveChecklist: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const items = payload.items; // Array of { checklistId, status, notes }

    if (items && Array.isArray(items)) {
      items.forEach(it => {
        Utils.updateRow(SHEETS.CHECKLISTS, 'ChecklistId', it.checklistId, {
          Status: it.status || 'Pass',
          Notes: it.notes || '',
          UpdatedAt: Utils.nowFormatted()
        });
      });
    }
    return { success: true, message: 'Checklist saved successfully.' };
  },

  /**
   * Save Work Notes
   */
  saveWorkNotes: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const workOrderId = payload.workOrderId;
    const existing = Utils.findOne(SHEETS.WORK_NOTES, 'WorkOrderId', workOrderId);

    const dataObj = {
      WorkOrderId: workOrderId,
      TechnicianId: payload.technicianId || '',
      PreWorkNotes: payload.preWorkNotes || '',
      WorkPerformed: payload.workPerformed || '',
      AdditionalFindings: payload.additionalFindings || '',
      Recommendations: payload.recommendations || '',
      CreatedAt: Utils.nowFormatted()
    };

    if (existing) {
      Utils.updateRow(SHEETS.WORK_NOTES, 'WorkOrderId', workOrderId, dataObj);
    } else {
      dataObj.NoteId = Utils.generateId('NOT');
      Utils.insertRow(SHEETS.WORK_NOTES, dataObj);
    }

    return { success: true, message: 'Work notes saved successfully.' };
  },

  /**
   * Save Customer Signature (HTML5 Canvas Base64) & Generate Service Report + Invoice
   */
  completeWorkOrder: function(payload) {
    const session = AuthModule.validateSession(payload.token);
    const workOrderId = payload.workOrderId;
    const wo = Utils.findOne(SHEETS.WORK_ORDERS, 'WorkOrderId', workOrderId);
    if (!wo) throw new Error('Work Order not found.');

    const now = Utils.nowFormatted();

    // 1. Mark Work Order as Completed
    Utils.updateRow(SHEETS.WORK_ORDERS, 'WorkOrderId', workOrderId, {
      Status: 'Completed',
      CompletedAt: now
    });

    // 2. Mark Service Request Completed
    if (wo.RequestId) {
      Utils.updateRow(SHEETS.SERVICE_REQUESTS, 'RequestId', wo.RequestId, {
        Status: 'Completed',
        UpdatedAt: now
      });
    }

    // 3. Save Digital Customer Signature
    let signatureUrl = '';
    if (payload.signatureBase64) {
      const fileRes = FilesModule.saveBase64Image(payload.signatureBase64, `Signature_${workOrderId}.png`, 'Signatures');
      signatureUrl = fileRes.viewUrl;
    }

    // 4. Generate Service Report Record
    const reportId = Utils.generateId('REP');
    const reportObj = {
      ReportId: reportId,
      WorkOrderId: workOrderId,
      RequestId: wo.RequestId,
      CustomerId: wo.CustomerId,
      TechnicianId: wo.TechnicianId,
      Summary: payload.summary || 'Work successfully executed adhering to quality standards and customer sign-off.',
      CustomerSignatureUrl: signatureUrl,
      CustomerName: payload.customerName || 'Authorized Signatory',
      SignedAt: now,
      ReportFileUrl: '#',
      CreatedAt: now
    };
    Utils.insertRow(SHEETS.SERVICE_REPORTS, reportObj);

    // 5. Generate Invoice
    const invoice = PaymentsModule.createInvoiceInternal(wo.RequestId, workOrderId, wo.CustomerId, wo.TenantId);

    // 6. Free up technician
    if (wo.TechnicianId) {
      Utils.updateRow(SHEETS.TECHNICIANS, 'TechnicianId', wo.TechnicianId, { Status: 'Available' });
    }

    NotificationsModule.logAudit(session.userId, session.tenantId, 'JOB_COMPLETED', 'WorkOrders', workOrderId, `Work Order completed. Report #${reportId}, Invoice #${invoice.InvoiceNumber}`);
    return {
      success: true,
      message: 'Work order completed and certified successfully!',
      report: reportObj,
      invoice: invoice
    };
  },

  /**
   * AMC Contracts List
   */
  getAMCList: function(token) {
    const session = AuthModule.validateSession(token);
    const all = Utils.getAllRows(SHEETS.AMC);
    if (session.role === 'Customer') {
      const cust = Utils.findOne(SHEETS.CUSTOMERS, 'UserId', session.userId);
      const custId = cust ? cust.CustomerId : '';
      return all.filter(a => a.CustomerId === custId);
    }
    return all;
  },

  /**
   * Service History
   */
  getServiceHistory: function(params) {
    const session = AuthModule.validateSession(params.token);
    const customerId = params.customerId;
    const reqs = Utils.getAllRows(SHEETS.SERVICE_REQUESTS).filter(r => r.CustomerId === customerId && r.Status === 'Completed');
    return reqs;
  }
};
