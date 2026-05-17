const { body } = require('express-validator');

const borrowBookValidator = [
  body('book_id')
    .notEmpty().withMessage('Book ID is required')
    .isUUID().withMessage('Book ID must be a valid UUID'),

  body('user_id')
    .optional()
    .isUUID().withMessage('User ID must be a valid UUID'),

  body('due_date')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be max 500 characters'),
];

const returnBookValidator = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be max 500 characters'),
];

module.exports = { borrowBookValidator, returnBookValidator };
