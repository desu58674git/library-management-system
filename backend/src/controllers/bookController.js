/**
 * Book Controller
 * Full CRUD + search + pagination
 */
const { query } = require('../config/database');
const { sendSuccess, sendCreated, sendError, sendPaginated, buildPagination } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @desc    Get all books with search, filter, pagination
 * @route   GET /api/books
 * @access  Public
 */
const getBooks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const available = req.query.available;

    let whereClause = 'WHERE b.is_active = TRUE';
    const params = [];
    let idx = 1;

    if (search) {
      whereClause += ` AND (b.title ILIKE $${idx} OR b.author ILIKE $${idx} OR b.isbn ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (category) {
      whereClause += ` AND b.category_id = $${idx}`;
      params.push(category);
      idx++;
    }

    if (available === 'true') {
      whereClause += ` AND b.available_copies > 0`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM books b ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const booksResult = await query(
      `SELECT b.*, c.name AS category_name
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return sendPaginated(
      res,
      booksResult.rows,
      buildPagination(total, page, limit),
      'Books retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single book by ID
 * @route   GET /api/books/:id
 * @access  Public
 */
const getBookById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*, c.name AS category_name
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.id = $1 AND b.is_active = TRUE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Book not found.', 404);
    }

    // Get borrow count for this book
    const borrowCount = await query(
      'SELECT COUNT(*) FROM borrow_records WHERE book_id = $1',
      [req.params.id]
    );

    return sendSuccess(res, {
      book: result.rows[0],
      total_borrows: parseInt(borrowCount.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new book
 * @route   POST /api/books
 * @access  Admin, Librarian
 */
const createBook = async (req, res, next) => {
  try {
    const {
      title, author, isbn, category_id, description, publisher,
      publication_year, total_copies, cover_image_url, location, language, pages,
    } = req.body;

    if (isbn) {
      const existing = await query('SELECT id FROM books WHERE isbn = $1', [isbn]);
      if (existing.rows.length > 0) {
        return sendError(res, 'A book with this ISBN already exists.', 409);
      }
    }

    const result = await query(
      `INSERT INTO books
         (title, author, isbn, category_id, description, publisher, publication_year,
          total_copies, available_copies, cover_image_url, location, language, pages)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        title, author, isbn || null, category_id || null, description || null,
        publisher || null, publication_year || null, total_copies,
        cover_image_url || null, location || null, language || 'English', pages || null,
      ]
    );

    logger.info(`Book created: ${title} by ${author}`);
    return sendCreated(res, { book: result.rows[0] }, 'Book created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a book
 * @route   PUT /api/books/:id
 * @access  Admin, Librarian
 */
const updateBook = async (req, res, next) => {
  try {
    const {
      title, author, isbn, category_id, description, publisher,
      publication_year, total_copies, available_copies, cover_image_url,
      location, language, pages, is_active,
    } = req.body;

    if (isbn) {
      const existing = await query(
        'SELECT id FROM books WHERE isbn = $1 AND id != $2',
        [isbn, req.params.id]
      );
      if (existing.rows.length > 0) {
        return sendError(res, 'ISBN already in use by another book.', 409);
      }
    }

    const result = await query(
      `UPDATE books SET
         title = COALESCE($1, title),
         author = COALESCE($2, author),
         isbn = COALESCE($3, isbn),
         category_id = COALESCE($4, category_id),
         description = COALESCE($5, description),
         publisher = COALESCE($6, publisher),
         publication_year = COALESCE($7, publication_year),
         total_copies = COALESCE($8, total_copies),
         available_copies = COALESCE($9, available_copies),
         cover_image_url = COALESCE($10, cover_image_url),
         location = COALESCE($11, location),
         language = COALESCE($12, language),
         pages = COALESCE($13, pages),
         is_active = COALESCE($14, is_active)
       WHERE id = $15
       RETURNING *`,
      [
        title, author, isbn, category_id, description, publisher,
        publication_year, total_copies, available_copies, cover_image_url,
        location, language, pages, is_active, req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Book not found.', 404);
    }

    return sendSuccess(res, { book: result.rows[0] }, 'Book updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a book (soft delete)
 * @route   DELETE /api/books/:id
 * @access  Admin
 */
const deleteBook = async (req, res, next) => {
  try {
    // Check for active borrows
    const activeBorrows = await query(
      "SELECT id FROM borrow_records WHERE book_id = $1 AND status = 'borrowed'",
      [req.params.id]
    );

    if (activeBorrows.rows.length > 0) {
      return sendError(res, 'Cannot delete book with active borrow records.', 400);
    }

    const result = await query(
      "UPDATE books SET is_active = FALSE WHERE id = $1 RETURNING id, title, author",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Book not found.', 404);
    }

    logger.info(`Book deleted (soft): ${result.rows[0].title}`);
    return sendSuccess(res, { book: result.rows[0] }, 'Book deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getBooks, getBookById, createBook, updateBook, deleteBook };
