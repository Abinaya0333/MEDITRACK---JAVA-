export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF';
  active: boolean;
  lastLogin?: string;
  createdAt?: string;
}

/** Shape returned by /api/auth/login and /api/auth/me. */
export interface SessionUser {
  token: string | null;
  username: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  userId: number;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: 'ADMIN' | 'STAFF';
}

export interface UserUpdateRequest {
  fullName?: string;
  email?: string;
  role?: 'ADMIN' | 'STAFF';
  active?: boolean;
  password?: string;
}

export interface Medicine {
  id: number;
  name: string;
  genericName?: string;
  category?: string;
  manufacturer?: string;
  batchNumber?: string;
  supplier?: string;
  quantity: number;
  minimumStockLevel: number;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: string;
  manufacturingDate?: string;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  expiryStatus: 'GOOD' | 'EXPIRING_7' | 'EXPIRING_15' | 'EXPIRING_30' | 'EXPIRED' | 'UNKNOWN';
  daysUntilExpiry?: number;
  createdAt?: string;
  updatedAt?: string;
  status: string;
}

export type TransactionType =
  | 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'SALE' | 'INVOICE_UPDATE';

export interface InventoryTransaction {
  id: number;
  medicineId: number;
  medicineName: string;
  type: TransactionType | string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  referenceNumber?: string;
  performedByName?: string;
  createdAt: string;
}

export interface MedicineRequest {
  name: string;
  genericName?: string;
  category?: string;
  manufacturer?: string;
  batchNumber?: string;
  supplier?: string;
  quantity: number;
  minimumStockLevel: number;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  expiryDate?: string | null;
  manufacturingDate?: string | null;
}

export type InvoiceStatus =
  | 'UPLOADED' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'CONFIRMED' | 'FAILED';

export interface Invoice {
  id: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierName?: string;
  supplierContact?: string;
  totalAmount?: number;
  status: InvoiceStatus | string;
  fileName?: string;
  fileType?: string;
  entryMethod?: string;
  itemCount?: number;
  uploadedByName?: string;
  createdAt?: string;
  confirmedAt?: string;
  items?: InvoiceItem[];
}

export interface InvoiceItemRequest {
  medicineId?: number | null;
  medicineName?: string;
  genericName?: string;
  batchNumber?: string;
  quantity?: number | null;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  gstPercent?: number | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  confirmed: boolean;
}

export interface InvoiceRequest {
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierName?: string;
  supplierContact?: string;
  totalAmount?: number | null;
  items: InvoiceItemRequest[];
}

export interface InvoiceItem {
  id?: number;
  medicineId?: number;
  medicineName?: string;
  genericName?: string;
  batchNumber?: string;
  quantity?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  gstPercent?: number;
  manufacturingDate?: string;
  expiryDate?: string;
  extractionStatus?: string;
  extractionNotes?: string;
  confirmed?: boolean;
}

export interface ExtractionResult {
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierName?: string;
  supplierContact?: string;
  totalAmount?: number;
  items: ExtractedItem[];
  partialExtraction: boolean;
  extractionMessage?: string;
}

export interface ExtractedItem {
  medicineName?: string;
  genericName?: string;
  batchNumber?: string;
  quantity?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  manufacturingDate?: string;
  expiryDate?: string;
  extractionStatus?: 'EXTRACTED' | 'PARTIAL' | 'MISSING';
  extractionNotes?: string;
  possibleMatchId?: number;
  possibleMatchName?: string;
}

export interface SaleItemRequest {
  medicineId: number;
  quantity: number;
  unitPrice: number;
}

export interface SaleRequest {
  items: SaleItemRequest[];
  notes?: string;
}

export interface Sale {
  id: number;
  saleNumber: string;
  totalAmount: number;
  notes?: string;
  performedByName?: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DashboardSummary {
  totalMedicines: number;
  totalStock: number;
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  todaySalesCount: number;
  todayRevenue: number;
  lowStockAlerts: AlertItem[];
  expiryAlerts: AlertItem[];
  recentActivity: RecentActivity[];
  expiryBreakdown: ExpiryBreakdown;
}

export interface AlertItem {
  id: number;
  medicineName: string;
  batchNumber?: string;
  quantity: number;
  minimumStockLevel?: number;
  expiryDate?: string;
  daysUntilExpiry?: number;
  alertType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

export interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
  performedBy?: string;
}

export interface ExpiryBreakdown {
  expired: number;
  within7Days: number;
  within15Days: number;
  within30Days: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
