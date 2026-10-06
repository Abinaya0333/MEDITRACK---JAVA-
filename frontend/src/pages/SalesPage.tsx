import { useCallback, useEffect, useState } from 'react';
import { saleApi } from '../api';
import { toErrorMessage } from '../api/client';
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format';
import type { Sale } from '../types';
import NewSaleModal from '../components/sales/NewSaleModal';
import { IconCart, IconPlus, IconRefresh } from '../components/Icons';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';

export default function SalesPage() {
  const [rows, setRows] = useState<Sale[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await saleApi.getAll({ page, size });
      setRows(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load sales'));
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    document.title = 'Sales · MediTrack';
    void load();
  }, [load]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">{formatNumber(totalElements)} recorded transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <IconRefresh className="w-4 h-4" />
            Refresh
          </button>
          <button type="button" className="btn-primary" onClick={() => setNewOpen(true)}>
            <IconPlus className="w-4 h-4" />
            Record sale
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Loading sales…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconCart className="w-7 h-7 text-slate-400" />}
            title="No sales recorded"
            description="Recording a sale reduces stock and writes an entry to the inventory ledger."
            action={
              <button type="button" className="btn-primary" onClick={() => setNewOpen(true)}>
                <IconPlus className="w-4 h-4" />
                Record sale
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Sale number</th>
                  <th>Items</th>
                  <th className="text-right">Total</th>
                  <th>Sold by</th>
                  <th>When</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {rows.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-mono text-sm text-slate-800">{sale.saleNumber}</td>
                    <td className="text-sm text-slate-600">
                      {sale.items?.length ?? 0} {sale.items?.length === 1 ? 'line' : 'lines'}
                      {sale.notes && <p className="text-xs text-slate-400">{sale.notes}</p>}
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="text-sm">{sale.performedByName || 'System'}</td>
                    <td className="text-sm whitespace-nowrap text-slate-500">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="text-right">
                      <button type="button" className="btn-ghost" onClick={() => setDetail(sale)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={size}
            onPageChange={setPage}
            onSizeChange={(next) => {
              setSize(next);
              setPage(0);
            }}
          />
        </>
      )}

      <NewSaleModal open={newOpen} onClose={() => setNewOpen(false)} onRecorded={load} />

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.saleNumber ?? 'Sale'}
        subtitle={detail ? formatDateTime(detail.createdAt) : undefined}
        size="lg"
        footer={
          <button type="button" className="btn-secondary" onClick={() => setDetail(null)}>
            Close
          </button>
        }
      >
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(detail?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="text-sm">{item.medicineName}</td>
                  <td className="text-right tabular-nums">{item.quantity}</td>
                  <td className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right font-semibold tabular-nums">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 mt-4">
          <span className="text-sm text-slate-600">
            Total{detail?.notes ? ` · ${detail.notes}` : ''}
          </span>
          <span className="text-lg font-bold text-slate-800 tabular-nums">
            {formatCurrency(detail?.totalAmount)}
          </span>
        </div>
      </Modal>
    </div>
  );
}