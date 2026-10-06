import React, { useState, useEffect } from 'react';
import {
  StocktakeDto,
  StocktakeItemDto,
  formatPaisaToPKR,
  UserRole,
} from '@pharmacy/shared';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
  ClipboardCheck,
  Printer,
  Plus,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Save,
  Send,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const StocktakePage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || UserRole.CASHIER;
  const canApprove = role === UserRole.ADMIN || role === UserRole.PHARMACIST;

  // State
  const [stocktakes, setStocktakes] = useState<StocktakeDto[]>([]);
  const [selectedStocktake, setSelectedStocktake] = useState<StocktakeDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);

  // New stocktake modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRackLocation, setNewRackLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Approval / Reject modal
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Counted quantities editing
  const [countsMap, setCountsMap] = useState<Record<string, number>>({});
  const [isSavingCounts, setIsSavingCounts] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Printable Count Sheet View mode
  const [printSheetMode, setPrintSheetMode] = useState(false);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [sheetRackFilter, setSheetRackFilter] = useState('');

  const loadStocktakes = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>('/api/stocktake');
      if (res.success && res.data.length > 0) {
        setStocktakes(res.data);
        if (!selectedStocktake) {
          setSelectedStocktake(res.data[0]);
          initCountsMap(res.data[0].items);
        } else {
          const updated = res.data.find((s: any) => s.id === selectedStocktake.id) || res.data[0];
          setSelectedStocktake(updated);
          initCountsMap(updated.items);
        }
      }
    } catch (err) {
      console.error('Failed to load stocktakes', err);
    } finally {
      setIsLoading(false);
    }
  };

  const initCountsMap = (items: StocktakeItemDto[]) => {
    const map: Record<string, number> = {};
    items.forEach((it) => {
      if (it.countedQuantity !== null) {
        map[it.batchId] = it.countedQuantity;
      }
    });
    setCountsMap(map);
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    loadStocktakes();
  }, []);

  const handleSelectStocktake = (stk: StocktakeDto) => {
    setSelectedStocktake(stk);
    initCountsMap(stk.items);
  };

  const handleCountChange = (batchId: string, val: string) => {
    const num = parseInt(val, 10);
    setCountsMap((prev) => ({
      ...prev,
      [batchId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveCounts = async (submitForReview = false) => {
    if (!selectedStocktake) return;
    setIsSavingCounts(true);
    try {
      const payload = {
        items: Object.entries(countsMap).map(([batchId, countedQuantity]) => ({
          batchId,
          countedQuantity,
        })),
        submitForReview,
      };

      const res = await apiFetch<any>(`/api/stocktake/${selectedStocktake.id}/counts`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSelectedStocktake(res.data);
        initCountsMap(res.data.items);
        await loadStocktakes();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save counts');
    } finally {
      setIsSavingCounts(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedStocktake) return;
    setIsApproving(true);
    try {
      const res = await apiFetch<any>(`/api/stocktake/${selectedStocktake.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: approvalNotes }),
      });

      if (res.success) {
        setIsApproveModalOpen(false);
        setApprovalNotes('');
        await loadStocktakes();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve stocktake');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedStocktake) return;
    setIsRejecting(true);
    try {
      const res = await apiFetch<any>(`/api/stocktake/${selectedStocktake.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (res.success) {
        setIsRejectModalOpen(false);
        setRejectionReason('');
        await loadStocktakes();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject stocktake');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCreateStocktake = async () => {
    setIsCreating(true);
    try {
      const res = await apiFetch<any>('/api/stocktake', {
        method: 'POST',
        body: JSON.stringify({
          rackLocation: newRackLocation || undefined,
          notes: newNotes,
        }),
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setNewRackLocation('');
        setNewNotes('');
        await loadStocktakes();
        setSelectedStocktake(res.data);
        initCountsMap(res.data.items);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create stocktake session');
    } finally {
      setIsCreating(false);
    }
  };

  const loadPrintSheet = async (rack?: string) => {
    try {
      setSheetRackFilter(rack || '');
      const url = `/api/stocktake/count-sheet${rack ? `?rackLocation=${encodeURIComponent(rack)}` : ''}`;
      const res = await apiFetch<any>(url);
      if (res.success) {
        setSheetData(res.data);
        setPrintSheetMode(true);
      }
    } catch (err) {
      console.error('Failed to load count sheet', err);
    }
  };

  // Filter items in review table
  const filteredItems = selectedStocktake?.items.filter((it) => {
    if (showVarianceOnly && it.varianceQuantity === 0) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return (
        it.productName.toLowerCase().includes(q) ||
        it.productSku.toLowerCase().includes(q) ||
        it.batchNumber.toLowerCase().includes(q) ||
        it.rackLocation.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  const isLocked = selectedStocktake?.status === 'APPROVED' || selectedStocktake?.status === 'REJECTED';

  // ── Render Printable Count Sheet ───────────────────────────────────────────
  if (printSheetMode) {
    return (
      <div className="space-y-6 print:p-0 print:m-0">
        <div className="flex items-center justify-between no-print bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20">
          <div>
            <h3 className="font-bold text-sm text-pharma-text">Printable Physical Inventory Count Sheet</h3>
            <p className="text-xs text-pharma-muted">
              Organized by Rack / Storage Location with blank physical counted column.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPrintSheetMode(false)}>
              Back to Audit
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" />
              Print Sheet
            </Button>
          </div>
        </div>

        <div className="bg-white p-8 rounded border border-gray-200 print:border-none print:p-0 print:shadow-none space-y-4">
          <div className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold uppercase text-gray-900 tracking-wider">
                  PharmaCare Pharmacy • Physical Stocktake Sheet
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  Location / Zone: <strong>{sheetRackFilter || 'All Racks & Storage Areas'}</strong> • Printed: {new Date().toLocaleString()}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500 font-mono">
                FORM: STK-CNT-2026<br />DRAP / Pharmacy Standard
              </div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800 text-left bg-gray-50">
                <th className="py-2 px-2">Rack / Loc</th>
                <th className="py-2 px-2">Medicine & Strength</th>
                <th className="py-2 px-2">SKU</th>
                <th className="py-2 px-2">Batch #</th>
                <th className="py-2 px-2">Expiry Date</th>
                <th className="py-2 px-2 text-right">System Qty</th>
                <th className="py-2 px-4 text-center border-l-2 border-gray-400 font-bold bg-gray-100">
                  PHYSICAL COUNT
                </th>
                <th className="py-2 px-2 text-left">Remarks / Discrepancy</th>
              </tr>
            </thead>
            <tbody>
              {sheetData.map((row, idx) => (
                <tr key={row.batchId || idx} className="border-b border-gray-300">
                  <td className="py-2.5 px-2 font-mono font-semibold">{row.rackLocation}</td>
                  <td className="py-2.5 px-2 font-bold flex items-center gap-1">
                    {row.productName}
                    {row.isRefrigerated && <span className="text-[10px] text-pharma-primary">❄️ 2-8°C</span>}
                  </td>
                  <td className="py-2.5 px-2 font-mono text-gray-600">{row.productSku}</td>
                  <td className="py-2.5 px-2 font-mono font-semibold">{row.batchNumber}</td>
                  <td className="py-2.5 px-2">{new Date(row.expiryDate).toLocaleDateString()}</td>
                  <td className="py-2.5 px-2 text-right font-mono font-semibold">{row.systemQuantity}</td>
                  <td className="py-2.5 px-4 text-center border-l-2 border-gray-400">
                    <div className="w-20 h-6 border-b border-gray-600 mx-auto"></div>
                  </td>
                  <td className="py-2.5 px-2 text-gray-400 italic">__________________</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-8 border-t border-gray-300 grid grid-cols-3 gap-6 text-xs text-gray-700">
            <div>
              <p className="font-bold">Count Conducted By:</p>
              <div className="mt-8 border-b border-gray-400"></div>
              <p className="text-[10px] text-gray-500 mt-1">Name, Signature & Date</p>
            </div>
            <div>
              <p className="font-bold">Verified By (Pharmacist):</p>
              <div className="mt-8 border-b border-gray-400"></div>
              <p className="text-[10px] text-gray-500 mt-1">PMDC Reg / Pharmacist Sign</p>
            </div>
            <div>
              <p className="font-bold">Approved For System Post:</p>
              <div className="mt-8 border-b border-gray-400"></div>
              <p className="text-[10px] text-gray-500 mt-1">Administrator Authorization</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Standard Audit & Variance Review Screen ────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
              Inventory Module:
            </span>
            <Badge variant="primary" dot={false}>
              Spec Section 10
            </Badge>
            <span className="text-xs text-pharma-muted font-mono">• Physical Stocktake & Variance Review</span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-pharma-primary" />
            Physical Stocktake & Discrepancy Reconciliation
          </h2>
          <p className="text-xs text-pharma-muted mt-1">
            Conduct rack-by-rack physical counts, review variances in real time, and execute locked stocktake adjustment movements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => loadPrintSheet(sheetRackFilter)}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Count Sheet
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Audit Session
          </Button>
        </div>
      </div>

      {/* ── Main Layout: Audit Sessions List + Variance Review ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Stocktake Sessions Selector (4 cols) */}
        <div className="lg:col-span-4 pharma-panel space-y-4">
          <div className="flex items-center justify-between border-b border-pharma-muted/15 pb-2">
            <h3 className="text-sm font-bold text-pharma-text">Audit Sessions ({stocktakes.length})</h3>
            <button
              onClick={loadStocktakes}
              className="text-xs text-pharma-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {stocktakes.map((stk) => {
              const isSelected = selectedStocktake?.id === stk.id;
              const isApproved = stk.status === 'APPROVED';
              const isPending = stk.status === 'PENDING_REVIEW';
              const isRejected = stk.status === 'REJECTED';

              return (
                <div
                  key={stk.id}
                  onClick={() => handleSelectStocktake(stk)}
                  className={`p-3 rounded-pharma border cursor-pointer transition-all ${isSelected
                      ? 'border-pharma-primary bg-pharma-primary/5 shadow-sm'
                      : 'border-pharma-muted/20 hover:border-pharma-muted/40 bg-pharma-surface'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-pharma-text">
                      {stk.stocktakeNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isApproved
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isRejected
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}
                    >
                      {stk.status}
                    </span>
                  </div>

                  <div className="text-xs text-pharma-muted line-clamp-1">{stk.notes}</div>

                  <div className="text-[11px] text-pharma-muted flex items-center justify-between mt-2 pt-1 border-t border-pharma-muted/10 font-mono">
                    <span>{stk.totalItems} Items ({stk.varianceItemsCount} Variances)</span>
                    <span
                      className={
                        stk.netVarianceQuantity < 0
                          ? 'text-red-600 font-bold'
                          : stk.netVarianceQuantity > 0
                            ? 'text-emerald-600 font-bold'
                            : 'text-pharma-muted'
                      }
                    >
                      {stk.netVarianceQuantity > 0 ? `+${stk.netVarianceQuantity}` : stk.netVarianceQuantity} units
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Variance Review & Approval Screen (8 cols) */}
        <div className="lg:col-span-8 pharma-panel space-y-4">
          {selectedStocktake ? (
            <>
              {/* Header Details of selected stocktake */}
              <div className="p-4 rounded-pharma bg-pharma-surface border border-pharma-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-bold text-base text-pharma-text">
                      {selectedStocktake.stocktakeNumber}
                    </h3>
                    <Badge variant={selectedStocktake.status === 'APPROVED' ? 'active' : selectedStocktake.status === 'REJECTED' ? 'expired' : 'near-expiry'} dot={false}>
                      {selectedStocktake.status}
                    </Badge>
                    {selectedStocktake.rackLocation && (
                      <span className="text-xs bg-pharma-white px-2 py-0.5 rounded border text-pharma-muted font-mono">
                        Zone: {selectedStocktake.rackLocation}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-pharma-muted mt-1">
                    Created by: <strong>{selectedStocktake.createdByName}</strong> on {new Date(selectedStocktake.createdAt).toLocaleString()}
                  </p>
                  {selectedStocktake.approvedAt && (
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                      ✓ Approved & Movements Created by: {selectedStocktake.approvedByName} on {new Date(selectedStocktake.approvedAt).toLocaleString()}
                    </p>
                  )}
                  {selectedStocktake.rejectedAt && (
                    <p className="text-xs text-red-700 font-semibold mt-0.5">
                      ✕ Rejected by: {selectedStocktake.rejectedByName} ({selectedStocktake.rejectionReason})
                    </p>
                  )}
                </div>

                {/* Status-specific action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isLocked && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveCounts(false)}
                        disabled={isSavingCounts || !hasUnsavedChanges}
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        Save Draft
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveCounts(true)}
                        disabled={isSavingCounts}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Submit Review
                      </Button>
                    </>
                  )}

                  {/* Pharmacist / Admin Approvals */}
                  {canApprove && !isLocked && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => setIsRejectModalOpen(true)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setIsApproveModalOpen(true)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        Approve & Apply
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Status Lock Banner */}
              {isLocked && (
                <div
                  className={`p-3 rounded text-xs flex items-center justify-between ${selectedStocktake.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    This audit session is {selectedStocktake.status}. Per strict invariant rules, inventory movements have been permanently committed and counts cannot be altered.
                  </span>
                </div>
              )}

              {/* Filters for item review */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-64">
                  <Input
                    placeholder="Search medicine, batch, SKU..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    prefixElement={<Search className="w-3.5 h-3.5" />}
                  />
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-pharma-text font-semibold">
                    <input
                      type="checkbox"
                      checked={showVarianceOnly}
                      onChange={(e) => setShowVarianceOnly(e.target.checked)}
                      className="rounded text-pharma-primary"
                    />
                    Highlight Non-Zero Variances Only ({selectedStocktake.varianceItemsCount})
                  </label>

                  <div className="font-mono text-xs">
                    Net Impact:{' '}
                    <strong
                      className={
                        selectedStocktake.netVarianceValuePaisa < 0
                          ? 'text-red-600'
                          : selectedStocktake.netVarianceValuePaisa > 0
                            ? 'text-emerald-600'
                            : 'text-pharma-text'
                      }
                    >
                      {formatPaisaToPKR(selectedStocktake.netVarianceValuePaisa)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Variance Review Table */}
              <div className="overflow-x-auto border border-pharma-muted/20 rounded-pharma">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine & Batch</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead className="text-right">System Qty</TableHead>
                      <TableHead className="w-28 text-center">Physical Count</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const currentCount =
                        countsMap[item.batchId] !== undefined
                          ? countsMap[item.batchId]
                          : item.countedQuantity !== null
                            ? item.countedQuantity
                            : item.systemQuantity;

                      const variance = currentCount - item.systemQuantity;
                      const varianceVal = variance * item.costPricePaisa;
                      const hasVariance = variance !== 0;

                      return (
                        <tr
                          key={item.id}
                          className={`border-b transition-colors ${hasVariance
                              ? variance < 0
                                ? 'bg-red-50/40 hover:bg-red-50/70'
                                : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                              : 'hover:bg-pharma-surface/50'
                            }`}
                        >
                          <TableCell>
                            <div>
                              <div className="font-bold text-xs text-pharma-text flex items-center gap-1.5">
                                {item.productName}
                                {item.isRefrigerated && (
                                  <span className="text-[10px] bg-pharma-surface text-pharma-primary px-1 py-0.2 rounded border border-pharma-primary/20 font-mono">
                                    ❄️ 2-8°C
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-pharma-muted font-mono flex items-center gap-2 mt-0.5">
                                <span>Batch: <strong>{item.batchNumber}</strong></span>
                                <span>SKU: {item.productSku}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs">{item.rackLocation}</TableCell>

                          <TableCell className="text-right font-mono font-bold text-xs">
                            {item.systemQuantity}
                          </TableCell>

                          <TableCell className="text-center">
                            {isLocked ? (
                              <span className="font-mono font-bold text-xs text-pharma-text">
                                {currentCount}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={currentCount}
                                onChange={(e) => handleCountChange(item.batchId, e.target.value)}
                                className="w-20 px-2 py-1 text-center font-mono font-bold text-xs border rounded focus:border-pharma-primary focus:ring-1 focus:ring-pharma-primary"
                              />
                            )}
                          </TableCell>

                          <TableCell className="text-right font-mono font-bold text-xs">
                            {variance === 0 ? (
                              <span className="text-pharma-muted">0 (Matched)</span>
                            ) : (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] ${variance < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}
                              >
                                {variance > 0 ? `+${variance}` : variance}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-right font-mono font-bold text-xs">
                            {varianceVal === 0 ? (
                              <span className="text-pharma-muted">Rs 0.00</span>
                            ) : (
                              <span className={varianceVal < 0 ? 'text-red-700' : 'text-emerald-700'}>
                                {formatPaisaToPKR(varianceVal)}
                              </span>
                            )}
                          </TableCell>
                        </tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-pharma-muted">
              Select an audit session from the left or create a new session.
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Create New Stocktake Session ───────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Start New Physical Stocktake Audit"
      >
        <div className="space-y-4">
          <p className="text-xs text-pharma-muted">
            Creates a new stocktake session capturing current system stock snapshot. You can perform physical counts and review variances prior to final authorization.
          </p>

          <div>
            <label className="block text-xs font-bold text-pharma-text mb-1">
              Filter by Rack / Storage Area (Optional)
            </label>
            <Input
              placeholder="e.g. Rack A-01, Fridge F-01 (Leave blank for whole pharmacy)"
              value={newRackLocation}
              onChange={(e) => setNewRackLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pharma-text mb-1">Audit Notes / Scope</label>
            <Input
              placeholder="e.g. Monthly narcotics & cold chain audit"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateStocktake} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Initialize Session'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Approve Stocktake Adjustments ───────────────────────────── */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Authorize & Commit Stocktake Adjustments"
      >
        <div className="space-y-4">
          <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Pharmacist / Admin Authorization Required
            </div>
            <p>
              Approving this stocktake will create <strong>STOCKTAKE ADJUSTMENT</strong> stock movements for all{' '}
              <strong>{selectedStocktake?.varianceItemsCount || 0}</strong> non-zero variances and synchronize batch quantities to match physical counts.
            </p>
            <p className="font-semibold text-red-700">
              This action is permanent, one-time, and cannot be undone or re-edited.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-pharma-text mb-1">Approval Verification Notes</label>
            <Input
              placeholder="e.g. Discrepancies verified against physical shelf count by Dr. Tariq"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleApprove} disabled={isApproving} className="bg-emerald-600 hover:bg-emerald-700">
              {isApproving ? 'Committing...' : 'Confirm & Commit Stock Adjustments'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Reject Stocktake ────────────────────────────────────────── */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Stocktake Audit Session"
      >
        <div className="space-y-4">
          <p className="text-xs text-pharma-muted">
            Rejecting this stocktake marks the session as rejected. No inventory balances will be modified. A recount may be scheduled.
          </p>

          <div>
            <label className="block text-xs font-bold text-pharma-text mb-1">Rejection Reason</label>
            <Input
              placeholder="e.g. Unexplained high variance on Rack A-02; physical recount ordered"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleReject} disabled={isRejecting} className="bg-red-600 hover:bg-red-700">
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
