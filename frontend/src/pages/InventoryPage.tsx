import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../api';
import { toErrorMessage } from '../api/client';
import { formatDateTime, formatNumber } from '../lib/format';
import type { InventoryTransaction } from '../types';
import { IconInbox, IconRefresh } from '../components/Icons';
import { TransactionBadge } from '../components/ui/Badges';
import Pagination from '../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryTransaction[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await inventoryApi.getTransactions({ page, size });
      setRows(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load the inventory ledger'));
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    document.title = 'Inventory · MediTrack';
    void load();
  }, [load]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory ledger</h1>
          <p className="page-subtitle">
            Every stock movement, newest first · {formatNumber(totalElements)} entries
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
          <IconRefresh className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Loading ledger…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconInbox className="w-7 h-7 text-slate-400" />}
            title="No stock movements yet"
            description="Adding a medicine or adjusting stock will create the first ledger entry."
          />
        </div>
      ) : (
        <>
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Movement</th>
                  <th>Medicine</th>
                  <th>Type</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Before → After</th>
                  <th>Notes</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id}>
                    <td className="text-slate-400 tabular-nums">#{tx.id}</td>
                    <td>
                      <p className="font-medium text-slate-800">{tx.medicineName}</p>
                      {tx.referenceNumber && (
                        <p className="text-xs text-slate-400">Ref {tx.referenceNumber}</p>
                      )}
                    </td>
                    <td>
                      <TransactionBadge type={tx.type} />
                    </td>
                    <td className="text-right font-semibold tabular-nums">{tx.quantity}</td>
                    <td className="text-right tabular-nums text-slate-500">
                      {tx.previousQuantity} → {tx.newQuantity}
                    </td>
                    <td className="text-sm max-w-[16rem]">
                      <span className="line-clamp-2">{tx.notes || '—'}</span>
                    </td>
                    <td className="text-sm">{tx.performedByName || 'System'}</td>
                    <td className="text-sm whitespace-nowrap text-slate-500">
                      {formatDateTime(tx.createdAt)}
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
    </div>
  );
}