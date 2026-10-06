import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../api';
import { fieldErrorOf, toErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, initialsOf } from '../lib/format';
import type { User, UserCreateRequest } from '../types';
import { IconPlus, IconRefresh, IconShield, IconUsers } from '../components/Icons';
import { RoleBadge } from '../components/ui/Badges';
import Modal from '../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../components/ui/States';

const BLANK: UserCreateRequest = {
  username: '',
  email: '',
  fullName: '',
  password: '',
  role: 'STAFF',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UserCreateRequest>(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await userApi.getAll();
      setRows(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Users · MediTrack';
    void load();
  }, [load]);

  const set = <K extends keyof UserCreateRequest>(key: K, value: UserCreateRequest[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setErrors({});

    if (!form.username.trim() || !form.email.trim() || !form.fullName.trim() || !form.password) {
      setFormError('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      await userApi.create({ ...form, username: form.username.trim(), email: form.email.trim(), fullName: form.fullName.trim() });
      toast.success('User created', form.username);
      setFormOpen(false);
      setForm(BLANK);
      void load();
    } catch (err) {
      setFormError(toErrorMessage(err, 'Could not create the user'));
      setErrors({
        username: fieldErrorOf(err, 'username') ?? '',
        email: fieldErrorOf(err, 'email') ?? '',
        password: fieldErrorOf(err, 'password') ?? '',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{rows.length} accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <IconRefresh className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setForm(BLANK);
              setFormOpen(true);
            }}
          >
            <IconPlus className="w-4 h-4" />
            Add user
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Loading users…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconUsers className="w-7 h-7 text-slate-400" />}
            title="No users"
            description="Add your first user account."
          />
        </div>
      ) : (
        <div className="table-container bg-white">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {initialsOf(user.fullName || user.username)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {user.fullName}
                          {user.username === currentUser?.username && (
                            <span className="text-xs text-slate-400 ml-2">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm">{user.email}</td>
                  <td>
                    <RoleBadge role={user.role} />
                  </td>
                  <td>
                    <span className={`badge ${user.active ? 'badge-green' : 'badge-red'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-sm text-slate-500">{formatDateTime(user.lastLogin)}</td>
                  <td className="text-sm text-slate-500">{formatDateTime(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add user"
        subtitle="Creates a new MediTrack account"
        size="md"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="user-form" className="btn-primary" disabled={submitting}>
              {submitting && <Spinner />}
              Create user
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div className="alert-critical !py-3" role="alert">
              <p className="text-sm text-red-800">{formError}</p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="u-fullname">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="u-fullname"
              className="input"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="label" htmlFor="u-username">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="u-username"
              className={`input ${errors.username ? 'input-error' : ''}`}
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="jane.doe"
            />
            {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="label" htmlFor="u-email">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="u-email"
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane@meditrack.com"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="u-password">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="u-password"
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="At least 6 characters"
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="label" htmlFor="u-role">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="u-role"
              className="select"
              value={form.role}
              onChange={(e) => set('role', e.target.value as 'ADMIN' | 'STAFF')}
            >
              <option value="STAFF">Staff — read/write inventory</option>
              <option value="ADMIN">Admin — full access</option>
            </select>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
              <IconShield className="w-3.5 h-3.5" />
              Admins can manage medicines, users and settings. Staff can view and transact.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}