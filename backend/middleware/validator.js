const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const registerValidationRules = () => [
  body('name', 'Name is required').not().isEmpty().trim().escape(),
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
];

const loginValidationRules = () => [
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('password', 'Password is required').exists(),
];

const forgotPasswordValidationRules = () => [
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('newPassword', 'New password must be 6 or more characters').isLength({ min: 6 }),
];

module.exports = {
  registerValidationRules,
  loginValidationRules,
  forgotPasswordValidationRules,
  handleValidationErrors,
};