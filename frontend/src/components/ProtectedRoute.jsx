import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  // Get user data from localStorage
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  // If no token or user, redirect to login
  if (!token || !userData) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userData);
    
    // If roles are specified, check if user has allowed role
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
      }
    }
    
    // If all checks pass, show the page
    return children;
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;