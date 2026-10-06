import type { ReactNode } from 'react';

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'orange';

const toneClass: Record<Tone, string> = {
  green: 'badge-green',
  red: 'badge-red',
  amber: 'badge-amber',
  blue: 'badge-blue',
  gray: 'badge-gray',
  orange: 'badge-orange',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={toneClass[tone]}>{children}</span>;
}

export function StockBadge({ status }: { status?: string }) {
  switch (status) {
    case 'IN_STOCK':
      return <Badge tone="green">In stock</Badge>;
    case 'LOW_STOCK':
      return <Badge tone="amber">Low stock</Badge>;
    case 'OUT_OF_STOCK':
      return <Badge tone="red">Out of stock</Badge>;
    default:
      return <Badge tone="gray">Unknown</Badge>;
  }
}

export function ExpiryBadge({
  status,
  daysUntilExpiry,
}: {
  status?: string;
  daysUntilExpiry?: number | null;
}) {
  const suffix = daysUntilExpiry === null || daysUntilExpiry === undefined ? '' : ` · ${daysUntilExpiry}d`;
  switch (status) {
    case 'EXPIRED':
      return <Badge tone="red">Expired{suffix}</Badge>;
    case 'EXPIRING_7':
      return <Badge tone="orange">≤ 7 days{suffix}</Badge>;
    case 'EXPIRING_15':
      return <Badge tone="amber">≤ 15 days{suffix}</Badge>;
    case 'EXPIRING_30':
      return <Badge tone="blue">≤ 30 days{suffix}</Badge>;
    case 'GOOD':
      return <Badge tone="green">Good</Badge>;
    default:
      return <Badge tone="gray">No expiry</Badge>;
  }
}

export function RoleBadge({ role }: { role?: string }) {
  return <Badge tone={role === 'ADMIN' ? 'blue' : 'gray'}>{role ?? '—'}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case 'CONFIRMED':
      return <Badge tone="green">Confirmed</Badge>;
    case 'REVIEW_REQUIRED':
      return <Badge tone="amber">Review required</Badge>;
    case 'PROCESSING':
      return <Badge tone="blue">Processing</Badge>;
    case 'FAILED':
      return <Badge tone="red">Failed</Badge>;
    case 'UPLOADED':
      return <Badge tone="gray">Uploaded</Badge>;
    default:
      return <Badge tone="gray">{status ?? '—'}</Badge>;
  }
}

export function TransactionBadge({ type }: { type?: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    STOCK_IN: { tone: 'green', label: 'Stock in' },
    STOCK_OUT: { tone: 'orange', label: 'Stock out' },
    ADJUSTMENT: { tone: 'blue', label: 'Adjustment' },
    SALE: { tone: 'amber', label: 'Sale' },
    INVOICE_UPDATE: { tone: 'gray', label: 'Invoice' },
  };
  const entry = map[type ?? ''];
  if (!entry) return <Badge tone="gray">{type ?? '—'}</Badge>;
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function SeverityBadge({ severity }: { severity?: string }) {
  const map: Record<string, Tone> = {
    CRITICAL: 'red',
    HIGH: 'orange',
    MEDIUM: 'amber',
    LOW: 'blue',
  };
  return <Badge tone={map[severity ?? ''] ?? 'gray'}>{severity ?? '—'}</Badge>;
}

export function ExtractionBadge({ status }: { status?: string }) {
  switch (status) {
    case 'EXTRACTED':
      return <Badge tone="green">Extracted</Badge>;
    case 'PARTIAL':
      return <Badge tone="amber">Partial</Badge>;
    case 'MISSING':
      return <Badge tone="red">Missing</Badge>;
    default:
      return <Badge tone="gray">—</Badge>;
  }
}