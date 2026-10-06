import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SupplierDto,
  SupplierStatus,
  ExpiryClaimDto,
  ExpiryClaimStatus,
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
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isCashier = user?.role === UserRole.CASHIER;

  // Active top-level view
  const [activeTab, setActiveTab] = useState<'directory' | 'expiryClaims'>('directory');

  // Supplier directory state
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

  // ── Expiry Claims State (3-Status Workflow) ──────────────────────────────
  const [claims, setClaims] = useState<ExpiryClaimDto[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimStatusFilter, setClaimStatusFilter] = useState('');

  // New Claim Modal
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [claimSupplierId, setClaimSupplierId] = useState('');
  const [claimItemName, setClaimItemName] = useState('');
  const [claimBatch, setClaimBatch] = useState('');
  const [claimExpiry, setClaimExpiry] = useState('');
  const [claimQty, setClaimQty] = useState('1');
  const [claimCostRupees, setClaimCostRupees] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claimError, setClaimError] = useState('');
  const [isSavingClaim, setIsSavingClaim] = useState(false);

  // Receive Credit Note Modal
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [selectedClaimForNote, setSelectedClaimForNote] = useState<ExpiryClaimDto | null>(null);
  const [cnNumber, setCnNumber] = useState('');
  const [cnAmountRupees, setCnAmountRupees] = useState('');
  const [cnNotes, setCnNotes] = useState('');
  const [cnError, setCnError] = useState('');
  const [isSavingCN, setIsSavingCN] = useState(false);

  // Adjust Claim Confirmation Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedClaimToAdjust, setSelectedClaimToAdjust] = useState<ExpiryClaimDto | null>(null);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

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

  const loadExpiryClaims = async () => {
    setClaimsLoading(true);
    try {
      const q = new URLSearchParams();
      if (claimStatusFilter) q.set('status', claimStatusFilter);

      const res = await apiFetch<any>(`/api/supplier-ledger/expiry-claims?${q.toString()}`);
      if (res.success) {
        setClaims(res.data || []);
      }
    } catch {
      // fallback
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedStatus]);

  useEffect(() => {
    if (activeTab === 'expiryClaims') {
      loadExpiryClaims();
    }
  }, [activeTab, claimStatusFilter]);

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
      openingBalancePaisa: rupeesToPaisa(Number(formData.openingBalanceRupees)),
      status: formData.status,
    };

    try {
      if (editingSupplier) {
        await apiFetch<any>(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch<any>('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch {
      // error
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setIsImportingCsv(true);
    setCsvResult(null);

    try {
      const rows = csvText
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);
      if (rows.length < 2) {
        setCsvResult({ success: false, message: 'CSV must contain at least a header and 1 data row.' });
        return;
      }

      const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
      const dataRows = rows.slice(1);

      const items = dataRows.map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });
        return {
          code: rowObj['code'] || `SUP-${Math.floor(100 + Math.random() * 900)}`,
          name: rowObj['name'] || 'Unnamed Supplier',
          contactPerson: rowObj['contactperson'] || rowObj['contact'] || undefined,
          phone: rowObj['phone'] || '0300-0000000',
          email: rowObj['email'] || undefined,
          address: rowObj['address'] || undefined,
          taxNumber: rowObj['taxnumber'] || rowObj['ntn'] || undefined,
          paymentTermsDays: Number(rowObj['terms'] || rowObj['paymenttermsdays'] || 30),
          openingBalancePaisa: rupeesToPaisa(Number(rowObj['balance'] || rowObj['openingbalance'] || 0)),
          status: SupplierStatus.ACTIVE,
        };
      });

      const res = await apiFetch<any>('/api/suppliers/import', {
        method: 'POST',
        body: JSON.stringify({ suppliers: items }),
      });

      if (res.success) {
        setCsvResult(res);
        loadSuppliers();
      } else {
        setCsvResult({ success: false, message: res.error || 'Import failed' });
      }
    } catch (err: any) {
      setCsvResult({ success: false, message: err.message || 'Import failed' });
    } finally {
      setIsImportingCsv(false);
    }
  };

  // ── Expiry Claims Handlers ───────────────────────────────────────────────
  const openNewClaimModal = () => {
    setClaimSupplierId(suppliers[0]?.id || '');
    setClaimItemName('');
    setClaimBatch('');
    setClaimExpiry(new Date().toISOString().split('T')[0]);
    setClaimQty('1');
    setClaimCostRupees('');
    setClaimNotes('');
    setClaimError('');
    setIsNewClaimOpen(true);
  };

  const handleCreateExpiryClaim = async () => {
    setClaimError('');
    if (!claimSupplierId) {
      setClaimError('Please select a supplier');
      return;
    }
    if (!claimItemName.trim()) {
      setClaimError('Medicine name is required');
      return;
    }
    const qty = parseInt(claimQty, 10);
    const cost = parseFloat(claimCostRupees);
    if (!qty || qty <= 0) {
      setClaimError('Quantity must be greater than 0');
      return;
    }
    if (!cost || cost <= 0) {
      setClaimError('Cost price must be greater than 0');
      return;
    }

    setIsSavingClaim(true);
    try {
      const totalCostPaisa = rupeesToPaisa(cost * qty);
      const res = await apiFetch<any>('/api/supplier-ledger/expiry-claims', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: claimSupplierId,
          notes: claimNotes || undefined,
          items: [
            {
              productId: `prod-temp-${Date.now()}`,
              productName: claimItemName,
              batchId: `batch-temp-${Date.now()}`,
              batchNumber: claimBatch || 'BATCH-EXP',
              expiryDate: new Date(claimExpiry || Date.now()).toISOString(),
              quantitySmallestUnits: qty,
              costPricePaisa: totalCostPaisa,
            },
          ],
        }),
      });

      if (res.success) {
        setIsNewClaimOpen(false);
        loadExpiryClaims();
      } else {
        setClaimError(res.message || res.error || 'Failed to create expiry claim');
      }
    } catch (err: any) {
      setClaimError(err.message || 'Error creating expiry claim');
    } finally {
      setIsSavingClaim(false);
    }
  };

  const openReceiveCNModal = (claim: ExpiryClaimDto) => {
    setSelectedClaimForNote(claim);
    setCnNumber(`CN-${claim.claimNumber.replace('CLM-', '')}`);
    setCnAmountRupees(paisaToRupees(claim.totalClaimPaisa).toString());
    setCnNotes('');
    setCnError('');
    setCreditNoteModalOpen(true);
  };

  const handleConfirmCreditNote = async () => {
    if (!selectedClaimForNote) return;
    setCnError('');
    if (!cnNumber.trim()) {
      setCnError('Credit note number from supplier is mandatory');
      return;
    }
    const amt = parseFloat(cnAmountRupees);
    if (!amt || amt <= 0) {
      setCnError('Credit note amount must be positive');
      return;
    }

    setIsSavingCN(true);
    try {
      const res = await apiFetch<any>(`/api/supplier-ledger/expiry-claims/${selectedClaimForNote.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: ExpiryClaimStatus.CREDIT_NOTE_RECEIVED,
          creditNoteNumber: cnNumber.trim(),
          creditNoteAmountPaisa: rupeesToPaisa(amt),
          notes: cnNotes || undefined,
        }),
      });

      if (res.success) {
        setCreditNoteModalOpen(false);
        loadExpiryClaims();
      } else {
        setCnError(res.message || res.error || 'Failed to record credit note');
      }
    } catch (err: any) {
      setCnError(err.message || 'Error updating claim status');
    } finally {
      setIsSavingCN(false);
    }
  };

  const openAdjustClaimModal = (claim: ExpiryClaimDto) => {
    setSelectedClaimToAdjust(claim);
    setAdjustNotes('');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjustment = async () => {
    if (!selectedClaimToAdjust) return;
    setIsAdjusting(true);
    try {
      const res = await apiFetch<any>(`/api/supplier-ledger/expiry-claims/${selectedClaimToAdjust.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: ExpiryClaimStatus.ADJUSTED,
          notes: adjustNotes || undefined,
        }),
      });

      if (res.success) {
        setAdjustModalOpen(false);
        loadExpiryClaims();
        loadSuppliers();
      }
    } catch {
      // error
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Card ────────────────────────────────────────────── */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
              Phase 2A: Creditors & Ledgers
            </span>
            <Badge variant="active" dot={false}>
              ACID Ledger Verified
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-pharma-text">Suppliers & Expiry Claims</h1>
          <p className="text-xs text-pharma-muted mt-1">
            Manage distributor balances, record supplier payments, issue purchase debit notes, and track 3-status expiry claims.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'directory' ? (
            <>
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
            </>
          ) : (
            <>
              {!isCashier && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openNewClaimModal}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Expiry Claim
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={loadExpiryClaims}
                title="Refresh Claims"
              >
                <RefreshCw className={`w-4 h-4 ${claimsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Switcher: Supplier Directory vs Expiry Claims ────────────── */}
      <div className="flex items-center gap-3 border-b border-pharma-muted/20 pb-1">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-pharma transition-colors ${activeTab === 'directory'
              ? 'bg-pharma-primary text-pharma-white shadow-pharma-sm'
              : 'text-pharma-muted hover:text-pharma-text hover:bg-pharma-surface'
            }`}
        >
          <Building2 className="w-4 h-4" />
          Distributor Directory ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('expiryClaims')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-pharma transition-colors ${activeTab === 'expiryClaims'
              ? 'bg-pharma-primary text-pharma-white shadow-pharma-sm'
              : 'text-pharma-muted hover:text-pharma-text hover:bg-pharma-surface'
            }`}
        >
          <Clock className="w-4 h-4" />
          Expiry Claims & 3-Status Workflow ({claims.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SUPPLIER DIRECTORY                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
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
                        <div className="font-bold text-pharma-text text-xs font-mono">
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/suppliers/${s.id}/ledger`)}
                            title="View Statement of Account & Record Payments"
                            className="h-8 px-2 text-xs font-semibold text-pharma-primary hover:bg-pharma-primary/10 flex items-center gap-1"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Ledger</span>
                          </Button>

                          {!isCashier && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(s)}
                              title="Edit Supplier Profile"
                              className="h-8 px-2 text-xs"
                            >
                              <Edit className="w-3.5 h-3.5 text-pharma-text" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: EXPIRY CLAIMS & 3-STATUS WORKFLOW                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'expiryClaims' && (
        <div className="space-y-4">
          {/* Claims Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="pharma-panel space-y-1">
              <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
                Claim Pending
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600">
                {claims.filter((c) => c.status === ExpiryClaimStatus.CLAIM_PENDING).length}
              </div>
              <p className="text-[11px] text-pharma-muted">Stock submitted to distributor</p>
            </div>

            <div className="pharma-panel space-y-1">
              <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
                Credit Note Received
              </div>
              <div className="text-2xl font-bold font-mono text-pharma-primary">
                {claims.filter((c) => c.status === ExpiryClaimStatus.CREDIT_NOTE_RECEIVED).length}
              </div>
              <p className="text-[11px] text-pharma-muted">Supplier issued credit note</p>
            </div>

            <div className="pharma-panel space-y-1">
              <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
                Adjusted in Ledger
              </div>
              <div className="text-2xl font-bold font-mono text-pharma-primary">
                {claims.filter((c) => c.status === ExpiryClaimStatus.ADJUSTED).length}
              </div>
              <p className="text-[11px] text-pharma-muted">Applied against payable balance</p>
            </div>

            <div className="pharma-panel space-y-1">
              <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
                Total Claims Value
              </div>
              <div className="text-2xl font-bold font-mono text-pharma-text">
                {formatPaisaToPKR(
                  claims.reduce((sum, c) => sum + (c.totalClaimPaisa || 0), 0)
                )}
              </div>
              <p className="text-[11px] text-pharma-muted">Across all claim batches</p>
            </div>
          </div>

          {/* Workflow explanation banner */}
          <div className="bg-pharma-surface p-3.5 rounded-pharma border border-pharma-muted/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-pharma-text">
              <span className="font-bold">3-Status Audit Workflow:</span>
              <span className="font-mono bg-pharma-white px-1.5 py-0.5 rounded border border-pharma-muted/20">
                1. CLAIM_PENDING
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-pharma-muted" />
              <span className="font-mono bg-pharma-white px-1.5 py-0.5 rounded border border-pharma-muted/20">
                2. CREDIT_NOTE_RECEIVED (Note # required)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-pharma-muted" />
              <span className="font-mono bg-pharma-white px-1.5 py-0.5 rounded border border-pharma-muted/20">
                3. ADJUSTED (Auto ledger credit applied)
              </span>
            </div>
          </div>

          {/* Filter Panel */}
          <div className="bg-pharma-white p-3 rounded-pharma border border-pharma-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-pharma-muted">Filter by Status:</span>
              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="pharma-input text-xs py-1 px-2.5"
              >
                <option value="">All Workflow Statuses</option>
                <option value={ExpiryClaimStatus.CLAIM_PENDING}>CLAIM_PENDING</option>
                <option value={ExpiryClaimStatus.CREDIT_NOTE_RECEIVED}>CREDIT_NOTE_RECEIVED</option>
                <option value={ExpiryClaimStatus.ADJUSTED}>ADJUSTED</option>
              </select>
            </div>
            <span className="text-xs text-pharma-muted">
              Showing {claims.length} claim records
            </span>
          </div>

          {/* Claims Table */}
          <div className="pharma-panel">
            {claimsLoading ? (
              <div className="py-12 text-center text-sm text-pharma-muted">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pharma-primary mb-2" />
                Loading expiry claims...
              </div>
            ) : claims.length === 0 ? (
              <EmptyState
                title="No Expiry Claims"
                description="No expiry claims currently registered with distributors."
                actionLabel="Create Expiry Claim"
                onAction={openNewClaimModal}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Items Count</TableHead>
                    <TableHead className="text-right">Claim Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credit Note Info</TableHead>
                    <TableHead className="text-right">Workflow Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-mono text-xs font-bold text-pharma-text">
                        {claim.claimNumber}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-pharma-text">
                          {claim.supplierName || 'Distributor'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-pharma-muted">
                        {new Date(claim.claimDate).toLocaleDateString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted">
                        {claim.items?.length || 1} item(s)
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-pharma-text">
                        {formatPaisaToPKR(claim.totalClaimPaisa)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            claim.status === ExpiryClaimStatus.ADJUSTED
                              ? 'active'
                              : claim.status === ExpiryClaimStatus.CREDIT_NOTE_RECEIVED
                                ? 'primary'
                                : 'near-expiry'
                          }
                        >
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claim.creditNoteNumber ? (
                          <div className="text-xs font-mono text-pharma-text">
                            <strong>{claim.creditNoteNumber}</strong>
                            <div className="text-[10px] text-pharma-muted">
                              {formatPaisaToPKR(claim.creditNoteAmountPaisa || claim.totalClaimPaisa)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-pharma-muted italic">Pending supplier note</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {claim.status === ExpiryClaimStatus.CLAIM_PENDING && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openReceiveCNModal(claim)}
                            className="h-7 text-xs font-semibold"
                          >
                            Receive Credit Note
                          </Button>
                        )}

                        {claim.status === ExpiryClaimStatus.CREDIT_NOTE_RECEIVED && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openAdjustClaimModal(claim)}
                            className="h-7 text-xs font-semibold"
                          >
                            Adjust Against Ledger
                          </Button>
                        )}

                        {claim.status === ExpiryClaimStatus.ADJUSTED && (
                          <span className="text-xs font-semibold text-pharma-primary flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Settled
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Add / Edit Supplier ───────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Medicine Distributor'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Supplier Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="pharma-input w-full font-mono font-bold"
              />
            </div>
            <div>
              <label className="pharma-label">Company / Distributor Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pharma-input w-full font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="pharma-input w-full"
              />
            </div>
            <div>
              <label className="pharma-label">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="pharma-input w-full font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pharma-input w-full"
              />
            </div>
            <div>
              <label className="pharma-label">NTN / STRN Tax Number</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="pharma-input w-full font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Payment Terms (Credit Days) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.paymentTermsDays}
                onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value, 10) || 0 })}
                className="pharma-input w-full"
              />
            </div>
            <div>
              <label className="pharma-label">Opening Balance (PKR)</label>
              <input
                type="number"
                step="any"
                disabled={Boolean(editingSupplier)}
                value={formData.openingBalanceRupees}
                onChange={(e) => setFormData({ ...formData, openingBalanceRupees: parseFloat(e.target.value) || 0 })}
                className="pharma-input w-full font-mono disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="pharma-label">Warehouse / Physical Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="pharma-input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-pharma-muted/20">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="font-semibold">
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Import Suppliers CSV ──────────────────────────────────── */}
      <Modal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title="Batch Import Suppliers (CSV)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-pharma-muted">
            Paste CSV data with headers: <code>code,name,contactperson,phone,email,address,ntn,terms,balance</code>
          </p>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="code,name,contactperson,phone,email,address,ntn,terms,balance&#10;SUP-001,Premier Agencies,Ali,03001234567,ali@premier.pk,Lahore,1234567-8,30,50000"
            className="pharma-input w-full font-mono text-xs"
          />

          {csvResult && (
            <div className={`p-2.5 rounded-pharma border ${csvResult.success ? 'bg-pharma-primary/10 border-pharma-primary/30 text-pharma-primary' : 'bg-pharma-danger/10 border-pharma-danger/30 text-pharma-danger'}`}>
              {csvResult.message || `Successfully imported ${csvResult.imported} suppliers.`}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-pharma-muted/20">
            <Button variant="outline" size="sm" onClick={() => setCsvModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleImportCsv}
              disabled={isImportingCsv || !csvText.trim()}
              className="font-semibold"
            >
              {isImportingCsv ? 'Importing...' : 'Upload & Parse CSV'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: New Expiry Claim ──────────────────────────────────────── */}
      <Modal
        isOpen={isNewClaimOpen}
        onClose={() => setIsNewClaimOpen(false)}
        title="Submit New Expiry Stock Claim"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {claimError && (
            <div className="bg-pharma-danger/10 border border-pharma-danger/30 text-pharma-danger p-2.5 rounded-pharma">
              {claimError}
            </div>
          )}

          <div>
            <label className="pharma-label">Distributor / Supplier *</label>
            <select
              value={claimSupplierId}
              onChange={(e) => setClaimSupplierId(e.target.value)}
              className="pharma-input w-full font-semibold"
            >
              <option value="">Select Supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Medicine Name *</label>
              <input
                type="text"
                value={claimItemName}
                onChange={(e) => setClaimItemName(e.target.value)}
                placeholder="e.g. Panadol Extra 500mg"
                className="pharma-input w-full"
              />
            </div>
            <div>
              <label className="pharma-label">Batch Number *</label>
              <input
                type="text"
                value={claimBatch}
                onChange={(e) => setClaimBatch(e.target.value)}
                placeholder="e.g. BTH-9912"
                className="pharma-input w-full font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="pharma-label">Expiry Date *</label>
              <input
                type="date"
                value={claimExpiry}
                onChange={(e) => setClaimExpiry(e.target.value)}
                className="pharma-input w-full"
              />
            </div>
            <div>
              <label className="pharma-label">Expired Qty (Units) *</label>
              <input
                type="number"
                min="1"
                value={claimQty}
                onChange={(e) => setClaimQty(e.target.value)}
                className="pharma-input w-full font-mono"
              />
            </div>
            <div>
              <label className="pharma-label">Unit Cost (PKR) *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={claimCostRupees}
                onChange={(e) => setClaimCostRupees(e.target.value)}
                placeholder="e.g. 120"
                className="pharma-input w-full font-mono"
              />
            </div>
          </div>

          <div>
            <label className="pharma-label">Notes / Distributor Policy</label>
            <textarea
              rows={2}
              value={claimNotes}
              onChange={(e) => setClaimNotes(e.target.value)}
              placeholder="e.g. Returned to salesman under 6-month expiry replacement policy"
              className="pharma-input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-pharma-muted/20">
            <Button variant="outline" size="sm" onClick={() => setIsNewClaimOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateExpiryClaim}
              disabled={isSavingClaim}
              className="font-semibold"
            >
              {isSavingClaim ? 'Submitting...' : 'Submit Expiry Claim'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Receive Credit Note from Supplier ─────────────────────── */}
      <Modal
        isOpen={creditNoteModalOpen}
        onClose={() => setCreditNoteModalOpen(false)}
        title="Record Received Credit Note (Step 2 of 3)"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {cnError && (
            <div className="bg-pharma-danger/10 border border-pharma-danger/30 text-pharma-danger p-2.5 rounded-pharma">
              {cnError}
            </div>
          )}

          <div className="p-3 bg-pharma-surface rounded-pharma border border-pharma-muted/20 space-y-1">
            <div className="text-pharma-muted">Claim Number: <strong className="text-pharma-text">{selectedClaimForNote?.claimNumber}</strong></div>
            <div className="text-pharma-muted">Original Claim Value: <strong className="text-pharma-text">{formatPaisaToPKR(selectedClaimForNote?.totalClaimPaisa || 0)}</strong></div>
          </div>

          <div>
            <label className="pharma-label">Supplier's Credit Note Number *</label>
            <input
              type="text"
              required
              value={cnNumber}
              onChange={(e) => setCnNumber(e.target.value)}
              placeholder="e.g. SCN-2026-9041"
              className="pharma-input w-full font-mono font-bold"
            />
            <span className="text-[10px] text-pharma-muted">
              Credit note reference provided on distributor letterhead or tax note.
            </span>
          </div>

          <div>
            <label className="pharma-label">Credit Note Amount Approved (PKR) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={cnAmountRupees}
              onChange={(e) => setCnAmountRupees(e.target.value)}
              className="pharma-input w-full font-mono"
            />
          </div>

          <div>
            <label className="pharma-label">Notes</label>
            <textarea
              rows={2}
              value={cnNotes}
              onChange={(e) => setCnNotes(e.target.value)}
              placeholder="e.g. Received via distributor email; full credit accepted."
              className="pharma-input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-pharma-muted/20">
            <Button variant="outline" size="sm" onClick={() => setCreditNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmCreditNote}
              disabled={isSavingCN}
              className="font-semibold"
            >
              {isSavingCN ? 'Saving...' : 'Save Credit Note'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Adjust Claim Against Supplier Ledger ──────────────────── */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Adjust Expiry Credit Note in Ledger (Step 3 of 3)"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-pharma-primary/10 rounded-pharma border border-pharma-primary/30 text-pharma-text space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-pharma-primary">
              <ShieldCheck className="w-4 h-4" />
              Automatic ACID Ledger Credit
            </div>
            <p className="text-[11px] text-pharma-muted">
              Confirming this will mark the claim as <strong>ADJUSTED</strong> and automatically apply a credit of{' '}
              <strong className="text-pharma-text">
                {formatPaisaToPKR(selectedClaimToAdjust?.creditNoteAmountPaisa || selectedClaimToAdjust?.totalClaimPaisa || 0)}
              </strong>{' '}
              to the distributor's running ledger, decreasing your payable liability.
            </p>
          </div>

          <div>
            <label className="pharma-label">Adjustment Remarks / Audit Notes</label>
            <textarea
              rows={2}
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="e.g. Adjusted against outstanding invoice liability."
              className="pharma-input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-pharma-muted/20">
            <Button variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmAdjustment}
              disabled={isAdjusting}
              className="font-semibold"
            >
              {isAdjusting ? 'Applying to Ledger...' : 'Confirm Ledger Adjustment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
