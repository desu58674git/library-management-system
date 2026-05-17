import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Shared Pages
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import Categories from './pages/Categories';
import BorrowingPage from './pages/BorrowingPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '10px', background: '#1f2937', color: '#fff' },
            success: { style: { background: '#065f46', color: '#fff' } },
            error: { style: { background: '#7f1d1d', color: '#fff' } },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="books" element={<Books />} />
            <Route path="books/:id" element={<BookDetail />} />
            <Route path="categories" element={
              <ProtectedRoute roles={['admin', 'librarian']}>
                <Categories />
              </ProtectedRoute>
            } />
            <Route path="borrowing" element={<BorrowingPage />} />
            <Route path="users" element={
              <ProtectedRoute roles={['admin', 'librarian']}>
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute roles={['admin', 'librarian']}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
