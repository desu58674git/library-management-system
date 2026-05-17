import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/books': 'Books',
  '/categories': 'Categories',
  '/borrowing': 'Borrowing',
  '/users': 'Users',
  '/reports': 'Reports',
  '/profile': 'Profile',
};

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Library Management';

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 relative" aria-label="Notifications">
          <BellIcon className="w-5 h-5" />
        </button>
        <Link
          to="/profile"
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Profile"
        >
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
            {user?.name}
          </span>
        </Link>
      </div>
    </header>
  );
};

export default Header;
