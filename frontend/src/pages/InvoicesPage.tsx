import { useCallback, useEffect, useState } from 'react';
import { invoiceApi } from '../api';
import { toErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import type { Invoice, InvoiceItem, InvoiceRequest } from '../types';
import { IconCheck, IconInbox, IconReceipt, IconRefresh, IconUpload } from '../components/Icons';
import { ExtractionBadge, InvoiceStatusBadge } from '../components/ui/Badges';
import Modal from '../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../components/ui/States';

export default function InvoicesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [review, setReview] = useState<Invoice | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await invoiceApi.getAll({ page: 0, size: 50 });
      setRows(data.content);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load invoices'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Invoices · MediTrack';
    void load();
  }, [load]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await invoiceApi.upload(file);
      if (data.items.length === 0) {
        toast.info('Invoice uploaded', data.extractionMessage || 'No line items were detected — enter them manually.');
      } else {
        toast.success('Invoice extracted', `${data.items.length} line items found`);
      }
      void load();
    } catch (err) {
      toast.error('Upload failed', toErrorMessage(err, 'Could not upload the invoice'));
    } finally {
      setUploading(false);
    }
  };

  const updateReviewItem = (index: number, field: keyof InvoiceItem, value: string | number | null) => {
    if (!review) return;
    const items = [...(review.items ?? [])];
    items[index] = { ...items[index], [field]: value };
    setReview({ ...review, items });
  };

  const addReviewItem = () => {
    if (!review) return;
    setReview({
      ...review,
      items: [...(review.items ?? []), { medicineName: '', quantity: 1, confirmed: false }],
    });
  };

  const removeReviewItem = (index: number) => {
    if (!review) return;
    setReview({ ...review, items: (review.items ?? []).filter((_, i) => i !== index) });
  };

  const handleConfirm = async () => {
    if (!review) return;
    setConfirming(true);
    try {
      const payload: InvoiceRequest = {
        invoiceNumber: review.invoiceNumber,
        invoiceDate: review.invoiceDate,
        supplierName: review.supplierName,
        supplierContact: review.supplierContact,
        totalAmount: review.totalAmount,
        items: (review.items ?? []).map((item) => ({
          medicineId: item.medicineId ?? null,
          medicineName: item.medicineName,
          genericName: item.genericName,
          batchNumber: item.batchNumber,
          quantity: item.quantity ?? null,
          purchasePrice: item.purchasePrice ?? null,
          sellingPrice: item.sellingPrice ?? null,
          gstPercent: item.gstPercent ?? null,
          manufacturingDate: item.manufacturingDate ?? null,
          expiryDate: item.expiryDate ?? null,
          confirmed: true,
        })),
      };
      await invoiceApi.confirm(review.id, payload);
      toast.success('Invoice confirmed', 'Inventory updated from invoice');
      setReview(null);
      void load();
    } catch (err) {
      toast.error('Confirmation failed', toErrorMessage(err, 'Could not confirm the invoice'));
    } finally {
      setConfirming(false);
    }
  };

  const total = rows.reduce((sum, invoice) => sum + (invoice.totalAmount ?? 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">
            {rows.length} invoices · {formatCurrency(total)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <IconRefresh className="w-4 h-4" />
            Refresh
          </button>
          <label className="btn-primary cursor-pointer">
            <IconUpload className="w-4 h-4" />
            Upload PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {uploading && (
        <div className="alert-blue mb-5">
          <Spinner />
          <p className="text-sm text-blue-800">Extracting text from the uploaded invoice…</p>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <LoadingState label="Loading invoices…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconReceipt className="w-7 h-7 text-slate-400" />}
            title="No invoices yet"
            description="Upload a supplier invoice PDF to extract its line items into inventory automatically."
          />
        </div>
      ) : (
        <div className="table-container bg-white">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Items</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-mono text-sm">{invoice.invoiceNumber || '—'}</td>
                  <td className="text-sm">{invoice.supplierName || '—'}</td>
                  <td className="text-sm text-slate-500">{formatDate(invoice.invoiceDate)}</td>
                  <td className="text-sm tabular-nums">{invoice.itemCount ?? invoice.items?.length ?? 0}</td>
                  <td className="text-right font-semibold tabular-nums">{formatCurrency(invoice.totalAmount)}</td>
                  <td>
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="text-sm text-slate-500">{formatDateTime(invoice.createdAt)}</td>
                  <td className="text-right">
                    <button type="button" className="btn-ghost" onClick={() => setReview(invoice)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={review !== null}
        onClose={() => setReview(null)}
        title={`Invoice ${review?.invoiceNumber ?? ''}`}
        subtitle={review ? `${review.supplierName ?? 'Unknown supplier'} · ${formatDate(review.invoiceDate)}` : undefined}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setReview(null)} disabled={confirming}>
              Close
            </button>
            <button
              type="button"
              className="btn-success"
              onClick={handleConfirm}
              disabled={confirming || (review?.items ?? []).length === 0}
            >
              {confirming && <Spinner />}
              <IconCheck className="w-4 h-4" />
              Confirm &amp; update inventory
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Supplier</p>
              <p className="text-sm font-medium text-slate-800">{review?.supplierName || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Contact</p>
              <p className="text-sm font-medium text-slate-800">{review?.supplierContact || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Date</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(review?.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums">{formatCurrency(review?.totalAmount)}</p>
            </div>
          </div>

          {(review?.items ?? []).length === 0 ? (
            <div className="alert-medium">
              <IconInbox className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                No line items were extracted from this invoice. Add them manually below.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Purchase</th>
                    <th className="text-right">Sell</th>
                    <th>Expiry</th>
                    <th>Extraction</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {(review?.items ?? []).map((item, index) => (
                    <tr key={item.id ?? index}>
                      <td>
                        <input
                          type="text"
                          className="input py-1.5"
                          value={item.medicineName ?? ''}
                          onChange={(e) => updateReviewItem(index, 'medicineName', e.target.value)}
                          placeholder="Medicine name"
                        />
                        {item.extractionNotes && (
                          <p className="text-xs text-amber-600 mt-0.5">{item.extractionNotes}</p>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input py-1.5"
                          value={item.batchNumber ?? ''}
                          onChange={(e) => updateReviewItem(index, 'batchNumber', e.target.value)}
                          placeholder="Batch"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input py-1.5 text-right"
                          value={item.quantity ?? ''}
                          onChange={(e) => updateReviewItem(index, 'quantity', e.target.value ? Number(e.target.value) : null)}
                          placeholder="Qty"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input py-1.5 text-right"
                          value={item.purchasePrice ?? ''}
                          onChange={(e) => updateReviewItem(index, 'purchasePrice', e.target.value ? Number(e.target.value) : null)}
                          placeholder="Purchase"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input py-1.5 text-right"
                          value={item.sellingPrice ?? ''}
                          onChange={(e) => updateReviewItem(index, 'sellingPrice', e.target.value ? Number(e.target.value) : null)}
                          placeholder="Sell"
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="input py-1.5"
                          value={item.expiryDate ?? ''}
                          onChange={(e) => updateReviewItem(index, 'expiryDate', e.target.value || null)}
                        />
                      </td>
                      <td>
                        <ExtractionBadge status={item.extractionStatus} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost px-1.5 py-1 text-red-400 hover:text-red-600"
                          onClick={() => removeReviewItem(index)}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn-secondary" onClick={addReviewItem}>
              + Add line item
            </button>
            <p className="text-xs text-slate-500">
              Confirming this invoice adds each line item to inventory as a stock-in movement.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}