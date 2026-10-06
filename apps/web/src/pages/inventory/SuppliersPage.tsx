import React, { useState, useEffect } from 'react';
import {
  SupplierDto,
  SupplierStatus,
  formatPaisaToPKR,
  rupeesToPaisa,
  paisaToRupees,
  UserRole,
} from '@pharmacy/shared';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { FormActionPair } from '../../components/ui/FormActionPair';
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
  FileSpreadsheet,
  Search,
  Phone,
  Mail,
  Building2,
  Edit,
} from 'lucide-react';

interface SupplierFormState {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  paymentTermsDays: number;
  openingBalanceRupees: number;
  status: SupplierStatus;
}

export const SuppliersPage: React.FC = () => {
  const { user } = useAuthStore();
  const isCashier = user?.role === UserRole.CASHIER;

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<any>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // Form State
  const [formData, setFormData] = useState<SupplierFormState>({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    paymentTermsDays: 30,
    openingBalanceRupees: 0,
    status: SupplierStatus.ACTIVE,
  });

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (searchTerm) q.set('search', searchTerm);
      if (selectedStatus) q.set('status', selectedStatus);

      const res = await apiFetch<any>(`/api/suppliers?${q.toString()}`);
      if (res.success) {
        setSuppliers(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedStatus]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      taxNumber: '',
      paymentTermsDays: 30,
      openingBalanceRupees: 0,
      status: SupplierStatus.ACTIVE,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: SupplierDto) => {
    setEditingSupplier(s);
    setFormData({
      code: s.code,
      name: s.name,
      contactPerson: s.contactPerson || '',
      phone: s.phone,
      email: s.email || '',
      address: s.address || '',
      taxNumber: s.taxNumber || '',
      paymentTermsDays: s.paymentTermsDays,
      openingBalanceRupees: paisaToRupees(s.openingBalancePaisa),
      status: s.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: formData.code.toUpperCase(),
      name: formData.name,
      contactPerson: formData.contactPerson || undefined,
      phone: formData.phone,
      email: formData.email || undefined,
      address: formData.address || undefined,
      taxNumber: formData.taxNumber || undefined,
      paymentTermsDays: Number(formData.paymentTermsDays),
      openingBalancePaisa: rupeesToPaisa(formData.openingBalanceRupees),
      currentBalancePaisa: rupeesToPaisa(formData.openingBalanceRupees),
      status: formData.status,
    };

    try {
      if (editingSupplier?.id) {
        await apiFetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch {
      setIsModalOpen(false);
      loadSuppliers();
    }
  };

  const handleCsvImport = async (dryRun = false) => {
    if (!csvText.trim()) return;
    setIsImportingCsv(true);
    try {
      const res = await apiFetch<any>('/api/suppliers/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csvText, dryRun }),
      });
      if (res.success) {
        setCsvResult(res);
        if (!dryRun && res.summary.validCount > 0) {
          loadSuppliers();
        }
      }
    } catch {
      // fallback
    } finally {
      setIsImportingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
              Phase 1A: Procurement & Logistics
            </span>
            <Badge variant="active" dot={false}>
              Credit & Tax Ledger
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-pharma-text">Supplier Master & Creditors</h1>
          <p className="text-xs text-pharma-muted mt-1">
            Maintain authorized medicine distributors, pharmaceutical wholesalers, NTN/STRN tax files, and payment credit terms.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvModalOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Import CSV
          </Button>

          {!isCashier && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Supplier
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadSuppliers}
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filter / Search Panel */}
      <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Input
            placeholder="Search by supplier name, code, contact person, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefixElement={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: SupplierStatus.ACTIVE, label: 'Active Suppliers' },
              { value: SupplierStatus.INACTIVE, label: 'Inactive / Suspended' },
            ]}
          />
        </div>
      </div>

      {/* Supplier Table Panel */}
      <div className="pharma-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-pharma-text">
              Distributor & Wholesale Directory ({suppliers.length})
            </h2>
            <span className="text-xs text-pharma-muted">
              • Integer Paisa Ledger Balances
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-pharma-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pharma-primary mb-2" />
            Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            title="No suppliers found"
            description="No suppliers match your search filters or directory is empty."
            actionLabel="Reset Search"
            onAction={() => {
              setSearchTerm('');
              setSelectedStatus('');
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code & Company</TableHead>
                <TableHead>Contact & Phone</TableHead>
                <TableHead>NTN / STRN</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Current Balance (PKR)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id || s.code}>
                  <TableCell>
                    <div>
                      <div className="font-bold text-pharma-text flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-pharma-primary" />
                        {s.name}
                      </div>
                      <div className="text-[11px] text-pharma-muted flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-pharma-surface px-1.5 py-0.5 rounded border border-pharma-muted/20">
                          {s.code}
                        </span>
                        {s.address && (
                          <span className="truncate max-w-[200px]" title={s.address}>
                            📍 {s.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-semibold text-pharma-text">
                      {s.contactPerson || '-'}
                    </div>
                    <div className="text-[11px] text-pharma-muted flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-pharma-primary" />
                        {s.phone}
                      </span>
                      {s.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-pharma-muted" />
                          {s.email}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-mono text-pharma-text">
                      {s.taxNumber || 'Non-filer'}
                    </div>
                    <div className="text-[10px] text-pharma-muted">
                      {s.taxNumber ? 'FBR Verified' : 'Standard'}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-semibold text-pharma-text">
                      {s.paymentTermsDays === 0 ? 'Cash on Delivery' : `${s.paymentTermsDays} Days Credit`}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-bold text-pharma-text text-xs">
                      {formatPaisaToPKR(s.currentBalancePaisa || s.openingBalancePaisa || 0)}
                    </div>
                    <div className="text-[10px] text-pharma-muted">
                      Opening: {formatPaisaToPKR(s.openingBalancePaisa || 0)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={s.status === SupplierStatus.ACTIVE ? 'active' : 'quarantine'} dot={false}>
                      {s.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {!isCashier && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(s)}
                        title="Edit Supplier"
                        className="h-8 px-2 text-xs"
                      >
                        <Edit className="w-3.5 h-3.5 text-pharma-text" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT SUPPLIER MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Medicine Supplier'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Supplier Code"
              placeholder="e.g. SUP-MADINA"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <Input
              label="Company / Firm Name"
              placeholder="e.g. Al-Madina Pharma Distributors"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Contact Person"
              placeholder="e.g. Haji Muhammad Rizwan"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. 0300-1234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. sales@distributor.pk"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="NTN / STRN Tax Number"
              placeholder="e.g. NTN-4891234-7"
              value={formData.taxNumber}
              onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
            />
            <Input
              label="Payment Terms (Days Credit)"
              type="number"
              value={formData.paymentTermsDays}
              onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value, 10) || 0 })}
            />
            {!editingSupplier && (
              <Input
                label="Opening Balance (PKR)"
                type="number"
                step="0.01"
                value={formData.openingBalanceRupees}
                onChange={(e) =>
                  setFormData({ ...formData, openingBalanceRupees: parseFloat(e.target.value) || 0 })
                }
              />
            )}
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as SupplierStatus })}
              options={[
                { value: SupplierStatus.ACTIVE, label: 'Active' },
                { value: SupplierStatus.INACTIVE, label: 'Inactive' },
              ]}
            />
          </div>

          <Input
            label="Full Physical Warehouse Address"
            placeholder="e.g. Medicine Market, Katchery Road, Lahore"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="border-t border-pharma-muted/20 pt-4">
            <FormActionPair
              saveLabel={editingSupplier ? 'Save Changes' : 'Create Supplier'}
              cancelLabel="Cancel"
              saveType="submit"
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* CSV IMPORT MODAL                                              */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={csvModalOpen}
        onClose={() => {
          setCsvModalOpen(false);
          setCsvResult(null);
        }}
        title="Batch Import Suppliers via CSV"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/20 text-xs">
            <p className="font-bold text-pharma-text mb-1">CSV Template Format:</p>
            <p className="font-mono text-[11px] text-pharma-muted select-all bg-pharma-white p-2 rounded border border-pharma-muted/20 overflow-x-auto">
              name,code,phone,contactperson,email,address,taxnumber,paymenttermsdays,openingbalance
              <br />
              Al-Madina Pharma,SUP-001,0300-1234567,Rizwan,sales@madina.pk,Lahore,NTN-123456,30,50000
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-pharma-text mb-1.5">
              Paste CSV Content:
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste comma-separated rows here..."
              className="w-full text-xs font-mono p-3 rounded-pharma border border-pharma-muted/30 focus:border-pharma-primary focus:ring-1 focus:ring-pharma-accent outline-none"
            />
          </div>

          {csvResult && (
            <div className="p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/20 text-xs space-y-2">
              <div className="font-bold text-pharma-text flex items-center justify-between">
                <span>Import Analysis:</span>
                <span className="text-pharma-primary">
                  {csvResult.summary.validCount} valid / {csvResult.summary.totalRows} rows
                </span>
              </div>
              {csvResult.errors && csvResult.errors.length > 0 && (
                <div className="text-pharma-danger space-y-1">
                  <strong>Errors detected:</strong>
                  {csvResult.errors.map((err: any, i: number) => (
                    <div key={i}>
                      Row {err.row}: {err.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCsvImport(true)}
              disabled={isImportingCsv || !csvText.trim()}
            >
              Validate & Preview
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCsvModalOpen(false);
                  setCsvResult(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCsvImport(false)}
                disabled={isImportingCsv || !csvText.trim()}
              >
                {isImportingCsv ? 'Importing...' : 'Commit Import'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
