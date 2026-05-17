import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/helpers';

const roleBadge = { admin: 'badge-danger', librarian: 'badge-info', student: 'badge-success' };

const UserForm = ({ user, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '', password: '',
    role: user?.role || 'student', student_id: user?.student_id || '',
    phone: user?.phone || '', is_active: user?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name required';
    if (!form.email) errs.email = 'Email required';
    if (!user && !form.password) errs.password = 'Password required';
    if (!user && form.password && form.password.length < 6) errs.password = 'Min 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      await onSave(payload);
    } catch (err) {
      if (err.response?.status === 422) {
        const fieldErrors = {};
        err.response.data.errors?.forEach((e) => { fieldErrors[e.field] = e.message; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Full Name', name: 'name', colSpan: 2 },
          { label: 'Email', name: 'email', type: 'email', colSpan: 2 },
          { label: user ? 'New Password (leave blank to keep)' : 'Password *', name: 'password', type: 'password', colSpan: 2 },
        ].map(({ label, name, type = 'text', colSpan }) => (
          <div key={name} className={colSpan === 2 ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input name={name} type={type} value={form[name]} onChange={handleChange}
              className={`input-field ${errors[name] ? 'input-error' : ''}`} />
            {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select name="role" value={form.role} onChange={handleChange} className="input-field">
            <option value="student">Student</option>
            <option value="librarian">Librarian</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
          <input name="student_id" value={form.student_id} onChange={handleChange} className="input-field" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="input-field" />
        </div>
        {user && (
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" name="is_active" id="is_active" checked={form.is_active} onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active account</label>
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
        </button>
      </div>
    </form>
  );
};

const UsersPage = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getAll({ page, limit: 10, search, role: roleFilter });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async (form) => {
    try {
      if (editUser) {
        await userService.update(editUser.id, form);
        toast.success('User updated');
      } else {
        await userService.create(form);
        toast.success('User created');
      }
      setModalOpen(false); setEditUser(null); fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await userService.delete(deleteId);
      toast.success('User deleted');
      setDeleteId(null); fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage library members</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditUser(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, student ID..." className="flex-1" />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input-field sm:w-40" aria-label="Filter by role">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="librarian">Librarian</option>
          <option value="student">Student</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Student ID</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400">
                      <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      No users found
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                    <td className="text-gray-500 text-xs">{u.student_id || '—'}</td>
                    <td className="text-gray-500 text-xs">{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-gray'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditUser(u); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(u.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
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

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditUser(null); }}
        title={editUser ? 'Edit User' : 'Add User'} size="md">
        <UserForm user={editUser} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditUser(null); }} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete User" message="Delete this user? This cannot be undone." loading={deleteLoading} />
    </div>
  );
};

export default UsersPage;
