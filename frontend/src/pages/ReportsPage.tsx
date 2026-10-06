import { useCallback, useEffect, useState } from 'react';
import { reportApi } from '../api';
import { toErrorMessage } from '../api/client';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../lib/format';
import type { Medicine, Sale } from '../types';
import { IconCart, IconChart, IconInbox, IconPill, IconRefresh } from '../components/Icons';
import { ExpiryBadge, StockBadge } from '../components/ui/Badges';
import { ErrorState, LoadingState } from '../components/ui/States';

type Tab = 'inventory' | 'expiry' | 'sales' | 'low-stock';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('inventory');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'sales') {
        const { data } = await reportApi.sales({ page: 0, size: 100 });
        setSales(data.content);
        setMedicines([]);
      } else if (tab === 'inventory') {
        const { data } = await reportApi.inventory({ page: 0, size: 100 });
        setMedicines(data.content);
        setSales([]);
      } else if (tab === 'expiry') {
        const { data } = await reportApi.expiry(90);
        setMedicines(data);
        setSales([]);
      } else {
        const { data } = await reportApi.lowStock();
        setMedicines(data);
        setSales([]);
      }
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load the report'));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    document.title = 'Reports · MediTrack';
    void load();
  }, [load]);

  const tabs: { key: Tab; label: string; icon: typeof IconChart }[] = [
    { key: 'inventory', label: 'Inventory', icon: IconInbox },
    { key: 'expiry', label: 'Expiry (90d)', icon: IconPill },
    { key: 'sales', label: 'Sales', icon: IconCart },
    { key: 'low-stock', label: 'Low stock', icon: IconChart },
  ];

  const totalValue = medicines.reduce((sum, m) => sum + m.quantity * (m.purchasePrice ?? 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            {tab === 'sales'
              ? `${formatNumber(sales.length)} sales · ${formatCurrency(totalRevenue)} total revenue`
              : `${formatNumber(medicines.length)} records · ${formatCurrency(totalValue)} stock value`}
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
        <LoadingState label="Generating report…" />
      ) : tab === 'sales' ? (
        sales.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconCart className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">No sales recorded</h3>
            </div>
          </div>
        ) : (
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Sale number</th>
                  <th>Items</th>
                  <th className="text-right">Total</th>
                  <th>Sold by</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-mono text-sm">{sale.saleNumber}</td>
                    <td className="text-sm">{sale.items?.length ?? 0} lines</td>
                    <td className="text-right font-semibold tabular-nums">{formatCurrency(sale.totalAmount)}</td>
                    <td className="text-sm">{sale.performedByName || 'System'}</td>
                    <td className="text-sm text-slate-500">{formatDateTime(sale.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : medicines.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconPill className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">No records</h3>
          </div>
        </div>
      ) : (
        <div className="table-container bg-white">
          <table className="table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Expiry</th>
                <th className="text-right">Stock value</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((medicine) => (
                <tr key={medicine.id}>
                  <td>
                    <p className="font-medium text-slate-800">{medicine.name}</p>
                    <p className="text-xs text-slate-500">{medicine.batchNumber ? `Batch ${medicine.batchNumber}` : '—'}</p>
                  </td>
                  <td className="text-sm">{medicine.category || '—'}</td>
                  <td>
                    <span className="font-semibold tabular-nums">{medicine.quantity}</span>
                    <StockBadge status={medicine.stockStatus} />
                  </td>
                  <td>
                    <ExpiryBadge status={medicine.expiryStatus} daysUntilExpiry={medicine.daysUntilExpiry} />
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(medicine.expiryDate)}</p>
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {formatCurrency(medicine.quantity * (medicine.purchasePrice ?? 0))}
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