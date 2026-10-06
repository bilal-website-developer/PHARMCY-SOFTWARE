import React, { useState, useEffect, useMemo } from 'react';
import {
  ProductDto,
  ProductSubstituteDto,
  PriceHistoryDto,
  DrugClass,
  DRUG_CLASS_LABELS,
  StorageCondition,
  STORAGE_LABELS,
  ProductStatus,
  DosageForms,
  formatPaisaToPKR,
  rupeesToPaisa,
  paisaToRupees,
  calculateLoosePrice,
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
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  History,
  Pill,
  ScanBarcode,
  Edit,
  Tag,
  CheckCircle2,
} from 'lucide-react';

interface ProductFormState {
  sku: string;
  name: string;
  urduName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  drugClass: DrugClass;
  storageCondition: StorageCondition;
  categoryId: string;
  companyId: string;
  primarySupplierId: string;
  minStockLevel: number;
  maxStockLevel: number;
  rackLocation: string;
  taxRatePct: number;
  status: ProductStatus;
  requiresPrescription: boolean;
  isLooseSellingEnabled: boolean;
  mrpRupees: number;
  costRupees: number;
  loosePriceRupees: number;
  loosePriceManuallyOverridden: boolean;
  barcodes: string[];
  units: {
    unitName: string;
    conversionFactor: number;
    isBaseUnit: boolean;
    isDefaultSellingUnit: boolean;
    barcode?: string | null;
    pricePaisa?: number | null;
  }[];
}

