/**
 * Authentication & Authorization Middleware
 */
const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const { query } = require('../config/database');

/**
 * Protect routes — verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check user still exists and is active
    const result = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User no longer exists.', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated.', 401);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token.', 401);
    }
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired. Please log in again.', 401);
    }
    return sendError(res, 'Authentication failed.', 500);
  }
};

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        403
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
