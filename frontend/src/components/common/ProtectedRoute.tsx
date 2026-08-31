import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';
import { RoleName } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: RoleName[];
  unauthorizedTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles, unauthorizedTo = '/' }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader variant="fullscreen" size="large" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
