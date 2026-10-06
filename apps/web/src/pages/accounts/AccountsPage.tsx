import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Clock,
  Plus,
  Download,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  Percent,
  XCircle,
} from 'lucide-react';
import {
  formatPaisaToPKR,
  formatDateDDMMYYYY,
  UserRole,
  ExpenseCategory,
  PaymentMethod,
  ShiftClosingStatus,
  CashBookEntryType,
} from '@pharmacy/shared';
import type {
  ProfitAndLossDto,
  MarginReportItemDto,
  StockValuationDto,
  SalesTaxSummaryDto,
  CashBookEntryDto,
  ExpenseDto,
  ShiftClosingDto,
} from '@pharmacy/shared';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

type AccountsTab = 'cash-book' | 'expenses' | 'shift-closing' | 'pnl' | 'margins' | 'tax';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  UTILITIES: 'Utilities (LESCO/Gas)',
  SALARIES: 'Staff Salaries',
  RENT: 'Shop Rent',
  PACKAGING: 'Packaging & Bags',
  MAINTENANCE: 'Maintenance & Repairs',
  TEA_REFRESHMENT: 'Tea & Refreshments',
  TRANSPORT: 'Delivery / Transport',
  MARKETING: 'Marketing & Ads',
  OTHER: 'Other Expenses',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card (Debit/Credit)',
  BANK_TRANSFER: 'Bank Transfer',
  DIGITAL_WALLET: 'JazzCash / EasyPaisa',
  CHEQUE: 'Cheque',
  CREDIT: 'Credit',
};

