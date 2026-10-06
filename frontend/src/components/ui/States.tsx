import type { ReactNode } from 'react';

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <span className={`spinner ${className}`} role="status" aria-label="Loading" />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
      <Spinner className="w-7 h-7 text-primary-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="alert-critical flex-col !items-stretch text-center">
      <h3 className="text-sm font-semibold text-red-800">Something went wrong</h3>
      <p className="text-sm text-red-700 mt-1">{message}</p>
      {onRetry && (
        <div className="mt-3">
          <button type="button" className="btn-danger" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}