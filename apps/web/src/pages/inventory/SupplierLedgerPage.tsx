import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  SupplierDto,
  SupplierLedgerEntryDto,
  SupplierLedgerEntryType,
  SupplierPaymentDto,
  DebitNoteDto,
  PaymentMethod,
  formatPaisaToPKR,
  rupeesToPaisa,
  UserRole,
} from '@pharmacy/shared';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/Table';
import {
  ArrowLeft,
  RefreshCw,
  CreditCard,
  BookOpen,
  FileText,
  Building2,
  Phone,
  Mail,
  Receipt,
} from 'lucide-react';

const ENTRY_TYPE_LABELS: Record<SupplierLedgerEntryType, string> = {
  [SupplierLedgerEntryType.PURCHASE_BILL]: 'Purchase Bill',
  [SupplierLedgerEntryType.PAYMENT_MADE]: 'Payment Made',
  [SupplierLedgerEntryType.PURCHASE_RETURN_DEBIT]: 'Purchase Return (Debit Note)',
  [SupplierLedgerEntryType.EXPIRY_CLAIM_CREDIT_NOTE]: 'Expiry Claim Adjusted',
  [SupplierLedgerEntryType.OPENING_BALANCE]: 'Opening Balance',
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.CARD, label: 'Card' },
  { value: PaymentMethod.EASYPAISA, label: 'EasyPaisa' },
  { value: PaymentMethod.JAZZCASH, label: 'JazzCash' },
];