function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Expense Modal ────────────────────────────────────────────────────────────
const ExpenseModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ onClose, onSubmit, isLoading }) => {
  const [form, setForm] = useState<{
    category: ExpenseCategory;
    amountPkr: string;
    paymentMethod: PaymentMethod;
    payee: string;
    expenseDate: string;
    notes: string;
  }>({
    category: ExpenseCategory.UTILITIES,
    amountPkr: '',
    paymentMethod: PaymentMethod.CASH,
    payee: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pkr = parseFloat(form.amountPkr);
    if (!pkr || pkr <= 0) return;
    onSubmit({
      category: form.category,
      amountPaisa: Math.round(pkr * 100),
      paymentMethod: form.paymentMethod,
      payee: form.payee,
      expenseDate: form.expenseDate,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-pharma-surface flex items-center justify-between">
          <h3 className="text-sm font-bold text-pharma-text flex items-center gap-2">
            <Receipt className="w-4 h-4 text-pharma-primary" />
            Record Operating Expense
          </h3>
          <button onClick={onClose} className="text-pharma-muted hover:text-pharma-text">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                required
              >
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Amount (PKR) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amountPkr}
                onChange={(e) => setForm({ ...form, amountPkr: e.target.value })}
                placeholder="0.00"
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Date</label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-pharma-text mb-1 block">Payee / Recipient *</label>
            <input
              type="text"
              value={form.payee}
              onChange={(e) => setForm({ ...form, payee: e.target.value })}
              placeholder="e.g. LESCO, Crown Packages, Staff Name..."
              className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-pharma-text mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional description or invoice reference..."
              className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} type="button" className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Shift Closing Modal ──────────────────────────────────────────────────────
const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

const ShiftClosingModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  currentShift: any;
  cashierId: string;
  cashierName: string;
}> = ({ onClose, onSubmit, isLoading, currentShift, cashierId, cashierName }) => {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');

  const countedPaisa = DENOMINATIONS.reduce(
    (total, denom) => total + Math.round((counts[denom] || 0) * denom * 100),
    0
  );
  const expectedPaisa = currentShift?.expectedCashPaisa || 0;
  const diffPaisa = countedPaisa - expectedPaisa;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      cashierId,
      cashierName,
      shiftStart: currentShift?.shiftStart || new Date().toISOString(),
      openingCashPaisa: currentShift?.openingCashPaisa || 1500000,
      countedCashPaisa: countedPaisa,
      denominations: Object.fromEntries(
        DENOMINATIONS.map((d) => [String(d), counts[d] || 0])
      ),
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="p-5 border-b border-pharma-surface flex items-center justify-between">
          <h3 className="text-sm font-bold text-pharma-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-pharma-primary" />
            End-of-Shift Cash Reconciliation
          </h3>
          <button onClick={onClose} className="text-pharma-muted hover:text-pharma-text">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-pharma-surface/60 rounded-xl p-3 text-center">
              <p className="text-[10px] text-pharma-muted font-medium">Opening Float</p>
              <p className="text-sm font-bold text-pharma-text">{formatPaisaToPKR(currentShift?.openingCashPaisa || 1500000)}</p>
            </div>
            <div className="bg-pharma-primary/5 border border-pharma-primary/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-pharma-muted font-medium">Expected Cash</p>
              <p className="text-sm font-bold text-pharma-primary">{formatPaisaToPKR(expectedPaisa)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${diffPaisa === 0 ? 'bg-green-50' : diffPaisa < 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
              <p className="text-[10px] text-pharma-muted font-medium">Difference</p>
              <p className={`text-sm font-bold ${diffPaisa === 0 ? 'text-green-700' : diffPaisa < 0 ? 'text-red-700' : 'text-amber-700'}`}>
                {diffPaisa >= 0 ? '+' : ''}{formatPaisaToPKR(diffPaisa)}
              </p>
              <p className={`text-[9px] font-semibold mt-0.5 ${diffPaisa === 0 ? 'text-green-700' : diffPaisa < 0 ? 'text-red-700' : 'text-amber-700'}`}>
                {diffPaisa === 0 ? 'Balanced ✓' : diffPaisa < 0 ? '▼ SHORT' : '▲ EXCESS'}
              </p>
            </div>
          </div>

          {/* Denomination Count Table */}
          <div>
            <p className="text-xs font-bold text-pharma-text mb-2">Count Cash by Denomination</p>
            <div className="border border-pharma-surface rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-pharma-surface/60">
                  <tr>
                    <th className="py-2 px-3 text-left text-pharma-text">Note / Coin (PKR)</th>
                    <th className="py-2 px-3 text-center text-pharma-text">Count</th>
                    <th className="py-2 px-3 text-right text-pharma-primary font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pharma-surface">
                  {DENOMINATIONS.map((denom) => {
                    const count = counts[denom] || 0;
                    const subtotal = Math.round(count * denom * 100);
                    return (
                      <tr key={denom} className="hover:bg-pharma-surface/20">
                        <td className="py-1.5 px-3 font-semibold text-pharma-text">
                          {denom.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={count || ''}
                            onChange={(e) =>
                              setCounts((p) => ({ ...p, [denom]: parseInt(e.target.value) || 0 }))
                            }
                            placeholder="0"
                            className="w-20 mx-auto block border border-pharma-muted/30 rounded px-2 py-0.5 text-center text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-pharma-primary">
                          {count > 0 ? formatPaisaToPKR(subtotal) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-pharma-surface/50 border-t-2 border-pharma-surface">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 font-bold text-pharma-text">Total Counted Cash</td>
                    <td className="py-2.5 px-3 text-right font-bold text-pharma-primary text-sm">
                      {formatPaisaToPKR(countedPaisa)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-pharma-text mb-1 block">Notes / Remarks</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Discrepancies, handover notes, or closing remarks..."
              className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} type="button" className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              className="flex-1"
              disabled={isLoading || countedPaisa === 0}
            >
              {isLoading ? 'Closing Shift...' : `Close Shift — ${formatPaisaToPKR(countedPaisa)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AccountsPage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isCashier = user?.role === UserRole.CASHIER;

  const [activeTab, setActiveTab] = useState<AccountsTab>('cash-book');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Cash Book
  const { data: cashBookData, isLoading: cbLoading } = useQuery<{
    success: boolean;
    data: CashBookEntryDto[];
    summary: { totalInPaisa: number; totalOutPaisa: number; currentBalancePaisa: number };
  }>({
    queryKey: ['accounts-cash-book'],
    queryFn: () => apiFetch('/api/accounts/cash-book'),
    enabled: activeTab === 'cash-book',
  });

  // Expenses
  const { data: expensesData, isLoading: expLoading } = useQuery<{
    success: boolean;
    data: ExpenseDto[];
    summary: { totalPaisa: number; byCategory: Record<string, number> };
  }>({
    queryKey: ['accounts-expenses'],
    queryFn: () => apiFetch('/api/accounts/expenses'),
    enabled: activeTab === 'expenses',
  });

  // Current shift
  const { data: currentShiftData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['accounts-current-shift'],
    queryFn: () => apiFetch('/api/accounts/shift-closings/current'),
    enabled: activeTab === 'shift-closing',
  });

  // Shift closings history
  const { data: shiftClosingsData } = useQuery<{ success: boolean; data: ShiftClosingDto[] }>({
    queryKey: ['accounts-shift-closings'],
    queryFn: () => apiFetch('/api/accounts/shift-closings'),
    enabled: activeTab === 'shift-closing',
  });

  // P&L
  const { data: pnlData, isLoading: pnlLoading } = useQuery<{ success: boolean; data: ProfitAndLossDto }>({
    queryKey: ['accounts-pnl'],
    queryFn: () => apiFetch('/api/accounts/profit-loss'),
    enabled: activeTab === 'pnl' && !isCashier,
  });

  // Margins
  const [marginGroupBy, setMarginGroupBy] = useState<'product' | 'company' | 'category' | 'cashier'>('product');

  const { data: marginsData, isLoading: marginsLoading } = useQuery<{
    success: boolean;
    data: MarginReportItemDto[];
  }>({
    queryKey: ['accounts-margins', marginGroupBy],
    queryFn: () => apiFetch(`/api/accounts/margins?groupBy=${marginGroupBy}`),
    enabled: activeTab === 'margins' && !isCashier,
  });

  // Stock Valuation
  const { data: stockValData } = useQuery<{ success: boolean; data: StockValuationDto }>({
    queryKey: ['accounts-stock-val'],
    queryFn: () => apiFetch('/api/accounts/stock-valuation'),
    enabled: activeTab === 'margins' && !isCashier,
  });

  // Tax Summary
  const { data: taxData, isLoading: taxLoading } = useQuery<{ success: boolean; data: SalesTaxSummaryDto }>({
    queryKey: ['accounts-tax'],
    queryFn: () => apiFetch('/api/accounts/tax-summary'),
    enabled: activeTab === 'tax',
  });

  // Mutations
  const expenseMut = useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/accounts/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-expenses'] });
      qc.invalidateQueries({ queryKey: ['accounts-cash-book'] });
      setShowExpenseModal(false);
    },
  });

  const shiftMut = useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/accounts/shift-closings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-shift-closings'] });
      qc.invalidateQueries({ queryKey: ['accounts-current-shift'] });
      setShowShiftModal(false);
    },
  });

  const cb = cashBookData?.data || [];
  const cbSummary = cashBookData?.summary;
  const expenses = expensesData?.data || [];
  const expSummary = expensesData?.summary;
  const closings = shiftClosingsData?.data || [];
  const pnl = pnlData?.data;
  const margins = (marginsData?.data || []).sort((a, b) => b.profitPaisa - a.profitPaisa);
  const stockVal = stockValData?.data;
  const tax = taxData?.data;

  const tabs: { id: AccountsTab; label: string; icon: React.ReactNode; hideCashier?: boolean }[] = [
    { id: 'cash-book', label: 'Cash Book', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'shift-closing', label: 'Shift Closing', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'pnl', label: 'Profit & Loss', icon: <TrendingUp className="w-3.5 h-3.5" />, hideCashier: true },
    { id: 'margins', label: 'Margins & Valuation', icon: <BarChart3 className="w-3.5 h-3.5" />, hideCashier: true },
    { id: 'tax', label: 'Tax Summary', icon: <Percent className="w-3.5 h-3.5" /> },
  ];

  const visibleTabs = tabs.filter((t) => !(t.hideCashier && isCashier));

  const handleExport = () => {
    if (activeTab === 'cash-book') {
      exportToCsv('cash-book', cb.map((e) => ({
        Date: new Date(e.date).toLocaleString(),
        Type: e.entryType,
        Category: e.category,
        Amount_PKR: (e.amountPaisa / 100).toFixed(2),
        Balance_PKR: (e.runningBalancePaisa / 100).toFixed(2),
        Description: e.description,
      })));
    } else if (activeTab === 'expenses') {
      exportToCsv('expenses', expenses.map((e) => ({
        Voucher: e.voucherNumber,
        Date: new Date(e.expenseDate).toLocaleString(),
        Category: e.category,
        Amount_PKR: (e.amountPaisa / 100).toFixed(2),
        Payee: e.payee,
        Method: e.paymentMethod,
        Notes: e.notes || '',
      })));
    } else if (activeTab === 'margins' && !isCashier) {
      exportToCsv('margin-report', margins.map((m) => ({
        Product: m.name,
        Units_Sold: m.unitsSold,
        Revenue_PKR: (m.revenuePaisa / 100).toFixed(2),
        Cost_PKR: (m.costPaisa / 100).toFixed(2),
        Profit_PKR: (m.profitPaisa / 100).toFixed(2),
        Margin_Pct: m.marginPct,
      })));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pharma-text flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-pharma-primary" />
            Accounts & Financial Ledgers
          </h1>
          <p className="text-xs text-pharma-muted mt-0.5">
            Cash book · Operating expenses · Shift closings · Profit & Loss · Tax summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'expenses' && (
            <Button variant="primary" size="sm" id="btn-add-expense" onClick={() => setShowExpenseModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Record Expense
            </Button>
          )}
          {activeTab === 'shift-closing' && (
            <Button variant="primary" size="sm" id="btn-close-shift" onClick={() => setShowShiftModal(true)}>
              <Clock className="w-4 h-4 mr-1.5" />
              Close Shift
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-pharma-surface">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-accounts-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === tab.id
                ? 'bg-pharma-primary text-white shadow-sm'
                : 'text-pharma-muted hover:bg-pharma-surface'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: CASH BOOK ════════════════════════════════════════════════════ */}
      {activeTab === 'cash-book' && (
        <div className="space-y-4">
          {cbSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="pharma-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-pharma-muted font-medium">Total Cash In</p>
                  <p className="text-lg font-bold text-green-700">{formatPaisaToPKR(cbSummary.totalInPaisa)}</p>
                </div>
              </div>
              <div className="pharma-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-xs text-pharma-muted font-medium">Total Cash Out</p>
                  <p className="text-lg font-bold text-red-700">{formatPaisaToPKR(cbSummary.totalOutPaisa)}</p>
                </div>
              </div>
              <div className="pharma-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pharma-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-pharma-primary" />
                </div>
                <div>
                  <p className="text-xs text-pharma-muted font-medium">Current Drawer Balance</p>
                  <p className="text-lg font-bold text-pharma-primary">{formatPaisaToPKR(cbSummary.currentBalancePaisa)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
              <span className="text-xs font-bold text-pharma-text">Cash Book Ledger</span>
              <span className="text-xs text-pharma-muted">{cb.length} entries</span>
            </div>
            {cbLoading ? (
              <div className="p-12 text-center text-pharma-muted text-xs">Loading cash book…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Time</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Reference</th>
                      <th className="py-2.5 px-4 text-right text-green-700">Cash In</th>
                      <th className="py-2.5 px-4 text-right text-red-700">Cash Out</th>
                      <th className="py-2.5 px-4 text-right font-bold text-pharma-primary">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pharma-surface">
                    {cb.map((entry) => (
                      <tr key={entry.id} className="hover:bg-pharma-surface/30">
                        <td className="py-2.5 px-4 text-pharma-muted font-mono text-[11px]">
                          {new Date(entry.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] bg-pharma-surface px-2 py-0.5 rounded font-medium">
                            {entry.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-pharma-text max-w-xs truncate">{entry.description}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-pharma-muted">
                          {entry.referenceId || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-green-700">
                          {entry.entryType === CashBookEntryType.CASH_IN ? formatPaisaToPKR(entry.amountPaisa) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-red-700">
                          {entry.entryType === CashBookEntryType.CASH_OUT ? formatPaisaToPKR(entry.amountPaisa) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-pharma-primary">
                          {formatPaisaToPKR(entry.runningBalancePaisa)}
                        </td>
                      </tr>
                    ))}
                    {cb.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-pharma-muted">
                          No cash book entries for today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: EXPENSES ════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {expSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="pharma-card p-4 col-span-2 sm:col-span-1 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-xs text-pharma-muted font-medium">Total Expenses</p>
                  <p className="text-lg font-bold text-pharma-danger">{formatPaisaToPKR(expSummary.totalPaisa)}</p>
                </div>
              </div>
              {Object.entries(expSummary.byCategory).map(([cat, amt]) => (
                <div key={cat} className="pharma-card p-3">
                  <p className="text-[10px] text-pharma-muted font-medium truncate">
                    {EXPENSE_CATEGORY_LABELS[cat] || cat}
                  </p>
                  <p className="text-sm font-bold text-pharma-text mt-0.5">{formatPaisaToPKR(amt as number)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
              <span className="text-xs font-bold text-pharma-text">Operating Expenses Register</span>
              <span className="text-xs text-pharma-muted">{expenses.length} vouchers</span>
            </div>
            {expLoading ? (
              <div className="p-12 text-center text-pharma-muted text-xs">Loading expenses…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Voucher #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Payee</th>
                      <th className="py-2.5 px-4">Method</th>
                      <th className="py-2.5 px-4 text-right font-bold text-pharma-danger">Amount</th>
                      <th className="py-2.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pharma-surface">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-pharma-surface/30">
                        <td className="py-2.5 px-4 font-mono font-bold text-pharma-primary">{exp.voucherNumber}</td>
                        <td className="py-2.5 px-4 text-pharma-muted">{formatDateDDMMYYYY(exp.expenseDate)}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            {EXPENSE_CATEGORY_LABELS[exp.category] || exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-pharma-text">{exp.payee}</td>
                        <td className="py-2.5 px-4 text-pharma-muted">
                          {PAYMENT_METHOD_LABELS[exp.paymentMethod] || exp.paymentMethod}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-pharma-danger">
                          {formatPaisaToPKR(exp.amountPaisa)}
                        </td>
                        <td className="py-2.5 px-4 text-pharma-muted max-w-xs truncate">
                          {exp.notes || '—'}
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-pharma-muted">
                          No expenses recorded. Click "Record Expense" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: SHIFT CLOSING ════════════════════════════════════════════════ */}
      {activeTab === 'shift-closing' && (
        <div className="space-y-4">
          {currentShiftData?.data && (
            <div className="pharma-card p-5">
              <h3 className="text-xs font-bold text-pharma-text mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-pharma-primary" />
                Active Shift — {currentShiftData.data.cashierName}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-pharma-surface/50 rounded-xl p-3">
                  <p className="text-[10px] text-pharma-muted font-medium">Opening Float</p>
                  <p className="text-base font-bold text-pharma-text">{formatPaisaToPKR(currentShiftData.data.openingCashPaisa)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-[10px] text-pharma-muted font-medium">Cash Sales</p>
                  <p className="text-base font-bold text-green-700">+{formatPaisaToPKR(currentShiftData.data.cashSalesPaisa)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-[10px] text-pharma-muted font-medium">Customer Receipts</p>
                  <p className="text-base font-bold text-green-700">+{formatPaisaToPKR(currentShiftData.data.customerReceiptsPaisa)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-[10px] text-pharma-muted font-medium">Cash Expenses</p>
                  <p className="text-base font-bold text-red-700">-{formatPaisaToPKR(currentShiftData.data.cashExpensesPaisa)}</p>
                </div>
              </div>
              <div className="mt-3 bg-pharma-primary/5 border border-pharma-primary/20 rounded-xl p-3 flex items-center justify-between">
                <p className="text-xs font-bold text-pharma-text">Expected Cash in Drawer</p>
                <p className="text-xl font-bold text-pharma-primary">{formatPaisaToPKR(currentShiftData.data.expectedCashPaisa)}</p>
              </div>
            </div>
          )}

          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
              <span className="text-xs font-bold text-pharma-text">Shift Closing History</span>
              <span className="text-xs text-pharma-muted">{closings.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Closing #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Cashier</th>
                    <th className="py-2.5 px-4 text-right">Expected</th>
                    <th className="py-2.5 px-4 text-right">Counted</th>
                    <th className="py-2.5 px-4 text-right font-bold">Difference</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4">Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pharma-surface">
                  {closings.map((c) => {
                    const diff = c.differencePaisa;
                    return (
                      <tr key={c.id} className="hover:bg-pharma-surface/30">
                        <td className="py-2.5 px-4 font-mono font-bold text-pharma-primary">{c.closingNumber}</td>
                        <td className="py-2.5 px-4 text-pharma-muted">{formatDateDDMMYYYY(c.shiftEnd)}</td>
                        <td className="py-2.5 px-4 font-medium text-pharma-text">{c.cashierName}</td>
                        <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(c.expectedCashPaisa)}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{formatPaisaToPKR(c.countedCashPaisa)}</td>
                        <td className={`py-2.5 px-4 text-right font-bold ${diff === 0 ? 'text-green-700' : diff < 0 ? 'text-pharma-danger' : 'text-amber-600'}`}>
                          {diff >= 0 ? '+' : ''}{formatPaisaToPKR(diff)}
                          {diff !== 0 && (
                            <span className="ml-1 text-[10px]">({diff < 0 ? '▼ SHORT' : '▲ EXCESS'})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {c.status === ShiftClosingStatus.RECONCILED ? (
                            <Badge variant="active">RECONCILED</Badge>
                          ) : c.status === ShiftClosingStatus.CLOSED ? (
                            <Badge variant="active">CLOSED</Badge>
                          ) : (
                            <Badge variant="near-expiry">OPEN</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-pharma-muted">{c.verifiedByName || '—'}</td>
                      </tr>
                    );
                  })}
                  {closings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-pharma-muted">
                        No shift closings yet. Click "Close Shift" to start reconciliation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: PROFIT & LOSS ═══════════════════════════════════════════════ */}
      {activeTab === 'pnl' && !isCashier && (
        <div className="space-y-4">
          {pnlLoading ? (
            <div className="pharma-card p-12 text-center text-pharma-muted text-xs">Computing P&L…</div>
          ) : pnl ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="pharma-card p-4">
                  <p className="text-xs text-pharma-muted font-medium">Gross Sales</p>
                  <p className="text-2xl font-bold text-pharma-text">{formatPaisaToPKR(pnl.grossSalesPaisa)}</p>
                  <p className="text-[10px] text-pharma-muted mt-1">Discounts: -{formatPaisaToPKR(pnl.discountPaisa)}</p>
                </div>
                <div className="pharma-card p-4">
                  <p className="text-xs text-pharma-muted font-medium">Net Sales Revenue</p>
                  <p className="text-2xl font-bold text-pharma-primary">{formatPaisaToPKR(pnl.netSalesPaisa)}</p>
                  <p className="text-[10px] text-pharma-muted mt-1">After all discounts</p>
                </div>
                <div className="pharma-card p-4">
                  <p className="text-xs text-pharma-muted font-medium">Gross Profit</p>
                  <p className="text-2xl font-bold text-green-700">{formatPaisaToPKR(pnl.grossProfitPaisa)}</p>
                  <p className="text-[10px] text-pharma-muted mt-1">{pnl.grossMarginPct}% gross margin</p>
                </div>
                <div className={`pharma-card p-4 border-l-4 ${pnl.netOperatingProfitPaisa >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                  <p className="text-xs text-pharma-muted font-medium">Net Operating Profit</p>
                  <p className={`text-2xl font-bold ${pnl.netOperatingProfitPaisa >= 0 ? 'text-green-700' : 'text-pharma-danger'}`}>
                    {formatPaisaToPKR(pnl.netOperatingProfitPaisa)}
                  </p>
                  <p className="text-[10px] text-pharma-muted mt-1">{pnl.netMarginPct}% net margin</p>
                </div>
              </div>

              {/* P&L Waterfall Statement */}
              <div className="pharma-card p-5">
                <h3 className="text-xs font-bold text-pharma-text mb-4">Income Statement (Waterfall)</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Gross Sales', value: pnl.grossSalesPaisa, cls: 'text-pharma-text' },
                    { label: '  Less: Trade Discounts', value: -pnl.discountPaisa, cls: 'text-pharma-muted' },
                    { label: 'Net Sales Revenue', value: pnl.netSalesPaisa, cls: 'text-pharma-primary font-bold', sep: true },
                    { label: '  Less: Cost of Goods Sold (Batch Cost)', value: -pnl.cogsPaisa, cls: 'text-pharma-muted' },
                    { label: `Gross Profit  (${pnl.grossMarginPct}%)`, value: pnl.grossProfitPaisa, cls: 'text-green-700 font-bold', sep: true },
                    ...Object.entries(pnl.expensesByCategory).map(([cat, amt]) => ({
                      label: `  Less: ${EXPENSE_CATEGORY_LABELS[cat] || cat}`,
                      value: -(amt as number),
                      cls: 'text-pharma-muted',
                    })),
                    { label: 'Total Operating Expenses', value: -pnl.totalExpensesPaisa, cls: 'text-pharma-danger', sep: true },
                    {
                      label: `Net Operating Profit  (${pnl.netMarginPct}%)`,
                      value: pnl.netOperatingProfitPaisa,
                      cls: `${pnl.netOperatingProfitPaisa >= 0 ? 'text-green-700' : 'text-pharma-danger'} font-bold text-base`,
                      sep: true,
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between py-1.5 ${(row as any).sep ? 'border-t border-pharma-surface mt-2 pt-3' : ''}`}
                    >
                      <span className={`text-xs ${row.cls}`}>{row.label}</span>
                      <span className={`text-xs font-mono ${row.cls}`}>
                        {row.value >= 0 ? '' : '− '}{formatPaisaToPKR(Math.abs(row.value))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ══ TAB: MARGINS & STOCK VALUATION ═══════════════════════════════════ */}
      {activeTab === 'margins' && !isCashier && (
        <div className="space-y-4">
          {stockVal && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="pharma-card p-4">
                <p className="text-xs text-pharma-muted font-medium">Total Batches In Stock</p>
                <p className="text-2xl font-bold text-pharma-text">{stockVal.totalBatches}</p>
                <p className="text-[10px] text-pharma-muted">{stockVal.totalProducts} products</p>
              </div>
              <div className="pharma-card p-4">
                <p className="text-xs text-pharma-muted font-medium">Stock at Cost Price</p>
                <p className="text-2xl font-bold text-pharma-text">{formatPaisaToPKR(stockVal.valuationAtCostPaisa)}</p>
                <p className="text-[10px] text-pharma-muted">Purchase valuation</p>
              </div>
              <div className="pharma-card p-4">
                <p className="text-xs text-pharma-muted font-medium">Stock at MRP</p>
                <p className="text-2xl font-bold text-pharma-primary">{formatPaisaToPKR(stockVal.valuationAtMrpPaisa)}</p>
                <p className="text-[10px] text-pharma-muted">Retail price valuation</p>
              </div>
              <div className="pharma-card p-4 border-l-4 border-green-500">
                <p className="text-xs text-pharma-muted font-medium">Unrealized Profit</p>
                <p className="text-2xl font-bold text-green-700">{formatPaisaToPKR(stockVal.unrealizedProfitPaisa)}</p>
                <p className="text-[10px] text-pharma-muted">{stockVal.potentialMarginPct}% potential margin</p>
              </div>
            </div>
          )}

          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-pharma-text">Margin Analysis (Sorted by Profit)</span>
                <p className="text-[10px] text-pharma-muted mt-0.5">Calculated using exact batch purchase costs</p>
              </div>
              <div className="flex items-center gap-1.5 bg-pharma-surface p-1 rounded-xl">
                {(
                  [
                    { id: 'product', label: 'By Product' },
                    { id: 'company', label: 'By Company' },
                    { id: 'category', label: 'By Category' },
                    { id: 'cashier', label: 'By Cashier' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setMarginGroupBy(g.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      marginGroupBy === g.id
                        ? 'bg-pharma-primary text-white shadow-sm'
                        : 'text-pharma-muted hover:text-pharma-text'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            {marginsLoading ? (
              <div className="p-12 text-center text-pharma-muted text-xs">Computing margins…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">
                        {marginGroupBy === 'company'
                          ? 'Company / Manufacturer'
                          : marginGroupBy === 'category'
                          ? 'Category'
                          : marginGroupBy === 'cashier'
                          ? 'Cashier / Counter'
                          : 'Product'}
                      </th>
                      <th className="py-2.5 px-4 text-center">Units Sold</th>
                      <th className="py-2.5 px-4 text-right">Revenue</th>
                      <th className="py-2.5 px-4 text-right">Cost</th>
                      <th className="py-2.5 px-4 text-right font-bold text-green-700">Profit</th>
                      <th className="py-2.5 px-4 text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pharma-surface">
                    {margins.map((item) => (
                      <tr key={item.id} className="hover:bg-pharma-surface/30">
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-pharma-text">{item.name}</p>
                          {item.secondaryName && (
                            <p className="text-[10px] text-pharma-muted">{item.secondaryName}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-medium">{item.unitsSold}</td>
                        <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(item.revenuePaisa)}</td>
                        <td className="py-2.5 px-4 text-right text-pharma-muted">{formatPaisaToPKR(item.costPaisa)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-green-700">{formatPaisaToPKR(item.profitPaisa)}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.marginPct >= 30
                                ? 'bg-green-100 text-green-800'
                                : item.marginPct >= 20
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.marginPct >= 10
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {item.marginPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {margins.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-pharma-muted">
                          No sales data for margin analysis.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: TAX SUMMARY ═════════════════════════════════════════════════ */}
      {activeTab === 'tax' && (
        <div className="space-y-4">
          {taxLoading ? (
            <div className="pharma-card p-12 text-center text-pharma-muted text-xs">Loading tax summary…</div>
          ) : tax ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="pharma-card p-4">
                  <p className="text-xs text-pharma-muted font-medium">Taxable Sales (GST/PST Applied)</p>
                  <p className="text-xl font-bold text-pharma-text">{formatPaisaToPKR(tax.taxableSalesPaisa)}</p>
                </div>
                <div className="pharma-card p-4">
                  <p className="text-xs text-pharma-muted font-medium">Exempt Sales (Essential Medicines)</p>
                  <p className="text-xl font-bold text-pharma-text">{formatPaisaToPKR(tax.exemptSalesPaisa)}</p>
                </div>
                <div className="pharma-card p-4">
                  <p className="text-xs text-pharma-muted font-medium">Output Tax Collected</p>
                  <p className="text-xl font-bold text-amber-700">{formatPaisaToPKR(tax.outputTaxCollectedPaisa)}</p>
                </div>
                <div className="pharma-card p-4">
                  <p className="text-xs text-pharma-muted font-medium">Input Tax Credit (Purchases)</p>
                  <p className="text-xl font-bold text-green-700">-{formatPaisaToPKR(tax.inputTaxPurchasesPaisa)}</p>
                </div>
                <div className="pharma-card p-4 col-span-1 sm:col-span-2 border-l-4 border-pharma-primary">
                  <p className="text-xs text-pharma-muted font-medium">Net Tax Payable to FBR</p>
                  <p className="text-3xl font-bold text-pharma-primary">{formatPaisaToPKR(tax.netTaxPayablePaisa)}</p>
                  <p className="text-[10px] text-pharma-muted mt-1">
                    Period: {formatDateDDMMYYYY(tax.periodStart)} – {formatDateDDMMYYYY(tax.periodEnd)}
                  </p>
                </div>
              </div>

              <div className="pharma-card p-5">
                <h3 className="text-xs font-bold text-pharma-text mb-3">Tax Reconciliation</h3>
                {[
                  { label: 'Output Tax Collected from Customers', value: tax.outputTaxCollectedPaisa, cls: 'text-amber-700' },
                  { label: 'Less: Input Tax Credit on Purchases', value: -tax.inputTaxPurchasesPaisa, cls: 'text-green-700' },
                  { label: 'Net FBR Remittance Due', value: tax.netTaxPayablePaisa, cls: 'text-pharma-primary font-bold', sep: true },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between py-1.5 ${(row as any).sep ? 'border-t border-pharma-surface mt-2 pt-3' : ''}`}>
                    <span className={`text-xs ${row.cls}`}>{row.label}</span>
                    <span className={`text-xs font-mono ${row.cls}`}>
                      {row.value >= 0 ? '' : '− '}{formatPaisaToPKR(Math.abs(row.value))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ══ CASHIER ACCESS BLOCKED MESSAGE ═══════════════════════════════════ */}
      {(activeTab === 'pnl' || activeTab === 'margins') && isCashier && (
        <div className="pharma-card p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-pharma-danger/10 text-pharma-danger flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-pharma-text">Access Restricted</h3>
          <p className="text-xs text-pharma-muted max-w-sm mx-auto">
            Cost, margin, and profit data are restricted from the Cashier role.
            This boundary is enforced strictly on the server (HTTP 403).
          </p>
        </div>
      )}

      {/* ── Modals ── */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSubmit={(data) => expenseMut.mutate(data)}
          isLoading={expenseMut.isPending}
        />
      )}
      {showShiftModal && (
        <ShiftClosingModal
          onClose={() => setShowShiftModal(false)}
          onSubmit={(data) => shiftMut.mutate(data)}
          isLoading={shiftMut.isPending}
          currentShift={currentShiftData?.data}
          cashierId={user?.id || 'demo-cashier'}
          cashierName={user?.fullName || 'Cashier'}
        />
      )}
    </div>
  );
};
