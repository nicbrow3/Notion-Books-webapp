import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0, opacity: 0 });
  const booksRef = useRef<HTMLAnchorElement>(null);
  const settingsRef = useRef<HTMLAnchorElement>(null);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isHomePage = location.pathname === '/';

  // Update indicator position based on active tab
  useEffect(() => {
    if (isHomePage) {
      setIndicatorStyle({ width: 0, left: 0, opacity: 0 });
      return;
    }

    let activeRef: React.RefObject<HTMLAnchorElement> | null = null;
    
    if (isActive('/notion')) {
      activeRef = booksRef;
    } else if (isActive('/settings')) {
      activeRef = settingsRef;
    }

    if (activeRef?.current) {
      const element = activeRef.current;
      const rect = element.getBoundingClientRect();
      const navRect = element.closest('.navbar-links')?.getBoundingClientRect();
      
      if (navRect) {
        setIndicatorStyle({
          width: rect.width,
          left: rect.left - navRect.left,
          opacity: 1
        });
      }
    } else {
      setIndicatorStyle({ width: 0, left: 0, opacity: 0 });
    }
  }, [location.pathname, isHomePage]);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600">
              Notion Books
            </Link>
            
            <div className="hidden md:flex items-center space-x-6 relative navbar-links">
              {/* Animated blue rectangle indicator */}
              <div
                className="absolute bottom-0 h-0.5 bg-blue-600 transition-all duration-300 ease-in-out"
                style={{
                  width: `${indicatorStyle.width}px`,
                  left: `${indicatorStyle.left}px`,
                  opacity: indicatorStyle.opacity,
                  transform: 'translateY(2px)'
                }}
              />
              
              <Link
                ref={booksRef}
                to="/notion"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/notion')
                    ? 'text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Books
              </Link>
              <Link
                ref={settingsRef}
                to="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/settings')
                    ? 'text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Settings
              </Link>
            </div>
          </div>
          
          {/* Removed user info and logout section */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 