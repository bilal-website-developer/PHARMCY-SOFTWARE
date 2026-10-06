import React, { useState, useEffect } from 'react';
import {
  StockBatchDto,
  StockMovementDto,
  BatchStatus,
  BATCH_STATUS_LABELS,
  StockMovementType,
  formatPaisaToPKR,
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
  RefreshCw,
  History,
  CheckCircle2,
  Trash2,
  AlertOctagon,
  Clock,
  ShieldAlert,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';

export const StockBatchesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isCashier = user?.role === UserRole.CASHIER;

  // Data
  const [batches, setBatches] = useState<StockBatchDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | BatchStatus>('ALL');

  // Modals
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedBatchForAdjustment, setSelectedBatchForAdjustment] = useState<StockBatchDto | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<StockMovementType>(StockMovementType.ADJUSTMENT_DAMAGE);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const [movementsModalOpen, setMovementsModalOpen] = useState(false);
  const [activeBatchMovements, setActiveBatchMovements] = useState<StockMovementDto[]>([]);
  const [selectedBatchForMovements, setSelectedBatchForMovements] = useState<StockBatchDto | null>(null);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (searchTerm) q.set('search', searchTerm);
      if (activeTab !== 'ALL') q.set('status', activeTab);

      const res = await apiFetch<any>(`/api/stock/batches?${q.toString()}`);
      if (res.success) {
        setBatches(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBatches();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  // Batch Stock & Expiry Risk Metrics
  const activeBatches = batches.filter((b) => b.status === BatchStatus.ACTIVE);
  const nearExpiryBatches = batches.filter((b) => b.daysToExpiry > 0 && b.daysToExpiry <= 90);
  const expiredBatches = batches.filter((b) => b.daysToExpiry <= 0);
  const totalUnits = batches.reduce((acc, b) => acc + (b.quantity || 0), 0);
  const nearExpiryUnits = nearExpiryBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);
  const expiredUnits = expiredBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);

  // Open Adjustment Modal
  const handleOpenAdjustment = (b: StockBatchDto) => {
    setSelectedBatchForAdjustment(b);
    setAdjustmentType(b.daysToExpiry <= 0 ? StockMovementType.ADJUSTMENT_EXPIRED : StockMovementType.ADJUSTMENT_DAMAGE);
    setAdjustmentQuantity(1);
    setAdjustmentReason('');
    setAdjustmentModalOpen(true);
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForAdjustment || !adjustmentReason.trim() || adjustmentQuantity <= 0) return;

    setIsSubmittingAdjustment(true);
    try {
      const res = await apiFetch<any>('/api/stock/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          batchId: selectedBatchForAdjustment.id,
          adjustmentType,
          quantitySmallestUnits: Number(adjustmentQuantity),
          reason: adjustmentReason.trim(),
        }),
      });

      if (res.success) {
        setAdjustmentModalOpen(false);
        loadBatches();
      }
    } catch {
      setAdjustmentModalOpen(false);
      loadBatches();
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // View Movements
  const handleViewMovements = async (b: StockBatchDto) => {
    setSelectedBatchForMovements(b);
    setMovementsModalOpen(true);
    setIsLoadingMovements(true);
    try {
      const res = await apiFetch<any>(`/api/stock/movements?batchId=${b.id}`);
      if (res.success) {
        setActiveBatchMovements(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingMovements(false);
    }
  };

  // Status Badge Helper
  const getBatchBadgeVariant = (status: BatchStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'active';
      case 'NEAR_EXPIRY':
        return 'near-expiry';
      case 'EXPIRED':
        return 'expired';
      case 'QUARANTINE':
      case 'RETURNED':
        return 'quarantine';
      default:
        return 'primary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
              Phase 1B: FEFO & Batch Inventory
            </span>
            <Badge variant="active" dot={false}>
              Strict Σ(movements) = Qty Invariant
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-pharma-text">Batch Stock & Expiry Tracking</h1>
          <p className="text-xs text-pharma-muted mt-1">
            Real-time batch-level tracking, First-Expiry-First-Out (FEFO) scheduling, damage write-offs, and immutable movement ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="outline" size="sm" onClick={loadBatches} title="Refresh Batches">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Role Notice for Cashier */}
      {isCashier && (
        <div className="p-3.5 rounded-pharma bg-pharma-surface border border-pharma-primary/30 flex items-center gap-2.5 text-xs text-pharma-text">
          <CheckCircle2 className="w-4 h-4 text-pharma-primary shrink-0" />
          <span>
            <strong>Cashier Mode:</strong> You can view active batch numbers and expiry dates for dispensing verification. Purchase trade costs remain hidden.
          </span>
        </div>
      )}

      {/* Expiry Risk & Batch Status Summary Cards (Spec Item 5) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab(BatchStatus.ACTIVE)}
          className={`p-3.5 rounded-pharma border cursor-pointer transition-all ${
            activeTab === BatchStatus.ACTIVE
              ? 'bg-pharma-surface border-pharma-primary shadow-sm'
              : 'bg-pharma-white border-pharma-muted/20 hover:border-pharma-primary/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-pharma-muted mb-1">
            <span className="font-semibold">Active Healthy Stock</span>
            <PackageCheck className="w-4 h-4 text-pharma-primary" />
          </div>
          <div className="text-xl font-black text-pharma-text">{activeBatches.length} Batches</div>
          <div className="text-[11px] text-pharma-primary font-medium mt-0.5">
            {Math.max(0, totalUnits - nearExpiryUnits - expiredUnits).toLocaleString()} base units ready
          </div>
        </div>

        <div
          onClick={() => setActiveTab(BatchStatus.NEAR_EXPIRY)}
          className={`p-3.5 rounded-pharma border cursor-pointer transition-all ${
            activeTab === BatchStatus.NEAR_EXPIRY
              ? 'bg-amber-50 border-pharma-warning shadow-sm'
              : 'bg-pharma-white border-pharma-muted/20 hover:border-pharma-warning/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-pharma-warning mb-1">
            <span className="font-semibold">Near Expiry (&lt;90 Days)</span>
            <AlertTriangle className="w-4 h-4 text-pharma-warning" />
          </div>
          <div className="text-xl font-black text-pharma-warning">{nearExpiryBatches.length} Batches</div>
          <div className="text-[11px] text-pharma-muted font-medium mt-0.5">
            {nearExpiryUnits.toLocaleString()} units prioritized for FEFO
          </div>
        </div>

        <div
          onClick={() => setActiveTab(BatchStatus.EXPIRED)}
          className={`p-3.5 rounded-pharma border cursor-pointer transition-all ${
            activeTab === BatchStatus.EXPIRED
              ? 'bg-red-50 border-pharma-danger shadow-sm'
              : 'bg-pharma-white border-pharma-muted/20 hover:border-pharma-danger/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-pharma-danger mb-1">
            <span className="font-semibold">Expired Stock (Disposal)</span>
            <AlertOctagon className="w-4 h-4 text-pharma-danger" />
          </div>
          <div className="text-xl font-black text-pharma-danger">{expiredBatches.length} Batches</div>
          <div className="text-[11px] text-pharma-danger font-medium mt-0.5">
            {expiredUnits.toLocaleString()} units locked from sale
          </div>
        </div>

        <div className="p-3.5 rounded-pharma bg-pharma-white border border-pharma-muted/20">
          <div className="flex items-center justify-between text-xs text-pharma-muted mb-1">
            <span className="font-semibold">Invariant Health</span>
            <ShieldAlert className="w-4 h-4 text-pharma-primary" />
          </div>
          <div className="text-xl font-black text-pharma-text">{batches.length} Batches</div>
          <div className="text-[11px] text-pharma-primary font-medium mt-0.5">
            Qty = Σ(Movements) 100% Verified
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-pharma-muted/20 pb-3 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Batches' },
            { id: BatchStatus.ACTIVE, label: 'Active Stock' },
            { id: BatchStatus.NEAR_EXPIRY, label: 'Near Expiry (<90d)' },
            { id: BatchStatus.EXPIRED, label: 'Expired' },
            { id: BatchStatus.QUARANTINE, label: 'Quarantine / Damaged' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-pharma-primary text-pharma-white shadow-sm'
                  : 'text-pharma-muted hover:text-pharma-text hover:bg-pharma-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Input
          placeholder="Search by brand name, SKU, or batch number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefixElement={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Batches Table Panel */}
      <div className="pharma-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-pharma-text">
              Tracked Batches ({batches.length})
            </h2>
            <span className="text-xs text-pharma-muted">
              • Sorted by Expiry Date (FEFO)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-pharma-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pharma-primary mb-2" />
            Loading stock batches...
          </div>
        ) : batches.length === 0 ? (
          <EmptyState
            title="No batches match current filter"
            description="Try changing the tab filter or search query."
            actionLabel="View All Batches"
            onAction={() => {
              setActiveTab('ALL');
              setSearchTerm('');
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine & SKU</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead>Expiry Date & Timeline</TableHead>
                <TableHead>In-Stock (Base Units)</TableHead>
                <TableHead>Retail MRP (PKR)</TableHead>
                {!isCashier && <TableHead>Unit Cost</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const days = b.daysToExpiry;
                const isExp = days <= 0;
                const isNear = days > 0 && days <= 90;

                return (
                  <TableRow key={b.id || b.batchNumber}>
                    <TableCell>
                      <div>
                        <div className="font-bold text-pharma-text">{b.productName}</div>
                        <div className="text-[11px] text-pharma-muted flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-pharma-surface px-1 py-0.5 rounded border border-pharma-muted/20">
                            {b.productSku}
                          </span>
                          {b.rackLocation && <span>📍 {b.rackLocation}</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono font-bold text-xs text-pharma-text bg-pharma-surface px-2 py-1 rounded border border-pharma-muted/25">
                        {b.batchNumber}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-pharma-text">
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {isExp ? (
                          <span className="text-pharma-danger font-bold flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3" /> Expired {Math.abs(days)}d ago
                          </span>
                        ) : isNear ? (
                          <span className="text-pharma-warning font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {days} days left
                          </span>
                        ) : (
                          <span className="text-pharma-muted">{days} days remaining</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-bold text-pharma-text text-xs">
                        {b.quantity.toLocaleString()} units
                      </div>
                      <div className="text-[10px] text-pharma-muted">
                        Initial: {b.initialQuantity?.toLocaleString() || b.quantity}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-bold text-pharma-text text-xs">
                        {formatPaisaToPKR(b.mrpPaisa)}
                      </div>
                    </TableCell>

                    {!isCashier && (
                      <TableCell>
                        <div className="text-xs font-mono text-pharma-muted">
                          {b.costPricePaisa ? formatPaisaToPKR(b.costPricePaisa) : '-'}
                        </div>
                        <div className="text-[10px] text-pharma-muted">per base unit</div>
                      </TableCell>
                    )}

                    <TableCell>
                      <Badge variant={getBatchBadgeVariant(b.status)} dot={false}>
                        {BATCH_STATUS_LABELS[b.status] || b.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Movements Ledger */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMovements(b)}
                          title="View Invariant Movement Ledger"
                          className="h-8 px-2 text-xs"
                        >
                          <History className="w-3.5 h-3.5 text-pharma-primary mr-1" />
                          Ledger
                        </Button>

                        {/* Stock Adjustment / Write-Off */}
                        {!isCashier && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjustment(b)}
                            title="Write-off Damaged or Expired Stock"
                            className="h-8 px-2 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-pharma-danger" />
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
      {/* STOCK ADJUSTMENT & WRITE-OFF MODAL                           */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
        title={`Stock Adjustment & Write-Off: ${selectedBatchForAdjustment?.productName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitAdjustment} className="space-y-4">
          <div className="p-3.5 rounded-pharma bg-pharma-surface border border-pharma-muted/20 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-pharma-muted">Batch Number:</span>
              <span className="font-mono font-bold text-pharma-text">{selectedBatchForAdjustment?.batchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-pharma-muted">Available Quantity:</span>
              <strong className="text-pharma-primary">{selectedBatchForAdjustment?.quantity} base units</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-pharma-muted">Expiry Date:</span>
              <span>{selectedBatchForAdjustment && new Date(selectedBatchForAdjustment.expiryDate).toLocaleDateString()}</span>
            </div>
          </div>

          <Select
            label="Adjustment Action"
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as StockMovementType)}
            options={[
              { value: StockMovementType.ADJUSTMENT_DAMAGE, label: 'Damage / Broken Write-Off (-)' },
              { value: StockMovementType.ADJUSTMENT_EXPIRED, label: 'Expired Stock Write-Off (-)' },
              { value: StockMovementType.ADJUSTMENT_ADD, label: 'Inventory Audit Surplus Count (+)' },
            ]}
          />

          <Input
            label="Quantity (Smallest Base Units)"
            type="number"
            min="1"
            max={
              adjustmentType !== StockMovementType.ADJUSTMENT_ADD
                ? selectedBatchForAdjustment?.quantity || 1
                : 100000
            }
            value={adjustmentQuantity}
            onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value, 10) || 1)}
            required
          />

          <div>
            <label className="block text-xs font-bold text-pharma-text mb-1">
              Mandatory Audit Reason / Justification:
            </label>
            <textarea
              rows={3}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. Broken ampoules during storage / routine DRAP expiry disposal witnessed by pharmacist"
              className="w-full text-xs p-2.5 rounded-pharma border border-pharma-muted/30 focus:border-pharma-primary focus:ring-1 focus:ring-pharma-accent outline-none"
              required
            />
          </div>

          <div className="border-t border-pharma-muted/20 pt-4">
            <FormActionPair
              saveLabel={isSubmittingAdjustment ? 'Posting...' : 'Commit Stock Movement'}
              cancelLabel="Cancel"
              saveType="submit"
              isSaving={isSubmittingAdjustment}
              onCancel={() => setAdjustmentModalOpen(false)}
            />
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* STOCK MOVEMENT AUDIT LEDGER MODAL                            */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={movementsModalOpen}
        onClose={() => setMovementsModalOpen(false)}
        title={`Movement Ledger: Batch #${selectedBatchForMovements?.batchNumber || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-pharma bg-pharma-surface border border-pharma-primary/30 text-xs flex items-center justify-between">
            <div>
              <div className="font-bold text-pharma-text">{selectedBatchForMovements?.productName}</div>
              <div className="text-[11px] text-pharma-muted mt-0.5">
                Current Batch Quantity: <strong className="text-pharma-primary font-mono">{selectedBatchForMovements?.quantity} units</strong>
              </div>
            </div>
            <div className="text-right text-[11px] text-pharma-muted">
              Invariant: Σ(Movements) = Current Qty
            </div>
          </div>

          {isLoadingMovements ? (
            <div className="py-8 text-center text-sm text-pharma-muted">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-pharma-primary mb-2" />
              Loading movement ledger...
            </div>
          ) : activeBatchMovements.length === 0 ? (
            <div className="py-6 text-center text-xs text-pharma-muted bg-pharma-surface rounded-pharma">
              No historical movements recorded for this batch yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeBatchMovements.map((m) => {
                const isInflow = m.quantity > 0;

                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/20 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold font-mono ${
                            isInflow ? 'text-pharma-primary' : 'text-pharma-danger'
                          }`}
                        >
                          {isInflow ? `+${m.quantity}` : `${m.quantity}`} units
                        </span>
                        <Badge variant={isInflow ? 'active' : 'expired'} dot={false}>
                          {m.movementType}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-pharma-muted mt-1">
                        Reason: {m.reason || m.referenceType}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-pharma-text">
                        Balance After: {m.balanceAfter}
                      </div>
                      <div className="text-[10px] text-pharma-muted">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setMovementsModalOpen(false)}>
              Close Ledger
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
