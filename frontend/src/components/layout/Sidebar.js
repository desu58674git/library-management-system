import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon, BookOpenIcon, TagIcon, ArrowsRightLeftIcon,
  UsersIcon, ChartBarIcon, UserCircleIcon, ArrowRightOnRectangleIcon,
  XMarkIcon, BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon, roles: ['admin', 'librarian', 'student'] },
  { to: '/books', label: 'Books', icon: BookOpenIcon, roles: ['admin', 'librarian', 'student'] },
  { to: '/categories', label: 'Categories', icon: TagIcon, roles: ['admin', 'librarian'] },
  { to: '/borrowing', label: 'Borrowing', icon: ArrowsRightLeftIcon, roles: ['admin', 'librarian', 'student'] },
  { to: '/users', label: 'Users', icon: UsersIcon, roles: ['admin', 'librarian'] },
  { to: '/reports', label: 'Reports', icon: ChartBarIcon, roles: ['admin', 'librarian'] },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon, roles: ['admin', 'librarian', 'student'] },
];

const roleBadgeColors = {
  admin: 'bg-red-100 text-red-700',
  librarian: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700',
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="p-2 bg-primary-600 rounded-xl">
          <BuildingLibraryIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-tight">Library</h1>
          <p className="text-xs text-gray-500">Management System</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[user?.role]}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border border-primary-100'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative flex flex-col w-64 h-full bg-white shadow-xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
