import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export function ProtectedRoute({
  children
}: ProtectedRouteProps): JSX.Element {
  const location = useLocation();
  const auth = useAuth();

  if (auth.isInitializing) {
    return <div className="route-loading">Securing your workspace...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
