import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/States';

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <Spinner className="w-8 h-8 text-primary-600" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const { isAuthenticated, isAdmin, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, initialising } = useAuth();

  useEffect(() => {
    document.title = 'Sign in · MediTrack';
  }, []);

  if (initialising) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}