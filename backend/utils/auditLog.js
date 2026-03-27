const AdminLog = require('../models/AdminLog');

const logAdminAction = async (req, action, options = {}) => {
  try {
    const {
      resource,
      resourceId,
      details,
      status = 'success',
      errorMessage
    } = options;

    const logEntry = {
      adminId: req.user?._id || req.user?.id,
      adminEmail: req.user?.email,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      status,
      errorMessage
    };

    await AdminLog.create(logEntry);
  } catch (err) {
    // Silently fail logging to not break the main operation
    console.error('[AUDIT LOG ERROR]', err.message);
  }
};

const getAdminLogs = async (filters = {}, limit = 100, skip = 0) => {
  try {
    const query = AdminLog.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const logs = await query.exec();
    const total = await AdminLog.countDocuments(filters);

    return { logs, total };
  } catch (err) {
    console.error('[AUDIT LOG FETCH ERROR]', err.message);
    return { logs: [], total: 0 };
  }
};

const getCounts = async (adminEmail, action) => {
  try {
    const filter = {
      adminEmail: adminEmail.toLowerCase()
    };
    if (action) {
      filter.action = action;
    }

    return await AdminLog.countDocuments(filter);
  } catch (err) {
    console.error('[AUDIT COUNT ERROR]', err.message);
    return 0;
  }
};

module.exports = {
  logAdminAction,
  getAdminLogs,
  getCounts
};
