const { body, validationResult } = require('express-validator');

const validateEventCreation = [
  body('title')
    .notEmpty().withMessage('Event title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .notEmpty().withMessage('Event description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category')
    .notEmpty().withMessage('Category is required'),
  body('startDate')
    .isISO8601().toDate().withMessage('Valid start date is required')
    .custom((value, { req }) => {
      if (new Date(value) < new Date()) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),
  body('endDate')
    .isISO8601().toDate().withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date cannot be before start date');
      }
      return true;
    }),
  body('venue.name')
    .optional()
    .notEmpty().withMessage('Venue name cannot be empty if provided'),
  body('ticketTypes')
    .isArray({ min: 1 }).withMessage('At least one ticket type is required'),
  body('ticketTypes.*.name')
    .notEmpty().withMessage('Ticket type name is required'),
  body('ticketTypes.*.price')
    .isFloat({ min: 0 }).withMessage('Ticket price must be a non-negative number'),
  body('ticketTypes.*.quantity')
    .isInt({ min: 1 }).withMessage('Ticket quantity must be at least 1'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateEventCreation
};