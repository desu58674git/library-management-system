/**
 * Borrow Controller
 * Handles borrowing, returning, history, overdue tracking, and fines
 */
const { query, getClient } = require('../config/database');
const { sendSuccess, sendCreated, sendError, sendPaginated, buildPagination } = require('../utils/response');
const logger = require('../utils/logger');

const FINE_PER_DAY = parseFloat(process.env.FINE_PER_DAY) || 0.50;
const DEFAULT_BORROW_DAYS = 14; // 2 weeks

/**
 * @desc    Borrow a book
 * @route   POST /api/borrow
 * @access  Private (all roles)
 */
const borrowBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { book_id, notes } = req.body;
    // Admins/librarians can borrow on behalf of a user
    const user_id = req.body.user_id && ['admin', 'librarian'].includes(req.user.role)
      ? req.body.user_id
      : req.user.id;

    // Calculate due date (default 14 days)
    const due_date = req.body.due_date
      ? new Date(req.body.due_date)
      : new Date(Date.now() + DEFAULT_BORROW_DAYS * 24 * 60 * 60 * 1000);

    // Lock the book row for update
    const bookResult = await client.query(
      'SELECT id, title, available_copies FROM books WHERE id = $1 AND is_active = TRUE FOR UPDATE',
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Book not found.', 404);
    }

    const book = bookResult.rows[0];

    if (book.available_copies <= 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'No copies available for borrowing.', 400);
    }

    // Check if user already has this book borrowed
    const alreadyBorrowed = await client.query(
      "SELECT id FROM borrow_records WHERE user_id = $1 AND book_id = $2 AND status = 'borrowed'",
      [user_id, book_id]
    );

    if (alreadyBorrowed.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'User already has this book borrowed.', 400);
    }

    // Create borrow record
    const borrowResult = await client.query(
      `INSERT INTO borrow_records (user_id, book_id, due_date, notes, issued_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, book_id, due_date, notes || null, req.user.id]
    );

    // Decrement available copies
    await client.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
      [book_id]
    );

    await client.query('COMMIT');

    logger.info(`Book borrowed: ${book.title} by user ${user_id}`);

    return sendCreated(res, { borrow: borrowResult.rows[0] }, 'Book borrowed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc    Return a book
 * @route   PUT /api/borrow/:id/return
 * @access  Private (Admin, Librarian)
 */
const returnBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { notes } = req.body;
    const borrowId = req.params.id;

    // Get borrow record
    const borrowResult = await client.query(
      "SELECT * FROM borrow_records WHERE id = $1 AND status = 'borrowed' FOR UPDATE",
      [borrowId]
    );

    if (borrowResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Borrow record not found or already returned.', 404);
    }

    const borrow = borrowResult.rows[0];
    const returnedAt = new Date();
    const dueDate = new Date(borrow.due_date);

    // Calculate fine if overdue
    let fineAmount = 0;
    let daysOverdue = 0;

    if (returnedAt > dueDate) {
      daysOverdue = Math.ceil((returnedAt - dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * FINE_PER_DAY;
    }

    // Update borrow record
    const updatedBorrow = await client.query(
      `UPDATE borrow_records
       SET status = 'returned', returned_at = $1, notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
      [returnedAt, notes, borrowId]
    );

    // Increment available copies
    await client.query(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
      [borrow.book_id]
    );

    // Create fine record if overdue
    let fine = null;
    if (fineAmount > 0) {
      const fineResult = await client.query(
        `INSERT INTO fines (borrow_record_id, user_id, amount, days_overdue)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [borrowId, borrow.user_id, fineAmount, daysOverdue]
      );
      fine = fineResult.rows[0];
    }

    await client.query('COMMIT');

    logger.info(`Book returned: borrow record ${borrowId}, fine: $${fineAmount}`);

    return sendSuccess(res, {
      borrow: updatedBorrow.rows[0],
      fine,
      days_overdue: daysOverdue,
      fine_amount: fineAmount,
    }, 'Book returned successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc    Get all borrow records with pagination
 * @route   GET /api/borrow
 * @access  Admin, Librarian
 */
const getBorrowRecords = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (status) {
      whereClause += ` AND br.status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (search) {
      whereClause += ` AND (u.name ILIKE $${idx} OR b.title ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM borrow_records br
       JOIN users u ON u.id = br.user_id
       JOIN books b ON b.id = br.book_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const recordsResult = await query(
      `SELECT br.*,
         u.name AS user_name, u.email AS user_email, u.student_id,
         b.title AS book_title, b.author AS book_author, b.isbn
       FROM borrow_records br
       JOIN users u ON u.id = br.user_id
       JOIN books b ON b.id = br.book_id
       ${whereClause}
       ORDER BY br.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return sendPaginated(
      res,
      recordsResult.rows,
      buildPagination(total, page, limit),
      'Borrow records retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current user's borrow history
 * @route   GET /api/borrow/my-history
 * @access  Private
 */
const getMyBorrowHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await query(
      'SELECT COUNT(*) FROM borrow_records WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT br.*,
         b.title AS book_title, b.author AS book_author, b.isbn, b.cover_image_url
       FROM borrow_records br
       JOIN books b ON b.id = br.book_id
       WHERE br.user_id = $1
       ORDER BY br.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    return sendPaginated(
      res,
      result.rows,
      buildPagination(total, page, limit),
      'Borrow history retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get overdue records and update their status
 * @route   GET /api/borrow/overdue
 * @access  Admin, Librarian
 */
const getOverdueRecords = async (req, res, next) => {
  try {
    // Update overdue status
    await query(
      `UPDATE borrow_records
       SET status = 'overdue'
       WHERE status = 'borrowed' AND due_date < NOW()`
    );

    const result = await query(
      `SELECT br.*,
         u.name AS user_name, u.email AS user_email, u.student_id, u.phone,
         b.title AS book_title, b.author AS book_author,
         EXTRACT(DAY FROM NOW() - br.due_date)::INTEGER AS days_overdue,
         (EXTRACT(DAY FROM NOW() - br.due_date)::INTEGER * $1::NUMERIC) AS estimated_fine
       FROM borrow_records br
       JOIN users u ON u.id = br.user_id
       JOIN books b ON b.id = br.book_id
       WHERE br.status IN ('borrowed', 'overdue') AND br.due_date < NOW()
       ORDER BY br.due_date ASC`,
      [FINE_PER_DAY]
    );

    return sendSuccess(res, {
      overdue_records: result.rows,
      total: result.rows.length,
      fine_per_day: FINE_PER_DAY,
    }, 'Overdue records retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Pay a fine
 * @route   PUT /api/borrow/fines/:id/pay
 * @access  Admin, Librarian
 */
const payFine = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE fines SET is_paid = TRUE, paid_at = NOW()
       WHERE id = $1 AND is_paid = FALSE
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Fine not found or already paid.', 404);
    }

    return sendSuccess(res, { fine: result.rows[0] }, 'Fine marked as paid');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user fines
 * @route   GET /api/borrow/fines
 * @access  Private
 */
const getFines = async (req, res, next) => {
  try {
    const isAdminOrLibrarian = ['admin', 'librarian'].includes(req.user.role);
    const userId = req.query.user_id && isAdminOrLibrarian ? req.query.user_id : req.user.id;

    const result = await query(
      `SELECT f.*,
         u.name AS user_name, u.email AS user_email,
         b.title AS book_title,
         br.borrowed_at, br.due_date, br.returned_at
       FROM fines f
       JOIN users u ON u.id = f.user_id
       JOIN borrow_records br ON br.id = f.borrow_record_id
       JOIN books b ON b.id = br.book_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    const totalUnpaid = result.rows
      .filter((f) => !f.is_paid)
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    return sendSuccess(res, {
      fines: result.rows,
      total_unpaid: totalUnpaid.toFixed(2),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  borrowBook, returnBook, getBorrowRecords, getMyBorrowHistory,
  getOverdueRecords, payFine, getFines,
};
