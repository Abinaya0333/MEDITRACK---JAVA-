import { useEffect, useMemo, useState } from 'react';
import { medicineApi, saleApi } from '../../api';
import { toErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/format';
import type { Medicine } from '../../types';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/States';

interface DraftLine {
  medicine: Medicine;
  quantity: number;
  unitPrice: number;
}

interface NewSaleModalProps {
  open: boolean;
  onClose: () => void;
  onRecorded: () => void;
}

export default function NewSaleModal({ open, onClose, onRecorded }: NewSaleModalProps) {
  const toast = useToast();
  const [catalogue, setCatalogue] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState('');
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLines([]);
    setSearch('');
    setNotes('');
    setError('');
    setLoadingCatalogue(true);
    medicineApi
      .getAll({ page: 0, size: 100, sortBy: 'name', sortDir: 'asc' })
      .then(({ data }) => setCatalogue(data.content))
      .catch(() => setCatalogue([]))
      .finally(() => setLoadingCatalogue(false));
  }, [open]);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const available = catalogue.filter((m) => !lines.some((line) => line.medicine.id === m.id));
    if (!term) return available.slice(0, 8);
    return available
      .filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          (m.genericName ?? '').toLowerCase().includes(term) ||
          (m.batchNumber ?? '').toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [catalogue, search, lines]);

  const addLine = (medicine: Medicine) => {
    setLines((current) => [
      ...current,
      { medicine, quantity: 1, unitPrice: medicine.sellingPrice ?? 0 },
    ]);
    setSearch('');
  };

  const updateLine = (id: number, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line) => (line.medicine.id === id ? { ...line, ...patch } : line))
    );
  };

  const removeLine = (id: number) => {
    setLines((current) => current.filter((line) => line.medicine.id !== id));
  };

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const overSell = lines.find((line) => line.quantity > line.medicine.quantity);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (lines.length === 0) {
      setError('Add at least one medicine to the sale.');
      return;
    }
    if (lines.some((line) => line.quantity < 1)) {
      setError('Every line needs a quantity of at least 1.');
      return;
    }
    if (lines.some((line) => line.unitPrice <= 0)) {
      setError('Every line needs a positive unit price.');
      return;
    }
    if (overSell) {
      setError(`${overSell.medicine.name} only has ${overSell.medicine.quantity} units in stock.`);
      return;
    }

setSubmitting(true);
    try {
      const { data } = await saleApi.create({
        items: lines.map((line) => ({
          medicineId: line.medicine.id,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        notes: notes.trim() || undefined,
      });
      toast.success('Sale recorded', `${data.saleNumber} · ${formatCurrency(data.totalAmount)}`);
      onRecorded();
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, 'Could not record the sale'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a sale"
      subtitle="Stock is decremented and written to the ledger on save"
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="sale-form" className="btn-success" disabled={submitting || lines.length === 0}>
            {submitting && <Spinner />}
            Record sale · {formatCurrency(subtotal)}
          </button>
        </>
      }
    >
      <form id="sale-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="alert-critical !py-3" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="label" htmlFor="sale-search">
            Find a medicine
          </label>
          <input
            id="sale-search"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Start typing a name, generic name or batch…"
            autoFocus
          />
          {loadingCatalogue ? (
            <p className="text-xs text-slate-400 mt-2">Loading catalogue…</p>
          ) : search.trim() && matches.length === 0 ? (
            <p className="text-xs text-slate-400 mt-2">No matching in-stock medicines.</p>
          ) : matches.length > 0 ? (
            <ul className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {matches.map((medicine) => (
                <li key={medicine.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                    onClick={() => addLine(medicine)}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">
                        {medicine.name}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">
                        {medicine.batchNumber ? `Batch ${medicine.batchNumber} · ` : ''}
                        {medicine.quantity} in stock
                      </span>
                    </span>
                    <span className="text-sm font-medium text-slate-700 shrink-0 tabular-nums">
                      {formatCurrency(medicine.sellingPrice)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {lines.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th className="w-24 text-right">Qty</th>
                  <th className="w-32 text-right">Unit price</th>
                  <th className="w-28 text-right">Total</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.medicine.id}>
                    <td>
                      <p className="font-medium text-slate-800 text-sm">{line.medicine.name}</p>
                      <p className="text-xs text-slate-400">{line.medicine.quantity} available</p>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={line.medicine.quantity}
                        className={`input !py-1.5 text-sm ${line.quantity > line.medicine.quantity ? 'input-error' : ''}`}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.medicine.id, { quantity: Number(e.target.value) })}
                        aria-label={`Quantity for ${line.medicine.name}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input !py-1.5 text-sm"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.medicine.id, { unitPrice: Number(e.target.value) })}
                        aria-label={`Unit price for ${line.medicine.name}`}
                      />
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatCurrency(line.quantity * line.unitPrice)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost !px-1.5 !text-red-600 hover:!bg-red-50"
                        onClick={() => removeLine(line.medicine.id)}
                        aria-label={`Remove ${line.medicine.name}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label className="label" htmlFor="sale-notes">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="sale-notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Counter sale · prescription ref 4471"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">Total</span>
          <span className="text-lg font-bold text-slate-800 tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
      </form>
    </Modal>
  );
}