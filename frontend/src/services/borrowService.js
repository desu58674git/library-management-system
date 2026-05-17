import api from './api';

const borrowService = {
  getAll: (params) => api.get('/borrow', { params }),
  getMyHistory: (params) => api.get('/borrow/my-history', { params }),
  getOverdue: () => api.get('/borrow/overdue'),
  getFines: (params) => api.get('/borrow/fines', { params }),
  borrow: (data) => api.post('/borrow', data),
  return: (id, data) => api.put(`/borrow/${id}/return`, data),
  payFine: (id) => api.put(`/borrow/fines/${id}/pay`),
};

export default borrowService;
