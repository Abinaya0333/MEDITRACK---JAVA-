import api from './client';
import type {
  Medicine, MedicineRequest, PageResponse, InventoryTransaction,
  DashboardSummary, Invoice, InvoiceRequest, ExtractionResult,
  Sale, SaleRequest, User, UserCreateRequest, UserUpdateRequest, SessionUser
} from '../types';

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post<SessionUser>('/api/auth/login', { username, password }),
  me: () => api.get<SessionUser>('/api/auth/me'),
};

// Dashboard
export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/api/dashboard'),
};

export interface MedicineQuery {
  search?: string;
  category?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// Medicines
export const medicineApi = {
  getAll: (params?: MedicineQuery) =>
    api.get<PageResponse<Medicine>>('/api/medicines', { params }),

  getById: (id: number) => api.get<Medicine>(`/api/medicines/${id}`),

  create: (data: MedicineRequest) => api.post<Medicine>('/api/medicines', data),

  update: (id: number, data: MedicineRequest) => api.put<Medicine>(`/api/medicines/${id}`, data),

  delete: (id: number) => api.delete<void>(`/api/medicines/${id}`),

  updateStock: (id: number, data: { type: string; quantity: number; notes?: string }) =>
    api.post<Medicine>(`/api/medicines/${id}/stock`, data),

  getCategories: () => api.get<string[]>('/api/medicines/categories'),

  getLowStock: () => api.get<Medicine[]>('/api/medicines/low-stock'),

  getExpired: () => api.get<Medicine[]>('/api/medicines/expired'),

  getExpiringSoon: (days = 30) =>
    api.get<Medicine[]>('/api/medicines/expiring-soon', { params: { days } }),
};

export interface TransactionQuery {
  page?: number;
  size?: number;
  medicineId?: number;
}

// Inventory
export const inventoryApi = {
  getTransactions: (params?: TransactionQuery) =>
    api.get<PageResponse<InventoryTransaction>>('/api/inventory/transactions', { params }),

  getActivity: (days = 7, size = 50) =>
    api.get<InventoryTransaction[]>('/api/inventory/activity', { params: { days, size } }),
};

// Invoices
export const invoiceApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ExtractionResult>('/api/invoices/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createManual: (data: InvoiceRequest) => api.post<Invoice>('/api/invoices/manual', data),

  confirm: (id: number, data: InvoiceRequest) => api.post<Invoice>(`/api/invoices/${id}/confirm`, data),

  getAll: (params?: { page?: number; size?: number }) =>
    api.get<PageResponse<Invoice>>('/api/invoices', { params }),

  getById: (id: number) => api.get<Invoice>(`/api/invoices/${id}`),
};

export interface AlertBundle {
  lowStock: Medicine[];
  expiring: Medicine[];
  expired: Medicine[];
}

// Alerts
export const alertApi = {
  getAllAlerts: () => api.get<AlertBundle>('/api/alerts'),
  getLowStock: () => api.get<Medicine[]>('/api/alerts/low-stock'),
  getExpiry: (days = 30) => api.get<Medicine[]>('/api/alerts/expiry', { params: { days } }),
  getExpired: () => api.get<Medicine[]>('/api/alerts/expired'),
};

// Sales
export const saleApi = {
  getAll: (params?: { page?: number; size?: number }) =>
    api.get<PageResponse<Sale>>('/api/sales', { params }),

  create: (data: SaleRequest) => api.post<Sale>('/api/sales', data),
};

// Reports
export const reportApi = {
  inventory: (params?: { page?: number; size?: number }) =>
    api.get<PageResponse<Medicine>>('/api/reports/inventory', { params }),

  expiry: (days = 90) =>
    api.get<Medicine[]>('/api/reports/expiry', { params: { days } }),

  sales: (params?: { page?: number; size?: number }) =>
    api.get<PageResponse<Sale>>('/api/reports/sales', { params }),

  lowStock: () => api.get<Medicine[]>('/api/reports/low-stock'),
};

// Users
export const userApi = {
  getAll: () => api.get<User[]>('/api/users'),
  getById: (id: number) => api.get<User>(`/api/users/${id}`),
  create: (data: UserCreateRequest) => api.post<User>('/api/users', data),
  update: (id: number, data: UserUpdateRequest) => api.put<User>(`/api/users/${id}`, data),
};