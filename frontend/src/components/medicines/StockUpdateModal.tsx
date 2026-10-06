import { useEffect, useMemo, useState } from 'react';
import { medicineApi } from '../../api';
import { toErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Medicine } from '../../types';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/States';

type StockAction = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

interface StockUpdateModalProps {
  open: boolean;
  medicine: Medicine | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StockUpdateModal({ open, medicine, onClose, onSaved }: StockUpdateModalProps) {
  const toast = useToast();
  const [action, setAction] = useState<StockAction>('STOCK_IN');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAction('STOCK_IN');
    setQuantity(1);
    setNotes('');
    setError('');
  }, [open]);

  const resulting = useMemo(() => {
    if (!medicine) return 0;
    if (action === 'STOCK_IN') return medicine.quantity + quantity;
    if (action === 'STOCK_OUT') return medicine.quantity - quantity;
    return quantity;
  }, [action, quantity, medicine]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!medicine) return;

    setError('');

    if (action === 'ADJUSTMENT') {
      if (quantity < 0) {
        setError('Adjusted quantity cannot be negative.');
        return;
      }
    } else if (quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    if (action === 'STOCK_OUT' && quantity > medicine.quantity) {
      setError(`Only ${medicine.quantity} units are in stock.`);
      return;
    }

    setSubmitting(true);
    try {
      await medicineApi.updateStock(medicine.id, {
        type: action,
        quantity,
        notes: notes.trim() || undefined,
      });
      toast.success('Stock updated', `${medicine.name} is now at ${resulting} units`);
      onSaved();
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, 'Could not update stock'));
    } finally {
      setSubmitting(false);
    }
  };

  const ACTIONS: { value: StockAction; label: string; help: string }[] = [
    { value: 'STOCK_IN', label: 'Add stock', help: 'Adds the quantity to the current total' },
    { value: 'STOCK_OUT', label: 'Remove stock', help: 'Takes the quantity off the shelf' },
    { value: 'ADJUSTMENT', label: 'Set quantity', help: 'Overwrites the total with this number' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update stock"
      subtitle={medicine ? `${medicine.name}${medicine.batchNumber ? ` · Batch ${medicine.batchNumber}` : ''}` : undefined}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="stock-form" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner />}
            Apply update
          </button>
        </>
      }
    >
      <form id="stock-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="alert-critical !py-3" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {medicine && (
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 text-center">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">On hand</p>
              <p className="text-lg font-bold text-slate-800 tabular-nums">{medicine.quantity}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Minimum</p>
              <p className="text-lg font-bold text-slate-500 tabular-nums">{medicine.minimumStockLevel}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">After</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  resulting < 0
                    ? 'text-red-600'
                    : resulting <= medicine.minimumStockLevel
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {resulting}
              </p>
            </div>
          </div>
        )}

        <div>
          <span className="label">Action</span>
          <div className="space-y-2">
            {ACTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  action === option.value
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="stock-action"
                  className="mt-0.5 accent-primary-600"
                  checked={action === option.value}
                  onChange={() => {
                    setAction(option.value);
                    setQuantity(option.value === 'ADJUSTMENT' ? (medicine?.quantity ?? 0) : 1);
                  }}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.help}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="s-qty">
            {action === 'ADJUSTMENT' ? 'New quantity' : 'Quantity'}
          </label>
          <input
            id="s-qty"
            type="number"
            min={0}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="s-notes">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="s-notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Received against PO-1043"
          />
        </div>

        {medicine && medicine.sellingPrice != null && (
          <p className="text-xs text-slate-500">
            Selling price {formatCurrency(medicine.sellingPrice)} · expiry {formatDate(medicine.expiryDate)}
          </p>
        )}
      </form>
    </Modal>
  );
}