import nodemailer from 'nodemailer';

// Email configuration - in production, use environment variables
const emailConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025'), // MailHog default port
  secure: false, // true for 465, false for other ports
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Test connection
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection failed:', error);
    return false;
  }
};

// Email templates
const templates = {
  tenderAlert: (data: {
    userEmail: string;
    userName: string;
    ruleName: string;
    tenderTitle: string;
    tenderId: number;
    authority: string;
    estimatedValue: string;
    closingDate: string;
    matchCount: number;
  }) => ({
    from: process.env.FROM_EMAIL || 'noreply@procureintel.com',
    to: data.userEmail,
    subject: `New Tender Match: ${data.tenderTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Tender Alert</h2>
        <p>Hi ${data.userName},</p>

        <p>Your alert rule "<strong>${data.ruleName}</strong>" has found a new matching tender:</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">${data.tenderTitle}</h3>
          <p><strong>Authority:</strong> ${data.authority}</p>
          <p><strong>Estimated Value:</strong> ₹${data.estimatedValue}</p>
          <p><strong>Closing Date:</strong> ${new Date(data.closingDate).toLocaleDateString()}</p>
          <p><strong>Total Matches:</strong> ${data.matchCount} tenders found</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/tenders/${data.tenderId}"
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Tender Details
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          You're receiving this because you have active alert rules in ProcureIntel.
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/settings/alerts">Manage Alerts</a>
        </p>
      </div>
    `,
  }),

  bidStatusUpdate: (data: {
    userEmail: string;
    userName: string;
    bidTitle: string;
    bidId: number;
    oldStatus: string;
    newStatus: string;
    tenderTitle: string;
    updatedBy: string;
  }) => ({
    from: process.env.FROM_EMAIL || 'noreply@procureintel.com',
    to: data.userEmail,
    subject: `Bid Status Updated: ${data.bidTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Bid Status Update</h2>
        <p>Hi ${data.userName},</p>

        <p>The status of your bid has been updated:</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">${data.bidTitle}</h3>
          <p><strong>Tender:</strong> ${data.tenderTitle}</p>
          <p><strong>Status Change:</strong> ${data.oldStatus} → <strong>${data.newStatus}</strong></p>
          <p><strong>Updated By:</strong> ${data.updatedBy}</p>
          <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/bids/${data.bidId}"
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Bid Details
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          This is an automated notification from ProcureIntel.
        </p>
      </div>
    `,
  }),

  taskAssigned: (data: {
    userEmail: string;
    userName: string;
    taskTitle: string;
    bidTitle: string;
    bidId: number;
    assignedBy: string;
    dueDate?: string;
  }) => ({
    from: process.env.FROM_EMAIL || 'noreply@procureintel.com',
    to: data.userEmail,
    subject: `New Task Assigned: ${data.taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Task Assigned</h2>
        <p>Hi ${data.userName},</p>

        <p>You have been assigned a new task:</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">${data.taskTitle}</h3>
          <p><strong>Bid:</strong> ${data.bidTitle}</p>
          <p><strong>Assigned By:</strong> ${data.assignedBy}</p>
          ${data.dueDate ? `<p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/bids/${data.bidId}"
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Bid & Tasks
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          This is an automated notification from ProcureIntel.
        </p>
      </div>
    `,
  }),

  documentExpiry: (data: {
    userEmail: string;
    userName: string;
    documentName: string;
    documentId: number;
    expiryDate: string;
    daysUntilExpiry: number;
  }) => ({
    from: process.env.FROM_EMAIL || 'noreply@procureintel.com',
    to: data.userEmail,
    subject: `Document Expiring Soon: ${data.documentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Document Expiry Alert</h2>
        <p>Hi ${data.userName},</p>

        <p><strong>Warning:</strong> A document is expiring soon:</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #dc2626;">${data.documentName}</h3>
          <p><strong>Expiry Date:</strong> ${new Date(data.expiryDate).toLocaleDateString()}</p>
          <p><strong>Days Until Expiry:</strong> ${data.daysUntilExpiry} days</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/documents/${data.documentId}"
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Document
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          Please renew or update this document before it expires.
        </p>
      </div>
    `,
  }),
};

// Send email function
export const sendEmail = async (
  template: keyof typeof templates,
  data: any
): Promise<boolean> => {
  try {
    const emailOptions = templates[template](data);
    const info = await transporter.sendMail(emailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send ${template} email:`, error);
    return false;
  }
};

// Notification service functions
export const sendTenderAlert = async (data: Parameters<typeof templates.tenderAlert>[0]) =>
  sendEmail('tenderAlert', data);

export const sendBidStatusUpdate = async (data: Parameters<typeof templates.bidStatusUpdate>[0]) =>
  sendEmail('bidStatusUpdate', data);

export const sendTaskAssigned = async (data: Parameters<typeof templates.taskAssigned>[0]) =>
  sendEmail('taskAssigned', data);

export const sendDocumentExpiryAlert = async (data: Parameters<typeof templates.documentExpiry>[0]) =>
  sendEmail('documentExpiry', data);

// Batch notification sender
export const sendBatchNotifications = async (
  notifications: Array<{ template: keyof typeof templates; data: any }>
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const notification of notifications) {
    const result = await sendEmail(notification.template, notification.data);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
};
