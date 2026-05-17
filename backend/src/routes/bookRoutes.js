/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Book management endpoints
 */
const express = require('express');
const router = express.Router();
const { getBooks, getBookById, createBook, updateBook, deleteBook } = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');
const { createBookValidator, updateBookValidator, bookQueryValidator } = require('../validators/bookValidators');
const validate = require('../middleware/validate');

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all books with search and pagination
 *     tags: [Books]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title, author, or ISBN
 *       - in: query
 *         name: category
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: available
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of books
 */
router.get('/', bookQueryValidator, validate, getBooks);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get book by ID
 *     tags: [Books]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Book details
 *       404:
 *         description: Book not found
 */
router.get('/:id', getBookById);

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author, total_copies]
 *             properties:
 *               title: { type: string, example: "Clean Code" }
 *               author: { type: string, example: "Robert C. Martin" }
 *               isbn: { type: string, example: "978-0132350884" }
 *               category_id: { type: string, format: uuid }
 *               total_copies: { type: integer, example: 5 }
 *               description: { type: string }
 *               publisher: { type: string }
 *               publication_year: { type: integer, example: 2008 }
 *               cover_image_url: { type: string }
 *               language: { type: string, example: "English" }
 *               pages: { type: integer, example: 431 }
 *     responses:
 *       201:
 *         description: Book created
 *       409:
 *         description: ISBN already exists
 */
router.post('/', protect, authorize('admin', 'librarian'), createBookValidator, validate, createBook);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Update a book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Book updated
 */
router.put('/:id', protect, authorize('admin', 'librarian'), updateBookValidator, validate, updateBook);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Delete a book (soft delete)
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Book deleted
 *       400:
 *         description: Cannot delete book with active borrows
 */
router.delete('/:id', protect, authorize('admin'), deleteBook);

module.exports = router;
