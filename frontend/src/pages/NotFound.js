import React from 'react';
import { Link } from 'react-router-dom';
import { BuildingLibraryIcon } from '@heroicons/react/24/outline';

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="text-center">
      <BuildingLibraryIcon className="w-16 h-16 text-primary-300 mx-auto mb-4" />
      <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary inline-block">Go to Dashboard</Link>
    </div>
  </div>
);

export default NotFound;
