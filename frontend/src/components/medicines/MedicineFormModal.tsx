import { useEffect, useState } from 'react';
import { medicineApi } from '../../api';
import { fieldErrorOf, toErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { toApiNumber } from '../../lib/format';
import type { Medicine, MedicineRequest } from '../../types';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/States';

interface MedicineFormState {
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  supplier: string;
  quantity: number;
  minimumStockLevel: number;
  purchasePrice: string;
  sellingPrice: string;
  expiryDate: string;
  manufacturingDate: string;
}

const BLANK: MedicineFormState = {
  name: '',
  genericName: '',
  category: '',
  manufacturer: '',
  batchNumber: '',
  supplier: '',
  quantity: 0,
  minimumStockLevel: 10,
  purchasePrice: '',
  sellingPrice: '',
  expiryDate: '',
  manufacturingDate: '',
};

function toFormState(medicine: Medicine): MedicineFormState {
  return {
    name: medicine.name,
    genericName: medicine.genericName ?? '',
    category: medicine.category ?? '',
    manufacturer: medicine.manufacturer ?? '',
    batchNumber: medicine.batchNumber ?? '',
    supplier: medicine.supplier ?? '',
    quantity: medicine.quantity,
    minimumStockLevel: medicine.minimumStockLevel,
    purchasePrice: medicine.purchasePrice != null ? String(medicine.purchasePrice) : '',
    sellingPrice: medicine.sellingPrice != null ? String(medicine.sellingPrice) : '',
    expiryDate: medicine.expiryDate ?? '',
    manufacturingDate: medicine.manufacturingDate ?? '',
  };
}

interface MedicineFormModalProps {
  open: boolean;
  medicine: Medicine | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function MedicineFormModal({
  open,
  medicine,
  categories,
  onClose,
  onSaved,
}: MedicineFormModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<MedicineFormState>(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = Boolean(medicine?.id);

  useEffect(() => {
    if (!open) return;
    setForm(medicine ? toFormState(medicine) : BLANK);
    setError('');
    setErrors({});
  }, [open, medicine]);

  const set = <K extends keyof MedicineFormState>(key: K, value: MedicineFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setErrors({});

    if (!form.name.trim()) {
      setErrors({ name: 'Medicine name is required' });
      return;
    }
    if (Number(form.minimumStockLevel) < 0) {
      setErrors({ minimumStockLevel: 'Minimum stock level cannot be negative' });
      return;
    }
    if (Number(form.quantity) < 0) {
      setErrors({ quantity: 'Quantity cannot be negative' });
      return;
    }

    const payload: MedicineRequest = {
      name: form.name.trim(),
      genericName: form.genericName.trim() || undefined,
      category: form.category.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      batchNumber: form.batchNumber.trim() || undefined,
      supplier: form.supplier.trim() || undefined,
      quantity: Number(form.quantity),
      minimumStockLevel: Number(form.minimumStockLevel),
      purchasePrice: toApiNumber(form.purchasePrice) ?? null,
      sellingPrice: toApiNumber(form.sellingPrice) ?? null,
      expiryDate: form.expiryDate || null,
      manufacturingDate: form.manufacturingDate || null,
    };

    setSubmitting(true);
    try {
      if (isEdit && medicine) {
        await medicineApi.update(medicine.id, payload);
        toast.success('Medicine updated', payload.name);
      } else {
        await medicineApi.create(payload);
        toast.success('Medicine added', payload.name);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, 'Could not save the medicine'));
      setErrors({
        name: fieldErrorOf(err, 'name') ?? '',
        quantity: fieldErrorOf(err, 'quantity') ?? '',
        minimumStockLevel: fieldErrorOf(err, 'minimumStockLevel') ?? '',
        expiryDate: fieldErrorOf(err, 'expiryDate') ?? '',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit medicine' : 'Add medicine'}
      subtitle={isEdit ? medicine?.batchNumber ? `Batch ${medicine.batchNumber}` : undefined : 'Creates a new inventory record'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="medicine-form" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner />}
            {isEdit ? 'Save changes' : 'Add medicine'}
          </button>
        </>
      }
    >
      <form id="medicine-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="alert-critical !py-3" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="m-name">
              Medicine name <span className="text-red-500">*</span>
            </label>
            <input
              id="m-name"
              className={`input ${errors.name ? 'input-error' : ''}`}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Paracetamol 500mg"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="m-generic">
              Generic name
            </label>
            <input
              id="m-generic"
              className="input"
              value={form.genericName}
              onChange={(e) => set('genericName', e.target.value)}
              placeholder="Acetaminophen"
            />
          </div>

          <div>
            <label className="label" htmlFor="m-category">
              Category
            </label>
            <input
              id="m-category"
              className="input"
              list="category-options"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="Analgesic"
            />
            <datalist id="category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="label" htmlFor="m-batch">
              Batch number
            </label>
            <input
              id="m-batch"
              className="input"
              value={form.batchNumber}
              onChange={(e) => set('batchNumber', e.target.value)}
              placeholder="B-2024-0917"
            />
          </div>

          <div>
            <label className="label" htmlFor="m-manufacturer">
              Manufacturer
            </label>
            <input
              id="m-manufacturer"
              className="input"
              value={form.manufacturer}
              onChange={(e) => set('manufacturer', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="m-supplier">
              Supplier
            </label>
            <input
              id="m-supplier"
              className="input"
              value={form.supplier}
              onChange={(e) => set('supplier', e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Stock &amp; pricing</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="m-qty">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="m-qty"
                type="number"
                min={0}
                className={`input ${errors.quantity ? 'input-error' : ''}`}
                value={form.quantity}
                onChange={(e) => set('quantity', Number(e.target.value))}
              />
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
              {isEdit && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Changing this records an adjustment in the ledger.
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="m-min">
                Minimum level <span className="text-red-500">*</span>
              </label>
              <input
                id="m-min"
                type="number"
                min={0}
                className={`input ${errors.minimumStockLevel ? 'input-error' : ''}`}
                value={form.minimumStockLevel}
                onChange={(e) => set('minimumStockLevel', Number(e.target.value))}
              />
              {errors.minimumStockLevel && (
                <p className="text-xs text-red-600 mt-1">{errors.minimumStockLevel}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="m-purchase">
                Purchase price
              </label>
              <input
                id="m-purchase"
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={form.purchasePrice ?? ''}
                onChange={(e) => set('purchasePrice', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label" htmlFor="m-selling">
                Selling price
              </label>
              <input
                id="m-selling"
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={form.sellingPrice ?? ''}
                onChange={(e) => set('sellingPrice', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label" htmlFor="m-mfg">
                Manufacturing date
              </label>
              <input
                id="m-mfg"
                type="date"
                className="input"
                value={form.manufacturingDate ?? ''}
                onChange={(e) => set('manufacturingDate', e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="m-exp">
                Expiry date
              </label>
              <input
                id="m-exp"
                type="date"
                className={`input ${errors.expiryDate ? 'input-error' : ''}`}
                value={form.expiryDate ?? ''}
                onChange={(e) => set('expiryDate', e.target.value)}
              />
              {errors.expiryDate && <p className="text-xs text-red-600 mt-1">{errors.expiryDate}</p>}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}