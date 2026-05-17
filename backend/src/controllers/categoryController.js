/**
 * Category Controller
 */
const { query } = require('../config/database');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

const getCategories = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, COUNT(b.id) AS book_count
       FROM categories c
       LEFT JOIN books b ON b.category_id = c.id AND b.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
    return sendSuccess(res, { categories: result.rows });
  } catch (err) { next(err); }
};

const getCategoryById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, COUNT(b.id) AS book_count
       FROM categories c
       LEFT JOIN books b ON b.category_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return sendError(res, 'Category not found.', 404);
    return sendSuccess(res, { category: result.rows[0] });
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const existing = await query('SELECT id FROM categories WHERE name ILIKE $1', [name]);
    if (existing.rows.length > 0) return sendError(res, 'Category already exists.', 409);

    const result = await query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    return sendCreated(res, { category: result.rows[0] }, 'Category created successfully');
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (name) {
      const existing = await query(
        'SELECT id FROM categories WHERE name ILIKE $1 AND id != $2',
        [name, req.params.id]
      );
      if (existing.rows.length > 0) return sendError(res, 'Category name already in use.', 409);
    }

    const result = await query(
      `UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name, description, req.params.id]
    );
    if (result.rows.length === 0) return sendError(res, 'Category not found.', 404);
    return sendSuccess(res, { category: result.rows[0] }, 'Category updated successfully');
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const books = await query(
      'SELECT id FROM books WHERE category_id = $1 AND is_active = TRUE LIMIT 1',
      [req.params.id]
    );
    if (books.rows.length > 0) {
      return sendError(res, 'Cannot delete category with active books. Reassign books first.', 400);
    }

    const result = await query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return sendError(res, 'Category not found.', 404);
    return sendSuccess(res, { category: result.rows[0] }, 'Category deleted successfully');
  } catch (err) { next(err); }
};

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
