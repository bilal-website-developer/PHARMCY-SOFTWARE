import React, { useState, useEffect } from 'react';
import {
  BranchDto,
  StockTransferDto,
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
  Building2,
  ArrowRightLeft,
  DollarSign,
  Plus,
  RefreshCw,
  CheckCircle,
  Truck,
} from 'lucide-react';

export const BranchesAndTransfersPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || UserRole.CASHIER;
  const canManage = [UserRole.ADMIN as string, UserRole.PHARMACIST as string, UserRole.INVENTORY as string].includes(role);

  const [activeTab, setActiveTab] = useState<'branches' | 'transfers'>('branches');
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [transfers, setTransfers] = useState<StockTransferDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Branch Cash Book Modal
  const [selectedBranchCashBook, setSelectedBranchCashBook] = useState<any | null>(null);

  // New Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [sourceBranchId, setSourceBranchId] = useState<string>('br-main');
  const [destBranchId, setDestBranchId] = useState<string>('br-dha');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferItems, setTransferItems] = useState<
    Array<{
      productId: string;
      productName: string;
      sku: string;
      batchNumber: string;
      expiryDate: string;
      quantityInUnit: number;
      unitName: string;
      conversionFactor: number;
    }>
  >([
    {
      productId: 'prod-1',
      productName: 'Panadol 500mg',
      sku: 'MED-PAN-500',
      batchNumber: 'BT-PAN-2024-01',
      expiryDate: '2026-12',
      quantityInUnit: 5,
      unitName: 'Box',
      conversionFactor: 200,
    },
  ]);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bRes, tRes] = await Promise.all([
        apiFetch<any>('/api/branches'),
        apiFetch<any>('/api/branches/transfers'),
      ]);
      if (bRes.success) setBranches(bRes.data);
      if (tRes.success) setTransfers(tRes.data);
    } catch (err: any) {
      console.error('Failed to load branches and transfers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCashBook = async (branchId: string) => {
    try {
      const res = await apiFetch<any>(`/api/branches/${branchId}/cash-book`);
      if (res.success) {
        setSelectedBranchCashBook(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load branch cash book');
    }
  };

  const handleUpdateTransferStatus = async (
    transferId: string,
    status: 'DISPATCHED' | 'RECEIVED' | 'CANCELLED'
  ) => {
    try {
      const res = await apiFetch<any>(`/api/branches/transfers/${transferId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update transfer status');
    }
  };

  const handleCreateTransfer = async () => {
    if (sourceBranchId === destBranchId) {
      alert('Source and destination branches must be different.');
      return;
    }
    if (transferItems.length === 0) {
      alert('Please add at least one item to transfer.');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const res = await apiFetch<any>('/api/branches/transfers', {
        method: 'POST',
        body: JSON.stringify({
          sourceBranchId,
          destinationBranchId: destBranchId,
          notes: transferNotes,
          items: transferItems,
        }),
      });

      if (res.success) {
        setIsTransferModalOpen(false);
        setTransferNotes('');
        loadData();
        setActiveTab('transfers');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit stock transfer');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-pharma-white p-5 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pharma-accent" />
            <span className="text-xs text-pharma-primary font-semibold font-mono uppercase tracking-wider">
              Phase 3 • Enterprise Multi-Store Operations
            </span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-pharma-primary" />
            Multi-Branch Stock & Separate Cash Books
          </h2>
          <p className="text-xs text-pharma-muted mt-0.5">
            Central warehouse stock monitoring, inter-branch transfer requisitions, and independent till cash books per branch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex bg-pharma-surface p-1 rounded-lg border border-pharma-muted/30">
            <button
              onClick={() => setActiveTab('branches')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'branches'
                  ? 'bg-pharma-primary text-white shadow-xs'
                  : 'text-pharma-muted hover:text-pharma-text'
              }`}
            >
              Branch Tills & Cash Books ({branches.length})
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                activeTab === 'transfers'
                  ? 'bg-pharma-primary text-white shadow-xs'
                  : 'text-pharma-muted hover:text-pharma-text'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Stock Transfers ({transfers.length})
            </button>
          </div>

          {canManage && (
            <Button variant="primary" size="sm" onClick={() => setIsTransferModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New Transfer
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Tab 1: Branches & Cash Books ─────────────────────────────────────── */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {branches.map((b) => (
              <div
                key={b.id}
                className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold bg-pharma-surface px-2 py-0.5 rounded border border-pharma-muted/30 text-pharma-muted">
                      {b.code}
                    </span>
                    <Badge variant={b.isMainBranch ? 'primary' : 'active'} dot={false}>
                      {b.isMainBranch ? 'CENTRAL HUB' : 'RETAIL OUTLET'}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-sm text-pharma-text mt-2">{b.name}</h3>
                  <p className="text-xs text-pharma-muted mt-0.5">{b.address}</p>
                  <p className="text-[11px] text-pharma-muted font-mono mt-1">Phone: {b.phone}</p>

                  <div className="mt-4 pt-3 border-t border-pharma-muted/15 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pharma-muted">Physical Cash in Drawer:</span>
                      <strong className="font-mono text-emerald-700 font-bold">
                        {formatPaisaToPKR(b.currentCashPaisa)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pharma-muted">Today's Retail Sales:</span>
                      <strong className="font-mono text-pharma-primary font-bold">
                        {formatPaisaToPKR(b.todaySalesPaisa)}
                      </strong>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCashBook(b.id)}
                  className="w-full text-xs"
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  View Separate Cash Book
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 2: Stock Transfers ───────────────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-pharma-text flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-pharma-primary" />
              Inter-Branch Stock Transfers History ({transfers.length})
            </h3>
            <span className="text-xs text-pharma-muted">Audit trail with batch tracking</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>From (Source)</TableHead>
                <TableHead>To (Destination)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((trf) => (
                <TableRow key={trf.id} className="hover:bg-pharma-surface/50">
                  <TableCell className="font-mono font-bold text-xs text-pharma-text">
                    {trf.transferNumber}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-bold text-pharma-text">{trf.sourceBranchName}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-bold text-pharma-primary">{trf.destinationBranchName}</span>
                  </TableCell>
                  <TableCell className="text-xs text-pharma-muted">
                    {new Date(trf.createdAt).toLocaleDateString('en-GB')}
                    <div className="text-[10px] text-pharma-muted">{trf.createdByName}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {trf.items.map((it, idx) => (
                      <div key={idx} className="text-[11px] font-mono">
                        {it.productName} ({it.quantityInUnit} {it.unitName})
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        trf.status === 'RECEIVED'
                          ? 'active'
                          : trf.status === 'DISPATCHED'
                          ? 'primary'
                          : 'near-expiry'
                      }
                      dot={true}
                    >
                      {trf.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {trf.status === 'REQUESTED' && canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateTransferStatus(trf.id, 'DISPATCHED')}
                          className="text-xs h-7"
                        >
                          <Truck className="w-3 h-3 mr-1" />
                          Dispatch
                        </Button>
                      )}
                      {trf.status === 'DISPATCHED' && canManage && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateTransferStatus(trf.id, 'RECEIVED')}
                          className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Receive Stock
                        </Button>
                      )}
                      {trf.status === 'RECEIVED' && (
                        <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                          Completed
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Modal: Branch Cash Book ──────────────────────────────────────────── */}
      {selectedBranchCashBook && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-pharma-white rounded-pharma shadow-pharma-xl max-w-2xl w-full p-6 space-y-4 border border-pharma-muted/20">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-pharma-text flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Independent Branch Cash Book
                </h3>
                <p className="text-xs text-pharma-muted">
                  Branch: <strong>{selectedBranchCashBook.branch.name}</strong> ({selectedBranchCashBook.branch.code})
                </p>
              </div>
              <button
                onClick={() => setSelectedBranchCashBook(null)}
                className="text-pharma-muted hover:text-pharma-text text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Particulars / Transaction</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Amount (PKR)</TableHead>
                  <TableHead className="text-right">Closing Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedBranchCashBook.entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-mono text-pharma-muted">{e.time}</TableCell>
                    <TableCell className="text-xs font-medium text-pharma-text">{e.particulars}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={e.entryType === 'CASH_IN' ? 'active' : 'expired'} dot={false}>
                        {e.entryType}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-bold text-xs ${
                        e.entryType === 'CASH_IN' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatPaisaToPKR(e.amountPaisa)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-pharma-primary">
                      {formatPaisaToPKR(e.balanceAfterPaisa)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="text-xs text-pharma-muted">
                Physical Cash In Drawer:{' '}
                <strong className="text-emerald-700 font-mono font-bold">
                  {formatPaisaToPKR(selectedBranchCashBook.branch.currentCashPaisa)}
                </strong>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedBranchCashBook(null)}>
                Close Cash Book
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create Stock Transfer ─────────────────────────────────────── */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-pharma-white rounded-pharma shadow-pharma-xl max-w-xl w-full p-6 space-y-4 border border-pharma-muted/20">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-pharma-text flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-pharma-primary" />
                Inter-Branch Stock Transfer Requisition
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-pharma-muted hover:text-pharma-text text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-pharma-text block mb-1">
                    Source Branch (From):
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-pharma-muted/30 bg-pharma-surface"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-pharma-text block mb-1">
                    Destination Branch (To):
                  </label>
                  <select
                    value={destBranchId}
                    onChange={(e) => setDestBranchId(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-pharma-muted/30 bg-pharma-surface"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-pharma-text block mb-1">
                  Medicine to Dispatch:
                </label>
                <div className="p-3 bg-pharma-surface rounded-md border border-pharma-muted/20 text-xs space-y-1">
                  <div className="font-bold text-pharma-text">Panadol 500mg Tablet (Box of 200)</div>
                  <div className="text-[10px] text-pharma-muted font-mono">
                    SKU: MED-PAN-500 • Batch: BT-PAN-2024-01 • Expiry: 12/2026
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-pharma-muted">Quantity to Transfer:</span>
                    <Input
                      type="number"
                      min={1}
                      value={transferItems[0].quantityInUnit}
                      onChange={(e) =>
                        setTransferItems([
                          {
                            ...transferItems[0],
                            quantityInUnit: parseInt(e.target.value, 10) || 1,
                          },
                        ])
                      }
                      className="w-20 h-7 text-center font-mono font-bold text-xs"
                    />
                    <span className="text-xs text-pharma-muted font-mono">Boxes (1,000 tablets)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-pharma-text block mb-1">
                  Transfer Notes / Reason:
                </label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Replenishment requested for Saturday rush."
                  className="w-full text-xs p-2 rounded-md border border-pharma-muted/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateTransfer}
                disabled={isSubmittingTransfer}
              >
                {isSubmittingTransfer ? 'Dispatching...' : 'Submit Requisition'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
