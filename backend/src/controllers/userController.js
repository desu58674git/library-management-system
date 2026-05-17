/**
 * User Management Controller
 * Admin/Librarian operations for managing users
 */
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { sendSuccess, sendCreated, sendError, sendPaginated, buildPagination } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @desc    Get all users with pagination and search
 * @route   GET /api/users
 * @access  Admin, Librarian
 */
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR student_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const usersResult = await query(
      `SELECT id, name, email, role, student_id, phone, address, avatar_url, is_active, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return sendPaginated(
      res,
      usersResult.rows,
      buildPagination(total, page, limit),
      'Users retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Admin, Librarian
 */
const getUserById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, student_id, phone, address, avatar_url, is_active, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    // Get borrow stats for this user
    const statsResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'borrowed') AS active_borrows,
         COUNT(*) FILTER (WHERE status = 'returned') AS total_returned,
         COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count
       FROM borrow_records WHERE user_id = $1`,
      [req.params.id]
    );

    return sendSuccess(res, {
      user: result.rows[0],
      stats: statsResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new user (Admin only)
 * @route   POST /api/users
 * @access  Admin
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', student_id, phone, address } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return sendError(res, 'Email is already registered.', 409);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password, role, student_id, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, student_id, phone, is_active, created_at`,
      [name, email, hashedPassword, role, student_id || null, phone || null, address || null]
    );

    logger.info(`User created by admin: ${email}`);
    return sendCreated(res, { user: result.rows[0] }, 'User created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Admin
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, student_id, phone, address, is_active } = req.body;

    // Check email uniqueness if changing
    if (email) {
      const existing = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.params.id]
      );
      if (existing.rows.length > 0) {
        return sendError(res, 'Email is already in use.', 409);
      }
    }

    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         role = COALESCE($3, role),
         student_id = COALESCE($4, student_id),
         phone = COALESCE($5, phone),
         address = COALESCE($6, address),
         is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING id, name, email, role, student_id, phone, address, is_active, created_at`,
      [name, email, role, student_id, phone, address, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, { user: result.rows[0] }, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return sendError(res, 'You cannot delete your own account.', 400);
    }

    // Check for active borrows
    const activeBorrows = await query(
      "SELECT id FROM borrow_records WHERE user_id = $1 AND status = 'borrowed'",
      [req.params.id]
    );

    if (activeBorrows.rows.length > 0) {
      return sendError(res, 'Cannot delete user with active borrowed books.', 400);
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    logger.info(`User deleted: ${result.rows[0].email}`);
    return sendSuccess(res, { user: result.rows[0] }, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
