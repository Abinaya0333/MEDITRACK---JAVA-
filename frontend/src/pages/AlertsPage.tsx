import { useCallback, useEffect, useState } from 'react';
import { alertApi } from '../api';
import { toErrorMessage } from '../api/client';
import { formatDate, formatNumber } from '../lib/format';
import type { Medicine } from '../types';
import { IconAlertTriangle, IconBell, IconClock, IconRefresh } from '../components/Icons';
import { ExpiryBadge, SeverityBadge, StockBadge } from '../components/ui/Badges';
import { ErrorState, LoadingState } from '../components/ui/States';

type Tab = 'low-stock' | 'expiring' | 'expired';

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>('low-stock');
  const [rows, setRows] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await alertApi.getAllAlerts();
      setRows(tab === 'low-stock' ? data.lowStock : tab === 'expiring' ? data.expiring : data.expired);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load alerts'));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    document.title = 'Alerts · MediTrack';
    void load();
  }, [load]);

  const tabs: { key: Tab; label: string; icon: typeof IconBell }[] = [
    { key: 'low-stock', label: 'Low stock', icon: IconAlertTriangle },
    { key: 'expiring', label: 'Expiring soon', icon: IconClock },
    { key: 'expired', label: 'Expired', icon: IconBell },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">
            {formatNumber(rows.length)} active {tab === 'low-stock' ? 'low-stock' : tab === 'expiring' ? 'expiry' : 'expired'} alerts
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
          <IconRefresh className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`btn-secondary ${tab === key ? '!bg-primary-50 !border-primary-200 !text-primary-700' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Loading alerts…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconBell className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">No alerts</h3>
            <p className="text-sm text-slate-500 mt-1">
              {tab === 'low-stock'
                ? 'Every medicine is above its minimum level.'
                : tab === 'expiring'
                  ? 'Nothing is expiring within the next 30 days.'
                  : 'No expired batches on the shelf.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="table-container bg-white">
          <table className="table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Stock</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((medicine) => (
                <tr key={medicine.id}>
                  <td>
                    <p className="font-medium text-slate-800">{medicine.name}</p>
                    <p className="text-xs text-slate-500">{medicine.genericName || '—'}</p>
                  </td>
                  <td className="text-sm">{medicine.batchNumber || '—'}</td>
                  <td>
                    <span className="font-semibold tabular-nums">{medicine.quantity}</span>
                    <p className="text-xs text-slate-400">Min {medicine.minimumStockLevel}</p>
                  </td>
                  <td>
                    <ExpiryBadge status={medicine.expiryStatus} daysUntilExpiry={medicine.daysUntilExpiry} />
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(medicine.expiryDate)}</p>
                  </td>
                  <td>
                    <StockBadge status={medicine.stockStatus} />
                  </td>
                  <td>
                    <SeverityBadge
                      severity={
                        tab === 'expired'
                          ? 'CRITICAL'
                          : medicine.quantity === 0
                            ? 'CRITICAL'
                            : medicine.daysUntilExpiry !== undefined && medicine.daysUntilExpiry <= 7
                              ? 'HIGH'
                              : 'MEDIUM'
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}