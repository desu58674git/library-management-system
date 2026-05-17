import api from './api';

const reportService = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMostBorrowed: (limit) => api.get('/reports/most-borrowed', { params: { limit } }),
  getActiveUsers: (limit) => api.get('/reports/active-users', { params: { limit } }),
  getBorrowTrends: () => api.get('/reports/borrow-trends'),
  getCategoryDistribution: () => api.get('/reports/category-distribution'),
  getOverdueReport: () => api.get('/reports/overdue'),
};

export default reportService;
