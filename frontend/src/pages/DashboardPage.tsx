import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api';
import { toErrorMessage } from '../api/client';
import { formatCurrency, formatNumber, formatRelative } from '../lib/format';
import type { DashboardSummary } from '../types';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconCart,
  IconClock,
  IconPill,
  IconReceipt,
  IconRefresh,
} from '../components/Icons';
import { ErrorState, LoadingState } from '../components/ui/States';
import { SeverityBadge, StockBadge } from '../components/ui/Badges';

interface StatDef {
  label: string;
  value: string;
  icon: typeof IconPill;
  tone: string;
  to: string;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await dashboardApi.getSummary();
      setSummary(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load the dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Dashboard · MediTrack';
    void load();
  }, [load]);

  if (loading && !summary) return <LoadingState label="Loading dashboard…" />;
  if (error && !summary) return <ErrorState message={error} onRetry={load} />;
  if (!summary) return null;

  const breakdown = summary.expiryBreakdown;
  const stats: StatDef[] = [
    {
      label: 'Active medicines',
      value: formatNumber(summary.totalMedicines),
      icon: IconPill,
      tone: 'bg-primary-50 text-primary-600',
      to: '/medicines',
    },
    {
      label: 'Units in stock',
      value: formatNumber(summary.totalStock),
      icon: IconReceipt,
      tone: 'bg-blue-50 text-blue-600',
      to: '/medicines',
    },
    {
      label: 'Low stock',
      value: formatNumber(summary.lowStockCount),
      icon: IconArrowDown,
      tone: 'bg-amber-50 text-amber-600',
      to: '/alerts',
    },
    {
      label: 'Expired batches',
      value: formatNumber(summary.expiredCount),
      icon: IconAlertTriangle,
      tone: 'bg-red-50 text-red-600',
      to: '/alerts',
    },
    {
      label: 'Sales today',
      value: formatNumber(summary.todaySalesCount),
      icon: IconCart,
      tone: 'bg-emerald-50 text-emerald-600',
      to: '/sales',
    },
    {
      label: 'Revenue today',
      value: formatCurrency(summary.todayRevenue),
      icon: IconArrowUp,
      tone: 'bg-navy-50 text-navy-600',
      to: '/reports',
    },
  ];

  const expiryBuckets = [
    { label: 'Expired', value: breakdown?.expired ?? 0, tone: 'bg-red-500' },
    { label: 'Within 7 days', value: breakdown?.within7Days ?? 0, tone: 'bg-orange-500' },
    { label: 'Within 15 days', value: breakdown?.within15Days ?? 0, tone: 'bg-amber-500' },
    { label: 'Within 30 days', value: breakdown?.within30Days ?? 0, tone: 'bg-blue-500' },
  ];
  const maxBucket = Math.max(...expiryBuckets.map((b) => b.value), 1);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Inventory health and expiry risk at a glance.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
          {loading ? <span className="spinner" /> : <IconRefresh className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert-medium mb-5">
          <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Showing the last successful load. {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="stat-card card-hover">
            <div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
            </div>
            <div className={`stat-icon ${stat.tone}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <div className="card p-5">
          <h2 className="form-section-title !mb-5">Expiry risk</h2>
          <div className="space-y-4">
            {expiryBuckets.map((bucket) => (
              <div key={bucket.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-600">{bucket.label}</span>
                  <span className="font-semibold text-slate-800 tabular-nums">{bucket.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bucket.tone} transition-all duration-500`}
                    style={{ width: `${(bucket.value / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link to="/alerts" className="btn-secondary w-full justify-center mt-5">
            Review all alerts
          </Link>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="form-section-title !mb-4">Low stock alerts</h2>
          {summary.lowStockAlerts.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Every medicine is above its minimum level.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.lowStockAlerts.map((alert) => (
                <li key={`${alert.id}-low`} className="py-3 flex items-start gap-3">
                  <SeverityBadge severity={alert.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{alert.medicineName}</p>
                    <p className="text-xs text-slate-500">{alert.message}</p>
                  </div>
                  <StockBadge status={alert.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'} />
                </li>
              ))}
            </ul>
          )}
          <Link to="/medicines?filter=low" className="btn-ghost mt-3 w-full justify-center">
            Manage medicines
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div className="card p-5">
          <h2 className="form-section-title !mb-4">Expiry alerts</h2>
          {summary.expiryAlerts.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Nothing is expiring soon.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.expiryAlerts.map((alert) => (
                <li key={`${alert.id}-exp`} className="py-3 flex items-start gap-3">
                  <SeverityBadge severity={alert.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{alert.medicineName}</p>
                    <p className="text-xs text-slate-500">{alert.message}</p>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {alert.quantity} units
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="form-section-title !mb-4">Recent activity</h2>
          {summary.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No stock movements recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.recentActivity.slice(0, 12).map((activity, index) => (
                <li key={`${activity.timestamp}-${index}`} className="py-2.5 flex items-start gap-3">
                  <IconClock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{activity.description}</p>
                    <p className="text-xs text-slate-400">
                      {activity.performedBy} · {formatRelative(activity.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/inventory" className="btn-ghost mt-3 w-full justify-center">
            View full ledger
          </Link>
        </div>
      </div>
    </div>
  );
}