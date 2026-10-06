import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { toErrorMessage } from '../api/client';
import { IconPill, IconShield } from '../components/Icons';
import { Spinner } from '../components/ui/States';

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'Administrator' },
  { username: 'staff', password: 'staff123', role: 'Staff' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Sign in · MediTrack';
  }, []);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Enter both your username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await login(username.trim(), password);
      toast.success(`Welcome back, ${session.fullName}`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(toErrorMessage(err, 'Sign in failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 sidebar-bg flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <IconPill className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-xl leading-tight">MediTrack</p>
            <p className="text-sm text-blue-200 leading-tight">Pharmacy Inventory &amp; Expiry Alerts</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-snug">
            Never lose a batch to expiry again.
          </h1>
          <p className="mt-4 text-blue-100 leading-relaxed">
            Track stock levels, catch medicines about to expire, turn supplier invoices into
            inventory automatically, and keep a full audit trail of every movement.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-blue-100">
            {[
              'Low-stock and expiry alerts the moment they matter',
              'PDF invoice upload with automatic text extraction',
              'Complete stock ledger — every movement is accounted for',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-300 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-blue-300">© {new Date().getFullYear()} MediTrack</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <IconPill className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-tight">MediTrack</p>
              <p className="text-xs text-slate-500 leading-tight">Pharmacy Inventory</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">Use your MediTrack account to continue.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="username">
                Username or email
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className={`input ${error && !username ? 'input-error' : ''}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={`input ${error && !password ? 'input-error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="alert-critical !py-3" role="alert">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center !py-2.5" disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <IconShield className="w-3.5 h-3.5" />
              Demo accounts
            </p>
            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                    setError('');
                  }}
                >
                  <span className="font-mono text-xs text-slate-700">
                    {account.username} / {account.password}
                  </span>
                  <span className="text-[11px] text-slate-500">{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}