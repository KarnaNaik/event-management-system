const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  action: {
    type: String,
    enum: [
      'login',
      'logout',
      'view_users',
      'view_logs',
      'delete_user',
      'view_tickets',
      'view_payments',
      'approve_payment',
      'reject_payment',
      'verify_payment',
      'view_stats',
      'view_pending_verifications'
    ],
    required: true
  },
  resource: {
    type: String,
    description: 'Type of resource affected (e.g., user, payment, ticket)'
  },
  resourceId: {
    type: String,
    description: 'ID of the affected resource'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Additional context about the action'
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient querying
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ action: 1, createdAt: -1 });
AdminLogSchema.index({ adminEmail: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', AdminLogSchema);
