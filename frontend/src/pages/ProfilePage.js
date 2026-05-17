import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/helpers';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '', phone: user?.phone || '', address: user?.address || '',
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await api.put('/auth/me', profileForm);
      updateUser(res.data.data.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Required';
    if (!passwordForm.newPassword) errs.newPassword = 'Required';
    else if (passwordForm.newPassword.length < 6) errs.newPassword = 'Min 6 characters';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setPasswordErrors(errs); return; }

    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleBadgeColors = { admin: 'bg-red-100 text-red-700', librarian: 'bg-blue-100 text-blue-700', student: 'bg-green-100 text-green-700' };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="card mb-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
        <p className="text-gray-500 text-sm">{user?.email}</p>
        <span className={`badge mt-2 ${roleBadgeColors[user?.role]}`}>{user?.role}</span>
        {user?.student_id && <p className="text-xs text-gray-400 mt-2">ID: {user.student_id}</p>}
        <p className="text-xs text-gray-400 mt-1">Member since {formatDate(user?.created_at)}</p>
      </div>

      {/* Edit Profile */}
      <div className="card mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Edit Profile</h3>
        <form onSubmit={handleProfileSave}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="input-field" placeholder="+1-555-0100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                rows={2} className="input-field resize-none" />
            </div>
          </div>
          <button type="submit" className="btn-primary mt-4 w-full" disabled={profileLoading}>
            {profileLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSave}>
          <div className="space-y-4">
            {[
              { label: 'Current Password', key: 'currentPassword' },
              { label: 'New Password', key: 'newPassword' },
              { label: 'Confirm New Password', key: 'confirmPassword' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type="password" value={passwordForm[key]}
                  onChange={(e) => { setPasswordForm({ ...passwordForm, [key]: e.target.value }); setPasswordErrors({ ...passwordErrors, [key]: '' }); }}
                  className={`input-field ${passwordErrors[key] ? 'input-error' : ''}`} />
                {passwordErrors[key] && <p className="mt-1 text-xs text-red-600">{passwordErrors[key]}</p>}
              </div>
            ))}
          </div>
          <button type="submit" className="btn-primary mt-4 w-full" disabled={passwordLoading}>
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
