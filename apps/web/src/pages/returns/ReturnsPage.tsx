import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Package,
  FileText,
  DollarSign,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  formatPaisaToPKR,
  formatDateDDMMYYYY,
  RefundMethod,
  ReturnDestination,
  SaleReturnDto,
  SaleReturnItemInput,
  PostReturnInput,
  SaleDto,
} from '@pharmacy/shared';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

// ── Thermal Return Receipt ───────────────────────────────────────────────────
function printReturnReceipt(ret: SaleReturnDto) {
  const w = window.open('', '_blank');
  if (!w) return;

  const itemsHtml = ret.items
    .map(
      (i) => `
      <tr>
        <td style="padding: 2px 0;">${i.productName} (${i.unitName})</td>
        <td style="text-align: right; padding: 2px 0;">${i.quantityInUnit}</td>
        <td style="text-align: right; padding: 2px 0;">${formatPaisaToPKR(i.lineTotalRefundPaisa)}</td>
      </tr>
      <tr>
        <td colspan="3" style="font-size: 9px; color: #666; padding-bottom: 2px;">
          Batch: ${i.batchNumber} | Dest: ${i.destination === ReturnDestination.RESTOCK_ORIGINAL_BATCH ? 'Restocked' : 'Quarantined'}
        </td>
      </tr>`
    )
    .join('');

  w.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Return Receipt - ${ret.returnNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: monospace; font-size: 11px; margin: 0; padding: 6px; color: #000; width: 72mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">PHARMACARE PHARMACY</div>
        <div class="center">Main Boulevard, Gulberg III, Lahore</div>
        <div class="center">Ph: +92 42 3578 9000</div>
        <div class="divider"></div>
        <div class="center bold">REFUND / CREDIT VOUCHER</div>
        <div class="divider"></div>
        <div><strong>Return No:</strong> ${ret.returnNumber}</div>
        <div><strong>Date:</strong> ${new Date(ret.returnDate).toLocaleString()}</div>
        ${ret.saleInvoiceNumber ? `<div><strong>Ref Invoice:</strong> ${ret.saleInvoiceNumber}</div>` : ''}
        <div><strong>Processed By:</strong> ${ret.cashierName || 'Cashier'}</div>
        <div><strong>Refund Method:</strong> ${ret.refundMethod}</div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left;">Item</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Refund</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold;">
          <span>TOTAL REFUND:</span>
          <span>${formatPaisaToPKR(ret.totalRefundPaisa)}</span>
        </div>
        <div class="divider"></div>
        <div style="font-size: 10px;"><strong>Reason:</strong> ${ret.reason}</div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px;">Customer Signature: ___________________</div>
        <div class="center" style="margin-top: 12px; font-size: 9px;">Software by PharmaCare ERP</div>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export const ReturnsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search invoice state
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [searchedSale, setSearchedSale] = useState<SaleDto | null>(null);
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  const [invoiceSearchError, setInvoiceSearchError] = useState<string | null>(null);

  // New return form state
  const [isNewReturnModalOpen, setIsNewReturnModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{
    [itemId: string]: {
      checked: boolean;
      quantity: number;
      destination: ReturnDestination;
      reason: string;
    };
  }>({});
  const [overallReason, setOverallReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>(RefundMethod.CASH);
  const [completedReturn, setCompletedReturn] = useState<SaleReturnDto | null>(null);

  // Fetch returns list
  const { data: returnsData, isLoading } = useQuery<{ success: boolean; data: SaleReturnDto[] }>({
    queryKey: ['returns'],
    queryFn: () => apiFetch('/api/returns'),
  });

  const returnsList = returnsData?.data || [];

  // Search invoice handler
  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceSearchQuery.trim()) return;

    setIsSearchingInvoice(true);
    setInvoiceSearchError(null);
    setSearchedSale(null);

    try {
      // Find sale by searching sales endpoint
      const res = await apiFetch<{ success: boolean; data: SaleDto[] }>(
        `/api/sales?page=1&limit=50`
      );
      const found = res.data?.find(
        (s) => s.invoiceNumber.toLowerCase() === invoiceSearchQuery.trim().toLowerCase()
      );

      if (found) {
        if (found.status === 'VOIDED') {
          setInvoiceSearchError(`Invoice ${found.invoiceNumber} has been VOIDED and cannot be returned.`);
        } else {
          setSearchedSale(found);
          // Initialize selection
          const init: any = {};
          found.items.forEach((item) => {
            init[item.id] = {
              checked: false,
              quantity: item.quantityInUnit,
              destination: ReturnDestination.RESTOCK_ORIGINAL_BATCH,
              reason: '',
            };
          });
          setSelectedItems(init);
        }
      } else {
        setInvoiceSearchError(`Invoice "${invoiceSearchQuery.trim()}" not found. You may also initiate a manager-approved return without an invoice.`);
      }
    } catch (_err) {
      setInvoiceSearchError('Failed to search invoice.');
    } finally {
      setIsSearchingInvoice(false);
    }
  };

  // Submit return mutation
  const returnMutation = useMutation({
    mutationFn: async (payload: PostReturnInput) => {
      const res = await apiFetch<{ success: boolean; data: SaleReturnDto }>('/api/returns', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setCompletedReturn(data);
      setIsNewReturnModalOpen(false);
      setSearchedSale(null);
      setInvoiceSearchQuery('');
    },
  });

  const handleProcessReturn = () => {
    if (!overallReason.trim()) {
      alert('Please specify an overall reason for the return.');
      return;
    }

    if (!searchedSale) return;

    const itemsToReturn: SaleReturnItemInput[] = [];

    for (const item of searchedSale.items) {
      const state = selectedItems[item.id];
      if (state && state.checked && state.quantity > 0) {
        itemsToReturn.push({
          saleItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          unitName: item.unitName,
          conversionFactor: item.conversionFactor,
          quantityInUnit: state.quantity,
          refundPricePaisaPerUnit: item.mrpPaisaPerUnit,
          destination: state.destination,
          reason: state.reason || overallReason,
        });
      }
    }

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item and quantity to return.');
      return;
    }

    const payload: PostReturnInput = {
      saleId: searchedSale.id,
      saleInvoiceNumber: searchedSale.invoiceNumber,
      refundMethod,
      reason: overallReason,
      items: itemsToReturn,
    };

    returnMutation.mutate(payload);
  };

  // Calculate return total
  const calculatedRefundTotal = searchedSale
    ? searchedSale.items.reduce((sum, item) => {
        const state = selectedItems[item.id];
        if (state && state.checked && state.quantity > 0) {
          return sum + state.quantity * item.mrpPaisaPerUnit;
        }
        return sum;
      }, 0)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pharma-text flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-pharma-primary" />
            Sales Returns & Refunds
          </h1>
          <p className="text-xs text-pharma-muted mt-0.5">
            Process customer returns against original invoices, restock sellable medicines or route damaged goods to quarantine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setIsNewReturnModalOpen(true);
              setSearchedSale(null);
              setInvoiceSearchQuery('');
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Process New Return
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="pharma-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pharma-surface border border-pharma-primary/20 flex items-center justify-center text-pharma-primary">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-pharma-muted font-medium">Total Returns Recorded</div>
            <div className="text-xl font-bold text-pharma-text">{returnsList.length}</div>
          </div>
        </div>

        <div className="pharma-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pharma-surface border border-pharma-primary/20 flex items-center justify-center text-pharma-primary">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-pharma-muted font-medium">Total Refunded Value</div>
            <div className="text-xl font-bold text-pharma-text">
              {formatPaisaToPKR(returnsList.reduce((acc, r) => acc + r.totalRefundPaisa, 0))}
            </div>
          </div>
        </div>

        <div className="pharma-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pharma-surface border border-pharma-primary/20 flex items-center justify-center text-pharma-primary">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-pharma-muted font-medium">Stock Re-credited</div>
            <div className="text-xl font-bold text-pharma-text">
              {returnsList.reduce(
                (sum, r) =>
                  sum +
                  r.items.filter((i) => i.destination === ReturnDestination.RESTOCK_ORIGINAL_BATCH).length,
                0
              )}{' '}
              Items
            </div>
          </div>
        </div>
      </div>

      {/* ── Return History Table ── */}
      <div className="pharma-card overflow-hidden">
        <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-pharma-primary" />
            <h2 className="text-sm font-bold text-pharma-text">Past Return Transactions</h2>
          </div>
          <span className="text-xs text-pharma-muted">{returnsList.length} total entries</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-pharma-muted">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pharma-primary" />
            Loading return records...
          </div>
        ) : returnsList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <RotateCcw className="w-8 h-8 mx-auto text-pharma-muted opacity-40" />
            <div className="text-sm font-medium text-pharma-text">No return records found</div>
            <p className="text-xs text-pharma-muted max-w-sm mx-auto">
              Sales returns processed by cashiers and pharmacists will appear here with complete audit trails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Return #</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Original Invoice</th>
                  <th className="py-2.5 px-4">Cashier</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4 text-right">Refund Amount</th>
                  <th className="py-2.5 px-4 text-center">Items & Destination</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pharma-surface">
                {returnsList.map((ret) => (
                  <tr key={ret.id} className="hover:bg-pharma-surface/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-pharma-primary">
                      {ret.returnNumber}
                    </td>
                    <td className="py-2.5 px-4 text-pharma-muted">
                      {formatDateDDMMYYYY(ret.returnDate)}
                    </td>
                    <td className="py-2.5 px-4">
                      {ret.saleInvoiceNumber ? (
                        <span className="font-mono bg-pharma-surface px-1.5 py-0.5 rounded text-pharma-text font-medium">
                          {ret.saleInvoiceNumber}
                        </span>
                      ) : (
                        <Badge variant="quarantine">No Invoice (Approved)</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-pharma-text">{ret.cashierName || 'Cashier'}</td>
                    <td className="py-2.5 px-4 max-w-xs truncate text-pharma-text" title={ret.reason}>
                      {ret.reason}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-pharma-danger">
                      -{formatPaisaToPKR(ret.totalRefundPaisa)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {ret.items.map((i, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              i.destination === ReturnDestination.RESTOCK_ORIGINAL_BATCH
                                ? 'bg-pharma-surface text-pharma-primary border border-pharma-primary/20'
                                : 'bg-red-50 text-pharma-danger border border-pharma-danger/20'
                            }`}
                          >
                            {i.quantityInUnit}x {i.productName} (
                            {i.destination === ReturnDestination.RESTOCK_ORIGINAL_BATCH ? 'Shelf' : 'Quarantine'})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => printReturnReceipt(ret)}
                        title="Print Return Voucher"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New Return Modal ── */}
      <Modal
        isOpen={isNewReturnModalOpen}
        onClose={() => setIsNewReturnModalOpen(false)}
        title="Process Sales Return"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Step 1: Invoice lookup */}
          <div className="bg-pharma-surface p-4 rounded-xl border border-pharma-primary/20 space-y-3">
            <div className="text-xs font-semibold text-pharma-text flex items-center gap-1.5">
              <Search className="w-4 h-4 text-pharma-primary" />
              Step 1: Enter Original Sales Invoice Number
            </div>
            <form onSubmit={handleSearchInvoice} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. INV-202610-000001"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="flex-1 bg-white border border-pharma-muted/30 rounded-lg px-3 py-1.5 text-xs font-mono uppercase focus:ring-1 focus:ring-pharma-primary outline-none"
              />
              <Button type="submit" variant="primary" size="sm" disabled={isSearchingInvoice}>
                {isSearchingInvoice ? 'Searching...' : 'Lookup Bill'}
              </Button>
            </form>

            {invoiceSearchError && (
              <div className="text-xs text-pharma-danger bg-red-50 p-2.5 rounded-lg border border-pharma-danger/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{invoiceSearchError}</span>
              </div>
            )}
          </div>

          {/* Step 2: Item selection and return breakdown */}
          {searchedSale && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs bg-white p-3 rounded-lg border border-pharma-surface">
                <div>
                  <span className="text-pharma-muted">Invoice:</span>{' '}
                  <span className="font-bold text-pharma-text">{searchedSale.invoiceNumber}</span>
                  <span className="text-pharma-muted ml-3">Date:</span>{' '}
                  <span className="text-pharma-text">{formatDateDDMMYYYY(searchedSale.saleDate)}</span>
                </div>
                <div>
                  <span className="text-pharma-muted">Cashier:</span>{' '}
                  <span className="text-pharma-text">{searchedSale.cashierName || 'Cashier'}</span>
                </div>
              </div>

              <div className="border border-pharma-surface rounded-xl overflow-hidden">
                <div className="bg-pharma-surface px-3 py-2 text-xs font-bold text-pharma-text flex justify-between">
                  <span>Select Items to Return</span>
                  <span>Unit Price</span>
                </div>

                <div className="divide-y divide-pharma-surface max-h-64 overflow-y-auto">
                  {searchedSale.items.map((item) => {
                    const state = selectedItems[item.id] || {
                      checked: false,
                      quantity: item.quantityInUnit,
                      destination: ReturnDestination.RESTOCK_ORIGINAL_BATCH,
                      reason: '',
                    };

                    return (
                      <div key={item.id} className="p-3 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.checked}
                              onChange={(e) =>
                                setSelectedItems((prev) => ({
                                  ...prev,
                                  [item.id]: { ...state, checked: e.target.checked },
                                }))
                              }
                              className="rounded text-pharma-primary focus:ring-pharma-primary w-4 h-4"
                            />
                            <div>
                              <div className="text-xs font-bold text-pharma-text">{item.productName}</div>
                              <div className="text-[11px] text-pharma-muted font-mono">
                                Batch: {item.batchNumber} | Unit: {item.unitName} | Sold: {item.quantityInUnit}
                              </div>
                            </div>
                          </label>

                          <div className="text-right">
                            <div className="text-xs font-bold text-pharma-text">
                              {formatPaisaToPKR(item.mrpPaisaPerUnit)}
                            </div>
                            <div className="text-[10px] text-pharma-muted">per {item.unitName}</div>
                          </div>
                        </div>

                        {state.checked && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-pharma-surface/40 text-xs">
                            <div>
                              <label className="block text-[10px] text-pharma-muted font-medium mb-1">
                                Return Qty (Max {item.quantityInUnit})
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={item.quantityInUnit}
                                value={state.quantity}
                                onChange={(e) => {
                                  const val = Math.min(
                                    item.quantityInUnit,
                                    Math.max(1, parseInt(e.target.value) || 1)
                                  );
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...state, quantity: val },
                                  }));
                                }}
                                className="w-full bg-pharma-surface/40 border border-pharma-muted/30 rounded px-2 py-1 text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-pharma-muted font-medium mb-1">
                                Restock Destination
                              </label>
                              <select
                                value={state.destination}
                                onChange={(e) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...state, destination: e.target.value as any },
                                  }))
                                }
                                className="w-full bg-pharma-surface/40 border border-pharma-muted/30 rounded px-2 py-1 text-xs"
                              >
                                <option value={ReturnDestination.RESTOCK_ORIGINAL_BATCH}>
                                  Restock Shelf (Sellable)
                                </option>
                                <option value={ReturnDestination.DAMAGED_QUARANTINE}>
                                  Damaged / Quarantine
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] text-pharma-muted font-medium mb-1">
                                Item Refund Subtotal
                              </label>
                              <div className="px-2 py-1 bg-pharma-surface rounded font-bold text-pharma-danger">
                                {formatPaisaToPKR(state.quantity * item.mrpPaisaPerUnit)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Refund tender & overall reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-pharma-text mb-1">Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2 text-xs"
                  >
                    <option value={RefundMethod.CASH}>Cash Refund</option>
                    <option value={RefundMethod.CREDIT}>Store Credit / Ledger Credit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-pharma-text mb-1">
                    Return Reason <span className="text-pharma-danger">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prescribed dosage changed by physician"
                    value={overallReason}
                    onChange={(e) => setOverallReason(e.target.value)}
                    className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* Summary Bar */}
              <div className="bg-pharma-surface p-3 rounded-xl border border-pharma-primary/20 flex items-center justify-between">
                <div>
                  <div className="text-xs text-pharma-muted">Total Calculated Refund</div>
                  <div className="text-lg font-bold text-pharma-danger">
                    {formatPaisaToPKR(calculatedRefundTotal)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsNewReturnModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleProcessReturn}
                    disabled={returnMutation.isPending || calculatedRefundTotal === 0}
                  >
                    {returnMutation.isPending ? 'Processing...' : 'Confirm Return & Restock'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Success & Print Modal ── */}
      {completedReturn && (
        <Modal
          isOpen={!!completedReturn}
          onClose={() => setCompletedReturn(null)}
          title="Return Processed Successfully"
        >
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-pharma-surface border border-pharma-primary/30 text-pharma-primary flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-pharma-text">
                Return Voucher {completedReturn.returnNumber}
              </div>
              <div className="text-xs text-pharma-muted mt-1">
                Stock has been restored according to destination policy and ledger movements have been recorded.
              </div>
            </div>

            <div className="bg-pharma-surface p-3 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-pharma-muted">Total Refund Amount:</span>
                <span className="font-bold text-pharma-danger">
                  {formatPaisaToPKR(completedReturn.totalRefundPaisa)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-pharma-muted">Refund Tender:</span>
                <span className="font-semibold">{completedReturn.refundMethod}</span>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printReturnReceipt(completedReturn)}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Return Receipt
              </Button>
              <Button variant="primary" size="sm" onClick={() => setCompletedReturn(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
