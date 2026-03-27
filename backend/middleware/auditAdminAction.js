const { logAdminAction } = require('../utils/auditLog');

// Middleware to log admin route access
module.exports = function auditAdminAction(action) {
  return async (req, res, next) => {
    // Log the action immediately upon route access
    await logAdminAction(req, action, {
      details: {
        method: req.method,
        path: req.originalUrl
      }
    });

    next();
  };
};
