import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { medicineApi } from '../api';
import { toErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, formatNumber } from '../lib/format';
import type { Medicine } from '../types';
import MedicineFormModal from '../components/medicines/MedicineFormModal';
import StockUpdateModal from '../components/medicines/StockUpdateModal';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconBoxes,
  IconEdit,
  IconInbox,
  IconPill,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../components/Icons';
import { ExpiryBadge, StockBadge } from '../components/ui/Badges';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../components/ui/States';

type SortKey = 'name' | 'quantity' | 'expiryDate' | 'updatedAt' | 'category';

export default function MedicinesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInput = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 0));
  const [size, setSize] = useState(Number(searchParams.get('size') ?? 25));
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [stockTarget, setStockTarget] = useState<Medicine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('filter') === 'low');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (lowStockOnly) {
        const { data } = await medicineApi.getLowStock();
        setRows(data);
        setTotalElements(data.length);
        setTotalPages(1);
        return;
      }
      const { data } = await medicineApi.getAll({
        search: search || undefined,
        category: category || undefined,
        page,
        size,
        sortBy,
        sortDir,
      });
      setRows(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load medicines'));
    } finally {
      setLoading(false);
    }
  }, [search, category, page, size, sortBy, sortDir, lowStockOnly]);

  useEffect(() => {
    document.title = 'Medicines · MediTrack';
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (search) next.set('search', search);
      if (category) next.set('category', category);
      if (page > 0) next.set('page', String(page));
      if (size !== 25) next.set('size', String(size));
      if (lowStockOnly) next.set('filter', 'low');
      setSearchParams(next, { replace: true });
      void load();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [load, search, category, page, size, lowStockOnly, setSearchParams]);

  useEffect(() => {
    medicineApi
      .getCategories()
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const summary = useMemo(
    () => ({
      total: rows.reduce((sum, row) => sum + row.quantity, 0),
      value: rows.reduce(
        (sum, row) => sum + row.quantity * (row.purchasePrice ?? 0),
        0
      ),
      alerts: rows.filter(
        (row) => row.stockStatus !== 'IN_STOCK' || row.expiryStatus === 'EXPIRED'
      ).length,
    }),
    [rows]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await medicineApi.delete(deleteTarget.id);
      toast.success('Medicine archived', deleteTarget.name);
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.error('Could not archive medicine', toErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const sortIcon = (key: SortKey) =>
    sortBy === key ? (
      sortDir === 'asc' ? (
        <IconArrowUp className="w-3 h-3" />
      ) : (
        <IconArrowDown className="w-3 h-3" />
      )
    ) : null;

  const columns: { key: SortKey | 'stock' | 'expiry' | 'price' | 'actions'; label: string; sortable: boolean }[] = [
    { key: 'name', label: 'Medicine', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'stock', label: 'Stock', sortable: false },
    { key: 'expiry', label: 'Expiry', sortable: true },
    { key: 'price', label: 'Prices', sortable: false },
    { key: 'actions', label: '', sortable: false },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Medicines</h1>
          <p className="page-subtitle">
            {formatNumber(summary.total)} units across {formatNumber(totalElements)} records
            {summary.alerts > 0 && ` · ${summary.alerts} need attention`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`btn-secondary ${lowStockOnly ? '!bg-amber-50 !border-amber-200 !text-amber-800' : ''}`}
            onClick={() => {
              setLowStockOnly((current) => !current);
              setPage(0);
            }}
          >
            <IconAlertTriangle />
            Low stock
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <IconPlus className="w-4 h-4" />
              Add medicine
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInput}
              className="input !pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, generic name or batch number…"
              aria-label="Search medicines"
            />
          </div>
          <select
            className="select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {summary.total > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 pt-4 border-t border-slate-100 text-sm">
            <span className="text-slate-500">
              Units on hand <span className="font-semibold text-slate-800">{formatNumber(summary.total)}</span>
            </span>
            <span className="text-slate-500">
              Stock value <span className="font-semibold text-slate-800">{formatCurrency(summary.value)}</span>
            </span>
          </div>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Loading medicines…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconInbox className="w-7 h-7 text-slate-400" />}
            title={lowStockOnly ? 'No low-stock medicines' : 'No medicines found'}
            description={
              lowStockOnly
                ? 'Every medicine is above its minimum stock level.'
                : search || category
                  ? 'Try adjusting your search or category filter.'
                  : isAdmin
                    ? 'Add your first medicine to start tracking inventory.'
                    : 'Ask an administrator to add medicines.'
            }
            action={
              isAdmin && !lowStockOnly && !search && !category ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <IconPlus className="w-4 h-4" />
                  Add medicine
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>
                      {column.sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                          onClick={() => toggleSort(column.key as SortKey)}
                        >
                          {column.label}
                          {sortIcon(column.key as SortKey)}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((medicine) => (
                  <tr key={medicine.id}>
                    <td>
                      <p className="font-medium text-slate-800">{medicine.name}</p>
                      <p className="text-xs text-slate-500">
                        {medicine.genericName || '—'}
                        {medicine.batchNumber && ` · Batch ${medicine.batchNumber}`}
                      </p>
                    </td>
                    <td className="text-sm">{medicine.category || '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {medicine.quantity}
                        </span>
                        <StockBadge status={medicine.stockStatus} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Min {medicine.minimumStockLevel}
                      </p>
                    </td>
                    <td>
                      <ExpiryBadge
                        status={medicine.expiryStatus}
                        daysUntilExpiry={medicine.daysUntilExpiry}
                      />
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(medicine.expiryDate)}</p>
                    </td>
                    <td className="text-sm">
                      <p>Buy {formatCurrency(medicine.purchasePrice)}</p>
                      <p className="text-xs text-slate-400">Sell {formatCurrency(medicine.sellingPrice)}</p>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="btn-ghost !px-2"
                          title="Update stock"
                          onClick={() => setStockTarget(medicine)}
                        >
                          <IconBoxes className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="btn-ghost !px-2"
                              title="Edit medicine"
                              onClick={() => {
                                setEditing(medicine);
                                setFormOpen(true);
                              }}
                            >
                              <IconEdit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="btn-ghost !px-2 !text-red-600 hover:!bg-red-50"
                              title="Archive medicine"
                              onClick={() => setDeleteTarget(medicine)}
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!lowStockOnly && (
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
          )}
        </>
      )}

      {!isAdmin && !loading && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-4">
          <IconPill className="w-3.5 h-3.5" />
          You have read-only access to medicines. Ask an administrator to add or edit records.
        </p>
      )}

      <MedicineFormModal
        open={formOpen}
        medicine={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <StockUpdateModal
        open={stockTarget !== null}
        medicine={stockTarget}
        onClose={() => setStockTarget(null)}
        onSaved={load}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Archive medicine"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting && <Spinner />}
              Archive
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Archive <span className="font-semibold text-slate-800">{deleteTarget?.name}</span>? It will be
          hidden from inventory and excluded from alerts. Its stock history is preserved.
        </p>
      </Modal>
    </div>
  );
}