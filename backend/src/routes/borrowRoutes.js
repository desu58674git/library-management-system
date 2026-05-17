/**
 * @swagger
 * tags:
 *   name: Borrowing
 *   description: Book borrowing and return operations
 */
const express = require('express');
const router = express.Router();
const {
  borrowBook, returnBook, getBorrowRecords, getMyBorrowHistory,
  getOverdueRecords, payFine, getFines,
} = require('../controllers/borrowController');
const { protect, authorize } = require('../middleware/auth');
const { borrowBookValidator, returnBookValidator } = require('../validators/borrowValidators');
const validate = require('../middleware/validate');

router.use(protect);

/**
 * @swagger
 * /api/borrow:
 *   get:
 *     summary: Get all borrow records (Admin/Librarian)
 *     tags: [Borrowing]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [borrowed, returned, overdue] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated borrow records
 */
router.get('/', authorize('admin', 'librarian'), getBorrowRecords);

/**
 * @swagger
 * /api/borrow/my-history:
 *   get:
 *     summary: Get current user's borrow history
 *     tags: [Borrowing]
 *     responses:
 *       200:
 *         description: User's borrow history
 */
router.get('/my-history', getMyBorrowHistory);

/**
 * @swagger
 * /api/borrow/overdue:
 *   get:
 *     summary: Get all overdue records
 *     tags: [Borrowing]
 *     responses:
 *       200:
 *         description: Overdue borrow records with fine estimates
 */
router.get('/overdue', authorize('admin', 'librarian'), getOverdueRecords);

/**
 * @swagger
 * /api/borrow/fines:
 *   get:
 *     summary: Get fines (own fines for students, all for admin/librarian)
 *     tags: [Borrowing]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by user (admin/librarian only)
 *     responses:
 *       200:
 *         description: Fine records
 */
router.get('/fines', getFines);

/**
 * @swagger
 * /api/borrow:
 *   post:
 *     summary: Borrow a book
 *     tags: [Borrowing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [book_id]
 *             properties:
 *               book_id:
 *                 type: string
 *                 format: uuid
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: Target user (admin/librarian only)
 *               due_date:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Book borrowed successfully
 *       400:
 *         description: No copies available or already borrowed
 */
router.post('/', borrowBookValidator, validate, borrowBook);

/**
 * @swagger
 * /api/borrow/{id}/return:
 *   put:
 *     summary: Return a borrowed book
 *     tags: [Borrowing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Borrow record ID
 *     responses:
 *       200:
 *         description: Book returned, fine calculated if overdue
 */
router.put('/:id/return', authorize('admin', 'librarian'), returnBookValidator, validate, returnBook);

/**
 * @swagger
 * /api/borrow/fines/{id}/pay:
 *   put:
 *     summary: Mark a fine as paid
 *     tags: [Borrowing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fine marked as paid
 */
router.put('/fines/:id/pay', authorize('admin', 'librarian'), payFine);

module.exports = router;
