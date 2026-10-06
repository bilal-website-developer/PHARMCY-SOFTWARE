import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Printer,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Package,
  Pill,
  Stethoscope,
  ReceiptText,
  RefreshCw,
  ClipboardList,
  Clock,
  Users,
} from 'lucide-react';
import { usePosStore } from '../../stores/posStore';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import {
  CartItem,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  formatPaisaToPKR,
  formatDateDDMMYYYY,
  BatchStatus,
  DrugClass,
  ROLE_MAX_DISCOUNT,
  PostSaleInput,
  SaleDto,
  HeldBillDto,
  CustomerDto,
} from '@pharmacy/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

// ── Thermal Receipt (58mm / 80mm) ────────────────────────────────────────────
function printReceipt(sale: SaleDto) {
  const w = window.open('', '_blank');
  if (!w) return;

  const items = sale.items
    .map(
      (i) => `
    <tr>
      <td style="padding:2px 0">${i.productName} (${i.unitName})</td>
      <td style="text-align:right;padding:2px 0">${i.quantityInUnit}</td>
      <td style="text-align:right;padding:2px 0">Rs ${(i.mrpPaisaPerUnit / 100).toFixed(2)}</td>
      <td style="text-align:right;padding:2px 0">Rs ${(i.lineTotalPaisa / 100).toFixed(2)}</td>
    </tr>
    <tr><td colspan="4" style="color:#666;font-size:9px;padding-bottom:2px">Batch: ${i.batchNumber} | Exp: ${formatDateDDMMYYYY(i.expiryDate)}</td></tr>`
    )
    .join('');

  const payments = sale.payments
    .map(
      (p) =>
        `<tr><td>${PAYMENT_METHOD_LABELS[p.method as PaymentMethod]}</td><td style="text-align:right">Rs ${(p.amountPaisa / 100).toFixed(2)}</td></tr>`
    )
    .join('');

  w.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt ${sale.invoiceNumber}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  @media print { @page { size: 80mm auto; } }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; margin: 4mm; }
  h2 { font-size: 13px; margin: 0 0 2px; text-align: center; }
  .center { text-align: center; }
  .divider { border-top: 1px dashed #333; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  .total-row td { font-weight: bold; font-size: 12px; border-top: 1px solid #333; padding-top: 2px; }
  .receipt-58 @page { size: 58mm auto; }
</style>
</head>
<body>
  <div class="center">
    <h2>PharmaCare Pharmacy</h2>
    <div>Dispensing Excellence Since 2010</div>
    <div>Phone: +92 XXX XXXXXXX</div>
  </div>
  <div class="divider"></div>
  <table>
    <tr><td>Invoice #</td><td style="text-align:right"><b>${sale.invoiceNumber}</b></td></tr>
    <tr><td>Date</td><td style="text-align:right">${formatDateDDMMYYYY(sale.saleDate)}</td></tr>
    <tr><td>Cashier</td><td style="text-align:right">${sale.cashierName || '-'}</td></tr>
    ${sale.patientName ? `<tr><td>Patient</td><td style="text-align:right">${sale.patientName}</td></tr>` : ''}
    ${sale.doctorName ? `<tr><td>Doctor</td><td style="text-align:right">Dr. ${sale.doctorName}</td></tr>` : ''}
  </table>
  <div class="divider"></div>
  <table>
    <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th>Price</th><th>Amt</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">Rs ${(sale.subtotalPaisa / 100).toFixed(2)}</td></tr>
    ${sale.discountPaisa > 0 ? `<tr><td>Discount</td><td style="text-align:right">-Rs ${(sale.discountPaisa / 100).toFixed(2)}</td></tr>` : ''}
    ${sale.taxPaisa > 0 ? `<tr><td>Sales Tax</td><td style="text-align:right">Rs ${(sale.taxPaisa / 100).toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td>GRAND TOTAL</td><td style="text-align:right">Rs ${(sale.grandTotalPaisa / 100).toFixed(2)}</td></tr>
    <tr><td colspan="2" style="padding-top:4px;font-size:10px"><b>Payment:</b></td></tr>
    ${payments}
    ${sale.changePaisa > 0 ? `<tr><td>Change</td><td style="text-align:right">Rs ${(sale.changePaisa / 100).toFixed(2)}</td></tr>` : ''}
  </table>
  <div class="divider"></div>
  <div class="center" style="font-size:10px;margin-top:4px">
    Thank you! Get well soon 🌿<br/>
    Powered by PharmaCare Management System
  </div>
</body>
</html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

// ── Types ────────────────────────────────────────────────────────────────────
interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  genericName: string;
  dosageForm: string;
  drugClass: DrugClass;
  isLooseSellingEnabled: boolean;
  loosePricePaisa: number | null;
  mrpPaisa: number;
  taxRatePct: number;
  requiresPrescription: boolean;
  currentStock: number;
  rackLocation: string | null;
  units: { id: string; unitName: string; conversionFactor: number; isDefaultSellingUnit: boolean; isBaseUnit: boolean; pricePaisa: number | null }[];
  batches: { id: string; batchNumber: string; expiryDate: string; daysToExpiry: number; quantity: number; status: BatchStatus; mrpPaisa: number }[];
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
const batchBadgeVariant = (status: BatchStatus) => {
  if (status === 'EXPIRED') return 'expired';
  if (status === 'NEAR_EXPIRY') return 'near-expiry';
  return 'active';
};

// ── POS Main Page ─────────────────────────────────────────────────────────────
export const POSPage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const store = usePosStore();

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── UI modals ───────────────────────────────────────────────────────────────
  const [showPayment, setShowPayment] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState<ProductSearchResult | null>(null);
  const [showSuccess, setShowSuccess] = useState<SaleDto | null>(null);

  // ── Payment state ───────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [billDiscount, setBillDiscount] = useState('0');
  const [holdLabel, setHoldLabel] = useState('');

  const maxDisc = ROLE_MAX_DISCOUNT[user?.role ?? 'CASHIER'] ?? 5;

  // ── Credit Customer state ──────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);

  const { data: creditCustomers } = useQuery({
    queryKey: ['credit-customers'],
    queryFn: () => apiFetch<{ success: boolean; data: CustomerDto[] }>('/api/customers?status=ACTIVE'),
    select: (r) => r.data || [],
  });

  // ── Derived totals ──────────────────────────────────────────────────────────
  const grandTotal = store.getGrandTotalPaisa();
  const paidTotal = store.getPaidPaisa();
  const change = store.getChangePaisa();
  const remaining = Math.max(0, grandTotal - paidTotal);

  // ── Held bills query ────────────────────────────────────────────────────────
  const { data: heldBillsData, refetch: refetchHeld } = useQuery({
    queryKey: ['held-bills'],
    queryFn: () => apiFetch<{ success: boolean; data: HeldBillDto[] }>('/api/sales/held'),
    select: (r) => r.data,
    enabled: showHeldBills,
  });

  // ── Post sale mutation ──────────────────────────────────────────────────────
  const postSaleMutation = useMutation({
    mutationFn: async (body: PostSaleInput) => {
      const res = await apiFetch<{ success: boolean; data: SaleDto }>('/api/sales', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    onSuccess: (sale) => {
      setShowPayment(false);
      setShowSuccess(sale);
      store.clearCart();
      setBillDiscount('0');
      qc.invalidateQueries({ queryKey: ['held-bills'] });
      // Auto-print receipt
      setTimeout(() => printReceipt(sale), 500);
    },
  });

  // ── Hold bill mutation ──────────────────────────────────────────────────────
  const holdMutation = useMutation({
    mutationFn: (data: { label: string; billData: any }) =>
      apiFetch<{ success: boolean }>('/api/sales/held', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      store.clearCart();
      setBillDiscount('0');
      setShowHold(false);
      setHoldLabel('');
      qc.invalidateQueries({ queryKey: ['held-bills'] });
    },
  });

  // ── Product search (debounced) ──────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await apiFetch<{ success: boolean; data: ProductSearchResult[] }>(
        `/api/sales/pos/search?q=${encodeURIComponent(q)}`
      );
      setSearchResults(res.data ?? []);
      setShowResults(true);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(searchQ), 250);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQ, doSearch]);

  // ── Keyboard shortcuts (F-keys) ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // F1 → focus search / new bill
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
      // F2 → open payment (if cart non-empty)
      if (e.key === 'F2' && store.items.length > 0) { e.preventDefault(); handleOpenPayment(); }
      // F3 → hold bill
      if (e.key === 'F3' && store.items.length > 0) { e.preventDefault(); setShowHold(true); }
      // F4 → resume held bill
      if (e.key === 'F4') { e.preventDefault(); setShowHeldBills(true); }
      // Escape → clear search
      if (e.key === 'Escape') { setShowResults(false); setSearchQ(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store.items.length]);

  // ── Add product to cart ─────────────────────────────────────────────────────
  const addToCart = (product: ProductSearchResult, unit: typeof product.units[0], batch: typeof product.batches[0]) => {
    // Check batch status
    if (batch.status === 'EXPIRED') return;
    const mrpPaisaPerUnit = unit.pricePaisa ?? Math.round(product.mrpPaisa * unit.conversionFactor / (product.units.find(u => u.isBaseUnit)?.conversionFactor ?? 1));

    store.addItem({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      genericName: product.genericName,
      drugClass: product.drugClass,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      daysToExpiry: batch.daysToExpiry,
      availableSmallestUnits: batch.quantity,
      unitName: unit.unitName,
      conversionFactor: unit.conversionFactor,
      quantityInUnit: 1,
      mrpPaisaPerUnit,
      discountPct: 0,
      taxPct: product.taxRatePct,
    });

    // If Rx required, open Rx modal
    if (product.requiresPrescription && !store.requiresRx) {
      store.setRxFields({ requiresRx: true, doctorName: store.doctorName, patientName: store.patientName, patientPhone: store.patientPhone });
      setShowRxModal(true);
    }

    setShowResults(false);
    setSearchQ('');
    searchRef.current?.focus();
  };

  // ── Open payment modal ──────────────────────────────────────────────────────
  const handleOpenPayment = () => {
    const disc = parseFloat(billDiscount) || 0;
    store.setBillDiscountPct(Math.min(disc, maxDisc));
    setPaymentAmount(String(Math.ceil(grandTotal / 100))); // auto-fill cash amount in rupees
    setShowPayment(true);
  };

  // ── Add payment split ───────────────────────────────────────────────────────
  const handleAddPayment = () => {
    const amtRupees = parseFloat(paymentAmount.replace(/,/g, '')) || 0;
    if (amtRupees <= 0) return;

    if (paymentMethod === PaymentMethod.CREDIT && !selectedCustomerId) {
      alert('Please select a credit customer account before adding credit payment.');
      return;
    }

    store.addPayment({ method: paymentMethod, amountPaisa: Math.round(amtRupees * 100) });
    setPaymentAmount('');
  };

  // ── Post sale ───────────────────────────────────────────────────────────────
  const handlePostSale = () => {
    if (paidTotal < grandTotal) return;
    if (store.requiresRx && (!store.doctorName || !store.patientName)) {
      setShowRxModal(true);
      return;
    }

    const isCredit = Boolean(
      selectedCustomerId &&
      (paymentMethod === PaymentMethod.CREDIT || store.payments.some((p) => p.method === PaymentMethod.CREDIT))
    );

    const totals = {
      subtotalPaisa: store.getSubtotalPaisa(),
      discountPaisa: store.getDiscountPaisa(),
      taxPaisa: store.getTaxPaisa(),
      grandTotalPaisa: grandTotal,
      paidPaisa: paidTotal,
      changePaisa: change,
    };

    const body: PostSaleInput = {
      ...totals,
      requiresRx: store.requiresRx,
      doctorName: store.doctorName || undefined,
      patientName: store.patientName || undefined,
      patientPhone: store.patientPhone || undefined,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer?.name || undefined,
      isCreditSale: isCredit,
      payments: store.payments,
      items: store.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        unitName: item.unitName,
        conversionFactor: item.conversionFactor,
        quantityInUnit: item.quantityInUnit,
        quantitySmallestUnits: item.quantityInUnit * item.conversionFactor,
        mrpPaisaPerUnit: item.mrpPaisaPerUnit,
        discountPct: item.discountPct,
        taxPct: item.taxPct,
        lineTotalPaisa: item.lineTotalPaisa,
      })),
    };

    postSaleMutation.mutate(body);
  };

  // ── Resume held bill ────────────────────────────────────────────────────────
  const resumeHeld = async (held: HeldBillDto) => {
    store.loadHeldBill(held.billData);
    setBillDiscount(String(held.billData.billDiscountPct ?? 0));
    // Mark as resumed
    await apiFetch(`/api/sales/held/${held.id}`, { method: 'DELETE' }).catch(() => { });
    setShowHeldBills(false);
    qc.invalidateQueries({ queryKey: ['held-bills'] });
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const drugClassColor = (dc: DrugClass) => {
    if (dc === 'CONTROLLED' || dc === 'NARCOTIC') return 'text-pharma-danger font-semibold';
    if (dc === 'RX') return 'text-pharma-primary font-medium';
    return 'text-pharma-muted';
  };

  return (
    <div className="flex flex-col h-full gap-0 -m-5">
      {/* ── Top toolbar ──────────────────────────────────────────────────────── */}
      <div className="bg-pharma-primary text-white px-4 py-2.5 flex items-center gap-3 shadow-lg shrink-0">
        <ShoppingCart className="w-5 h-5 text-pharma-accent" />
        <span className="font-bold text-base">POS Billing</span>

        {/* Search bar */}
        <div className="relative flex-1 max-w-xl ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            id="pos-search-input"
            ref={searchRef}
            type="text"
            placeholder="Search by brand, generic or barcode… (F1)"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onFocus={() => searchQ.length >= 2 && setShowResults(true)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-pharma-accent/60"
            autoComplete="off"
          />
          {isSearching && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 animate-spin" />
          )}

          {/* Search dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-pharma shadow-2xl border border-pharma-muted/20 z-50 max-h-80 overflow-y-auto">
              {searchResults.map((product) => {
                const fefo = product.batches[0]; // Earliest valid expiry
                const defaultUnit = product.units.find((u) => u.isDefaultSellingUnit) ?? product.units[0];
                const hasStock = product.currentStock > 0 && fefo;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-pharma-surface cursor-pointer border-b border-pharma-muted/10 last:border-0 transition-colors ${!hasStock ? 'opacity-60' : ''}`}
                    onClick={() => {
                      if (!hasStock) return;
                      if (product.batches.length > 1) {
                        setShowProductDetail(product);
                      } else if (fefo && defaultUnit) {
                        addToCart(product, defaultUnit, fefo);
                      }
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-pharma-surface flex items-center justify-center shrink-0">
                      <Pill className="w-5 h-5 text-pharma-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-pharma-text text-sm truncate">{product.name}</span>
                        <span className={`text-xs ${drugClassColor(product.drugClass)}`}>{product.drugClass}</span>
                        {product.requiresPrescription && (
                          <span className="text-xs text-pharma-primary flex items-center gap-0.5"><Stethoscope className="w-3 h-3" />Rx</span>
                        )}
                      </div>
                      <div className="text-xs text-pharma-muted truncate">
                        {product.genericName} · {product.dosageForm}
                        {product.rackLocation && ` · ${product.rackLocation}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-pharma-primary text-sm">
                        {formatPaisaToPKR(defaultUnit?.pricePaisa ?? product.mrpPaisa)}
                        <span className="font-normal text-pharma-muted text-xs"> / {defaultUnit?.unitName}</span>
                      </div>
                      {fefo ? (
                        <Badge variant={batchBadgeVariant(fefo.status) as any} className="text-xs">
                          {fefo.daysToExpiry}d
                        </Badge>
                      ) : (
                        <span className="text-xs text-pharma-danger font-medium">Out of Stock</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showResults && searchResults.length === 0 && searchQ.length >= 2 && !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-pharma shadow-xl border border-pharma-muted/20 z-50 px-4 py-3 text-sm text-pharma-muted text-center">
              No medicines found for "{searchQ}"
            </div>
          )}
        </div>

        {/* Action buttons with keyboard hints */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            id="pos-held-bills-btn"
            onClick={() => { setShowHeldBills(true); refetchHeld(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >
            <PauseCircle className="w-4 h-4" />
            Held Bills <kbd className="ml-1 opacity-60 text-[10px]">F4</kbd>
          </button>
          {store.items.length > 0 && (
            <button
              id="pos-hold-btn"
              onClick={() => setShowHold(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors"
            >
              <PauseCircle className="w-4 h-4" />
              Hold <kbd className="ml-1 opacity-60 text-[10px]">F3</kbd>
            </button>
          )}
        </div>
      </div>

      {/* ── Main split layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* ── LEFT: Cart ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-pharma-muted/15">

          {/* Cart header */}
          <div className="px-4 py-2 bg-pharma-surface border-b border-pharma-muted/15 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-pharma-text uppercase tracking-wide flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-pharma-primary" />
              Cart ({store.items.length} item{store.items.length !== 1 ? 's' : ''})
            </span>
            {store.items.length > 0 && (
              <button
                onClick={() => { store.clearCart(); setBillDiscount('0'); }}
                className="text-xs text-pharma-danger hover:underline flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Rx indicator */}
          {store.requiresRx && (
            <div
              className="mx-3 mt-2 px-3 py-2 rounded-lg bg-pharma-surface border border-pharma-primary/20 flex items-center gap-2 text-xs text-pharma-primary cursor-pointer hover:bg-pharma-primary/5 shrink-0"
              onClick={() => setShowRxModal(true)}
            >
              <Stethoscope className="w-4 h-4" />
              <span><strong>Rx Sale:</strong> {store.patientName || '⚠ Patient name required'} — Dr. {store.doctorName || '⚠ Doctor name required'}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {store.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 text-pharma-muted">
                <Package className="w-14 h-14 mb-3 opacity-20" />
                <p className="font-semibold">Cart is empty</p>
                <p className="text-xs mt-1 opacity-70">Search for a medicine or scan a barcode to start</p>
                <p className="text-xs mt-3 opacity-50">F1 to focus search</p>
              </div>
            ) : (
              store.items.map((item) => (
                <CartRow
                  key={item.cartRowId}
                  item={item}
                  maxDisc={maxDisc}
                  onQtyChange={(qty) => store.updateItemQty(item.cartRowId, qty)}
                  onDiscChange={(disc) => store.updateItemDiscount(item.cartRowId, disc)}
                  onRemove={() => store.removeItem(item.cartRowId)}
                />
              ))
            )}
          </div>

          {/* Bill discount row */}
          {store.items.length > 0 && (
            <div className="shrink-0 px-4 py-2 border-t border-pharma-muted/15 bg-pharma-surface flex items-center gap-3">
              <span className="text-xs font-medium text-pharma-text whitespace-nowrap">Bill Discount</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={maxDisc}
                  step={0.5}
                  value={billDiscount}
                  onChange={(e) => {
                    const v = Math.min(parseFloat(e.target.value) || 0, maxDisc);
                    setBillDiscount(String(v));
                    store.setBillDiscountPct(v);
                  }}
                  className="w-16 text-center border border-pharma-muted/30 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pharma-accent"
                />
                <span className="text-xs text-pharma-muted">% (max {maxDisc}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary & Pay ─────────────────────────────────────────────── */}
        <div className="w-72 lg:w-80 flex flex-col shrink-0 bg-pharma-surface">
          {/* Totals */}
          <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wide text-pharma-text flex items-center gap-1.5">
              <ReceiptText className="w-3.5 h-3.5 text-pharma-primary" />
              Bill Summary
            </h3>

            <div className="pharma-card-row p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-pharma-muted">Subtotal</span>
                <span className="font-medium">{formatPaisaToPKR(store.getSubtotalPaisa())}</span>
              </div>
              {store.getDiscountPaisa() > 0 && (
                <div className="flex justify-between text-sm text-pharma-primary">
                  <span>Discount</span>
                  <span>-{formatPaisaToPKR(store.getDiscountPaisa())}</span>
                </div>
              )}
              {store.getTaxPaisa() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-pharma-muted">Sales Tax</span>
                  <span>{formatPaisaToPKR(store.getTaxPaisa())}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-pharma-muted/15 flex justify-between">
                <span className="font-bold text-pharma-text">Grand Total</span>
                <span className="font-bold text-pharma-primary text-lg">{formatPaisaToPKR(grandTotal)}</span>
              </div>
            </div>

            {/* Payments summary */}
            {store.payments.length > 0 && (
              <div className="pharma-card-row p-3 space-y-1">
                <p className="text-xs font-semibold text-pharma-muted uppercase mb-1">Payments</p>
                {store.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-pharma-text">
                      {p.method === 'CASH' && <Banknote className="w-3.5 h-3.5 text-pharma-primary" />}
                      {(p.method === 'JAZZCASH' || p.method === 'EASYPAISA') && <Smartphone className="w-3.5 h-3.5 text-pharma-primary" />}
                      {p.method === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-pharma-primary" />}
                      {p.method === 'BANK_TRANSFER' && <Building2 className="w-3.5 h-3.5 text-pharma-text" />}
                      <span>{PAYMENT_METHOD_LABELS[p.method as PaymentMethod]}</span>
                    </div>
                    <span className="font-medium">{formatPaisaToPKR(p.amountPaisa)}</span>
                  </div>
                ))}
                {change > 0 && (
                  <div className="pt-1 border-t border-pharma-muted/15 flex justify-between text-sm text-pharma-primary font-semibold">
                    <span>Change</span>
                    <span>{formatPaisaToPKR(change)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Keyboard hints */}
            <div className="text-xs text-pharma-muted space-y-0.5 mt-2">
              <div className="flex gap-2"><kbd className="bg-pharma-muted/10 px-1.5 py-0.5 rounded text-[10px]">F1</kbd><span>New / Search</span></div>
              <div className="flex gap-2"><kbd className="bg-pharma-muted/10 px-1.5 py-0.5 rounded text-[10px]">F2</kbd><span>Payment</span></div>
              <div className="flex gap-2"><kbd className="bg-pharma-muted/10 px-1.5 py-0.5 rounded text-[10px]">F3</kbd><span>Hold Bill</span></div>
              <div className="flex gap-2"><kbd className="bg-pharma-muted/10 px-1.5 py-0.5 rounded text-[10px]">F4</kbd><span>Resume Held</span></div>
            </div>
          </div>

          {/* Pay button */}
          <div className="shrink-0 p-4 border-t border-pharma-muted/20">
            <Button
              id="pos-pay-btn"
              variant="save"
              fullWidth
              size="lg"
              disabled={store.items.length === 0}
              onClick={handleOpenPayment}
              className="text-base py-3"
            >
              <CreditCard className="w-5 h-5" />
              Pay {grandTotal > 0 ? formatPaisaToPKR(grandTotal) : ''} &nbsp;
              <kbd className="text-[10px] opacity-70">F2</kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────────────────── */}

      {/* ── Product batch/unit chooser ─────────────────────────────────────────── */}
      {showProductDetail && (
        <Modal
          isOpen={!!showProductDetail}
          onClose={() => setShowProductDetail(null)}
          title={showProductDetail.name}
          description={`${showProductDetail.genericName} · ${showProductDetail.dosageForm} · ${showProductDetail.rackLocation ?? 'No rack assigned'}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Batch list */}
            <div>
              <h4 className="text-xs font-bold uppercase text-pharma-muted mb-2">Available Batches (FEFO order)</h4>
              <div className="space-y-2">
                {showProductDetail.batches.map((batch) => {
                  const expired = batch.status === 'EXPIRED';
                  return (
                    <div key={batch.id} className={`pharma-card-row p-3 ${expired ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-pharma-accent'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm text-pharma-text">{batch.batchNumber}</span>
                          <div className="text-xs text-pharma-muted mt-0.5">
                            Exp: {formatDateDDMMYYYY(batch.expiryDate)} &nbsp;·&nbsp; Stock: {batch.quantity} units
                          </div>
                        </div>
                        <Badge variant={batchBadgeVariant(batch.status) as any}>{batch.daysToExpiry}d</Badge>
                      </div>

                      {/* Unit selection for this batch */}
                      {!expired && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {showProductDetail.units.map((unit) => (
                            <button
                              key={unit.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pharma-primary/30 text-pharma-primary text-xs font-medium hover:bg-pharma-primary hover:text-white transition-colors"
                              onClick={() => {
                                addToCart(showProductDetail, unit, batch);
                                setShowProductDetail(null);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {unit.unitName}
                              {unit.pricePaisa ? ` (${formatPaisaToPKR(unit.pricePaisa)})` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                      {expired && <span className="text-xs text-pharma-danger mt-1 block">Cannot sell expired stock</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Rx / Controlled Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showRxModal}
        onClose={() => setShowRxModal(false)}
        title="Rx / Controlled Item Details"
        description="This sale contains a prescription-required or controlled medicine. Doctor and patient details are mandatory."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-pharma-surface border border-pharma-primary/20 text-xs text-pharma-primary flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>These details are logged in the controlled-drug register and are required by DRAP regulations.</span>
          </div>

          <div>
            <label className="text-xs font-medium text-pharma-muted uppercase tracking-wide">Doctor Name</label>
            <input
              className="mt-1 w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pharma-primary"
              placeholder="Dr. Farrukh Ahmed"
              value={store.doctorName}
              onChange={(e) => store.setRxFields({ requiresRx: true, doctorName: e.target.value, patientName: store.patientName, patientPhone: store.patientPhone })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-pharma-muted uppercase tracking-wide">Patient Name</label>
            <input
              className="mt-1 w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pharma-primary"
              placeholder="Muhammad Ali"
              value={store.patientName}
              onChange={(e) => store.setRxFields({ requiresRx: true, doctorName: store.doctorName, patientName: e.target.value, patientPhone: store.patientPhone })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-pharma-muted uppercase tracking-wide">Patient Phone (optional)</label>
            <input
              className="mt-1 w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pharma-primary"
              placeholder="+92 300 0000000"
              value={store.patientPhone}
              onChange={(e) => store.setRxFields({ requiresRx: true, doctorName: store.doctorName, patientName: store.patientName, patientPhone: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="save" fullWidth onClick={() => setShowRxModal(false)} disabled={!store.doctorName || !store.patientName}>
            <CheckCircle2 className="w-4 h-4" /> Confirm Details
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setShowRxModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Payment Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Complete Payment"
        description={`Grand Total: ${formatPaisaToPKR(grandTotal)}`}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Totals recap */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Grand Total', value: grandTotal, color: 'text-pharma-primary' },
              { label: 'Paid', value: paidTotal, color: 'text-green-600' },
              { label: remaining > 0 ? 'Remaining' : 'Change', value: remaining > 0 ? remaining : change, color: remaining > 0 ? 'text-pharma-danger' : 'text-green-600' },
            ].map((t) => (
              <div key={t.label} className="pharma-card-row p-3 text-center">
                <p className="text-xs text-pharma-muted">{t.label}</p>
                <p className={`font-bold text-base ${t.color}`}>{formatPaisaToPKR(t.value)}</p>
              </div>
            ))}
          </div>

          {/* Payment method picker */}
          <div>
            <label className="text-xs font-semibold text-pharma-muted uppercase tracking-wide mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Object.values(PaymentMethod).map((m) => {
                const icons: Record<string, React.ReactNode> = {
                  CASH: <Banknote className="w-4 h-4" />,
                  CARD: <CreditCard className="w-4 h-4" />,
                  JAZZCASH: <Smartphone className="w-4 h-4" />,
                  EASYPAISA: <Smartphone className="w-4 h-4" />,
                  BANK_TRANSFER: <Building2 className="w-4 h-4" />,
                  CREDIT: <Users className="w-4 h-4" />,
                };
                const labels: Record<string, string> = {
                  CASH: 'Cash',
                  CARD: 'Card',
                  JAZZCASH: 'JazzCash',
                  EASYPAISA: 'Easypaisa',
                  BANK_TRANSFER: 'Bank',
                  CREDIT: 'Credit',
                };
                return (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all ${paymentMethod === m ? 'bg-pharma-primary text-white border-pharma-primary' : 'border-pharma-muted/20 text-pharma-muted hover:border-pharma-primary hover:text-pharma-primary'}`}
                  >
                    {icons[m]}
                    {labels[m]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Selection for Credit Sale */}
          {(paymentMethod === PaymentMethod.CREDIT || selectedCustomerId) && (
            <div className="p-3 rounded-lg bg-pharma-surface border border-pharma-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-pharma-text uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-pharma-primary" />
                  Select Credit Customer Account *
                </label>
                {selectedCustomer && (
                  <span className="text-[11px] text-pharma-primary">
                    Limit: <strong className="font-mono">{formatPaisaToPKR(selectedCustomer.creditLimitPaisa)}</strong>
                  </span>
                )}
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const custId = e.target.value;
                  setSelectedCustomerId(custId);
                  const cust = creditCustomers?.find((c) => c.id === custId) || null;
                  setSelectedCustomer(cust);
                }}
                className="w-full border border-pharma-primary/30 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharma-primary bg-white"
              >
                <option value="">-- Choose Credit Customer --</option>
                {creditCustomers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - Current Bal: {formatPaisaToPKR(c.currentBalancePaisa)}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="space-y-1 pt-1 border-t border-pharma-primary/20 text-[11px] text-pharma-text">
                  <div className="flex items-center justify-between">
                    <span>Outstanding Ledger Balance: <strong className="font-mono">{formatPaisaToPKR(selectedCustomer.currentBalancePaisa)}</strong></span>
                    <span>
                      Available Credit:{' '}
                      <strong className={`font-mono ${selectedCustomer.creditLimitPaisa - selectedCustomer.currentBalancePaisa <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {formatPaisaToPKR(Math.max(0, selectedCustomer.creditLimitPaisa - selectedCustomer.currentBalancePaisa))}
                      </strong>
                    </span>
                  </div>

                  {selectedCustomer.currentBalancePaisa + grandTotal > selectedCustomer.creditLimitPaisa && (
                    <div className="p-2 rounded bg-amber-100/90 border border-amber-300 text-amber-900 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Warning: This sale will exceed the customer's credit limit! Requires Pharmacist/Admin override.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Amount input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-pharma-muted uppercase tracking-wide">Amount (Rs)</label>
              <input
                id="pos-payment-amount-input"
                type="number"
                min={0}
                step={0.01}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                className="mt-1 w-full border border-pharma-muted/30 rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-pharma-primary"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex items-end">
              <Button variant="primary" onClick={handleAddPayment} className="py-2.5">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => setPaymentAmount(String(amt))}
                className="px-3 py-1 rounded-lg bg-pharma-surface border border-pharma-muted/20 text-xs font-medium text-pharma-text hover:bg-pharma-primary/10 transition-colors"
              >
                Rs {amt}
              </button>
            ))}
            <button
              onClick={() => setPaymentAmount(String(Math.ceil(grandTotal / 100)))}
              className="px-3 py-1 rounded-lg bg-pharma-primary/10 border border-pharma-primary/30 text-xs font-medium text-pharma-primary hover:bg-pharma-primary/20 transition-colors"
            >
              Exact
            </button>
          </div>

          {/* Payment splits */}
          {store.payments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-pharma-muted uppercase tracking-wide mb-1.5">Added Payments</p>
              <div className="space-y-1">
                {store.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between pharma-card-row px-3 py-2">
                    <span className="text-sm">{PAYMENT_METHOD_LABELS[p.method as PaymentMethod]}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{formatPaisaToPKR(p.amountPaisa)}</span>
                      <button onClick={() => store.removePayment(i)} className="text-pharma-danger hover:opacity-70">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <Button
            id="pos-confirm-sale-btn"
            variant="save"
            fullWidth
            size="lg"
            disabled={paidTotal < grandTotal || postSaleMutation.isPending}
            isLoading={postSaleMutation.isPending}
            onClick={handlePostSale}
          >
            <CheckCircle2 className="w-5 h-5" />
            {paidTotal >= grandTotal ? `Post Sale & Print Receipt` : `Need ${formatPaisaToPKR(remaining)} more`}
          </Button>
          <Button variant="cancel" onClick={() => { setShowPayment(false); store.clearPayments(); }}>
            Cancel
          </Button>
        </div>

        {postSaleMutation.isError && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            {(postSaleMutation.error as any)?.message || 'Failed to post sale. Please try again.'}
          </div>
        )}
      </Modal>

      {/* ── Hold Bill Modal ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={showHold}
        onClose={() => setShowHold(false)}
        title="Hold Current Bill"
        description="The bill will be saved and you can resume it from F4."
        maxWidth="sm"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-pharma-muted uppercase tracking-wide">Hold Label (optional)</label>
            <input
              className="mt-1 w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pharma-primary"
              placeholder="e.g. Patient waiting"
              value={holdLabel}
              onChange={(e) => setHoldLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && holdMutation.mutate({ label: holdLabel, billData: { items: store.items, billDiscountPct: store.billDiscountPct, payments: store.payments, requiresRx: store.requiresRx, doctorName: store.doctorName, patientName: store.patientName, patientPhone: store.patientPhone } })}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="save"
              fullWidth
              isLoading={holdMutation.isPending}
              onClick={() => holdMutation.mutate({
                label: holdLabel,
                billData: { items: store.items, billDiscountPct: store.billDiscountPct, payments: store.payments, requiresRx: store.requiresRx, doctorName: store.doctorName, patientName: store.patientName, patientPhone: store.patientPhone },
              })}
            >
              <PauseCircle className="w-4 h-4" /> Hold Bill
            </Button>
            <Button variant="ghost" onClick={() => setShowHold(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* ── Held Bills Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showHeldBills}
        onClose={() => setShowHeldBills(false)}
        title="Held Bills"
        description="Select a held bill to resume it"
        maxWidth="md"
      >
        <div className="space-y-2">
          {!heldBillsData || heldBillsData.length === 0 ? (
            <div className="text-center py-8 text-pharma-muted">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No held bills</p>
            </div>
          ) : (
            heldBillsData.map((held) => (
              <div key={held.id} className="pharma-card-row p-3 flex items-center gap-3">
                <PauseCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-pharma-text">{held.label || 'Untitled Bill'}</p>
                  <p className="text-xs text-pharma-muted">
                    {held.billData?.items?.length ?? 0} items &nbsp;·&nbsp;
                    <Clock className="w-3 h-3 inline" /> {new Date(held.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => resumeHeld(held)}>
                  <PlayCircle className="w-4 h-4" /> Resume
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ── Sale Success Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!showSuccess}
        onClose={() => setShowSuccess(null)}
        title="Sale Posted Successfully"
        description={`Invoice ${showSuccess?.invoiceNumber} — ${formatPaisaToPKR(showSuccess?.grandTotalPaisa ?? 0)}`}
        maxWidth="sm"
      >
        {showSuccess && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-pharma-text text-lg">{showSuccess.invoiceNumber}</p>
              <p className="text-pharma-muted text-sm">{formatPaisaToPKR(showSuccess.grandTotalPaisa)} · {showSuccess.payments.length} payment{showSuccess.payments.length !== 1 ? 's' : ''}</p>
              {showSuccess.changePaisa > 0 && (
                <p className="text-pharma-primary font-semibold mt-1">Change: {formatPaisaToPKR(showSuccess.changePaisa)}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="primary" fullWidth onClick={() => printReceipt(showSuccess)}>
                <Printer className="w-4 h-4" /> Reprint Receipt
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setShowSuccess(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ── Cart Row Component ────────────────────────────────────────────────────────
interface CartRowProps {
  item: CartItem;
  maxDisc: number;
  onQtyChange: (qty: number) => void;
  onDiscChange: (disc: number) => void;
  onRemove: () => void;
}

const CartRow: React.FC<CartRowProps> = ({ item, maxDisc, onQtyChange, onDiscChange, onRemove }) => {
  const isNearExpiry = item.daysToExpiry > 0 && item.daysToExpiry <= 90;
  const isExpired = item.daysToExpiry <= 0;
  const isControlled = item.drugClass === 'CONTROLLED' || item.drugClass === 'NARCOTIC';
  const maxQty = Math.floor(item.availableSmallestUnits / item.conversionFactor);

  return (
    <div className={`pharma-card-row p-3 ${isExpired ? 'border-pharma-danger/40 bg-red-50' : isNearExpiry ? 'border-pharma-warning/40 bg-amber-50/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-pharma-text truncate">{item.productName}</span>
            {isControlled && (
              <span className="text-[10px] font-bold text-pharma-danger bg-red-50 border border-pharma-danger/30 px-1.5 py-0.5 rounded">CONTROLLED</span>
            )}
            {isNearExpiry && !isExpired && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />{item.daysToExpiry}d
              </span>
            )}
          </div>
          <div className="text-xs text-pharma-muted mt-0.5">
            {item.unitName} · Batch: {item.batchNumber}
          </div>
        </div>

        {/* Remove */}
        <button onClick={onRemove} className="text-pharma-muted hover:text-pharma-danger transition-colors shrink-0 mt-0.5">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Qty and pricing row */}
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        {/* Quantity stepper */}
        <div className="flex items-center gap-1 border border-pharma-muted/20 rounded-lg overflow-hidden">
          <button
            onClick={() => onQtyChange(item.quantityInUnit - 1)}
            disabled={item.quantityInUnit <= 1}
            className="px-2 py-1 hover:bg-pharma-surface disabled:opacity-30 transition-colors"
          >
            <Minus className="w-3.5 h-3.5 text-pharma-text" />
          </button>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={item.quantityInUnit}
            onChange={(e) => onQtyChange(Math.min(parseInt(e.target.value) || 1, maxQty))}
            className="w-12 text-center text-sm font-semibold border-x border-pharma-muted/20 py-1 focus:outline-none focus:bg-pharma-surface"
          />
          <button
            onClick={() => onQtyChange(item.quantityInUnit + 1)}
            disabled={item.quantityInUnit >= maxQty}
            className="px-2 py-1 hover:bg-pharma-surface disabled:opacity-30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-pharma-text" />
          </button>
        </div>

        {/* MRP per unit */}
        <span className="text-xs text-pharma-muted">
          {formatPaisaToPKR(item.mrpPaisaPerUnit)} × {item.quantityInUnit}
        </span>

        {/* Discount */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-pharma-muted">Disc</span>
          <input
            type="number"
            min={0}
            max={maxDisc}
            step={0.5}
            value={item.discountPct}
            onChange={(e) => onDiscChange(Math.min(parseFloat(e.target.value) || 0, maxDisc))}
            className="w-12 text-center text-xs border border-pharma-muted/20 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-pharma-accent"
          />
          <span className="text-xs text-pharma-muted">%</span>
        </div>

        {/* Line total */}
        <span className="ml-auto font-bold text-pharma-primary text-sm">
          {formatPaisaToPKR(item.lineTotalPaisa)}
        </span>
      </div>

      {isExpired && (
        <div className="mt-1.5 text-xs text-pharma-danger flex items-center gap-1 font-medium">
          <XCircle className="w-3.5 h-3.5" /> Expired batch — remove this item before posting
        </div>
      )}
    </div>
  );
};
