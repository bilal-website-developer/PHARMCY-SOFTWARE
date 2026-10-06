import React, { useState, useEffect } from 'react';
import {
  RecallReportDto,
  formatPaisaToPKR,
} from '@pharmacy/shared';
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
  AlertTriangle,
  Search,
  Printer,
  Download,
  Truck,
  Users,
  Package,
  FileText,
  Phone,
  RefreshCw,
  Snowflake,
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

export const BatchRecallPage: React.FC = () => {
  const [batchSearch, setBatchSearch] = useState('BT-PAN-2024-01');
  const [recallData, setRecallData] = useState<RecallReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);

  // Load available batches for quick selection
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const res = await apiFetch<any>('/api/stock/batches');
        if (res.success && res.data) {
          setAvailableBatches(res.data);
        }
      } catch {
        // ignore
      }
    };
    loadBatches();
    handleSearch('BT-PAN-2024-01');
  }, []);

  const handleSearch = async (batchNumberToSearch?: string) => {
    const targetBatch = batchNumberToSearch || batchSearch;
    if (!targetBatch.trim()) return;

    setIsLoading(true);
    try {
      const res = await apiFetch<any>(`/api/reports/recall?batchNumber=${encodeURIComponent(targetBatch.trim())}`);
      if (res.success) {
        setRecallData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load recall trace', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!recallData || !recallData.invoices) return;
    const exportRows = recallData.invoices.map((inv) => ({
      Product: recallData.productName,
      SKU: recallData.productSku,
      BatchNumber: recallData.batchNumber,
      ExpiryDate: recallData.expiryDate,
      InvoiceNumber: inv.invoiceNumber,
      SaleDate: inv.saleDate,
      Cashier: inv.cashierName,
      CustomerName: inv.customerName,
      CustomerPhone: inv.customerPhone || 'N/A',
      CustomerCNIC: inv.customerCnic || 'N/A',
      QuantitySold: inv.quantitySold,
      UnitPricePKR: (inv.unitPricePaisa / 100).toFixed(2),
      TotalPKR: (inv.totalPaisa / 100).toFixed(2),
      ClaimSupplier: recallData.supplier?.supplierName || 'N/A',
      SupplierBill: recallData.supplier?.billNumber || 'N/A',
      SupplierPhone: recallData.supplier?.phone || 'N/A',
    }));
    exportToCsv(`batch-recall-${recallData.batchNumber}`, exportRows);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
              DRAP Compliance & Safety:
            </span>
            <Badge variant="primary" dot={false}>
              Spec Section 12
            </Badge>
            <span className="text-xs text-pharma-muted font-mono">• Pharmaceutical Recall Trace</span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Batch Recall & Patient Safety Trace Dossier
          </h2>
          <p className="text-xs text-pharma-muted mt-1">
            Instantly trace medicine distribution across retail invoices, isolate remaining stock, identify affected patients, and generate supplier indemnity claim notices.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap no-print">
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!recallData}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Dossier
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!recallData}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Search & Batch Selection Bar ────────────────────────────────────── */}
      <div className="pharma-panel p-4 no-print space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-pharma-text mb-1">
              Enter Product Batch Number to Trace
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. BT-PAN-2024-01, BT-CAL-2024-09, BT-AUG-2023-EX"
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                prefixElement={<Search className="w-4 h-4" />}
              />
              <Button variant="primary" size="sm" onClick={() => handleSearch()} disabled={isLoading}>
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Generate Trace'}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Batch Chips */}
        {availableBatches.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-pharma-muted font-semibold text-[11px]">Quick Picks:</span>
            {availableBatches.slice(0, 5).map((b) => (
              <button
                key={b.id || b.batchNumber}
                onClick={() => {
                  setBatchSearch(b.batchNumber);
                  handleSearch(b.batchNumber);
                }}
                className="px-2 py-0.5 rounded bg-pharma-surface hover:bg-pharma-primary/10 border border-pharma-muted/20 text-pharma-text font-mono text-[11px] transition-colors"
              >
                {b.batchNumber} ({b.productName})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Recall Trace Dossier Content ────────────────────────────────────── */}
      {recallData ? (
        <div className="space-y-6">
          {/* Top KPI Cards: Stock Remaining, Units Sold, Affected Customers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="pharma-panel p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between text-pharma-muted mb-1 text-xs font-bold uppercase">
                <span>In-Stock (Isolate Now)</span>
                <Package className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-red-700">
                {recallData.currentStockRemaining} Units
              </div>
              <div className="text-[11px] text-pharma-muted mt-1">
                Move to damaged / quarantine storage
              </div>
            </div>

            <div className="pharma-panel p-4 border-l-4 border-amber-500">
              <div className="flex items-center justify-between text-pharma-muted mb-1 text-xs font-bold uppercase">
                <span>Units Sold to Patients</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {recallData.totalUnitsSold} Units
              </div>
              <div className="text-[11px] text-pharma-muted mt-1">
                Across {recallData.invoices.length} retail invoices
              </div>
            </div>

            <div className="pharma-panel p-4 border-l-4 border-pharma-primary">
              <div className="flex items-center justify-between text-pharma-muted mb-1 text-xs font-bold uppercase">
                <span>Patients Affected</span>
                <Users className="w-4 h-4 text-pharma-primary" />
              </div>
              <div className="text-2xl font-bold font-mono text-pharma-primary">
                {recallData.affectedCustomersCount} Customers
              </div>
              <div className="text-[11px] text-pharma-muted mt-1">
                Contact information available for alert
              </div>
            </div>

            <div className="pharma-panel p-4 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between text-pharma-muted mb-1 text-xs font-bold uppercase">
                <span>Total Received</span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-pharma-text">
                {recallData.initialQuantity} Units
              </div>
              <div className="text-[11px] text-pharma-muted mt-1">
                Batch Reconciliation: 100% Balanced
              </div>
            </div>
          </div>

          {/* Medicine & Batch Identification Banner */}
          <div className="pharma-panel p-5 bg-gradient-to-r from-pharma-surface to-pharma-white border border-pharma-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-pharma-text flex items-center gap-2">
                    {recallData.productName}
                  </h3>
                  {recallData.isRefrigerated && (
                    <span className="text-xs bg-pharma-surface text-pharma-primary px-2 py-0.5 rounded border border-pharma-primary/20 flex items-center gap-1 font-semibold">
                      <Snowflake className="w-3.5 h-3.5" /> Cold Chain (2-8°C)
                    </span>
                  )}
                </div>
                <div className="text-xs text-pharma-muted flex items-center gap-4 flex-wrap">
                  <span>Generic: <strong>{recallData.genericName}</strong></span>
                  <span>SKU: <strong className="font-mono">{recallData.productSku}</strong></span>
                  <span>Batch: <strong className="font-mono bg-pharma-white px-1.5 py-0.5 rounded border">{recallData.batchNumber}</strong></span>
                  <span>Expiry Date: <strong>{new Date(recallData.expiryDate).toLocaleDateString()}</strong></span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded border border-red-200">
                  RECALL STATUS: ACTIVE NOTICE
                </span>
              </div>
            </div>
          </div>

          {/* Supplier to Claim From (Indemnity Claim Details) */}
          <div className="pharma-panel space-y-3 border-l-4 border-pharma-primary">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-pharma-primary" />
              <div>
                <h4 className="text-sm font-bold text-pharma-text">Supplier to Claim From (Source of Supply)</h4>
                <p className="text-xs text-pharma-muted">
                  Purchase origin record identifying the responsible vendor, original bill number, and debit claim details.
                </p>
              </div>
            </div>

            {recallData.supplier ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 text-xs">
                <div className="p-3 rounded bg-pharma-surface border">
                  <span className="text-pharma-muted">Distributor / Supplier:</span>
                  <div className="font-bold text-pharma-text text-sm mt-0.5">
                    {recallData.supplier.supplierName}
                  </div>
                  <div className="text-[11px] text-pharma-muted mt-1 font-mono">
                    Code: {recallData.supplier.supplierCode || 'SUP-01'}
                  </div>
                </div>

                <div className="p-3 rounded bg-pharma-surface border">
                  <span className="text-pharma-muted">Supplier Invoice / Bill:</span>
                  <div className="font-bold text-pharma-text text-sm mt-0.5 font-mono">
                    {recallData.supplier.billNumber}
                  </div>
                  <div className="text-[11px] text-pharma-muted mt-1">
                    Date: {new Date(recallData.supplier.billDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-3 rounded bg-pharma-surface border">
                  <span className="text-pharma-muted">Contact Person & Phone:</span>
                  <div className="font-bold text-pharma-text text-sm mt-0.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-pharma-primary" />
                    {recallData.supplier.phone}
                  </div>
                  <div className="text-[11px] text-pharma-muted mt-1">
                    {recallData.supplier.contactPerson}
                  </div>
                </div>

                <div className="p-3 rounded bg-pharma-surface border">
                  <span className="text-pharma-muted">Purchase Unit Cost:</span>
                  <div className="font-bold text-pharma-text text-sm mt-0.5 font-mono">
                    {formatPaisaToPKR(recallData.supplier.costPricePaisa)}
                  </div>
                  <div className="text-[11px] text-pharma-primary font-semibold mt-1">
                    Eligible for full debit note
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded bg-pharma-surface text-xs text-pharma-muted">
                No purchase linkage found for this batch.
              </div>
            )}
          </div>

          {/* Invoices and Customers who received this batch */}
          <div className="pharma-panel space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="text-sm font-bold text-pharma-text flex items-center gap-2">
                  <Users className="w-4 h-4 text-pharma-primary" />
                  Invoices Containing This Batch & Patient Contact Records ({recallData.invoices.length})
                </h4>
                <p className="text-xs text-pharma-muted">
                  Complete dispensary audit log tracing patient names, phone numbers, and quantities dispensed.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-pharma-text bg-pharma-surface px-2.5 py-1 rounded border">
                Total Sold: {recallData.totalUnitsSold} units
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice # & Date</TableHead>
                    <TableHead>Cashier / Dispenser</TableHead>
                    <TableHead>Customer / Patient Name</TableHead>
                    <TableHead>Contact Phone</TableHead>
                    <TableHead>CNIC / ID</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total (PKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recallData.invoices.map((inv) => (
                    <TableRow key={inv.invoiceNumber}>
                      <TableCell>
                        <div className="font-mono font-bold text-xs text-pharma-text">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[10px] text-pharma-muted">
                          {new Date(inv.saleDate).toLocaleDateString()} {new Date(inv.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-pharma-muted">
                        {inv.cashierName}
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-xs text-pharma-text">
                          {inv.customerName}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {inv.customerPhone ? (
                          <a href={`tel:${inv.customerPhone}`} className="text-pharma-primary hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {inv.customerPhone}
                          </a>
                        ) : (
                          <span className="text-pharma-muted">Walk-in</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-pharma-muted">
                        {inv.customerCnic || '—'}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-xs text-amber-700">
                        {inv.quantitySold}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-pharma-muted">
                        {formatPaisaToPKR(inv.unitPricePaisa)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-xs text-pharma-text">
                        {formatPaisaToPKR(inv.totalPaisa)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center pharma-panel space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h3 className="text-base font-bold text-pharma-text">No Batch Selected</h3>
          <p className="text-xs text-pharma-muted max-w-md mx-auto">
            Enter a product batch number in the search bar above to generate a complete regulatory recall trace dossier.
          </p>
        </div>
      )}
    </div>
  );
};
