const { ADMIN_EMAIL } = require('../utils/bootstrapAdmin');

// Admin authorization middleware
module.exports = function(req, res, next) {
  // Check if user is the reserved admin account
  if (req.user && req.user.role === 'admin' && req.user.email === ADMIN_EMAIL) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};
