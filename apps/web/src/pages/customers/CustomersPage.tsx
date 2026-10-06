import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CustomerDto,
  CustomerType,
  CustomerStatus,
  CUSTOMER_TYPE_LABELS,
  CreateCustomerSchema,
  formatPaisaToPKR,
  rupeesToPaisa,
  paisaToRupees,
  UserRole,
} from '@pharmacy/shared';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/Table';
import {
  Plus,
  RefreshCw,
  Search,
  Phone,
  Mail,
  BookOpen,
  Edit,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  cnic: string;
  customerType: CustomerType;
  creditLimitRupees: number;
  openingBalanceRupees: number;
  notes: string;
  status: CustomerStatus;
}

const BLANK_FORM: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  cnic: '',
  customerType: CustomerType.REGULAR,
  creditLimitRupees: 0,
  openingBalanceRupees: 0,
  notes: '',
  status: CustomerStatus.ACTIVE,
};

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = user?.role !== UserRole.CASHIER;

  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const [formData, setFormData] = useState<CustomerFormState>(BLANK_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (selectedType) params.set('type', selectedType);
      if (selectedStatus) params.set('status', selectedStatus);
      const res = await apiFetch<any>(`/api/customers?${params}`);
      if (res.success) setCustomers(res.data || []);
    } catch {
      // demo data visible via API fallback
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedType, selectedStatus]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Stats
  const totalOutstanding = customers.reduce((s, c) => s + c.currentBalancePaisa, 0);
  const overLimit = customers.filter((c) => c.currentBalancePaisa > c.creditLimitPaisa);
  const activeCount = customers.filter((c) => c.status === CustomerStatus.ACTIVE).length;

  const openAdd = () => {
    setEditingCustomer(null);
    setFormData(BLANK_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (c: CustomerDto) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      cnic: c.cnic || '',
      customerType: c.customerType,
      creditLimitRupees: paisaToRupees(c.creditLimitPaisa),
      openingBalanceRupees: paisaToRupees(c.openingBalancePaisa),
      notes: c.notes || '',
      status: c.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      cnic: formData.cnic.trim() || undefined,
      customerType: formData.customerType,
      creditLimitPaisa: rupeesToPaisa(formData.creditLimitRupees),
      openingBalancePaisa: rupeesToPaisa(formData.openingBalanceRupees),
      notes: formData.notes.trim() || undefined,
      status: formData.status,
    };

    const parsed = editingCustomer
      ? { success: true, data: payload }
      : CreateCustomerSchema.safeParse(payload);

    if (!parsed.success && 'error' in parsed) {
      setFormError((parsed as any).error.issues[0]?.message || 'Validation error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCustomer) {
        await apiFetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const utilPct = (balance: number, limit: number): number => {
    if (limit === 0) return 0;
    return Math.min(100, Math.round((balance / limit) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pharma-text flex items-center gap-2">
            <Users className="w-6 h-6 text-pharma-primary" />
            Credit Customers
          </h1>
          <p className="text-sm text-pharma-muted mt-1">
            Manage credit accounts, balances, and customer ledgers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCustomers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="pharma-panel p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-pharma-primary/10 flex items-center justify-center text-pharma-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-pharma-muted">Active Accounts</p>
            <p className="text-xl font-bold text-pharma-text">{activeCount}</p>
          </div>
        </div>
        <div className="pharma-panel p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-pharma-warning/10 flex items-center justify-center text-pharma-warning">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-pharma-muted">Total Outstanding</p>
            <p className="text-xl font-bold text-pharma-text">{formatPaisaToPKR(totalOutstanding)}</p>
          </div>
        </div>
        <div className="pharma-panel p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overLimit.length > 0 ? 'bg-pharma-danger/10 text-pharma-danger' : 'bg-pharma-accent/10 text-pharma-primary'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-pharma-muted">Over Credit Limit</p>
            <p className={`text-xl font-bold ${overLimit.length > 0 ? 'text-pharma-danger' : 'text-pharma-text'}`}>{overLimit.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="pharma-panel p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pharma-muted" />
            <input
              id="customers-search"
              type="text"
              placeholder="Search by name, phone, email, CNIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pharma-input w-full pl-9"
            />
          </div>
          <select
            id="customers-type-filter"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="pharma-input"
          >
            <option value="">All Types</option>
            {Object.values(CustomerType).map((t) => (
              <option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            id="customers-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="pharma-input"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="pharma-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-pharma-muted animate-spin" />
            <span className="ml-2 text-pharma-muted">Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title="No Customers Found"
            description="Add your first credit customer to start tracking their account."
            icon={<Users className="w-8 h-8" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const pct = utilPct(c.currentBalancePaisa, c.creditLimitPaisa);
                const isOverLimit = c.currentBalancePaisa > c.creditLimitPaisa && c.creditLimitPaisa > 0;
                return (
                  <TableRow key={c.id} className={isOverLimit ? 'bg-pharma-danger/5' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-pharma-text text-sm">{c.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-pharma-muted">
                            <Phone className="w-3 h-3" />{c.phone}
                          </span>
                          {c.email && (
                            <span className="flex items-center gap-1 text-xs text-pharma-muted">
                              <Mail className="w-3 h-3" />{c.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.customerType === CustomerType.CORPORATE ? 'primary' : c.customerType === CustomerType.DOCTOR_CLINIC ? 'near-expiry' : 'active'}>
                        {CUSTOMER_TYPE_LABELS[c.customerType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === CustomerStatus.BLOCKED ? 'expired' : c.status === CustomerStatus.INACTIVE ? 'quarantine' : 'active'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-pharma-text">
                      {c.creditLimitPaisa === 0 ? (
                        <span className="text-pharma-muted text-xs">No Limit</span>
                      ) : (
                        formatPaisaToPKR(c.creditLimitPaisa)
                      )}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-bold ${isOverLimit ? 'text-pharma-danger' : 'text-pharma-text'}`}>
                      {formatPaisaToPKR(c.currentBalancePaisa)}
                      {isOverLimit && <AlertTriangle className="w-3 h-3 inline ml-1 text-pharma-danger" />}
                    </TableCell>
                    <TableCell>
                      {c.creditLimitPaisa > 0 ? (
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-pharma-danger' : pct >= 80 ? 'bg-pharma-warning' : 'bg-pharma-accent'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium min-w-[32px] text-right ${pct >= 100 ? 'text-pharma-danger' : 'text-pharma-muted'}`}>{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-pharma-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/customers/${c.id}/ledger`)}
                          title="View ledger"
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1" />
                          Ledger
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(c)}
                            title="Edit customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit — ${editingCustomer.name}` : 'Add Credit Customer'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-pharma-danger/10 border border-pharma-danger/20 text-pharma-danger text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="pharma-label">Full Name *</label>
              <input
                id="customer-name"
                className="pharma-input w-full"
                placeholder="e.g. Ahmed Medical Store"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="pharma-label">Phone *</label>
              <input
                id="customer-phone"
                className="pharma-input w-full"
                placeholder="0300-1234567"
                value={formData.phone}
                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="pharma-label">Email</label>
              <input
                id="customer-email"
                type="email"
                className="pharma-input w-full"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="pharma-label">Address</label>
              <input
                id="customer-address"
                className="pharma-input w-full"
                placeholder="Street, City"
                value={formData.address}
                onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div>
              <label className="pharma-label">CNIC</label>
              <input
                id="customer-cnic"
                className="pharma-input w-full"
                placeholder="35201-1234567-1"
                value={formData.cnic}
                onChange={(e) => setFormData((f) => ({ ...f, cnic: e.target.value }))}
              />
            </div>

            <div>
              <label className="pharma-label">Customer Type</label>
              <select
                id="customer-type"
                className="pharma-input w-full"
                value={formData.customerType}
                onChange={(e) => setFormData((f) => ({ ...f, customerType: e.target.value as CustomerType }))}
              >
                {Object.values(CustomerType).map((t) => (
                  <option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="pharma-label">Credit Limit (PKR)</label>
              <input
                id="customer-credit-limit"
                type="number"
                min={0}
                step={1000}
                className="pharma-input w-full"
                placeholder="0 = No limit"
                value={formData.creditLimitRupees}
                onChange={(e) => setFormData((f) => ({ ...f, creditLimitRupees: Number(e.target.value) }))}
              />
              <p className="text-xs text-pharma-muted mt-1">Set 0 for no credit limit</p>
            </div>

            {!editingCustomer && (
              <div>
                <label className="pharma-label">Opening Balance (PKR)</label>
                <input
                  id="customer-opening-balance"
                  type="number"
                  min={0}
                  step={100}
                  className="pharma-input w-full"
                  placeholder="0.00"
                  value={formData.openingBalanceRupees}
                  onChange={(e) => setFormData((f) => ({ ...f, openingBalanceRupees: Number(e.target.value) }))}
                />
              </div>
            )}

            {editingCustomer && (
              <div>
                <label className="pharma-label">Status</label>
                <select
                  id="customer-status"
                  className="pharma-input w-full"
                  value={formData.status}
                  onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value as CustomerStatus }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="pharma-label">Notes</label>
              <textarea
                id="customer-notes"
                className="pharma-input w-full resize-none"
                rows={2}
                placeholder="Internal notes about this customer..."
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-pharma-accent/20">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
