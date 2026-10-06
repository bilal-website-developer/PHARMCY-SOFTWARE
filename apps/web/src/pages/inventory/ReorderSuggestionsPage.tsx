import React, { useState, useEffect } from 'react';
import {
  SupplierReorderGroupDto,
  DraftPurchaseOrderDto,
  formatPaisaToPKR,
  UserRole,
} from '@pharmacy/shared';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/Table';
import {
  TrendingUp,
  Truck,
  Package,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  Share2,
  RefreshCw,
  Search,
  CheckCircle,
  FileText,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Snowflake,
  Send,
} from 'lucide-react';

function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const ReorderSuggestionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || UserRole.CASHIER;
  const canManagePo = ([UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY] as string[]).includes(role);

  // Tabs: 'suggestions' | 'draft-pos'
  const [activeTab, setActiveTab] = useState<'suggestions' | 'draft-pos'>('suggestions');

  // Filters
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const [targetCoverageDays, setTargetCoverageDays] = useState<number>(30);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [urgentOnly, setUrgentOnly] = useState<boolean>(false);
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [groups, setGroups] = useState<SupplierReorderGroupDto[]>([]);
  const [draftPos, setDraftPos] = useState<DraftPurchaseOrderDto[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalSuppliers: number;
    totalItemsToReorder: number;
    totalEstimatedPaisa: number;
  }>({
    totalSuppliers: 0,
    totalItemsToReorder: 0,
    totalEstimatedPaisa: 0,
  });

  // Collapsible state for supplier groups
  const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});

  // Editable quantities per product: Record<productId, quantityInPacks>
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  // Item inclusion checkboxes: Record<productId, boolean>
  const [includedItems, setIncludedItems] = useState<Record<string, boolean>>({});

  // Create Draft PO Modal State
  const [selectedSupplierForPo, setSelectedSupplierForPo] = useState<SupplierReorderGroupDto | null>(null);
  const [poNotes, setPoNotes] = useState<string>('');
  const [isCreatingPo, setIsCreatingPo] = useState<boolean>(false);
  const [createdPoSuccess, setCreatedPoSuccess] = useState<DraftPurchaseOrderDto | null>(null);

  // View Draft PO Details Modal
  const [viewingDraftPo, setViewingDraftPo] = useState<DraftPurchaseOrderDto | null>(null);

  // Load suggestions
  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        windowDays: String(windowDays),
        targetCoverageDays: String(targetCoverageDays),
        leadTimeDays: String(leadTimeDays),
        urgentOnly: String(urgentOnly),
      });
      if (supplierFilter) params.append('supplierId', supplierFilter);

      const res = await apiFetch<any>(`/api/reorder/suggestions?${params.toString()}`);
      if (res.success && res.data) {
        setGroups(res.data.groups || []);
        setSummaryData({
          totalSuppliers: res.data.totalSuppliers || 0,
          totalItemsToReorder: res.data.totalItemsToReorder || 0,
          totalEstimatedPaisa: res.data.totalEstimatedPaisa || 0,
        });

        // Initialize editable pack quantities and checked states
        const initialQty: Record<string, number> = {};
        const initialInc: Record<string, boolean> = {};
        for (const grp of res.data.groups || []) {
          for (const it of grp.items) {
            initialQty[it.productId] = it.suggestedPackUnits;
            initialInc[it.productId] = it.suggestedPackUnits > 0;
          }
        }
        setEditedQuantities(initialQty);
        setIncludedItems(initialInc);
      }
    } catch (err: any) {
      console.error('Failed to load reorder suggestions', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved draft POs
  const loadDraftPos = async () => {
    try {
      const res = await apiFetch<any>('/api/reorder/draft-pos');
      if (res.success && res.data) {
        setDraftPos(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load draft POs', err);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [windowDays, targetCoverageDays, leadTimeDays, urgentOnly, supplierFilter]);

  useEffect(() => {
    loadDraftPos();
  }, []);

  const toggleSupplierCollapse = (supId: string) => {
    setCollapsedSuppliers((prev) => ({
      ...prev,
      [supId]: !prev[supId],
    }));
  };

  const handleQtyChange = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    setEditedQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleItemCheck = (productId: string) => {
    setIncludedItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const openPoModal = (grp: SupplierReorderGroupDto) => {
    setSelectedSupplierForPo(grp);
    setPoNotes(`Refill based on ${windowDays}-day sales velocity for ${targetCoverageDays} days coverage.`);
    setCreatedPoSuccess(null);
  };

  const handleCreateDraftPo = async () => {
    if (!selectedSupplierForPo) return;

    // Filter items belonging to this supplier that are selected with qty > 0
    const itemsToInclude = selectedSupplierForPo.items
      .filter((it) => includedItems[it.productId] && (editedQuantities[it.productId] ?? it.suggestedPackUnits) > 0)
      .map((it) => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        unitName: it.packUnitName,
        conversionFactor: it.conversionFactor,
        quantityInPacks: editedQuantities[it.productId] ?? it.suggestedPackUnits,
        costPricePaisa: it.unitCostPaisa,
      }));

    if (itemsToInclude.length === 0) {
      alert('Please select at least one item with quantity greater than zero.');
      return;
    }

    setIsCreatingPo(true);
    try {
      const payload = {
        supplierId: selectedSupplierForPo.supplierId,
        targetCoverageDays,
        speedWindowDays: windowDays,
        notes: poNotes,
        items: itemsToInclude,
      };

      const res = await apiFetch<any>('/api/reorder/draft-po', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setCreatedPoSuccess(res.data);
        await loadDraftPos();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create draft PO');
    } finally {
      setIsCreatingPo(false);
    }
  };

  const handleUpdatePoStatus = async (poId: string, newStatus: 'SENT_TO_SUPPLIER' | 'CONVERTED_TO_PURCHASE') => {
    try {
      const res = await apiFetch<any>(`/api/reorder/draft-pos/${poId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        await loadDraftPos();
        if (viewingDraftPo && viewingDraftPo.id === poId) {
          setViewingDraftPo(res.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Generate WhatsApp order message
  const copyWhatsAppText = (grp: SupplierReorderGroupDto) => {
    const items = grp.items.filter((it) => includedItems[it.productId] && (editedQuantities[it.productId] ?? it.suggestedPackUnits) > 0);
    if (items.length === 0) {
      alert('No selected items to order.');
      return;
    }

    let text = `*PURCHASE ORDER — PharmaCare Pharmacy*\n`;
    text += `To: ${grp.supplierName}\n`;
    text += `Date: ${new Date().toLocaleDateString('en-GB')}\n\n`;
    text += `Please supply the following medicines urgently:\n`;

    items.forEach((it, idx) => {
      const qty = editedQuantities[it.productId] ?? it.suggestedPackUnits;
      text += `${idx + 1}. *${it.productName}* (${it.sku})\n   Quantity: *${qty} ${it.packUnitName}* (${it.conversionFactor > 1 ? `${it.conversionFactor}s` : 'base'})\n`;
    });

    text += `\nPlease confirm dispatch and invoice bill.\nThank you!`;

    navigator.clipboard.writeText(text);
    alert('WhatsApp order text copied to clipboard! You can paste directly to your supplier.');
  };

  const handleExportSupplierCsv = (grp: SupplierReorderGroupDto) => {
    const rows = grp.items
      .filter((it) => includedItems[it.productId])
      .map((it) => ({
        Supplier: grp.supplierName,
        Product: it.productName,
        SKU: it.sku,
        Generic: it.genericName || '',
        CurrentStock: it.currentStock,
        SalesVelocity: `${it.dailyRunRate}/day`,
        StockRemainingDays: it.daysStockRemaining,
        SuggestedPacks: editedQuantities[it.productId] ?? it.suggestedPackUnits,
        PackUnit: it.packUnitName,
        PackCostPKR: (it.unitCostPaisa / 100).toFixed(2),
        EstimatedTotalPKR: (((editedQuantities[it.productId] ?? it.suggestedPackUnits) * it.unitCostPaisa) / 100).toFixed(2),
      }));
    exportToCsv(`draft-po-${grp.supplierName.toLowerCase().replace(/\s+/g, '-')}`, rows);
  };

  // Filter groups and items by search query
  const filteredGroups = groups.map((grp) => {
    if (!searchQuery.trim()) return grp;
    const q = searchQuery.toLowerCase();
    const matchingItems = grp.items.filter(
      (it) =>
        it.productName.toLowerCase().includes(q) ||
        it.sku.toLowerCase().includes(q) ||
        (it.genericName && it.genericName.toLowerCase().includes(q))
    );
    return {
      ...grp,
      items: matchingItems,
      itemCount: matchingItems.length,
    };
  }).filter((grp) => grp.items.length > 0);

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-pharma-white p-5 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pharma-accent animate-pulse" />
            <span className="text-xs text-pharma-primary font-semibold font-mono uppercase tracking-wider">
              Phase 3 • Growth & Smart Inventory
            </span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text mt-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-pharma-primary" />
            Automated Reorder Suggestions & Draft Purchase Orders
          </h2>
          <p className="text-xs text-pharma-muted mt-0.5">
            Analyzes sales velocity over 30, 60 & 90 days to predict stockout dates and auto-generates supplier purchase orders.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-2">
          <div className="flex bg-pharma-surface p-1 rounded-lg border border-pharma-muted/30">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'suggestions'
                  ? 'bg-pharma-primary text-white shadow-sm'
                  : 'text-pharma-muted hover:text-pharma-text'
                }`}
            >
              Reorder Suggestions
            </button>
            <button
              onClick={() => setActiveTab('draft-pos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'draft-pos'
                  ? 'bg-pharma-primary text-white shadow-sm'
                  : 'text-pharma-muted hover:text-pharma-text'
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Draft POs ({draftPos.length})
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadSuggestions} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Speed
          </Button>
        </div>
      </div>

      {activeTab === 'suggestions' ? (
        <>
          {/* ── Key Summary Metrics ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pharma-primary/10 flex items-center justify-center text-pharma-primary shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-pharma-muted uppercase">Suppliers to Order</p>
                <h3 className="text-xl font-bold font-mono text-pharma-text">{summaryData.totalSuppliers}</h3>
              </div>
            </div>

            <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pharma-accent/20 flex items-center justify-center text-pharma-accent shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-pharma-muted uppercase">Items to Reorder</p>
                <h3 className="text-xl font-bold font-mono text-pharma-text">{summaryData.totalItemsToReorder}</h3>
              </div>
            </div>

            <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-pharma-muted uppercase">Estimated Capital</p>
                <h3 className="text-xl font-bold font-mono text-pharma-primary">
                  {formatPaisaToPKR(summaryData.totalEstimatedPaisa)}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-pharma-muted uppercase">Target Coverage</p>
                <h3 className="text-xl font-bold font-mono text-pharma-text">
                  {targetCoverageDays} Days (+{leadTimeDays}d lead)
                </h3>
              </div>
            </div>
          </div>

          {/* ── Controls Strip: Velocity Window, Coverage, Filters ────────────── */}
          <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Sales Speed Window Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-pharma-muted flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-pharma-primary" />
                  Speed Window:
                </span>
                <div className="inline-flex rounded-lg border border-pharma-muted/30 p-0.5 bg-pharma-surface">
                  <button
                    onClick={() => setWindowDays(30)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${windowDays === 30 ? 'bg-pharma-primary text-white shadow-xs' : 'text-pharma-muted hover:text-pharma-text'
                      }`}
                  >
                    30 Days (Fastest)
                  </button>
                  <button
                    onClick={() => setWindowDays(60)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${windowDays === 60 ? 'bg-pharma-primary text-white shadow-xs' : 'text-pharma-muted hover:text-pharma-text'
                      }`}
                  >
                    60 Days (Balanced)
                  </button>
                  <button
                    onClick={() => setWindowDays(90)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${windowDays === 90 ? 'bg-pharma-primary text-white shadow-xs' : 'text-pharma-muted hover:text-pharma-text'
                      }`}
                  >
                    90 Days (Quarterly)
                  </button>
                </div>
              </div>

              {/* Target Coverage Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-pharma-muted flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-pharma-primary" />
                  Target Coverage:
                </span>
                <select
                  value={targetCoverageDays}
                  onChange={(e) => setTargetCoverageDays(Number(e.target.value))}
                  className="text-xs border border-pharma-muted/30 rounded-md px-2.5 py-1 bg-pharma-surface text-pharma-text focus:outline-none focus:ring-1 focus:ring-pharma-primary"
                >
                  <option value={15}>15 Days Supply</option>
                  <option value={30}>30 Days Supply (Standard)</option>
                  <option value={45}>45 Days Supply</option>
                  <option value={60}>60 Days Supply</option>
                </select>
              </div>

              {/* Lead Time */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-pharma-muted">Supplier Lead Time:</span>
                <select
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  className="text-xs border border-pharma-muted/30 rounded-md px-2.5 py-1 bg-pharma-surface text-pharma-text focus:outline-none focus:ring-1 focus:ring-pharma-primary"
                >
                  <option value={3}>3 Days (Local)</option>
                  <option value={7}>7 Days (Regional)</option>
                  <option value={14}>14 Days (Cargo / Distant)</option>
                </select>
              </div>

              {/* Urgent Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-pharma-text select-none">
                <input
                  type="checkbox"
                  checked={urgentOnly}
                  onChange={(e) => setUrgentOnly(e.target.checked)}
                  className="rounded text-pharma-primary focus:ring-pharma-primary w-4 h-4"
                />
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Urgent only (≤ 7 days stock)
                </span>
              </label>
            </div>

            {/* Search filter row */}
            <div className="pt-2 border-t border-pharma-muted/15 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pharma-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by medicine brand, SKU or active formula (generic)..."
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="text-xs border border-pharma-muted/30 rounded-md px-3 py-2 bg-pharma-surface text-pharma-text focus:outline-none focus:ring-1 focus:ring-pharma-primary w-full sm:w-auto"
                >
                  <option value="">All Distributors / Suppliers</option>
                  {groups.map((g) => (
                    <option key={g.supplierId} value={g.supplierId}>
                      {g.supplierName} ({g.itemCount} items)
                    </option>
                  ))}
                </select>
              </div>

              {(searchQuery || supplierFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSupplierFilter('');
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* ── Grouped Supplier Reorder Recommendations ──────────────────────── */}
          {isLoading ? (
            <div className="p-12 text-center bg-pharma-white rounded-pharma border border-pharma-muted/20">
              <RefreshCw className="w-8 h-8 text-pharma-primary animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-pharma-text">Calculating consumption velocities across {windowDays} days...</p>
              <p className="text-xs text-pharma-muted mt-1">Aggregating sales run rates and supplier grouping...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-12 text-center bg-pharma-white rounded-pharma border border-pharma-muted/20">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-pharma-text">Stock Levels Are Well Balanced!</h3>
              <p className="text-xs text-pharma-muted mt-1 max-w-md mx-auto">
                No items are below target coverage for the selected window. If you wish to see all items or change criteria, reduce coverage or uncheck the urgent filter.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredGroups.map((grp) => {
                const isCollapsed = collapsedSuppliers[grp.supplierId];
                const selectedItemsInGroup = grp.items.filter((it) => includedItems[it.productId]);
                const groupEstimatedPaisa = selectedItemsInGroup.reduce(
                  (sum, it) => sum + (editedQuantities[it.productId] ?? it.suggestedPackUnits) * it.unitCostPaisa,
                  0
                );

                return (
                  <div
                    key={grp.supplierId}
                    className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm overflow-hidden"
                  >
                    {/* Supplier Header Strip */}
                    <div className="p-4 bg-pharma-surface border-b border-pharma-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSupplierCollapse(grp.supplierId)}
                          className="p-1 rounded hover:bg-pharma-muted/20 text-pharma-muted transition-colors"
                          title="Toggle collapse"
                        >
                          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-pharma-text flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-pharma-primary" />
                              {grp.supplierName}
                            </h3>
                            {grp.supplierCode && (
                              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-pharma-muted/30 text-pharma-muted">
                                {grp.supplierCode}
                              </span>
                            )}
                            <Badge variant="primary" dot={false} className="text-[10px]">
                              {selectedItemsInGroup.length} of {grp.items.length} items selected
                            </Badge>
                          </div>
                          <p className="text-xs text-pharma-muted mt-0.5">
                            Distributor Contact: <strong>{grp.supplierPhone || 'N/A'}</strong> • Estimated Order Value:{' '}
                            <strong className="text-pharma-primary font-mono">{formatPaisaToPKR(groupEstimatedPaisa)}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Group Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyWhatsAppText(grp)}
                          title="Generate text message formatted for WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          WhatsApp
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportSupplierCsv(grp)}
                          title="Export supplier PO to CSV"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          CSV
                        </Button>

                        {canManagePo && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openPoModal(grp)}
                            disabled={selectedItemsInGroup.length === 0}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Create Draft PO ({selectedItemsInGroup.length})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Items Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8">
                                <input
                                  type="checkbox"
                                  checked={grp.items.every((it) => includedItems[it.productId])}
                                  onChange={() => {
                                    const allChecked = grp.items.every((it) => includedItems[it.productId]);
                                    const updated: Record<string, boolean> = {};
                                    for (const it of grp.items) {
                                      updated[it.productId] = !allChecked;
                                    }
                                    setIncludedItems((prev) => ({ ...prev, ...updated }));
                                  }}
                                  className="rounded text-pharma-primary focus:ring-pharma-primary"
                                />
                              </TableHead>
                              <TableHead>Medicine / Description</TableHead>
                              <TableHead className="text-center">Stock Status</TableHead>
                              <TableHead className="text-right">Current Stock</TableHead>
                              <TableHead className="text-right">
                                Sales Speed ({windowDays}d)
                              </TableHead>
                              <TableHead className="text-center">Run Out In</TableHead>
                              <TableHead className="text-center w-36">Order Pack Qty</TableHead>
                              <TableHead className="text-right">Pack Cost</TableHead>
                              <TableHead className="text-right">Line Est. Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grp.items.map((it) => {
                              const isChecked = includedItems[it.productId] ?? false;
                              const currentQty = editedQuantities[it.productId] ?? it.suggestedPackUnits;
                              const lineTotal = currentQty * it.unitCostPaisa;

                              return (
                                <TableRow
                                  key={it.productId}
                                  className={`hover:bg-pharma-surface/50 transition-colors ${!isChecked ? 'opacity-50 bg-gray-50/50' : ''
                                    }`}
                                >
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleItemCheck(it.productId)}
                                      className="rounded text-pharma-primary focus:ring-pharma-primary"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <div className="font-bold text-xs text-pharma-text flex items-center gap-1.5">
                                      {it.productName}
                                      {it.isRefrigerated && (
                                        <span title="Cold Storage (2-8°C)">
                                          <Snowflake className="w-3.5 h-3.5 text-pharma-primary shrink-0" />
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-pharma-muted font-mono flex items-center gap-2">
                                      <span>SKU: {it.sku}</span>
                                      {it.genericName && <span>• {it.genericName}</span>}
                                      <span>• Rack: {it.rackLocation}</span>
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-center">
                                    {it.urgency === 'OUT_OF_STOCK' && (
                                      <Badge variant="expired" dot={true}>
                                        OUT OF STOCK
                                      </Badge>
                                    )}
                                    {it.urgency === 'CRITICAL' && (
                                      <Badge variant="expired" dot={true}>
                                        CRITICAL ({it.daysStockRemaining}d left)
                                      </Badge>
                                    )}
                                    {it.urgency === 'REORDER_NOW' && (
                                      <Badge variant="near-expiry" dot={true}>
                                        REORDER NOW
                                      </Badge>
                                    )}
                                    {it.urgency === 'ADEQUATE' && (
                                      <Badge variant="active" dot={false}>
                                        ADEQUATE
                                      </Badge>
                                    )}
                                  </TableCell>

                                  <TableCell className="text-right font-mono text-xs">
                                    <strong className={it.currentStock === 0 ? 'text-red-600' : 'text-pharma-text'}>
                                      {it.currentStock}
                                    </strong>{' '}
                                    <span className="text-[10px] text-pharma-muted">units</span>
                                  </TableCell>

                                  <TableCell className="text-right font-mono text-xs">
                                    <div>
                                      {windowDays === 30 ? it.sales30d : windowDays === 60 ? it.sales60d : it.sales90d}{' '}
                                      units
                                    </div>
                                    <div className="text-[10px] text-pharma-muted">
                                      ({it.dailyRunRate}/day)
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${it.daysStockRemaining <= 3
                                          ? 'bg-red-100 text-red-800'
                                          : it.daysStockRemaining <= 7
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-50 text-emerald-800'
                                        }`}
                                    >
                                      {it.daysStockRemaining >= 999 ? 'No Run Rate' : `${it.daysStockRemaining} Days`}
                                    </span>
                                  </TableCell>

                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Input
                                        type="number"
                                        min={0}
                                        value={currentQty}
                                        onChange={(e) => handleQtyChange(it.productId, e.target.value)}
                                        className="w-16 h-8 text-center font-mono font-bold text-xs"
                                        disabled={!isChecked}
                                      />
                                      <span className="text-[11px] text-pharma-muted whitespace-nowrap">
                                        {it.packUnitName}{it.conversionFactor > 1 ? ` (${it.conversionFactor}s)` : ''}
                                      </span>
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-right font-mono text-xs text-pharma-muted">
                                    {formatPaisaToPKR(it.unitCostPaisa)}
                                  </TableCell>

                                  <TableCell className="text-right font-mono text-xs font-bold text-pharma-primary">
                                    {formatPaisaToPKR(lineTotal)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Tab 2: Saved Draft Purchase Orders List ────────────────────────── */
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-pharma-text flex items-center gap-2">
                <FileText className="w-5 h-5 text-pharma-primary" />
                Draft & Active Purchase Orders ({draftPos.length})
              </h3>
              <p className="text-xs text-pharma-muted">
                Created purchase order batches ready for supplier transmission or conversion to purchase invoices.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadDraftPos}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>

          {draftPos.length === 0 ? (
            <div className="p-8 text-center text-pharma-muted text-xs">
              No draft purchase orders created yet. Select items in the Reorder Suggestions tab and click "Create Draft PO".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Items Count</TableHead>
                    <TableHead className="text-right">Estimated Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftPos.map((po) => (
                    <TableRow key={po.id} className="hover:bg-pharma-surface/50">
                      <TableCell className="font-mono font-bold text-xs text-pharma-text">
                        {po.poNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-xs">{po.supplierName}</div>
                        <div className="text-[10px] text-pharma-muted font-mono">{po.supplierPhone}</div>
                      </TableCell>
                      <TableCell className="text-xs text-pharma-muted">
                        {new Date(po.createdAt).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-xs">{po.createdByName}</TableCell>
                      <TableCell className="font-mono text-xs">{po.items.length} items</TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-pharma-primary">
                        {formatPaisaToPKR(po.totalEstimatedPaisa)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            po.status === 'CONVERTED_TO_PURCHASE'
                              ? 'active'
                              : po.status === 'SENT_TO_SUPPLIER'
                                ? 'primary'
                                : 'near-expiry'
                          }
                          dot={false}
                        >
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingDraftPo(po)}
                          className="text-xs h-7"
                        >
                          View PO
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Create Draft PO Review ───────────────────────────────────── */}
      {selectedSupplierForPo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-pharma-white rounded-pharma shadow-pharma-xl max-w-3xl w-full p-6 space-y-5 border border-pharma-muted/20">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-pharma-text flex items-center gap-2">
                  <FileText className="w-5 h-5 text-pharma-primary" />
                  Compile Draft Purchase Order
                </h3>
                <p className="text-xs text-pharma-muted mt-0.5">
                  Supplier: <strong>{selectedSupplierForPo.supplierName}</strong> ({selectedSupplierForPo.supplierPhone})
                </p>
              </div>
              <button
                onClick={() => setSelectedSupplierForPo(null)}
                className="text-pharma-muted hover:text-pharma-text text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {createdPoSuccess ? (
              <div className="p-6 text-center space-y-4 bg-emerald-50 rounded-pharma border border-emerald-200">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-lg text-emerald-900">
                  Purchase Order {createdPoSuccess.poNumber} Created!
                </h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  The draft PO with {createdPoSuccess.items.length} items ({formatPaisaToPKR(createdPoSuccess.totalEstimatedPaisa)}) has been recorded.
                </p>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      exportToCsv(
                        `po-${createdPoSuccess.poNumber}`,
                        createdPoSuccess.items.map((i) => ({
                          PO: createdPoSuccess.poNumber,
                          Product: i.productName,
                          SKU: i.sku,
                          Packs: i.quantityInPacks,
                          Unit: i.unitName,
                          CostPKR: (i.costPricePaisa / 100).toFixed(2),
                          LineTotalPKR: (i.lineTotalPaisa / 100).toFixed(2),
                        }))
                      );
                    }}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download CSV
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setSelectedSupplierForPo(null)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs bg-pharma-surface p-3 rounded-lg border border-pharma-muted/20">
                  <div>
                    <span className="text-pharma-muted">Sales Velocity Window:</span>{' '}
                    <strong className="text-pharma-text">{windowDays} Days</strong>
                  </div>
                  <div>
                    <span className="text-pharma-muted">Stock Target Coverage:</span>{' '}
                    <strong className="text-pharma-text">{targetCoverageDays} Days</strong>
                  </div>
                </div>

                {/* Items to include */}
                <div className="max-h-60 overflow-y-auto border border-pharma-muted/20 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-pharma-surface border-b sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left">Product</th>
                        <th className="py-2 px-3 text-center">Order Qty</th>
                        <th className="py-2 px-3 text-right">Pack Cost</th>
                        <th className="py-2 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pharma-muted/15">
                      {selectedSupplierForPo.items
                        .filter(
                          (it) =>
                            includedItems[it.productId] &&
                            (editedQuantities[it.productId] ?? it.suggestedPackUnits) > 0
                        )
                        .map((it) => {
                          const q = editedQuantities[it.productId] ?? it.suggestedPackUnits;
                          const total = q * it.unitCostPaisa;
                          return (
                            <tr key={it.productId}>
                              <td className="py-2 px-3">
                                <div className="font-bold text-pharma-text">{it.productName}</div>
                                <div className="text-[10px] text-pharma-muted font-mono">{it.sku}</div>
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold">
                                {q} {it.packUnitName}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-pharma-muted">
                                {formatPaisaToPKR(it.unitCostPaisa)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-pharma-primary">
                                {formatPaisaToPKR(total)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Order notes */}
                <div>
                  <label className="block text-xs font-semibold text-pharma-text mb-1">
                    Order / Delivery Instructions:
                  </label>
                  <textarea
                    rows={2}
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-md border border-pharma-muted/30 focus:outline-none focus:ring-1 focus:ring-pharma-primary"
                    placeholder="e.g. Please send via TCS Cargo, verify batch expiry > 18 months."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setSelectedSupplierForPo(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleCreateDraftPo} disabled={isCreatingPo}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {isCreatingPo ? 'Creating PO...' : 'Confirm & Generate PO'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: View Draft PO Details & Actions ──────────────────────────── */}
      {viewingDraftPo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-pharma-white rounded-pharma shadow-pharma-xl max-w-3xl w-full p-6 space-y-5 border border-pharma-muted/20">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-bold text-lg text-pharma-text">
                    {viewingDraftPo.poNumber}
                  </h3>
                  <Badge
                    variant={
                      viewingDraftPo.status === 'CONVERTED_TO_PURCHASE'
                        ? 'active'
                        : viewingDraftPo.status === 'SENT_TO_SUPPLIER'
                          ? 'primary'
                          : 'near-expiry'
                    }
                    dot={false}
                  >
                    {viewingDraftPo.status}
                  </Badge>
                </div>
                <p className="text-xs text-pharma-muted mt-0.5">
                  Supplier: <strong>{viewingDraftPo.supplierName}</strong> ({viewingDraftPo.supplierPhone}) • Created on{' '}
                  {new Date(viewingDraftPo.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setViewingDraftPo(null)}
                className="text-pharma-muted hover:text-pharma-text text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-pharma-surface rounded-lg text-xs space-y-1">
                <p className="text-pharma-muted">Notes: <strong className="text-pharma-text">{viewingDraftPo.notes || 'None'}</strong></p>
                <p className="text-pharma-muted">Parameters: Speed Window: <strong>{viewingDraftPo.speedWindowDays}d</strong> • Coverage: <strong>{viewingDraftPo.targetCoverageDays}d</strong></p>
              </div>

              {/* Items Table */}
              <div className="border border-pharma-muted/20 rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-pharma-surface border-b sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left">Product</th>
                      <th className="py-2 px-3 text-center">Quantity</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pharma-muted/15">
                    {viewingDraftPo.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <div className="font-bold text-pharma-text">{it.productName}</div>
                          <div className="text-[10px] text-pharma-muted font-mono">{it.sku}</div>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {it.quantityInPacks} {it.unitName}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-pharma-muted">
                          {formatPaisaToPKR(it.costPricePaisa)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-pharma-primary">
                          {formatPaisaToPKR(it.lineTotalPaisa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-pharma-surface border-t font-bold">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right">Total Estimated Order Value:</td>
                      <td className="py-2 px-3 text-right font-mono text-pharma-primary">
                        {formatPaisaToPKR(viewingDraftPo.totalEstimatedPaisa)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Actions & Status Transitions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      exportToCsv(
                        `po-${viewingDraftPo.poNumber}`,
                        viewingDraftPo.items.map((i) => ({
                          PO: viewingDraftPo.poNumber,
                          Supplier: viewingDraftPo.supplierName,
                          Product: i.productName,
                          SKU: i.sku,
                          Quantity: i.quantityInPacks,
                          Unit: i.unitName,
                          CostPKR: (i.costPricePaisa / 100).toFixed(2),
                          LineTotalPKR: (i.lineTotalPaisa / 100).toFixed(2),
                        }))
                      );
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Export CSV
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {viewingDraftPo.status === 'DRAFT' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdatePoStatus(viewingDraftPo.id, 'SENT_TO_SUPPLIER')}
                    >
                      Mark as Sent to Supplier
                    </Button>
                  )}
                  {viewingDraftPo.status === 'SENT_TO_SUPPLIER' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdatePoStatus(viewingDraftPo.id, 'CONVERTED_TO_PURCHASE')}
                    >
                      Mark Converted to Purchase Bill
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setViewingDraftPo(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
