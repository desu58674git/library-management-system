/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytics and reporting endpoints
 */
const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getMostBorrowedBooks, getActiveUsers,
  getBorrowTrends, getCategoryDistribution, getOverdueReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'librarian'));

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Dashboard stats including books, users, borrows, overdue, fines
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /api/reports/most-borrowed:
 *   get:
 *     summary: Get most borrowed books
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Top borrowed books
 */
router.get('/most-borrowed', getMostBorrowedBooks);

/**
 * @swagger
 * /api/reports/active-users:
 *   get:
 *     summary: Get most active users
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Users ranked by borrow count
 */
router.get('/active-users', getActiveUsers);

/**
 * @swagger
 * /api/reports/borrow-trends:
 *   get:
 *     summary: Get monthly borrow trends (last 12 months)
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Monthly borrow statistics
 */
router.get('/borrow-trends', getBorrowTrends);

/**
 * @swagger
 * /api/reports/category-distribution:
 *   get:
 *     summary: Get book distribution by category
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Category distribution data
 */
router.get('/category-distribution', getCategoryDistribution);

/**
 * @swagger
 * /api/reports/overdue:
 *   get:
 *     summary: Get overdue report with fine estimates
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Overdue report
 */
router.get('/overdue', getOverdueReport);

module.exports = router;
