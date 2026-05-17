import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, BookOpenIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import bookService from '../services/bookService';
import categoryService from '../services/categoryService';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import BookForm from '../components/books/BookForm';

const Books = () => {
  const { isAdminOrLibrarian, isAdmin } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookService.getAll({ page, limit: 10, search, category: categoryFilter });
      setBooks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  useEffect(() => {
    categoryService.getAll().then((res) => setCategories(res.data.data.categories)).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSave = async (formData) => {
    try {
      if (editBook) {
        await bookService.update(editBook.id, formData);
        toast.success('Book updated successfully');
      } else {
        await bookService.create(formData);
        toast.success('Book created successfully');
      }
      setModalOpen(false);
      setEditBook(null);
      fetchBooks();
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed';
      toast.error(msg);
      throw err; // Let form handle validation errors
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await bookService.delete(deleteId);
      toast.success('Book deleted successfully');
      setDeleteId(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Books</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage the library book collection</p>
        </div>
        {isAdminOrLibrarian && (
          <button onClick={() => { setEditBook(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Book
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title, author, ISBN..." className="flex-1" />
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="input-field sm:w-48"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Copies</th>
                  <th>Available</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <BookOpenIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      No books found
                    </td>
                  </tr>
                ) : books.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt={book.title}
                            className="w-10 h-12 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpenIcon className="w-5 h-5 text-primary-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{book.title}</p>
                          <p className="text-xs text-gray-500 truncate">{book.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-500 text-xs">{book.isbn || '—'}</td>
                    <td>
                      {book.category_name ? (
                        <span className="badge-info badge">{book.category_name}</span>
                      ) : '—'}
                    </td>
                    <td className="text-center">{book.total_copies}</td>
                    <td className="text-center">
                      <span className={book.available_copies > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>
                        {book.available_copies}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/books/${book.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View details">
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                        {isAdminOrLibrarian && (
                          <button onClick={() => { setEditBook(book); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleteId(book.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {/* Book Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditBook(null); }}
        title={editBook ? 'Edit Book' : 'Add New Book'} size="lg">
        <BookForm
          book={editBook}
          categories={categories}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditBook(null); }}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Book"
        message="Are you sure you want to delete this book? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  );
};

export default Books;
