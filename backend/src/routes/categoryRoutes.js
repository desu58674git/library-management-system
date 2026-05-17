/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Book category management
 */
const express = require('express');
const router = express.Router();
const {
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const categoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required')
    .isLength({ max: 100 }).withMessage('Name must be max 100 characters'),
  body('description').optional().trim(),
];

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories with book counts
 *     tags: [Categories]
 *     security: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', getCategories);
router.get('/:id', getCategoryById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Science Fiction" }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', protect, authorize('admin', 'librarian'), categoryValidator, validate, createCategory);
router.put('/:id', protect, authorize('admin', 'librarian'), categoryValidator, validate, updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
