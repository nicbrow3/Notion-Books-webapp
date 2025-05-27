import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600">
              Notion Books
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/search"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                🔍 Search Books
              </Link>
              <Link
                to="/notion"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/notion')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                📝 Notion Integration
              </Link>
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/settings')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Settings
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Login
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 