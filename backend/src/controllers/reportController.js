/**
 * Reports & Analytics Controller
 */
const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc    Dashboard statistics
 * @route   GET /api/reports/dashboard
 * @access  Admin, Librarian
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [books, users, borrows, overdue, fines, recentBorrows] = await Promise.all([
      // Book stats
      query(`SELECT
               COUNT(*) AS total_books,
               SUM(total_copies) AS total_copies,
               SUM(available_copies) AS available_copies,
               SUM(total_copies - available_copies) AS borrowed_copies
             FROM books WHERE is_active = TRUE`),
      // User stats
      query(`SELECT
               COUNT(*) AS total_users,
               COUNT(*) FILTER (WHERE role = 'student') AS students,
               COUNT(*) FILTER (WHERE role = 'librarian') AS librarians,
               COUNT(*) FILTER (WHERE role = 'admin') AS admins
             FROM users WHERE is_active = TRUE`),
      // Borrow stats
      query(`SELECT
               COUNT(*) AS total_borrows,
               COUNT(*) FILTER (WHERE status = 'borrowed') AS active_borrows,
               COUNT(*) FILTER (WHERE status = 'returned') AS returned,
               COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count
             FROM borrow_records`),
      // Overdue count
      query(`SELECT COUNT(*) AS overdue
             FROM borrow_records
             WHERE status IN ('borrowed','overdue') AND due_date < NOW()`),
      // Unpaid fines total
      query(`SELECT COALESCE(SUM(amount), 0) AS total_unpaid_fines
             FROM fines WHERE is_paid = FALSE`),
      // Recent 5 borrows
      query(`SELECT br.id, br.status, br.borrowed_at, br.due_date,
               u.name AS user_name, b.title AS book_title
             FROM borrow_records br
             JOIN users u ON u.id = br.user_id
             JOIN books b ON b.id = br.book_id
             ORDER BY br.created_at DESC LIMIT 5`),
    ]);

    return sendSuccess(res, {
      books: books.rows[0],
      users: users.rows[0],
      borrows: borrows.rows[0],
      overdue_count: parseInt(overdue.rows[0].overdue),
      total_unpaid_fines: parseFloat(fines.rows[0].total_unpaid_fines).toFixed(2),
      recent_borrows: recentBorrows.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Most borrowed books
 * @route   GET /api/reports/most-borrowed
 * @access  Admin, Librarian
 */
const getMostBorrowedBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await query(
      `SELECT b.id, b.title, b.author, b.cover_image_url,
         c.name AS category_name,
         COUNT(br.id) AS borrow_count
       FROM books b
       LEFT JOIN borrow_records br ON br.book_id = b.id
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.is_active = TRUE
       GROUP BY b.id, c.name
       ORDER BY borrow_count DESC
       LIMIT $1`,
      [limit]
    );
    return sendSuccess(res, { books: result.rows });
  } catch (err) { next(err); }
};

/**
 * @desc    Most active users
 * @route   GET /api/reports/active-users
 * @access  Admin, Librarian
 */
const getActiveUsers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.student_id,
         COUNT(br.id) AS total_borrows,
         COUNT(br.id) FILTER (WHERE br.status = 'borrowed') AS active_borrows
       FROM users u
       LEFT JOIN borrow_records br ON br.user_id = u.id
       WHERE u.is_active = TRUE
       GROUP BY u.id
       ORDER BY total_borrows DESC
       LIMIT $1`,
      [limit]
    );
    return sendSuccess(res, { users: result.rows });
  } catch (err) { next(err); }
};

/**
 * @desc    Borrow trends by month (last 12 months)
 * @route   GET /api/reports/borrow-trends
 * @access  Admin, Librarian
 */
const getBorrowTrends = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', borrowed_at), 'YYYY-MM') AS month,
         COUNT(*) AS total_borrows,
         COUNT(*) FILTER (WHERE status = 'returned') AS returned,
         COUNT(*) FILTER (WHERE status IN ('borrowed','overdue')) AS active
       FROM borrow_records
       WHERE borrowed_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', borrowed_at)
       ORDER BY month ASC`
    );
    return sendSuccess(res, { trends: result.rows });
  } catch (err) { next(err); }
};

/**
 * @desc    Books by category distribution
 * @route   GET /api/reports/category-distribution
 * @access  Admin, Librarian
 */
const getCategoryDistribution = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.name AS category,
         COUNT(b.id) AS book_count,
         SUM(b.total_copies) AS total_copies
       FROM categories c
       LEFT JOIN books b ON b.category_id = c.id AND b.is_active = TRUE
       GROUP BY c.id, c.name
       ORDER BY book_count DESC`
    );
    return sendSuccess(res, { distribution: result.rows });
  } catch (err) { next(err); }
};

/**
 * @desc    Overdue report
 * @route   GET /api/reports/overdue
 * @access  Admin, Librarian
 */
const getOverdueReport = async (req, res, next) => {
  try {
    const FINE_PER_DAY = parseFloat(process.env.FINE_PER_DAY) || 0.50;

    const result = await query(
      `SELECT
         u.name AS user_name, u.email, u.student_id, u.phone,
         b.title AS book_title, b.author,
         br.borrowed_at, br.due_date,
         EXTRACT(DAY FROM NOW() - br.due_date)::INTEGER AS days_overdue,
         (EXTRACT(DAY FROM NOW() - br.due_date)::INTEGER * $1::NUMERIC) AS estimated_fine
       FROM borrow_records br
       JOIN users u ON u.id = br.user_id
       JOIN books b ON b.id = br.book_id
       WHERE br.status IN ('borrowed','overdue') AND br.due_date < NOW()
       ORDER BY br.due_date ASC`,
      [FINE_PER_DAY]
    );

    const totalFines = result.rows.reduce(
      (sum, r) => sum + parseFloat(r.estimated_fine || 0), 0
    );

    return sendSuccess(res, {
      overdue_records: result.rows,
      total_overdue: result.rows.length,
      total_estimated_fines: totalFines.toFixed(2),
    });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboardStats, getMostBorrowedBooks, getActiveUsers,
  getBorrowTrends, getCategoryDistribution, getOverdueReport,
};
