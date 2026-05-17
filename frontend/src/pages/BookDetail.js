import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import bookService from '../services/bookService';
import borrowService from '../services/borrowService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/helpers';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);

  useEffect(() => {
    bookService.getById(id)
      .then((res) => setBook(res.data.data.book))
      .catch(() => toast.error('Book not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBorrow = async () => {
    setBorrowing(true);
    try {
      await borrowService.borrow({ book_id: id });
      toast.success('Book borrowed successfully! Due in 14 days.');
      setBook((prev) => ({ ...prev, available_copies: prev.available_copies - 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to borrow book');
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!book) return <div className="text-center py-20 text-gray-400">Book not found</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeftIcon className="w-4 h-4" /> Back to Books
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cover */}
        <div className="lg:col-span-1">
          <div className="card p-4 text-center">
            {book.cover_image_url ? (
              <img src={book.cover_image_url} alt={book.title}
                className="w-full max-w-[200px] mx-auto rounded-xl shadow-md object-cover" />
            ) : (
              <div className="w-full max-w-[200px] mx-auto h-64 bg-primary-50 rounded-xl flex items-center justify-center">
                <BookOpenIcon className="w-16 h-16 text-primary-300" />
              </div>
            )}
            <div className="mt-4">
              <span className={`badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'} text-sm px-3 py-1`}>
                {book.available_copies > 0 ? `${book.available_copies} Available` : 'Not Available'}
              </span>
            </div>
            {book.available_copies > 0 && (
              <button onClick={handleBorrow} disabled={borrowing} className="btn-primary w-full mt-4">
                {borrowing ? 'Borrowing...' : 'Borrow This Book'}
              </button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{book.title}</h1>
            <p className="text-lg text-gray-600 mb-4">by {book.author}</p>
            {book.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{book.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['ISBN', book.isbn],
                ['Category', book.category_name],
                ['Publisher', book.publisher],
                ['Year', book.publication_year],
                ['Language', book.language],
                ['Pages', book.pages],
                ['Location', book.location],
                ['Total Copies', book.total_copies],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <span className="text-gray-500">{label}:</span>
                  <span className="ml-2 font-medium text-gray-900">{value}</span>
                </div>
              ) : null)}
            </div>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400">Added on {formatDate(book.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
