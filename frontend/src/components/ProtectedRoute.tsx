import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // For now, just render children - we'll add auth logic later
  return <>{children}</>;
};

export default ProtectedRoute; 