export const ProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isCashier = user?.role === UserRole.CASHIER;

  // Catalog State
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDrugClass, setSelectedDrugClass] = useState('');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);

  const [substitutesModalOpen, setSubstitutesModalOpen] = useState(false);
  const [activeSubstituteProduct, setActiveSubstituteProduct] = useState<ProductDto | null>(null);
  const [substitutes, setSubstitutes] = useState<ProductSubstituteDto[]>([]);
  const [isLoadingSubstitutes, setIsLoadingSubstitutes] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeHistoryProduct, setActiveHistoryProduct] = useState<ProductDto | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryDto[]>([]);

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<any>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // Form State for Add / Edit Product
  const [formData, setFormData] = useState<ProductFormState>({
    sku: '',
    name: '',
    urduName: '',
    genericName: '',
    strength: '',
    dosageForm: 'Tablet',
    drugClass: DrugClass.OTC,
    storageCondition: StorageCondition.ROOM_TEMPERATURE,
    categoryId: '',
    companyId: '',
    primarySupplierId: '',
    minStockLevel: 20,
    maxStockLevel: 200,
    rackLocation: '',
    taxRatePct: 0,
    status: ProductStatus.ACTIVE,
    requiresPrescription: false,
    isLooseSellingEnabled: false,
    mrpRupees: 0,
    costRupees: 0,
    loosePriceRupees: 0,
    loosePriceManuallyOverridden: false,
    barcodes: [''],
    units: [
      { unitName: 'Box', conversionFactor: 100, isBaseUnit: false, isDefaultSellingUnit: true },
      { unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: false },
      { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false },
    ],
  });

  // Fetch Products
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.set('q', searchTerm);
      if (selectedCategory) queryParams.set('categoryId', selectedCategory);
      if (selectedDrugClass) queryParams.set('drugClass', selectedDrugClass);

      const res = await apiFetch<any>(`/api/products?${queryParams.toString()}`);
      if (res.success) {
        setProducts(res.data);
      }
    } catch {
      // Fallback handled by apiFetch
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedDrugClass]);

  // Open Add Product Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      urduName: '',
      genericName: '',
      strength: '500mg',
      dosageForm: 'Tablet',
      drugClass: DrugClass.OTC,
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      categoryId: '',
      companyId: '',
      primarySupplierId: '',
      minStockLevel: 20,
      maxStockLevel: 200,
      rackLocation: '',
      taxRatePct: 0,
      status: ProductStatus.ACTIVE,
      requiresPrescription: false,
      isLooseSellingEnabled: false,
      mrpRupees: 100,
      costRupees: 85,
      loosePriceRupees: 1,
      loosePriceManuallyOverridden: false,
      barcodes: [''],
      units: [
        { unitName: 'Box', conversionFactor: 100, isBaseUnit: false, isDefaultSellingUnit: true },
        { unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: false },
        { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false },
      ],
    });
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEdit = (p: ProductDto) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      urduName: p.urduName || '',
      genericName: p.genericName,
      strength: p.strength,
      dosageForm: p.dosageForm,
      drugClass: p.drugClass,
      storageCondition: p.storageCondition,
      categoryId: p.categoryId || '',
      companyId: p.companyId || '',
      primarySupplierId: p.primarySupplierId || '',
      minStockLevel: p.minStockLevel,
      maxStockLevel: p.maxStockLevel,
      rackLocation: p.rackLocation || '',
      taxRatePct: p.taxRatePct,
      status: p.status,
      requiresPrescription: p.requiresPrescription,
      isLooseSellingEnabled: p.isLooseSellingEnabled,
      mrpRupees: paisaToRupees(p.mrpPaisa),
      costRupees: p.costPricePaisa ? paisaToRupees(p.costPricePaisa) : 0,
      loosePriceRupees: p.loosePricePaisa ? paisaToRupees(p.loosePricePaisa) : 0,
      loosePriceManuallyOverridden: !!p.loosePricePaisa,
      barcodes: p.barcodes && p.barcodes.length > 0 ? p.barcodes : [''],
      units:
        p.units && p.units.length > 0
          ? (p.units as any)
          : [
              { unitName: 'Box', conversionFactor: 100, isBaseUnit: false, isDefaultSellingUnit: true },
              { unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: false },
              { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false },
            ],
    });
    setIsProductModalOpen(true);
  };

  // Auto calculate loose price when MRP or units change
  const calculatedLoosePriceRupees = useMemo(() => {
    const topUnit = formData.units.find((u) => !u.isBaseUnit);
    const unitsPerPack = topUnit?.conversionFactor || 1;
    const mrpPaisa = rupeesToPaisa(formData.mrpRupees);
    const autoPaisa = calculateLoosePrice(mrpPaisa, unitsPerPack);
    return paisaToRupees(autoPaisa);
  }, [formData.mrpRupees, formData.units]);

  // View Substitutes
  const handleViewSubstitutes = async (p: ProductDto) => {
    setActiveSubstituteProduct(p);
    setSubstitutesModalOpen(true);
    setIsLoadingSubstitutes(true);
    try {
      const res = await apiFetch<any>(`/api/products/${p.id}/substitutes`);
      if (res.success) {
        setSubstitutes(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingSubstitutes(false);
    }
  };

  // View Price History
  const handleViewHistory = async (p: ProductDto) => {
    setActiveHistoryProduct(p);
    setHistoryModalOpen(true);
    try {
      const res = await apiFetch<any>(`/api/products/${p.id}`);
      if (res.success && res.data.priceHistory) {
        setPriceHistory(res.data.priceHistory);
      }
    } catch {
      // fallback
    }
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const mrpPaisa = rupeesToPaisa(formData.mrpRupees);
    const costPricePaisa = isCashier ? undefined : rupeesToPaisa(formData.costRupees);
    const loosePricePaisa = formData.isLooseSellingEnabled
      ? formData.loosePriceManuallyOverridden
        ? rupeesToPaisa(formData.loosePriceRupees)
        : rupeesToPaisa(calculatedLoosePriceRupees)
      : null;

    const payload = {
      sku: formData.sku,
      name: formData.name,
      urduName: formData.urduName || undefined,
      genericName: formData.genericName,
      strength: formData.strength,
      dosageForm: formData.dosageForm,
      drugClass: formData.drugClass,
      storageCondition: formData.storageCondition,
      categoryId: formData.categoryId || undefined,
      companyId: formData.companyId || undefined,
      primarySupplierId: formData.primarySupplierId || undefined,
      minStockLevel: Number(formData.minStockLevel),
      maxStockLevel: Number(formData.maxStockLevel),
      rackLocation: formData.rackLocation || undefined,
      taxRatePct: Number(formData.taxRatePct),
      status: formData.status,
      requiresPrescription: formData.requiresPrescription,
      isLooseSellingEnabled: formData.isLooseSellingEnabled,
      loosePricePaisa,
      mrpPaisa,
      costPricePaisa,
      barcodes: formData.barcodes.filter(Boolean),
      units: formData.units,
    };

    try {
      if (editingProduct?.id) {
        await apiFetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsProductModalOpen(false);
      loadProducts();
    } catch {
      // fallback
      setIsProductModalOpen(false);
      loadProducts();
    }
  };

  // Handle CSV Import
  const handleCsvImport = async (dryRun = false) => {
    if (!csvText.trim()) return;
    setIsImportingCsv(true);
    try {
      const res = await apiFetch<any>('/api/products/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csvText, dryRun }),
      });
      if (res.success) {
        setCsvResult(res);
        if (!dryRun && res.summary.validCount > 0) {
          loadProducts();
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
              Phase 1A: Master Data
            </span>
            <Badge variant="active" dot={false}>
              FEFO & DRAP Compliant
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-pharma-text">Medicine Catalog & Master</h1>
          <p className="text-xs text-pharma-muted mt-1">
            Manage pharmaceutical formulas, pack conversions, loose pricing rules, barcodes, and substitutes.
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
              Add New Medicine
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadProducts}
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Role Notice for Cashier */}
      {isCashier && (
        <div className="p-3.5 rounded-pharma bg-pharma-surface border border-pharma-primary/30 flex items-center gap-2.5 text-xs text-pharma-text">
          <CheckCircle2 className="w-4 h-4 text-pharma-primary shrink-0" />
          <span>
            <strong>Cashier Mode:</strong> Supplier purchase cost and profit margins are automatically protected and concealed per system policy.
          </span>
        </div>
      )}

      {/* Filters & Search Panel */}
      <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Input
            placeholder="Search Brand, Generic / Salt, SKU, or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefixElement={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            value={selectedDrugClass}
            onChange={(e) => setSelectedDrugClass(e.target.value)}
            options={[
              { value: '', label: 'All Drug Classes' },
              { value: DrugClass.OTC, label: 'OTC (Over the Counter)' },
              { value: DrugClass.RX, label: 'Rx (Prescription Only)' },
              { value: DrugClass.CONTROLLED, label: 'Controlled Substance' },
              { value: DrugClass.NARCOTIC, label: 'Narcotic / Schedule D' },
            ]}
          />
        </div>

        <div>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'cat-1', label: 'Antibiotics' },
              { value: 'cat-2', label: 'Analgesics & Antipyretics' },
              { value: 'cat-3', label: 'Cardiovascular' },
              { value: 'cat-4', label: 'Gastrointestinal' },
              { value: 'cat-5', label: 'Respiratory & Cough' },
              { value: 'cat-6', label: 'Vitamins & Supplements' },
            ]}
          />
        </div>
      </div>

      {/* Products Table Panel (Pharma Green: white rows inside pale green panel) */}
      <div className="pharma-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-pharma-text">
              Active Medicines Catalog ({products.length})
            </h2>
            <span className="text-xs text-pharma-muted">
              • All currency formatted from integer Paisa
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-pharma-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pharma-primary mb-2" />
            Loading catalog...
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No medicines match your query"
            description="Try adjusting your brand, generic salt, or drug class filter."
            actionLabel="Reset Search"
            onAction={() => {
              setSearchTerm('');
              setSelectedDrugClass('');
              setSelectedCategory('');
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU & Brand Name</TableHead>
                <TableHead>Generic Salt / Formula</TableHead>
                <TableHead>Class & Storage</TableHead>
                <TableHead>Pack Structure & Units</TableHead>
                <TableHead>Retail MRP (PKR)</TableHead>
                {!isCashier && <TableHead>Trade Cost</TableHead>}
                <TableHead>Stock / Rack</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const isControlled = p.drugClass === DrugClass.CONTROLLED || p.drugClass === DrugClass.NARCOTIC;
                const isRx = p.drugClass === DrugClass.RX;

                return (
                  <TableRow key={p.id || p.sku}>
                    {/* Brand Name */}
                    <TableCell>
                      <div>
                        <div className="font-bold text-pharma-text flex items-center gap-1.5">
                          {p.name}
                          {p.urduName && (
                            <span className="text-[11px] text-pharma-muted font-urdu px-1 rounded bg-pharma-surface">
                              {p.urduName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-pharma-muted flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-pharma-surface px-1 py-0.5 rounded border border-pharma-muted/20">
                            {p.sku}
                          </span>
                          <span>{p.companyName || 'GSK / Getz'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Generic Salt & Strength */}
                    <TableCell>
                      <div className="text-xs font-semibold text-pharma-text">
                        {p.genericName}
                      </div>
                      <div className="text-[11px] text-pharma-muted mt-0.5">
                        Strength: <strong className="text-pharma-primary">{p.strength}</strong> • {p.dosageForm}
                      </div>
                    </TableCell>

                    {/* Class & Storage */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={isControlled ? 'expired' : isRx ? 'near-expiry' : 'active'}
                          dot={false}
                        >
                          {p.drugClass}
                        </Badge>
                        <div className="text-[10px] text-pharma-muted">
                          {STORAGE_LABELS[p.storageCondition]?.split('(')[0] || 'Room Temp'}
                        </div>
                      </div>
                    </TableCell>

                    {/* Pack Structure */}
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="font-medium text-pharma-text">
                          {p.units && p.units.length > 0 ? (
                            p.units.map((u) => u.unitName).join(' → ')
                          ) : (
                            'Pack → Unit'
                          )}
                        </div>
                        {p.isLooseSellingEnabled ? (
                          <div className="text-[10px] text-pharma-primary font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-pharma-primary inline-block" />
                            Loose: {p.loosePricePaisa ? formatPaisaToPKR(p.loosePricePaisa) : 'Auto'}/unit
                          </div>
                        ) : (
                          <div className="text-[10px] text-pharma-muted">Box only</div>
                        )}
                      </div>
                    </TableCell>

                    {/* Retail MRP */}
                    <TableCell>
                      <div className="font-bold text-pharma-text text-xs">
                        {formatPaisaToPKR(p.mrpPaisa)}
                      </div>
                      <div className="text-[10px] text-pharma-muted">Per pack</div>
                    </TableCell>

                    {/* Cost (Stripped for Cashier) */}
                    {!isCashier && (
                      <TableCell>
                        <div className="text-xs font-medium text-pharma-muted">
                          {p.costPricePaisa ? formatPaisaToPKR(p.costPricePaisa) : '-'}
                        </div>
                        <div className="text-[10px] text-pharma-primary">
                          Margin: Rs {p.costPricePaisa ? (paisaToRupees(p.mrpPaisa - p.costPricePaisa)).toFixed(2) : '-'}
                        </div>
                      </TableCell>
                    )}

                    {/* Stock / Rack */}
                    <TableCell>
                      <div className="text-xs font-semibold text-pharma-text">
                        {p.currentStock?.toLocaleString() || '0'} units
                      </div>
                      <div className="text-[10px] text-pharma-muted">
                        {p.rackLocation ? `📍 ${p.rackLocation}` : 'No rack'}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Auto-link Substitutes */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSubstitutes(p)}
                          title="View Substitutes (same generic salt + strength)"
                          className="h-8 px-2 text-xs"
                        >
                          <Layers className="w-3.5 h-3.5 text-pharma-primary mr-1" />
                          Subs
                        </Button>

                        {/* Price History */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(p)}
                          title="Price Change History"
                          className="h-8 px-2 text-xs"
                        >
                          <History className="w-3.5 h-3.5 text-pharma-muted" />
                        </Button>

                        {!isCashier && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="h-8 px-2 text-xs"
                          >
                            <Edit className="w-3.5 h-3.5 text-pharma-text" />
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

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT PRODUCT MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Edit Medicine: ${editingProduct.name}` : 'Add New Medicine to Master'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-6">
          {/* Section 1: Basic Clinical Identifiers */}
          <div>
            <h3 className="text-xs font-bold text-pharma-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Pill className="w-4 h-4" /> 1. Brand & Formulation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="SKU / Item Code"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
              <Input
                label="Brand Name"
                placeholder="e.g. Panadol, Augmentin"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Urdu Name (Pakistani Market)"
                placeholder="e.g. پیناڈول"
                value={formData.urduName}
                onChange={(e) => setFormData({ ...formData, urduName: e.target.value })}
              />
              <Input
                label="Generic Salt / Active Formula"
                placeholder="e.g. Paracetamol, Omeprazole"
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                required
              />
              <Input
                label="Strength"
                placeholder="e.g. 500mg, 10ml, 20mg"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                required
              />
              <Select
                label="Dosage Form"
                value={formData.dosageForm}
                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                options={DosageForms.map((d) => ({ value: d, label: d }))}
              />
            </div>
          </div>

          {/* Section 2: Clinical Class, Storage & Location */}
          <div className="border-t border-pharma-muted/20 pt-4">
            <h3 className="text-xs font-bold text-pharma-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-4 h-4" /> 2. Drug Class & Pharmacy Logistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                label="Drug Class"
                value={formData.drugClass}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    drugClass: e.target.value as DrugClass,
                    requiresPrescription: e.target.value !== DrugClass.OTC,
                  })
                }
                options={Object.keys(DRUG_CLASS_LABELS).map((k) => ({
                  value: k,
                  label: DRUG_CLASS_LABELS[k as DrugClass],
                }))}
              />
              <Select
                label="Storage Condition"
                value={formData.storageCondition}
                onChange={(e) =>
                  setFormData({ ...formData, storageCondition: e.target.value as StorageCondition })
                }
                options={Object.keys(STORAGE_LABELS).map((k) => ({
                  value: k,
                  label: STORAGE_LABELS[k as StorageCondition],
                }))}
              />
              <Input
                label="Shelf / Rack Location"
                placeholder="e.g. Rack B-12"
                value={formData.rackLocation}
                onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
              />
              <Input
                label="Min Stock (Reorder Alert)"
                type="number"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value, 10) || 0 })}
              />
              <Input
                label="Max Stock Level"
                type="number"
                value={formData.maxStockLevel}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: parseInt(e.target.value, 10) || 0 })}
              />
              <Input
                label="Sales Tax Rate (%)"
                type="number"
                value={formData.taxRatePct}
                onChange={(e) => setFormData({ ...formData, taxRatePct: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-pharma-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresPrescription}
                  onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                  className="rounded text-pharma-primary focus:ring-pharma-accent"
                />
                Requires Doctor Prescription (Rx flag)
              </label>
            </div>
          </div>

          {/* Section 3: Pack Structure & Loose Selling Rules */}
          <div className="border-t border-pharma-muted/20 pt-4">
            <h3 className="text-xs font-bold text-pharma-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> 3. Pack Conversion & Loose Selling Rules
            </h3>
            <p className="text-xs text-pharma-muted mb-3">
              Define the pack hierarchy (Carton → Box → Strip → Base Tablet/Unit). System guarantees all stock transactions convert to the smallest unit.
            </p>

            <div className="p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-pharma-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isLooseSellingEnabled}
                    onChange={(e) => setFormData({ ...formData, isLooseSellingEnabled: e.target.checked })}
                    className="rounded text-pharma-primary focus:ring-pharma-accent"
                  />
                  Enable Loose / Blister Selling for this Medicine
                </label>
                {formData.isLooseSellingEnabled && (
                  <span className="text-xs font-mono text-pharma-primary bg-pharma-white px-2 py-0.5 rounded border border-pharma-muted/20">
                    Auto-calc: Rs {calculatedLoosePriceRupees.toFixed(2)}/unit
                  </span>
                )}
              </div>

              {formData.isLooseSellingEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-pharma-muted/20">
                  <div>
                    <label className="block text-xs font-bold text-pharma-text mb-1">
                      Loose Price Mode
                    </label>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="looseMode"
                          checked={!formData.loosePriceManuallyOverridden}
                          onChange={() => setFormData({ ...formData, loosePriceManuallyOverridden: false })}
                        />
                        Auto (Pack MRP ÷ Units)
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="looseMode"
                          checked={formData.loosePriceManuallyOverridden}
                          onChange={() => setFormData({ ...formData, loosePriceManuallyOverridden: true })}
                        />
                        Manual Override
                      </label>
                    </div>
                  </div>

                  {formData.loosePriceManuallyOverridden && (
                    <Input
                      label="Override Loose Unit Price (PKR)"
                      type="number"
                      step="0.01"
                      value={formData.loosePriceRupees}
                      onChange={(e) =>
                        setFormData({ ...formData, loosePriceRupees: parseFloat(e.target.value) || 0 })
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Pricing & Barcode */}
          <div className="border-t border-pharma-muted/20 pt-4">
            <h3 className="text-xs font-bold text-pharma-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ScanBarcode className="w-4 h-4" /> 4. Pricing (PKR Paisa Precision) & Barcodes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Maximum Retail Price - MRP (PKR)"
                type="number"
                step="0.01"
                value={formData.mrpRupees}
                onChange={(e) => setFormData({ ...formData, mrpRupees: parseFloat(e.target.value) || 0 })}
                required
              />

              {!isCashier && (
                <Input
                  label="Purchase / Trade Cost (PKR)"
                  type="number"
                  step="0.01"
                  value={formData.costRupees}
                  onChange={(e) => setFormData({ ...formData, costRupees: parseFloat(e.target.value) || 0 })}
                />
              )}

              <Input
                label="Primary Pack Barcode"
                placeholder="Scan or enter 13-digit EAN"
                value={formData.barcodes[0] || ''}
                onChange={(e) => setFormData({ ...formData, barcodes: [e.target.value] })}
                prefixElement={<ScanBarcode className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Save & Cancel */}
          <div className="border-t border-pharma-muted/20 pt-4">
            <FormActionPair
              saveLabel={editingProduct ? 'Save Revisions' : 'Create Medicine Master'}
              cancelLabel="Cancel"
              saveType="submit"
              onCancel={() => setIsProductModalOpen(false)}
            />
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* AUTO-LINK SUBSTITUTES MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={substitutesModalOpen}
        onClose={() => setSubstitutesModalOpen(false)}
        title={`Linked Substitutes for: ${activeSubstituteProduct?.name || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-pharma bg-pharma-surface border border-pharma-accent/30 text-xs">
            <div className="font-bold text-pharma-text flex items-center gap-1.5 mb-0.5">
              <Layers className="w-4 h-4 text-pharma-primary" /> Same Active Salt Formula & Strength:
            </div>
            <div className="text-pharma-primary font-bold">
              {activeSubstituteProduct?.genericName} • {activeSubstituteProduct?.strength}
            </div>
            <div className="text-pharma-muted mt-1">
              When an item is out of stock, cashier and pharmacist can instantly offer these identical salt equivalents.
            </div>
          </div>

          {isLoadingSubstitutes ? (
            <div className="py-8 text-center text-sm text-pharma-muted">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-pharma-primary mb-2" />
              Searching substitute catalog...
            </div>
          ) : substitutes.length === 0 ? (
            <div className="py-8 text-center text-sm text-pharma-muted">
              No alternative brands found in inventory with the exact salt formula "{activeSubstituteProduct?.genericName}".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Retail MRP</TableHead>
                  <TableHead>In-Stock</TableHead>
                  <TableHead>Rack</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substitutes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-bold text-pharma-text">{s.name}</TableCell>
                    <TableCell className="text-xs text-pharma-muted">{s.companyName || 'Local Pharma'}</TableCell>
                    <TableCell className="text-xs font-bold text-pharma-primary">
                      {formatPaisaToPKR(s.mrpPaisa)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.currentStock > 0 ? 'active' : 'expired'} dot={false}>
                        {s.currentStock > 0 ? `${s.currentStock} in stock` : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-pharma-muted">{s.rackLocation || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setSubstitutesModalOpen(false)}>
              Close Substitutes
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* PRICE HISTORY AUDIT TRAIL MODAL                               */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Price History Audit Trail: ${activeHistoryProduct?.name || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-pharma-muted">
            All MRP and cost revisions are immutably logged with user identity and reason per DRAP and audit regulations.
          </p>

          {priceHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-pharma-muted bg-pharma-surface rounded-pharma">
              No historical price revisions recorded yet for this product.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {priceHistory.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-pharma-text">
                    <span>
                      MRP: {formatPaisaToPKR(h.oldMrpPaisa)} →{' '}
                      <span className="text-pharma-primary">{formatPaisaToPKR(h.newMrpPaisa)}</span>
                    </span>
                    <span className="text-[10px] text-pharma-muted font-normal">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-pharma-muted">
                    Reason: {h.changeReason || 'Manufacturer price update'}
                  </div>
                  <div className="text-[10px] text-pharma-muted font-mono">
                    Authorized By: {h.changedByName || 'System'}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
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
        title="Batch Import Products via CSV"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/20 text-xs">
            <p className="font-bold text-pharma-text mb-1">CSV Template Format:</p>
            <p className="font-mono text-[11px] text-pharma-muted select-all bg-pharma-white p-2 rounded border border-pharma-muted/20 overflow-x-auto">
              sku,name,genericname,strength,dosageform,mrppkr,costpkr,drugclass,looseselling,barcode
              <br />
              MED-001,Panadol 500mg,Paracetamol,500mg,Tablet,70.00,58.00,OTC,true,8964000111222
              <br />
              MED-002,Augmentin 625mg,Amoxicillin + Clavulanic Acid,625mg,Tablet,228.00,195.00,RX,true,8964000222333
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
                {isImportingCsv ? 'Importing...' : 'Commit Import to Catalog'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
