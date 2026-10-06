import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CustomerDto,
  CustomerLedgerEntryDto,
  CustomerLedgerEntryType,
  CustomerPaymentDto,
  formatPaisaToPKR,
  rupeesToPaisa,
} from '@pharmacy/shared';
import { apiFetch } from '../../lib/api';
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
} from 'lucide-react';

const ENTRY_TYPE_LABELS: Record<CustomerLedgerEntryType, string> = {
  [CustomerLedgerEntryType.CREDIT_SALE]: 'Credit Sale',
  [CustomerLedgerEntryType.SALE_RETURN_CREDIT]: 'Sale Return',
  [CustomerLedgerEntryType.PAYMENT_RECEIVED]: 'Payment Received',
  [CustomerLedgerEntryType.OPENING_BALANCE]: 'Opening Balance',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT: 'Credit',
};

export const CustomerLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerDto | null>(null);
  const [entries, setEntries] = useState<CustomerLedgerEntryDto[]>([]);
  const [payments, setPayments] = useState<CustomerPaymentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'payments'>('ledger');

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [isSavingPay, setIsSavingPay] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [ledgerRes, payRes] = await Promise.all([
        apiFetch<any>(`/api/customers/${id}/ledger`),
        apiFetch<any>(`/api/customers/${id}/payments`),
      ]);
      if (ledgerRes.success) {
        setEntries(ledgerRes.data || []);
        if (ledgerRes.customer) setCustomer(ledgerRes.customer);
      }
      if (payRes.success) setPayments(payRes.data || []);
    } catch {
      // demo fallback handled by API
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openPayModal = () => {
    setPayAmount('');
    setPayMethod('CASH');
    setPayRef('');
    setPayNotes('');
    setPayError('');
    setPayModal(true);
  };

  const handleReceivePayment = async () => {
    setPayError('');
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Enter a valid payment amount');
      return;
    }
    if (!id) return;

    setIsSavingPay(true);
    try {
      await apiFetch('/api/customers/payments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: id,
          amountPaisa: rupeesToPaisa(amount),
          paymentMethod: payMethod,
          referenceNumber: payRef.trim() || undefined,
          notes: payNotes.trim() || undefined,
        }),
      });
      setPayModal(false);
      loadAll();
    } catch (err: any) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setIsSavingPay(false);
    }
  };

  const utilizationPct = customer
    ? customer.creditLimitPaisa > 0
      ? Math.min(100, Math.round((customer.currentBalancePaisa / customer.creditLimitPaisa) * 100))
      : 0
    : 0;

  const isOverLimit = customer
    ? customer.creditLimitPaisa > 0 && customer.currentBalancePaisa > customer.creditLimitPaisa
    : false;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Customers
        </Button>
        <span className="text-pharma-muted text-sm">/</span>
        <span className="text-pharma-text text-sm font-medium">
          {customer ? customer.name : 'Customer Ledger'}
        </span>
      </div>

      {/* Customer Profile Card */}
      {customer && (
        <div className="pharma-panel p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-pharma-text">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="text-sm text-pharma-muted">{customer.phone}</span>
                {customer.email && <span className="text-sm text-pharma-muted">{customer.email}</span>}
                {customer.address && <span className="text-sm text-pharma-muted">{customer.address}</span>}
              </div>
              {customer.notes && (
                <p className="text-xs text-pharma-muted mt-1 italic">{customer.notes}</p>
              )}
            </div>
            <Button variant="primary" size="sm" onClick={openPayModal}>
              <CreditCard className="w-4 h-4 mr-1" />
              Receive Payment
            </Button>
          </div>

          {/* Balance KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-pharma-accent/20">
            <div>
              <p className="text-xs text-pharma-muted">Outstanding Balance</p>
              <p className={`text-lg font-bold ${isOverLimit ? 'text-pharma-danger' : 'text-pharma-text'}`}>
                {formatPaisaToPKR(customer.currentBalancePaisa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-pharma-muted">Credit Limit</p>
              <p className="text-lg font-bold text-pharma-text">
                {customer.creditLimitPaisa === 0 ? 'No Limit' : formatPaisaToPKR(customer.creditLimitPaisa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-pharma-muted">Available Credit</p>
              <p className={`text-lg font-bold ${isOverLimit ? 'text-pharma-danger' : 'text-pharma-primary'}`}>
                {customer.creditLimitPaisa === 0
                  ? '∞'
                  : formatPaisaToPKR(Math.max(0, customer.creditLimitPaisa - customer.currentBalancePaisa))}
              </p>
            </div>
            <div>
              <p className="text-xs text-pharma-muted">Opening Balance</p>
              <p className="text-lg font-bold text-pharma-text">
                {formatPaisaToPKR(customer.openingBalancePaisa)}
              </p>
            </div>
          </div>

          {/* Credit Utilisation Bar */}
          {customer.creditLimitPaisa > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-pharma-muted">Credit Utilisation</span>
                <span className={`text-xs font-semibold ${isOverLimit ? 'text-pharma-danger' : 'text-pharma-text'}`}>
                  {utilizationPct}%
                  {isOverLimit && <span className="ml-1 text-pharma-danger font-bold">⚠ Over Limit</span>}
                </span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-pharma-danger' : utilizationPct >= 80 ? 'bg-pharma-warning' : 'bg-pharma-accent'}`}
                  style={{ width: `${Math.min(100, utilizationPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-pharma-accent/20">
        <button
          id="tab-ledger"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'ledger' ? 'border-pharma-primary text-pharma-primary' : 'border-transparent text-pharma-muted hover:text-pharma-text'}`}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5" />
          Ledger ({entries.length})
        </button>
        <button
          id="tab-payments"
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'payments' ? 'border-pharma-primary text-pharma-primary' : 'border-transparent text-pharma-muted hover:text-pharma-text'}`}
        >
          <CreditCard className="w-4 h-4 inline mr-1.5" />
          Payments ({payments.length})
        </button>
        <button
          id="tab-refresh"
          onClick={loadAll}
          className="ml-auto px-3 py-2 text-sm text-pharma-muted hover:text-pharma-text transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="pharma-panel overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-pharma-muted" />
              <span className="ml-2 text-pharma-muted">Loading ledger...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-10 h-10 text-pharma-muted mx-auto mb-3 opacity-40" />
              <p className="text-pharma-muted text-sm">No ledger entries yet.</p>
              <p className="text-pharma-muted text-xs mt-1">Entries are created when credit sales or payments are recorded.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Debit (Dr)</TableHead>
                  <TableHead className="text-right">Credit (Cr)</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const isDebit = e.debitPaisa > 0;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-pharma-muted whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.entryType === CustomerLedgerEntryType.PAYMENT_RECEIVED ? 'primary'
                              : e.entryType === CustomerLedgerEntryType.CREDIT_SALE ? 'near-expiry'
                                : 'active'
                          }
                        >
                          {ENTRY_TYPE_LABELS[e.entryType as CustomerLedgerEntryType] || e.entryType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted">
                        {e.referenceType}{e.referenceId ? ` (${e.referenceId.slice(-8)})` : ''}
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted max-w-[180px] truncate">
                        {e.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-pharma-danger">
                        {isDebit ? formatPaisaToPKR(e.debitPaisa) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-pharma-primary">
                        {!isDebit && e.creditPaisa > 0 ? formatPaisaToPKR(e.creditPaisa) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-pharma-text">
                        {formatPaisaToPKR(e.runningBalancePaisa)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="pharma-panel overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-pharma-muted" />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-10 h-10 text-pharma-muted mx-auto mb-3 opacity-40" />
              <p className="text-pharma-muted text-sm">No payments received yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-pharma-primary font-semibold">
                      {p.receiptNumber}
                    </TableCell>
                    <TableCell className="text-xs text-pharma-muted whitespace-nowrap">
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="primary">
                        {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-pharma-muted">{p.referenceNumber || '—'}</TableCell>
                    <TableCell className="text-xs text-pharma-muted">{p.receivedByName || '—'}</TableCell>
                    <TableCell className="text-xs text-pharma-muted max-w-[150px] truncate">{p.notes || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-bold text-pharma-primary">
                      {formatPaisaToPKR(p.amountPaisa)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Receive Payment Modal */}
      <Modal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title={`Receive Payment — ${customer?.name || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {customer && (
            <div className={`p-3 rounded-lg border text-sm ${isOverLimit ? 'bg-pharma-danger/10 border-pharma-danger/30 text-pharma-danger' : 'bg-pharma-surface border-pharma-accent/30 text-pharma-text'}`}>
              <span className="font-medium">Outstanding:</span> {formatPaisaToPKR(customer.currentBalancePaisa)}
              {customer.creditLimitPaisa > 0 && (
                <span className="ml-3 text-pharma-muted">
                  | Limit: {formatPaisaToPKR(customer.creditLimitPaisa)}
                </span>
              )}
            </div>
          )}

          {payError && (
            <div className="p-3 rounded-lg bg-pharma-danger/10 border border-pharma-danger/20 text-pharma-danger text-sm">
              {payError}
            </div>
          )}

          <div>
            <label className="pharma-label">Amount Received (PKR) *</label>
            <input
              id="pay-amount"
              type="number"
              min={1}
              step={100}
              className="pharma-input w-full text-lg font-semibold"
              placeholder="0.00"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="pharma-label">Payment Method</label>
            <select
              id="pay-method"
              className="pharma-input w-full"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="pharma-label">Reference / Cheque No.</label>
            <input
              id="pay-ref"
              className="pharma-input w-full"
              placeholder="Optional reference number"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
          </div>

          <div>
            <label className="pharma-label">Notes</label>
            <textarea
              id="pay-notes"
              className="pharma-input w-full resize-none"
              rows={2}
              placeholder="Optional notes..."
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-pharma-accent/20">
            <Button variant="outline" onClick={() => setPayModal(false)} disabled={isSavingPay}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReceivePayment} disabled={isSavingPay}>
              {isSavingPay ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
