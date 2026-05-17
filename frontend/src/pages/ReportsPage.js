import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import reportService from '../services/reportService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const ReportsPage = () => {
  const [mostBorrowed, setMostBorrowed] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [overdueReport, setOverdueReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportService.getMostBorrowed(10),
      reportService.getActiveUsers(10),
      reportService.getOverdueReport(),
    ]).then(([booksRes, usersRes, overdueRes]) => {
      setMostBorrowed(booksRes.data.data.books);
      setActiveUsers(usersRes.data.data.users);
      setOverdueReport(overdueRes.data.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const borrowedBooksChart = {
    labels: mostBorrowed.map((b) => b.title.length > 20 ? b.title.substring(0, 20) + '...' : b.title),
    datasets: [{
      label: 'Times Borrowed',
      data: mostBorrowed.map((b) => parseInt(b.borrow_count)),
      backgroundColor: 'rgba(37, 99, 235, 0.8)',
      borderRadius: 6,
    }],
  };

  const activeUsersChart = {
    labels: activeUsers.map((u) => u.name.split(' ')[0]),
    datasets: [{
      label: 'Total Borrows',
      data: activeUsers.map((u) => parseInt(u.total_borrows)),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 6,
    }],
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Library performance insights</p>
        </div>
      </div>

      {/* Summary cards */}
      {overdueReport && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-600">{overdueReport.total_overdue}</p>
            <p className="text-sm text-gray-500 mt-1">Overdue Books</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-yellow-600">${overdueReport.total_estimated_fines}</p>
            <p className="text-sm text-gray-500 mt-1">Estimated Fines</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600">{mostBorrowed.length}</p>
            <p className="text-sm text-gray-500 mt-1">Tracked Books</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Most Borrowed Books</h3>
          {mostBorrowed.length > 0 ? (
            <Bar data={borrowedBooksChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
          ) : <p className="text-gray-400 text-sm text-center py-8">No data available</p>}
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Most Active Users</h3>
          {activeUsers.length > 0 ? (
            <Bar data={activeUsersChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
          ) : <p className="text-gray-400 text-sm text-center py-8">No data available</p>}
        </div>
      </div>

      {/* Overdue Table */}
      {overdueReport?.overdue_records?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Overdue Records</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Book</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Est. Fine</th>
                </tr>
              </thead>
              <tbody>
                {overdueReport.overdue_records.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium">{r.user_name}</p>
                      <p className="text-xs text-gray-400">{r.student_id || r.email}</p>
                    </td>
                    <td>
                      <p className="font-medium">{r.book_title}</p>
                      <p className="text-xs text-gray-400">{r.author}</p>
                    </td>
                    <td className="text-red-600 text-xs font-medium">{formatDate(r.due_date)}</td>
                    <td>
                      <span className="badge-danger badge">{r.days_overdue} days</span>
                    </td>
                    <td className="font-semibold text-red-600">${parseFloat(r.estimated_fine).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
