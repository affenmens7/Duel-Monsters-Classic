/**
 * AdminGuard — route guard that restricts access to admin-only routes.
 * Checks user role via AuthContext. Redirects non-admins to /app/home.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export function AdminGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/app/home" replace />;
  }

  return <Outlet />;
}