export const SupplierLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canPerformFinancials = user?.role !== UserRole.CASHIER;

  const [supplier, setSupplier] = useState<SupplierDto | null>(null);
  const [entries, setEntries] = useState<SupplierLedgerEntryDto[]>([]);
  const [payments, setPayments] = useState<SupplierPaymentDto[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNoteDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'payments' | 'debitNotes'>('ledger');

  // Record Payment Modal
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [isSavingPay, setIsSavingPay] = useState(false);

  // Create Debit Note Modal
  const [debitModal, setDebitModal] = useState(false);
  const [debitReason, setDebitReason] = useState('DAMAGED_ON_ARRIVAL');
  const [debitItemName, setDebitItemName] = useState('');
  const [debitBatch, setDebitBatch] = useState('');
  const [debitQty, setDebitQty] = useState('1');
  const [debitCostRupees, setDebitCostRupees] = useState('');
  const [debitNotesText, setDebitNotesText] = useState('');
  const [debitError, setDebitError] = useState('');
  const [isSavingDebit, setIsSavingDebit] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [ledgerRes, payRes, dnRes, suppRes] = await Promise.all([
        apiFetch<any>(`/api/supplier-ledger/${id}/ledger`),
        apiFetch<any>(`/api/supplier-ledger/${id}/payments`),
        apiFetch<any>(`/api/supplier-ledger/${id}/debit-notes`),
        apiFetch<any>(`/api/suppliers`),
      ]);

      if (ledgerRes.success) {
        setEntries(ledgerRes.data || []);
        if (ledgerRes.supplier) setSupplier(ledgerRes.supplier);
      }
      if (payRes.success) setPayments(payRes.data || []);
      if (dnRes.success) setDebitNotes(dnRes.data || []);

      if (suppRes.success && (!ledgerRes.supplier || !supplier)) {
        const found = suppRes.data?.find((s: SupplierDto) => s.id === id);
        if (found) setSupplier(found);
      }
    } catch {
      // demo fallback
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openPayModal = () => {
    setPayAmount('');
    setPayMethod(PaymentMethod.BANK_TRANSFER);
    setPayRef('');
    setPayNotes('');
    setPayError('');
    setPayModal(true);
  };

  const handleRecordPayment = async () => {
    setPayError('');
    const amount = parseFloat(payAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid payment amount');
      return;
    }

    setIsSavingPay(true);
    try {
      const res = await apiFetch<any>('/api/supplier-ledger/payments', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: id,
          amountPaisa: rupeesToPaisa(amount),
          paymentMethod: payMethod,
          chequeOrTxNumber: payRef || undefined,
          notes: payNotes || undefined,
        }),
      });

      if (res.success) {
        setPayModal(false);
        loadAll();
      } else {
        setPayError(res.message || res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      setPayError(err.message || 'Payment processing error');
    } finally {
      setIsSavingPay(false);
    }
  };

  const openDebitModal = () => {
    setDebitReason('DAMAGED_ON_ARRIVAL');
    setDebitItemName('');
    setDebitBatch('');
    setDebitQty('1');
    setDebitCostRupees('');
    setDebitNotesText('');
    setDebitError('');
    setDebitModal(true);
  };

  const handleCreateDebitNote = async () => {
    setDebitError('');
    const qty = parseInt(debitQty, 10);
    const cost = parseFloat(debitCostRupees);

    if (!debitItemName.trim()) {
      setDebitError('Medicine/item name is required');
      return;
    }
    if (!qty || qty <= 0) {
      setDebitError('Quantity must be greater than 0');
      return;
    }
    if (!cost || cost <= 0) {
      setDebitError('Cost price per unit must be greater than 0');
      return;
    }

    setIsSavingDebit(true);
    try {
      const res = await apiFetch<any>('/api/supplier-ledger/debit-notes', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: id,
          reason: debitReason,
          notes: debitNotesText || undefined,
          items: [
            {
              productId: `prod-temp-${Date.now()}`,
              productName: debitItemName,
              batchId: `batch-temp-${Date.now()}`,
              batchNumber: debitBatch || 'BATCH-UNKNOWN',
              quantitySmallestUnits: qty,
              costPricePaisaPerUnit: rupeesToPaisa(cost),
            },
          ],
        }),
      });

      if (res.success) {
        setDebitModal(false);
        loadAll();
      } else {
        setDebitError(res.message || res.error || 'Failed to create debit note');
      }
    } catch (err: any) {
      setDebitError(err.message || 'Error creating debit note');
    } finally {
      setIsSavingDebit(false);
    }
  };

  const currentBalPaisa = supplier?.currentBalancePaisa ?? 0;
  const isPayableOverdue = currentBalPaisa > 0;

  return (
    <div className="space-y-6">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/suppliers')}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Suppliers
          </Button>
          <div>
            <h1 className="text-xl font-bold text-pharma-text flex items-center gap-2">
              <Building2 className="w-5 h-5 text-pharma-primary" />
              {supplier?.name || 'Supplier Ledger'}
            </h1>
            <p className="text-xs text-pharma-muted mt-0.5">
              Code: <span className="font-mono font-medium">{supplier?.code || id}</span>
              {supplier?.paymentTermsDays !== undefined && (
                <span> • Terms: {supplier.paymentTermsDays === 0 ? 'Cash on Delivery' : `${supplier.paymentTermsDays} Days Credit`}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canPerformFinancials && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={openDebitModal}
                className="flex items-center gap-1.5 text-xs"
              >
                <FileText className="w-3.5 h-3.5 text-pharma-secondary" />
                Debit Note
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={openPayModal}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Supplier Profile & Balance Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Profile Card */}
        <div className="pharma-panel md:col-span-1 space-y-3">
          <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
            Distributor Details
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-pharma-text">
              <Phone className="w-3.5 h-3.5 text-pharma-primary shrink-0" />
              <span>{supplier?.phone || 'No phone'}</span>
            </div>
            {supplier?.email && (
              <div className="flex items-center gap-2 text-pharma-text">
                <Mail className="w-3.5 h-3.5 text-pharma-muted shrink-0" />
                <span className="truncate">{supplier.email}</span>
              </div>
            )}
            {supplier?.contactPerson && (
              <div className="text-pharma-muted">
                Contact: <strong className="text-pharma-text">{supplier.contactPerson}</strong>
              </div>
            )}
            <div className="text-pharma-muted">
              NTN / Tax: <span className="font-mono text-pharma-text">{supplier?.taxNumber || 'Non-filer'}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-pharma-muted/15 flex items-center justify-between">
            <span className="text-xs text-pharma-muted">Account Status:</span>
            <Badge variant={supplier?.status === 'ACTIVE' ? 'active' : 'quarantine'}>
              {supplier?.status || 'ACTIVE'}
            </Badge>
          </div>
        </div>

        {/* Current Balance (Amount Owed to Supplier) */}
        <div className="pharma-panel md:col-span-1 space-y-1.5">
          <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
            Current Payable Balance
          </div>
          <div className="text-2xl font-bold font-mono text-pharma-text">
            {formatPaisaToPKR(currentBalPaisa)}
          </div>
          <p className="text-[11px] text-pharma-muted">
            {isPayableOverdue ? (
              <span className="text-amber-600 font-semibold">● Outstanding liability to distributor</span>
            ) : (
              <span className="text-pharma-primary font-semibold">● Account fully settled (Zero liability)</span>
            )}
          </p>
        </div>

        {/* Total Payments Made */}
        <div className="pharma-panel md:col-span-1 space-y-1.5">
          <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
            Total Payments Recorded
          </div>
          <div className="text-2xl font-bold font-mono text-pharma-primary">
            {formatPaisaToPKR(
              payments.reduce((sum, p) => sum + (p.amountPaisa || 0), 0)
            )}
          </div>
          <p className="text-[11px] text-pharma-muted">
            {payments.length} payment vouchers issued
          </p>
        </div>

        {/* Debit Notes / Claims */}
        <div className="pharma-panel md:col-span-1 space-y-1.5">
          <div className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
            Purchase Return Debit Notes
          </div>
          <div className="text-2xl font-bold font-mono text-pharma-secondary">
            {formatPaisaToPKR(
              debitNotes.reduce((sum, d) => sum + (d.totalAmountPaisa || 0), 0)
            )}
          </div>
          <p className="text-[11px] text-pharma-muted">
            {debitNotes.length} return debit notes filed
          </p>
        </div>
      </div>

      {/* ── Tabbed View: Ledger vs Payments vs Debit Notes ────────────────── */}
      <div className="pharma-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-pharma-muted/20 pb-3">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-pharma text-xs font-semibold transition-colors ${
              activeTab === 'ledger'
                ? 'bg-pharma-primary text-pharma-white shadow-pharma-sm'
                : 'text-pharma-muted hover:text-pharma-text hover:bg-pharma-surface'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Statement of Account ({entries.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-pharma text-xs font-semibold transition-colors ${
              activeTab === 'payments'
                ? 'bg-pharma-primary text-pharma-white shadow-pharma-sm'
                : 'text-pharma-muted hover:text-pharma-text hover:bg-pharma-surface'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payment Vouchers ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('debitNotes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-pharma text-xs font-semibold transition-colors ${
              activeTab === 'debitNotes'
                ? 'bg-pharma-primary text-pharma-white shadow-pharma-sm'
                : 'text-pharma-muted hover:text-pharma-text hover:bg-pharma-surface'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Debit Notes ({debitNotes.length})
          </button>
        </div>

        {/* Tab 1: Ledger Statement */}
        {activeTab === 'ledger' && (
          <div>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-pharma-muted">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pharma-primary mb-2" />
                Loading supplier ledger...
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-sm text-pharma-muted">
                <Receipt className="w-8 h-8 mx-auto text-pharma-muted/40 mb-2" />
                No ledger transactions recorded yet for this supplier.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Reference / Invoice</TableHead>
                    <TableHead className="text-right">Billed (Credit)</TableHead>
                    <TableHead className="text-right">Paid / Returned (Debit)</TableHead>
                    <TableHead className="text-right">Balance Payable (PKR)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-pharma-muted font-mono whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        {new Date(entry.createdAt).toLocaleTimeString('en-PK', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-pharma-text">
                          {ENTRY_TYPE_LABELS[entry.entryType] || entry.entryType}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-pharma-muted">
                        {entry.referenceId || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-700 font-semibold">
                        {entry.creditPaisa > 0 ? `+${formatPaisaToPKR(entry.creditPaisa)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-pharma-primary font-semibold">
                        {entry.debitPaisa > 0 ? `-${formatPaisaToPKR(entry.debitPaisa)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-pharma-text">
                        {formatPaisaToPKR(entry.runningBalancePaisa)}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted max-w-[200px] truncate">
                        {entry.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 2: Payment History */}
        {activeTab === 'payments' && (
          <div>
            {payments.length === 0 ? (
              <div className="py-12 text-center text-sm text-pharma-muted">
                <CreditCard className="w-8 h-8 mx-auto text-pharma-muted/40 mb-2" />
                No payments have been recorded for this supplier.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Cheque / Tx Ref</TableHead>
                    <TableHead>Authorized By</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-pharma-primary">
                        {p.voucherNumber}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted font-mono">
                        {new Date(p.paymentDate).toLocaleDateString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary">{p.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-pharma-text">
                        {p.chequeOrTxNumber || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted">
                        {p.paidByName || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-pharma-primary">
                        {formatPaisaToPKR(p.amountPaisa)}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted">
                        {p.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 3: Purchase Return Debit Notes */}
        {activeTab === 'debitNotes' && (
          <div>
            {debitNotes.length === 0 ? (
              <div className="py-12 text-center text-sm text-pharma-muted">
                <FileText className="w-8 h-8 mx-auto text-pharma-muted/40 mb-2" />
                No purchase return debit notes issued to this supplier.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Debit Note #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Items Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Debit Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debitNotes.map((dn) => (
                    <TableRow key={dn.id}>
                      <TableCell className="font-mono text-xs font-bold text-pharma-secondary">
                        {dn.debitNoteNumber}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted font-mono">
                        {new Date(dn.returnDate).toLocaleDateString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-pharma-text">
                        {dn.reason}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted">
                        {dn.items?.length || 0} items
                      </TableCell>
                      <TableCell>
                        <Badge variant={dn.status === 'APPLIED' ? 'active' : 'near-expiry'}>
                          {dn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-pharma-secondary">
                        {formatPaisaToPKR(dn.totalAmountPaisa)}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted">
                        {dn.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      {/* ── Record Payment Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title="Record Payment to Supplier"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {payError && (
            <div className="bg-pharma-danger/10 border border-pharma-danger/30 text-pharma-danger p-2.5 rounded-pharma">
              {payError}
            </div>
          )}

          <div>
            <label className="pharma-label">Supplier</label>
            <div className="font-semibold text-pharma-text p-2 bg-pharma-surface rounded-pharma border border-pharma-muted/20">
              {supplier?.name} ({supplier?.code})
            </div>
          </div>

          <div>
            <label className="pharma-label">Current Outstanding Balance</label>
            <div className="font-mono font-bold text-sm text-pharma-text p-2 bg-pharma-surface rounded-pharma border border-pharma-muted/20">
              {formatPaisaToPKR(currentBalPaisa)}
            </div>
          </div>

          <div>
            <label className="pharma-label">Payment Amount (PKR) *</label>
            <input
              type="number"
              step="any"
              min="1"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="pharma-input w-full font-mono text-sm"
            />
          </div>

          <div>
            <label className="pharma-label">Payment Method *</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="pharma-input w-full"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="pharma-label">Cheque Number / Digital Tx Reference</label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. HBL-CHQ-123456 or IBFT-987654"
              className="pharma-input w-full"
            />
          </div>

          <div>
            <label className="pharma-label">Notes / Remarks</label>
            <textarea
              rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. Cleared bill for GRN-00124"
              className="pharma-input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-pharma-muted/20">
            <Button variant="outline" size="sm" onClick={() => setPayModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecordPayment}
              disabled={isSavingPay}
              className="font-semibold"
            >
              {isSavingPay ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Create Debit Note Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={debitModal}
        onClose={() => setDebitModal(false)}
        title="Issue Purchase Return Debit Note"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {debitError && (
            <div className="bg-pharma-danger/10 border border-pharma-danger/30 text-pharma-danger p-2.5 rounded-pharma">
              {debitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Supplier</label>
              <div className="font-semibold text-pharma-text p-2 bg-pharma-surface rounded-pharma border border-pharma-muted/20">
                {supplier?.name}
              </div>
            </div>
            <div>
              <label className="pharma-label">Return Reason *</label>
              <select
                value={debitReason}
                onChange={(e) => setDebitReason(e.target.value)}
                className="pharma-input w-full"
              >
                <option value="DAMAGED_ON_ARRIVAL">Damaged on Arrival</option>
                <option value="NEAR_EXPIRY_REJECTED">Near-Expiry Goods Rejected</option>
                <option value="WRONG_ITEM_SUPPLIED">Wrong Item Supplied</option>
                <option value="OVER_DELIVERY">Over Delivery / Billing Error</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Medicine / Item Name *</label>
              <input
                type="text"
                value={debitItemName}
                onChange={(e) => setDebitItemName(e.target.value)}
                placeholder="e.g. Augmentin 625mg Tab"
                className="pharma-input w-full"
              />
            </div>
            <div>
              <label className="pharma-label">Batch Number</label>
              <input
                type="text"
                value={debitBatch}
                onChange={(e) => setDebitBatch(e.target.value)}
                placeholder="e.g. BTH-8821"
                className="pharma-input w-full font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="pharma-label">Return Quantity (Smallest Units) *</label>
              <input
                type="number"
                min="1"
                value={debitQty}
                onChange={(e) => setDebitQty(e.target.value)}
                className="pharma-input w-full font-mono"
              />
            </div>
            <div>
              <label className="pharma-label">Unit Cost Price (PKR) *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={debitCostRupees}
                onChange={(e) => setDebitCostRupees(e.target.value)}
                placeholder="e.g. 150"
                className="pharma-input w-full font-mono"
              />
            </div>
          </div>

          <div>
            <label className="pharma-label">Notes & Justification</label>
            <textarea
              rows={2}
              value={debitNotesText}
              onChange={(e) => setDebitNotesText(e.target.value)}
              placeholder="e.g. Box arrived broken in transit; return signed by delivery driver."
              className="pharma-input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-pharma-muted/20">
            <Button variant="outline" size="sm" onClick={() => setDebitModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateDebitNote}
              disabled={isSavingDebit}
              className="font-semibold"
            >
              {isSavingDebit ? 'Creating...' : 'Issue Debit Note'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
