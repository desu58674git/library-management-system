import React, { useEffect, useState } from 'react';
import {
  BookOpenIcon, UsersIcon, ArrowsRightLeftIcon,
  ExclamationTriangleIcon, CheckCircleIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import reportService from '../services/reportService';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const statusBadge = {
  borrowed: 'badge-info',
  returned: 'badge-success',
  overdue: 'badge-danger',
};

const Dashboard = () => {
  const { user, isAdminOrLibrarian } = useAuth();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categoryDist, setCategoryDist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdminOrLibrarian) {
          const [dashRes, trendsRes, catRes] = await Promise.all([
            reportService.getDashboard(),
            reportService.getBorrowTrends(),
            reportService.getCategoryDistribution(),
          ]);
          setStats(dashRes.data.data);
          setTrends(trendsRes.data.data.trends);
          setCategoryDist(catRes.data.data.distribution);
        }
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdminOrLibrarian]);

  if (loading) return <LoadingSpinner />;

  // Chart data
  const barData = {
    labels: trends.map((t) => t.month),
    datasets: [
      {
        label: 'Total Borrows',
        data: trends.map((t) => parseInt(t.total_borrows)),
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderRadius: 6,
      },
      {
        label: 'Returned',
        data: trends.map((t) => parseInt(t.returned)),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 6,
      },
    ],
  };

  const doughnutData = {
    labels: categoryDist.slice(0, 8).map((c) => c.category),
    datasets: [{
      data: categoryDist.slice(0, 8).map((c) => parseInt(c.book_count)),
      backgroundColor: [
        '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
        '#06b6d4','#f97316','#84cc16',
      ],
      borderWidth: 0,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {isAdminOrLibrarian && stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <StatCard title="Total Books" value={stats.books?.total_books} icon={BookOpenIcon} color="blue" />
            <StatCard title="Available" value={stats.books?.available_copies} icon={CheckCircleIcon} color="green" />
            <StatCard title="Borrowed" value={stats.books?.borrowed_copies} icon={ArrowsRightLeftIcon} color="indigo" />
            <StatCard title="Total Users" value={stats.users?.total_users} icon={UsersIcon} color="purple" />
            <StatCard title="Overdue" value={stats.overdue_count} icon={ExclamationTriangleIcon} color="red" />
            <StatCard title="Unpaid Fines" value={`$${stats.total_unpaid_fines}`} icon={CurrencyDollarIcon} color="yellow" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="card lg:col-span-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Borrow Trends</h3>
              {trends.length > 0 ? (
                <Bar data={barData} options={chartOptions} />
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No trend data available</p>
              )}
            </div>
            <div className="card">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Books by Category</h3>
              {categoryDist.length > 0 ? (
                <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No category data</p>
              )}
            </div>
          </div>

          {/* Recent Borrows */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Borrowing Activity</h3>
            {stats.recent_borrows?.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Book</th>
                      <th>Borrowed</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_borrows.map((b) => (
                      <tr key={b.id}>
                        <td className="font-medium">{b.user_name}</td>
                        <td className="text-gray-600 max-w-[200px] truncate">{b.book_title}</td>
                        <td className="text-gray-500">{formatDate(b.borrowed_at)}</td>
                        <td className="text-gray-500">{formatDate(b.due_date)}</td>
                        <td><span className={`badge ${statusBadge[b.status] || 'badge-gray'}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </>
      ) : (
        /* Student Dashboard */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card text-center py-10">
            <BookOpenIcon className="w-12 h-12 text-primary-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Browse Books</h3>
            <p className="text-gray-500 text-sm mb-4">Explore our collection of books</p>
            <a href="/books" className="btn-primary inline-block">View Books</a>
          </div>
          <div className="card text-center py-10">
            <ArrowsRightLeftIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">My Borrowings</h3>
            <p className="text-gray-500 text-sm mb-4">View your borrow history</p>
            <a href="/borrowing" className="btn-primary inline-block">View History</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
