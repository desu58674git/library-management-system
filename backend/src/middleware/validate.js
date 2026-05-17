/**
 * Express Validator - Validation Result Middleware
 * Checks for validation errors and returns them in a standard format
 */
const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return sendError(res, 'Validation failed', 422, formattedErrors);
  }
  next();
};

module.exports = validate;
