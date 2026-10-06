import React, { useState, useEffect } from 'react';
import {
  SupplierDto,
  ProductDto,
  PurchaseDto,
  formatPaisaToPKR,
  rupeesToPaisa,
  paisaToRupees,
  calculateEffectiveUnitCost,
  getDaysToExpiry,
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
  Search,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileText,
  Layers,
  Paperclip,
  Upload,
  Eye,
  X,
} from 'lucide-react';

interface PurchaseFormItem {
  productId: string;
  productName: string;
  productSku: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitName: string;
  conversionFactor: number;
  bonusQuantity: number;
  tradePriceRupees: number;
  discountPct: number;
  taxPct: number;
  mrpRupees: number;
  originalMrpRupees: number;
}

export const PurchasesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isCashier = user?.role === UserRole.CASHIER;

  // State
  const [purchases, setPurchases] = useState<PurchaseDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Bill Scan Preview & Modal State
  const [viewingBillUrl, setViewingBillUrl] = useState<string | null>(null);
  const [viewingBillTitle, setViewingBillTitle] = useState<string>('');
  const [isBillScanModalOpen, setIsBillScanModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  // Duplicate Bill Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingBill, setIsCheckingBill] = useState(false);

  // New Purchase Form State
  const [supplierId, setSupplierId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billAttachmentUrl, setBillAttachmentUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [paidRupees, setPaidRupees] = useState(0);

  // Handle Scan / Photo File Upload
  const handleBillFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBillAttachmentUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBillAttachment = () => {
    setBillAttachmentUrl('');
    setUploadFileName('');
  };

  const [items, setItems] = useState<PurchaseFormItem[]>([
    {
      productId: '',
      productName: '',
      productSku: '',
      batchNumber: '',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity: 1,
      unitName: 'Box',
      conversionFactor: 100,
      bonusQuantity: 0,
      tradePriceRupees: 85,
      discountPct: 0,
      taxPct: 0,
      mrpRupees: 100,
      originalMrpRupees: 100,
    },
  ]);

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        apiFetch<any>('/api/purchases'),
        apiFetch<any>('/api/suppliers'),
        apiFetch<any>('/api/products?limit=100'),
      ]);
      if (purRes.success) setPurchases(purRes.data);
      if (supRes.success) setSuppliers(supRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check duplicate bill number
  useEffect(() => {
    if (!supplierId || !billNumber.trim()) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingBill(true);
      try {
        const res = await apiFetch<any>('/api/purchases/check-bill', {
          method: 'POST',
          body: JSON.stringify({ supplierId, billNumber }),
        });
        if (res.success && res.isDuplicate) {
          setDuplicateWarning(
            `Duplicate Alert: Bill #${billNumber} is already recorded for this supplier on ${new Date(
              res.existingPurchase.billDate
            ).toLocaleDateString()}.`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      } finally {
        setIsCheckingBill(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [supplierId, billNumber]);

  // Handle item product selection
  const handleSelectProduct = (index: number, pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    const topUnit = prod.units?.find((u) => !u.isBaseUnit) || prod.units?.[0];
    const conversionFactor = topUnit?.conversionFactor || 1;
    const mrp = paisaToRupees(prod.mrpPaisa);
    const cost = prod.costPricePaisa ? paisaToRupees(prod.costPricePaisa) : Math.round(mrp * 0.85);

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: prod.id || '',
      productName: prod.name,
      productSku: prod.sku,
      unitName: topUnit?.unitName || 'Pack',
      conversionFactor,
      tradePriceRupees: cost,
      mrpRupees: mrp,
      originalMrpRupees: mrp,
    };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: '',
        productName: '',
        productSku: '',
        batchNumber: '',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: 1,
        unitName: 'Box',
        conversionFactor: 100,
        bonusQuantity: 0,
        tradePriceRupees: 50,
        discountPct: 0,
        taxPct: 0,
        mrpRupees: 65,
        originalMrpRupees: 65,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations for Totals
  const totals = items.reduce(
    (acc, it) => {
      const lineGross = it.quantity * it.tradePriceRupees;
      const lineDiscount = lineGross * (it.discountPct / 100);
      const lineTaxable = lineGross - lineDiscount;
      const lineTax = lineTaxable * (it.taxPct / 100);
      const lineNet = lineTaxable + lineTax;

      return {
        gross: acc.gross + lineGross,
        discount: acc.discount + lineDiscount,
        tax: acc.tax + lineTax,
        net: acc.net + lineNet,
      };
    },
    { gross: 0, discount: 0, tax: 0, net: 0 }
  );

  // Submit Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !billNumber.trim()) return;

    for (const it of items) {
      if (!it.productId || !it.batchNumber.trim() || !it.expiryDate) {
        alert('Please fill product, batch number, and expiry date for all items.');
        return;
      }
    }

    const payload = {
      supplierId,
      billNumber: billNumber.trim(),
      billDate,
      totalAmountPaisa: rupeesToPaisa(totals.gross),
      discountPaisa: rupeesToPaisa(totals.discount),
      taxPaisa: rupeesToPaisa(totals.tax),
      netPayablePaisa: rupeesToPaisa(totals.net),
      paidAmountPaisa: rupeesToPaisa(paidRupees),
      status: 'CONFIRMED',
      billAttachmentUrl: billAttachmentUrl || undefined,
      notes: notes || undefined,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku,
        batchNumber: it.batchNumber.trim().toUpperCase(),
        expiryDate: it.expiryDate,
        quantity: Number(it.quantity),
        unitName: it.unitName,
        conversionFactor: Number(it.conversionFactor) || 1,
        bonusQuantity: Number(it.bonusQuantity) || 0,
        tradePricePaisa: rupeesToPaisa(it.tradePriceRupees),
        discountPct: Number(it.discountPct) || 0,
        taxPct: Number(it.taxPct) || 0,
        mrpPaisa: rupeesToPaisa(it.mrpRupees),
      })),
    };

    try {
      const res = await apiFetch<any>('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsNewPurchaseModalOpen(false);
        loadData();
      }
    } catch {
      setIsNewPurchaseModalOpen(false);
      loadData();
    }
  };

  const handleOpenNewPurchase = () => {
    setSupplierId(suppliers[0]?.id || '');
    setBillNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setBillDate(new Date().toISOString().split('T')[0]);
    setBillAttachmentUrl('');
    setUploadFileName('');
    setNotes('');
    setPaidRupees(0);
    setDuplicateWarning(null);
    setItems([
      {
        productId: products[0]?.id || '',
        productName: products[0]?.name || '',
        productSku: products[0]?.sku || '',
        batchNumber: `BT-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: 10,
        unitName: 'Box',
        conversionFactor: 100,
        bonusQuantity: 1,
        tradePriceRupees: 85,
        discountPct: 5,
        taxPct: 0,
        mrpRupees: 100,
        originalMrpRupees: 100,
      },
    ]);
    setIsNewPurchaseModalOpen(true);
  };

  const handleViewDetails = (p: any) => {
    setSelectedPurchaseDetails(p);
    setIsDetailsModalOpen(true);
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      p.billNumber.toLowerCase().includes(s) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
              Phase 1B: Procurement & GRN
            </span>
            <Badge variant="active" dot={false}>
              Atomic Stock Invariants
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-pharma-text">Purchases & Goods Received (GRN)</h1>
          <p className="text-xs text-pharma-muted mt-1">
            Record supplier bills, batch numbers, bonus quantities, auto-conversion to smallest units, and supplier ledger credits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!isCashier && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenNewPurchase}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Purchase Entry (GRN)
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={loadData} title="Refresh List">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Role Notice for Cashier */}
      {isCashier && (
        <div className="p-3.5 rounded-pharma bg-pharma-surface border border-pharma-primary/30 flex items-center gap-2.5 text-xs text-pharma-text">
          <CheckCircle2 className="w-4 h-4 text-pharma-primary shrink-0" />
          <span>
            <strong>Cashier Notice:</strong> Purchase invoices and supplier trade prices are restricted to Pharmacist and Inventory Manager roles.
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm">
        <Input
          placeholder="Search by supplier bill number or distributor name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefixElement={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Purchases History Table Panel */}
      <div className="pharma-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-pharma-text">
              Recorded Purchase Invoices & GRNs ({filteredPurchases.length})
            </h2>
            <span className="text-xs text-pharma-muted">
              • Invariant: Batch Quantity = Σ(Movements)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-pharma-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pharma-primary mb-2" />
            Loading purchases...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <EmptyState
            title="No purchases found"
            description="Create your first Goods Received Note (GRN) to populate batch stock and update supplier ledger."
            actionLabel={!isCashier ? 'Create First GRN' : undefined}
            onAction={!isCashier ? handleOpenNewPurchase : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill # & Date</TableHead>
                <TableHead>Supplier Distributor</TableHead>
                <TableHead>Items Count</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Net Payable (PKR)</TableHead>
                <TableHead>Paid / Unpaid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((p) => {
                const unpaid = p.netPayablePaisa - (p.paidAmountPaisa || 0);

                return (
                  <TableRow key={p.id || p.billNumber}>
                    <TableCell>
                      <div>
                        <div className="font-bold text-pharma-text font-mono text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-pharma-primary" />
                          {p.billNumber}
                        </div>
                        <div className="text-[11px] text-pharma-muted mt-0.5">
                          {new Date(p.billDate).toLocaleDateString()}
                        </div>
                        {p.billAttachmentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingBillUrl(p.billAttachmentUrl || null);
                              setViewingBillTitle(`Supplier Bill Scan: #${p.billNumber} (${p.supplierName || 'Distributor'})`);
                              setIsBillScanModalOpen(true);
                            }}
                            className="text-[10px] text-pharma-primary font-bold flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3 text-pharma-primary" /> Bill Scan Attached
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-pharma-text">
                        {p.supplierName || 'Distributor'}
                      </div>
                      <div className="text-[10px] text-pharma-muted font-mono">
                        {p.supplierCode || '-'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-medium text-pharma-text bg-pharma-surface px-2 py-0.5 rounded border border-pharma-muted/20">
                        {p.items?.length || 1} items
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-pharma-muted">
                        {formatPaisaToPKR(p.totalAmountPaisa)}
                      </div>
                      {p.discountPaisa > 0 && (
                        <div className="text-[10px] text-pharma-primary">
                          -{formatPaisaToPKR(p.discountPaisa)} disc
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="font-bold text-pharma-text text-xs">
                        {formatPaisaToPKR(p.netPayablePaisa)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-pharma-text">
                        Paid: {formatPaisaToPKR(p.paidAmountPaisa || 0)}
                      </div>
                      <div className="text-[10px] text-pharma-danger">
                        {unpaid > 0 ? `Due: ${formatPaisaToPKR(unpaid)}` : 'Fully Paid'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="active" dot={false}>
                        {p.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(p)}
                        className="h-8 px-2 text-xs"
                      >
                        View Items
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NEW PURCHASE / GRN ENTRY MODAL                                */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isNewPurchaseModalOpen}
        onClose={() => setIsNewPurchaseModalOpen(false)}
        title="Goods Received Note (GRN) & Purchase Entry"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitPurchase} className="space-y-6">
          {/* Header Info */}
          <div className="p-4 rounded-pharma bg-pharma-surface border border-pharma-muted/20 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                label="Distributor / Supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={suppliers.map((s) => ({
                  value: s.id || '',
                  label: `${s.name} (${s.code})`,
                }))}
                required
              />

              <div>
                <Input
                  label="Supplier Bill / Invoice #"
                  placeholder="e.g. INV-8849"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  required
                />
                {isCheckingBill && (
                  <span className="text-[10px] text-pharma-muted">Checking duplicate...</span>
                )}
              </div>

              <Input
                label="Bill Date"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                required
              />
            </div>

            {/* Duplicate Bill Warning */}
            {duplicateWarning && (
              <div className="p-2.5 rounded-pharma bg-pharma-warning/15 border border-pharma-warning/40 text-pharma-text text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-pharma-warning shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {/* Attach Bill Scan / Photo (Spec Item 7) */}
            <div className="pt-2.5 border-t border-pharma-muted/20">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-pharma-text flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-pharma-primary" />
                  Attach Supplier Bill Scan / Photo
                </label>
                {billAttachmentUrl && (
                  <span className="text-[11px] text-pharma-primary font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-pharma-primary" /> Scan Ready
                  </span>
                )}
              </div>

              {!billAttachmentUrl ? (
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-pharma-white border border-pharma-muted/40 hover:border-pharma-primary rounded-pharma text-xs font-semibold text-pharma-text transition-all shadow-sm hover:bg-pharma-surface">
                    <Upload className="w-3.5 h-3.5 text-pharma-primary" />
                    Upload Scan / Photo
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleBillFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-pharma-muted">
                    Attach distributor delivery challan / physical invoice for auditing.
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded bg-pharma-white border border-pharma-primary/30">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={billAttachmentUrl}
                      alt="Bill Thumbnail"
                      className="w-9 h-9 rounded border border-pharma-muted/30 object-cover bg-pharma-surface"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-pharma-text truncate max-w-xs">
                        {uploadFileName || 'Attached_Supplier_Bill.png'}
                      </div>
                      <span className="text-[10px] text-pharma-muted">Stored and linked with GRN</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewingBillUrl(billAttachmentUrl);
                        setViewingBillTitle(`Scanned Bill Preview: ${billNumber || 'New Purchase'}`);
                        setIsBillScanModalOpen(true);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <button
                      type="button"
                      onClick={handleRemoveBillAttachment}
                      className="p-1 text-pharma-muted hover:text-pharma-danger rounded transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-pharma-primary uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Medicine Line Items ({items.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Medicine
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {items.map((it, idx) => {
                const totalUnits = (it.quantity + it.bonusQuantity) * (it.conversionFactor || 1);
                const daysExp = getDaysToExpiry(it.expiryDate);
                const isNearExp = daysExp <= 90;
                const mrpChanged = it.originalMrpRupees > 0 && it.mrpRupees !== it.originalMrpRupees;

                const effectiveUnitCostPaisa = calculateEffectiveUnitCost(
                  rupeesToPaisa(it.tradePriceRupees),
                  it.discountPct,
                  it.taxPct,
                  totalUnits
                );
                const effectiveUnitCostRupees = paisaToRupees(effectiveUnitCostPaisa);

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-pharma bg-pharma-white border border-pharma-muted/25 shadow-sm space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pharma-primary">
                        Line #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-pharma-muted hover:text-pharma-danger p-1 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                      <div className="md:col-span-2">
                        <Select
                          label="Medicine"
                          value={it.productId}
                          onChange={(e) => handleSelectProduct(idx, e.target.value)}
                          options={[
                            { value: '', label: 'Select Medicine...' },
                            ...products.map((p) => ({
                              value: p.id || '',
                              label: `${p.name} (${p.genericName} - ${p.strength})`,
                            })),
                          ]}
                          required
                        />
                      </div>

                      <Input
                        label="Batch Number"
                        placeholder="e.g. BT-2024"
                        value={it.batchNumber}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].batchNumber = e.target.value.toUpperCase();
                          setItems(updated);
                        }}
                        required
                      />

                      <div>
                        <Input
                          label="Expiry Date"
                          type="date"
                          value={it.expiryDate}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].expiryDate = e.target.value;
                            setItems(updated);
                          }}
                          required
                        />
                        {isNearExp && (
                          <span className="text-[10px] text-pharma-warning font-bold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Near Expiry (&lt;90 days)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1 border-t border-pharma-muted/15 text-xs">
                      <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].quantity = parseInt(e.target.value, 10) || 1;
                          setItems(updated);
                        }}
                        required
                      />

                      <Input
                        label="Bonus Qty (Free)"
                        type="number"
                        min="0"
                        value={it.bonusQuantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].bonusQuantity = parseInt(e.target.value, 10) || 0;
                          setItems(updated);
                        }}
                      />

                      <Input
                        label="Trade Price (PKR)"
                        type="number"
                        step="0.01"
                        value={it.tradePriceRupees}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].tradePriceRupees = parseFloat(e.target.value) || 0;
                          setItems(updated);
                        }}
                        required
                      />

                      <Input
                        label="Discount (%)"
                        type="number"
                        step="0.1"
                        value={it.discountPct}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].discountPct = parseFloat(e.target.value) || 0;
                          setItems(updated);
                        }}
                      />

                      <Input
                        label="MRP (PKR)"
                        type="number"
                        step="0.01"
                        value={it.mrpRupees}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].mrpRupees = parseFloat(e.target.value) || 0;
                          setItems(updated);
                        }}
                        required
                      />

                      <div>
                        <label className="block text-xs font-semibold text-pharma-text mb-1">
                          Effective Cost
                        </label>
                        <div className="p-2 rounded bg-pharma-surface border border-pharma-muted/20 text-xs font-mono font-bold text-pharma-primary">
                          Rs {effectiveUnitCostRupees.toFixed(2)}
                          <div className="text-[10px] text-pharma-muted font-normal">
                            per base unit
                          </div>
                        </div>
                      </div>
                    </div>

                    {mrpChanged && (
                      <div className="text-[11px] text-pharma-warning font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        MRP altered from master (Was: Rs {it.originalMrpRupees.toFixed(2)} → Now: Rs {it.mrpRupees.toFixed(2)}). Price history will be recorded.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals & Immediate Payment */}
          <div className="p-4 rounded-pharma bg-pharma-surface border border-pharma-muted/20 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                label="Immediate Paid Amount (PKR)"
                type="number"
                step="0.01"
                value={paidRupees}
                onChange={(e) => setPaidRupees(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="GRN Notes / Remarks"
                placeholder="e.g. Received via TCS cargo / checked by Pharmacist"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 text-xs text-pharma-text bg-pharma-white p-3 rounded-pharma border border-pharma-muted/20">
              <div className="flex justify-between">
                <span>Gross Trade Total:</span>
                <span className="font-mono">Rs {totals.gross.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-pharma-primary">
                <span>Total Line Discounts:</span>
                <span className="font-mono">-Rs {totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax:</span>
                <span className="font-mono">+Rs {totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-pharma-muted/20 pt-1 text-pharma-primary">
                <span>Net Payable:</span>
                <span className="font-mono">Rs {totals.net.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-pharma-danger font-semibold">
                <span>Credit Added to Supplier Ledger:</span>
                <span className="font-mono">
                  Rs {Math.max(0, totals.net - paidRupees).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="border-t border-pharma-muted/20 pt-4">
            <FormActionPair
              saveLabel="Confirm GRN & Post Batches"
              cancelLabel="Cancel"
              saveType="submit"
              onCancel={() => setIsNewPurchaseModalOpen(false)}
            />
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* VIEW PURCHASE DETAILS MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Purchase Invoice Details: Bill #${selectedPurchaseDetails?.billNumber || ''}`}
        maxWidth="lg"
      >
        {selectedPurchaseDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/20">
              <div>
                <span className="text-pharma-muted">Supplier:</span>{' '}
                <strong>{selectedPurchaseDetails.supplierName}</strong>
              </div>
              <div>
                <span className="text-pharma-muted">Bill Date:</span>{' '}
                <strong>{new Date(selectedPurchaseDetails.billDate).toLocaleDateString()}</strong>
              </div>
              <div>
                <span className="text-pharma-muted">Net Payable:</span>{' '}
                <strong className="text-pharma-primary">
                  {formatPaisaToPKR(selectedPurchaseDetails.netPayablePaisa)}
                </strong>
              </div>
              <div>
                <span className="text-pharma-muted">Paid:</span>{' '}
                <strong>{formatPaisaToPKR(selectedPurchaseDetails.paidAmountPaisa || 0)}</strong>
              </div>
            </div>

            <h4 className="text-xs font-bold text-pharma-primary uppercase">Received Items & Batches</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedPurchaseDetails.items?.map((it: any, i: number) => (
                <div
                  key={i}
                  className="p-2.5 rounded bg-pharma-surface border border-pharma-muted/20 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-pharma-text">{it.productName || it.product?.name}</div>
                    <div className="text-[11px] text-pharma-muted">
                      Batch: <strong className="font-mono">{it.batchNumber}</strong> • Expiry:{' '}
                      {new Date(it.expiryDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-pharma-text">
                      {it.quantity} {it.unitName || 'Units'} {it.bonusQuantity > 0 && `(+${it.bonusQuantity} free)`}
                    </div>
                    <div className="text-[11px] text-pharma-primary font-mono">
                      MRP: {formatPaisaToPKR(it.mrpPaisa)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Attachment Preview if present */}
            {selectedPurchaseDetails.billAttachmentUrl && (
              <div className="p-3 rounded-pharma bg-pharma-surface border border-pharma-primary/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Paperclip className="w-4 h-4 text-pharma-primary" />
                  <div>
                    <div className="text-xs font-bold text-pharma-text">Scanned Supplier Invoice Attached</div>
                    <div className="text-[10px] text-pharma-muted">Proof of delivery & supplier verification</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewingBillUrl(selectedPurchaseDetails.billAttachmentUrl || null);
                    setViewingBillTitle(`Supplier Bill Scan: Bill #${selectedPurchaseDetails.billNumber}`);
                    setIsBillScanModalOpen(true);
                  }}
                  className="h-7 px-2.5 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View Scan
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* SCANNED BILL PREVIEW MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isBillScanModalOpen}
        onClose={() => setIsBillScanModalOpen(false)}
        title={viewingBillTitle || 'Supplier Bill Scan / Invoice Photo'}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded bg-slate-900 border border-slate-700 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-auto">
            {viewingBillUrl?.startsWith('data:image') || viewingBillUrl?.startsWith('http') || viewingBillUrl?.includes('<svg') ? (
              <img
                src={viewingBillUrl}
                alt="Scanned Supplier Invoice"
                className="max-w-full h-auto object-contain rounded shadow-lg"
              />
            ) : (
              <div className="text-center p-8 text-slate-300 text-xs">
                <FileText className="w-12 h-12 mx-auto text-pharma-primary mb-2" />
                <p>Attachment Document Available</p>
                <a
                  href={viewingBillUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-pharma-accent underline mt-2 inline-block font-semibold"
                >
                  Open in New Tab
                </a>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-pharma-muted">
              Official supplier tax invoice / delivery challan document
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBillScanModalOpen(false)}
            >
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
