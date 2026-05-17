const { body, query, param } = require('express-validator');

const createBookValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title must be max 255 characters'),

  body('author')
    .trim()
    .notEmpty().withMessage('Author is required')
    .isLength({ max: 255 }).withMessage('Author must be max 255 characters'),

  body('isbn')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('ISBN must be max 20 characters'),

  body('category_id')
    .optional()
    .isUUID().withMessage('Category ID must be a valid UUID'),

  body('total_copies')
    .notEmpty().withMessage('Total copies is required')
    .isInt({ min: 1 }).withMessage('Total copies must be at least 1'),

  body('publication_year')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() + 1 })
    .withMessage('Publication year must be a valid year'),

  body('pages')
    .optional()
    .isInt({ min: 1 }).withMessage('Pages must be a positive integer'),

  body('cover_image_url')
    .optional()
    .isURL().withMessage('Cover image must be a valid URL'),
];

const updateBookValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Title must be 1-255 characters'),

  body('author')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Author must be 1-255 characters'),

  body('total_copies')
    .optional()
    .isInt({ min: 0 }).withMessage('Total copies must be 0 or more'),

  body('available_copies')
    .optional()
    .isInt({ min: 0 }).withMessage('Available copies must be 0 or more'),

  body('publication_year')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() + 1 })
    .withMessage('Publication year must be a valid year'),

  body('cover_image_url')
    .optional()
    .isURL().withMessage('Cover image must be a valid URL'),
];

const bookQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

module.exports = { createBookValidator, updateBookValidator, bookQueryValidator };
