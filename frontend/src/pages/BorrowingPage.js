import React, { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import borrowService from '../services/borrowService';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/helpers';

const statusBadge = {
  borrowed: 'badge-info',
  returned: 'badge-success',
  overdue:  'badge-danger',
};

const BorrowingPage = () => {
  const { isAdminOrLibrarian } = useAuth();
  const [records, setRecords]         = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [returnId, setReturnId]       = useState(null);
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (isAdminOrLibrarian) {
        res = await borrowService.getAll({ page, limit: 10, search, status: statusFilter });
      } else {
        res = await borrowService.getMyHistory({ page, limit: 10 });
      }

      // Handle both array and paginated response shapes safely
      const data       = res.data?.data       ?? [];
      const pagination = res.data?.pagination ?? null;

      setRecords(Array.isArray(data) ? data : []);
      setPagination(pagination);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load borrow records';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, isAdminOrLibrarian]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleReturn = async () => {
    setReturnLoading(true);
    try {
      const res = await borrowService.return(returnId, {});
      const { fine_amount, days_overdue } = res.data.data;
      if (fine_amount > 0) {
        toast.success(`Book returned. Fine: $${fine_amount} (${days_overdue} days overdue)`);
      } else {
        toast.success('Book returned successfully!');
      }
      setReturnId(null);
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return failed');
    } finally {
      setReturnLoading(false);
    }
  };

  // Empty state component
  const EmptyState = () => (
    <tr>
      <td colSpan={isAdminOrLibrarian ? 7 : 5} className="text-center py-16">
        <BookOpenIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-medium">No borrow records found</p>
        <p className="text-gray-400 text-sm mt-1">
          {isAdminOrLibrarian
            ? 'No borrowing activity yet'
            : 'You have not borrowed any books yet. Browse the Books page to get started.'}
        </p>
      </td>
    </tr>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {isAdminOrLibrarian ? 'Borrow Records' : 'My Borrowing History'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdminOrLibrarian
              ? 'Manage all borrowing operations'
              : 'Track your borrowed and returned books'}
          </p>
        </div>
      </div>

      {/* Filters — admin/librarian only */}
      {isAdminOrLibrarian && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by user or book..."
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field sm:w-40"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="borrowed">Borrowed</option>
            <option value="returned">Returned</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {isAdminOrLibrarian && <th>User</th>}
                  <th>Book</th>
                  <th>Borrowed</th>
                  <th>Due Date</th>
                  <th>Returned</th>
                  <th>Status</th>
                  {isAdminOrLibrarian && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <EmptyState />
                ) : records.map((r) => (
                  <tr key={r.id}>
                    {isAdminOrLibrarian && (
                      <td>
                        <p className="font-medium">{r.user_name}</p>
                        <p className="text-xs text-gray-400">
                          {r.student_id || r.user_email}
                        </p>
                      </td>
                    )}
                    <td>
                      <p className="font-medium max-w-[180px] truncate">
                        {r.book_title}
                      </p>
                      <p className="text-xs text-gray-400">{r.book_author}</p>
                    </td>
                    <td className="text-gray-500 text-xs">
                      {formatDate(r.borrowed_at)}
                    </td>
                    <td className={`text-xs ${
                      r.status === 'overdue'
                        ? 'text-red-600 font-medium'
                        : 'text-gray-500'
                    }`}>
                      {formatDate(r.due_date)}
                      {r.status === 'overdue' && (
                        <span className="flex items-center gap-1 mt-0.5">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="text-gray-500 text-xs">
                      {r.returned_at ? formatDate(r.returned_at) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[r.status] || 'badge-gray'}`}>
                        {r.status}
                      </span>
                    </td>
                    {isAdminOrLibrarian && (
                      <td>
                        {r.status !== 'returned' && (
                          <button
                            onClick={() => setReturnId(r.id)}
                            className="text-xs btn-secondary py-1 px-3 flex items-center gap-1"
                          >
                            <ArrowPathIcon className="w-3 h-3" /> Return
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {/* Return confirmation dialog */}
      <ConfirmDialog
        isOpen={!!returnId}
        onClose={() => setReturnId(null)}
        onConfirm={handleReturn}
        title="Return Book"
        message="Confirm book return? A fine will be calculated if overdue."
        confirmText="Return Book"
        loading={returnLoading}
      />
    </div>
  );
};

export default BorrowingPage;
