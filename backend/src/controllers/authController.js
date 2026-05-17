/**
 * Authentication Controller
 * Handles register, login, logout, profile, and password change
 */
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', student_id, phone, address } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return sendError(res, 'Email is already registered.', 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = await query(
      `INSERT INTO users (name, email, password, role, student_id, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, student_id, phone, is_active, created_at`,
      [name, email, hashedPassword, role, student_id || null, phone || null, address || null]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    logger.info(`New user registered: ${email} (${role})`);

    return sendCreated(res, { user, token }, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT id, name, email, password, role, is_active, avatar_url FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated. Contact admin.', 401);
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${email}`);

    return sendSuccess(res, { user: userWithoutPassword, token }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, student_id, phone, address, avatar_url, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, { user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, avatar_url } = req.body;

    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone),
       address = COALESCE($3, address), avatar_url = COALESCE($4, avatar_url)
       WHERE id = $5
       RETURNING id, name, email, role, student_id, phone, address, avatar_url, is_active`,
      [name, phone, address, avatar_url, req.user.id]
    );

    return sendSuccess(res, { user: result.rows[0] }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect.', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    logger.info(`Password changed for user: ${req.user.email}`);

    return sendSuccess(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
