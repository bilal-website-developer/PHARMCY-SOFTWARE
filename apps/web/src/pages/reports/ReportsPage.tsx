import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  Percent,
  RotateCcw,
  ShieldAlert,
  Truck,
  Hourglass,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import {
  formatPaisaToPKR,
  formatDateDDMMYYYY,
  UserRole,
  DailySalesSummaryDto,
  ProductSalesDto,
  CashierSalesDto,
  DiscountAuditDto,
  ReturnReportDto,
  StockPositionDto,
  ExpiryReportDto,
  AuditLogDto,
  PurchaseReportItemDto,
  DeadStockItemDto,
  MovementSpeedItemDto,
  ComplianceSummaryDto,
} from '@pharmacy/shared';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

type ReportTab =
  | 'daily-sales'
  | 'products'
  | 'purchases'
  | 'dead-stock'
  | 'fast-slow-movers'
  | 'compliance'
  | 'cashiers'
  | 'discounts'
  | 'returns'
  | 'stock-position'
  | 'expiry'
  | 'audit';

// Helper to download arrays as CSV
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

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isCashier = user?.role === UserRole.CASHIER;

  const [activeTab, setActiveTab] = useState<ReportTab>('daily-sales');
  const [datePreset] = useState<'today' | '7days' | '30days'>('30days');
  const [auditFilterAction, setAuditFilterAction] = useState('');

  // 1. Daily Sales
  const { data: dailySalesData } = useQuery<{
    success: boolean;
    data: DailySalesSummaryDto[];
  }>({
    queryKey: ['reports-daily', datePreset],
    queryFn: () => apiFetch('/api/reports/daily-sales'),
    enabled: activeTab === 'daily-sales',
  });

  // 2. Products Sales
  const { data: productsData } = useQuery<{
    success: boolean;
    data: ProductSalesDto[];
  }>({
    queryKey: ['reports-products'],
    queryFn: () => apiFetch('/api/reports/sales-by-product'),
    enabled: activeTab === 'products',
  });

  // 3. Cashiers
  const { data: cashiersData } = useQuery<{
    success: boolean;
    data: CashierSalesDto[];
  }>({
    queryKey: ['reports-cashiers'],
    queryFn: () => apiFetch('/api/reports/sales-by-cashier'),
    enabled: activeTab === 'cashiers',
  });

  // 4. Discounts
  const { data: discountsData } = useQuery<{
    success: boolean;
    data: DiscountAuditDto[];
  }>({
    queryKey: ['reports-discounts'],
    queryFn: () => apiFetch('/api/reports/discounts'),
    enabled: activeTab === 'discounts',
  });

  // 5. Returns
  const { data: returnsData } = useQuery<{
    success: boolean;
    data: ReturnReportDto[];
  }>({
    queryKey: ['reports-returns'],
    queryFn: () => apiFetch('/api/reports/returns'),
    enabled: activeTab === 'returns',
  });

  // 6. Stock Position
  const { data: stockData } = useQuery<{
    success: boolean;
    data: StockPositionDto[];
  }>({
    queryKey: ['reports-stock'],
    queryFn: () => apiFetch('/api/reports/stock-position'),
    enabled: activeTab === 'stock-position',
  });

  // 7. Expiry
  const { data: expiryData } = useQuery<{
    success: boolean;
    data: ExpiryReportDto[];
  }>({
    queryKey: ['reports-expiry'],
    queryFn: () => apiFetch('/api/reports/expiry'),
    enabled: activeTab === 'expiry',
  });

  // 8. Audit Trail (Admin only)
  const { data: auditData } = useQuery<{
    success: boolean;
    data: AuditLogDto[];
  }>({
    queryKey: ['reports-audit', auditFilterAction],
    queryFn: () =>
      apiFetch(
        `/api/audit${auditFilterAction ? `?action=${encodeURIComponent(auditFilterAction)}` : ''}`
      ),
    enabled: activeTab === 'audit' && isAdmin,
  });

  // 9. Purchases Summary (Phase 2C)
  const { data: purchasesData } = useQuery<{
    success: boolean;
    data: PurchaseReportItemDto[];
  }>({
    queryKey: ['reports-purchases'],
    queryFn: () => apiFetch('/api/reports/purchases-summary'),
    enabled: activeTab === 'purchases',
  });

  // 10. Dead Stock (Phase 2C)
  const { data: deadStockData } = useQuery<{
    success: boolean;
    data: DeadStockItemDto[];
  }>({
    queryKey: ['reports-dead-stock'],
    queryFn: () => apiFetch('/api/reports/dead-stock'),
    enabled: activeTab === 'dead-stock',
  });

  // 11. Fast / Slow Movers (Phase 2C)
  const { data: moversData } = useQuery<{
    success: boolean;
    data: MovementSpeedItemDto[];
  }>({
    queryKey: ['reports-movers'],
    queryFn: () => apiFetch('/api/reports/fast-slow-movers'),
    enabled: activeTab === 'fast-slow-movers',
  });

  // 12. Compliance Summary (Phase 2C)
  const { data: complianceData } = useQuery<{
    success: boolean;
    data: ComplianceSummaryDto;
  }>({
    queryKey: ['reports-compliance'],
    queryFn: () => apiFetch('/api/reports/compliance-summary'),
    enabled: activeTab === 'compliance',
  });

  // Handle Export
  const handleExportCurrentTab = () => {
    switch (activeTab) {
      case 'daily-sales':
        exportToCsv(
          'daily-sales-report',
          (dailySalesData?.data || []).map((r) => ({
            Date: r.date,
            Invoices: r.invoiceCount,
            Gross_PKR: (r.grossSalesPaisa / 100).toFixed(2),
            Discount_PKR: (r.discountPaisa / 100).toFixed(2),
            Net_PKR: (r.netSalesPaisa / 100).toFixed(2),
            Cash_PKR: (r.cashPaisa / 100).toFixed(2),
            Card_PKR: (r.cardPaisa / 100).toFixed(2),
            Digital_PKR: (r.digitalPaisa / 100).toFixed(2),
            Refunds_PKR: (r.returnedPaisa / 100).toFixed(2),
          }))
        );
        break;
      case 'products':
        exportToCsv(
          'product-sales-report',
          (productsData?.data || []).map((p) => ({
            SKU: p.sku,
            Product: p.productName,
            Packs_Sold: p.unitsSold,
            Base_Units: p.baseUnitsSold,
            Revenue_PKR: (p.revenuePaisa / 100).toFixed(2),
            Returns: p.returnQty,
          }))
        );
        break;
      case 'cashiers':
        exportToCsv(
          'cashier-performance',
          (cashiersData?.data || []).map((c) => ({
            Cashier: c.cashierName,
            Bills_Processed: c.invoiceCount,
            Total_Sales_PKR: (c.totalSalesPaisa / 100).toFixed(2),
            Total_Discounts_PKR: (c.totalDiscountPaisa / 100).toFixed(2),
            Average_Bill_PKR: (c.averageBillPaisa / 100).toFixed(2),
          }))
        );
        break;
      case 'stock-position':
        exportToCsv(
          'stock-valuation-report',
          (stockData?.data || []).map((s) => ({
            SKU: s.sku,
            Medicine: s.name,
            On_Hand: s.currentStock,
            MRP_Per_Unit: (s.mrpPaisa / 100).toFixed(2),
            Total_MRP_Valuation_PKR: (s.totalMrpValuePaisa / 100).toFixed(2),
            Low_Stock: s.isLowStock ? 'YES' : 'NO',
          }))
        );
        break;
      case 'expiry':
        exportToCsv(
          'expiry-watchlist',
          (expiryData?.data || []).map((e) => ({
            Medicine: e.productName,
            Batch: e.batchNumber,
            Expiry_Date: formatDateDDMMYYYY(e.expiryDate),
            Days_Remaining: e.daysToExpiry,
            Remaining_Stock: e.quantity,
            Status: e.status,
          }))
        );
        break;
      case 'audit':
        exportToCsv(
          'audit-log-export',
          (auditData?.data || []).map((a) => ({
            Timestamp: a.createdAt,
            User: a.userName,
            Role: a.role,
            Action: a.action,
            Entity: a.entity,
            Entity_ID: a.entityId,
            Reason: a.reason,
          }))
        );
        break;
      case 'purchases':
        exportToCsv(
          'purchase-summary',
          (purchasesData?.data || []).map((p) => ({
            Bill_Number: p.billNumber,
            Date: p.billDate,
            Supplier: p.supplierName,
            Supplier_Code: p.supplierCode,
            Items: p.itemCount,
            Total_PKR: ((p.totalAmountPaisa || 0) / 100).toFixed(2),
            Discount_PKR: ((p.discountPaisa || 0) / 100).toFixed(2),
            Net_Payable_PKR: ((p.netPayablePaisa || 0) / 100).toFixed(2),
            Paid_PKR: ((p.paidAmountPaisa || 0) / 100).toFixed(2),
            Balance_PKR: ((p.balanceDuePaisa || 0) / 100).toFixed(2),
            Status: p.status,
          }))
        );
        break;
      case 'dead-stock':
        exportToCsv(
          'dead-stock-report',
          (deadStockData?.data || []).map((d) => ({
            SKU: d.sku,
            Product: d.productName,
            Generic: d.genericName,
            Rack: d.rackLocation,
            Stock: d.quantityInStock,
            Days_Stagnant: d.daysSinceLastSale,
            Cost_Per_Unit_PKR: ((d.unitCostPricePaisa || 0) / 100).toFixed(2),
            Tied_Up_Capital_PKR: ((d.tiedUpCapitalPaisa || 0) / 100).toFixed(2),
            Last_Sale: d.lastSaleDate ? new Date(d.lastSaleDate).toLocaleDateString() : 'Never',
            Refrigerated: d.isRefrigerated ? 'YES' : 'NO',
          }))
        );
        break;
      case 'fast-slow-movers':
        exportToCsv(
          'fast-slow-movers',
          (moversData?.data || []).map((m) => ({
            SKU: m.sku,
            Product: m.productName,
            Units_Sold: m.unitsSold,
            Revenue_PKR: ((m.revenuePaisa || 0) / 100).toFixed(2),
            Current_Stock: m.currentStock,
            Monthly_Velocity: m.monthlyVelocity,
            Category: m.category,
            Refrigerated: m.isRefrigerated ? 'YES' : 'NO',
          }))
        );
        break;
      case 'compliance':
        if (complianceData?.data) {
          exportToCsv('compliance-summary', [{
            Start_Date: complianceData.data.dateRange.startDate,
            End_Date: complianceData.data.dateRange.endDate,
            Controlled_Drug_Entries: complianceData.data.controlledDrugEntriesCount,
            Narcotic_Inflow: complianceData.data.controlledNarcoticInflow,
            Narcotic_Outflow: complianceData.data.controlledNarcoticOutflow,
            Psychotropic_Inflow: complianceData.data.controlledPsychotropicInflow,
            Psychotropic_Outflow: complianceData.data.controlledPsychotropicOutflow,
            Prescriptions_Captured: complianceData.data.prescriptionsCapturedCount,
            Prescriptions_Verified: complianceData.data.prescriptionsVerifiedCount,
            PMDC_Verified: complianceData.data.doctorPmdcVerifiedCount,
            Audit_Events: complianceData.data.auditEventsCount,
            Cold_Storage_Compliance_Pct: complianceData.data.coldStorageCheckCompliancePct,
          }]);
        }
        break;

    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pharma-text flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-pharma-primary" />
            Pharmacy Analytics & Audit Reports
          </h1>
          <p className="text-xs text-pharma-muted mt-0.5">
            Operational summaries, financial breakdown, inventory valuation, expiry watch, and immutable system audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print View
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportCurrentTab}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Tab Selector ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-pharma-surface">
        <button
          onClick={() => setActiveTab('daily-sales')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'daily-sales'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Daily Sales & Revenue
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'products'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Sales by Product
        </button>

        <button
          onClick={() => setActiveTab('cashiers')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'cashiers'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Cashier Performance
        </button>

        <button
          onClick={() => setActiveTab('discounts')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'discounts'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          Discounts Audit
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'returns'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Returns Summary
        </button>

        <button
          onClick={() => setActiveTab('stock-position')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'stock-position'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Stock Valuation
        </button>

        <button
          onClick={() => setActiveTab('expiry')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'expiry'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Expiry Watchlist
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'audit'
                ? 'bg-pharma-primary text-white shadow-sm'
                : 'text-pharma-muted hover:bg-pharma-surface'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Immutable Audit Trail
          </button>
        )}

        {/* ── Phase 2C Tabs ── */}
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'purchases'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Purchase Summary
        </button>

        <button
          onClick={() => setActiveTab('dead-stock')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'dead-stock'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <Hourglass className="w-3.5 h-3.5" />
          Dead Stock
        </button>

        <button
          onClick={() => setActiveTab('fast-slow-movers')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'fast-slow-movers'
              ? 'bg-pharma-primary text-white shadow-sm'
              : 'text-pharma-muted hover:bg-pharma-surface'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Fast / Slow Movers
        </button>

        {(isAdmin || user?.role === UserRole.PHARMACIST) && (
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'compliance'
                ? 'bg-pharma-primary text-white shadow-sm'
                : 'text-pharma-muted hover:bg-pharma-surface'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Compliance Summary
          </button>
        )}
      </div>

      {/* ── TAB 1: DAILY SALES ── */}
      {activeTab === 'daily-sales' && (
        <div className="space-y-4">
          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
              <span className="text-xs font-bold text-pharma-text">Daily Sales & Tender Breakdown</span>
              <span className="text-xs text-pharma-muted">
                {dailySalesData?.data?.length || 0} days recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-center">Invoices</th>
                    <th className="py-2.5 px-4 text-right">Gross Sales</th>
                    <th className="py-2.5 px-4 text-right">Discounts</th>
                    <th className="py-2.5 px-4 text-right font-bold text-pharma-primary">Net Collection</th>
                    <th className="py-2.5 px-4 text-right">Cash</th>
                    <th className="py-2.5 px-4 text-right">Card</th>
                    <th className="py-2.5 px-4 text-right">JazzCash / EasyPaisa</th>
                    <th className="py-2.5 px-4 text-right text-pharma-danger">Refunds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pharma-surface">
                  {dailySalesData?.data?.map((row) => (
                    <tr key={row.date} className="hover:bg-pharma-surface/30">
                      <td className="py-2.5 px-4 font-medium text-pharma-text">{row.date}</td>
                      <td className="py-2.5 px-4 text-center font-mono">{row.invoiceCount}</td>
                      <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(row.grossSalesPaisa)}</td>
                      <td className="py-2.5 px-4 text-right text-pharma-muted">
                        -{formatPaisaToPKR(row.discountPaisa)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-pharma-primary">
                        {formatPaisaToPKR(row.netSalesPaisa)}
                      </td>
                      <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(row.cashPaisa)}</td>
                      <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(row.cardPaisa)}</td>
                      <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(row.digitalPaisa)}</td>
                      <td className="py-2.5 px-4 text-right text-pharma-danger">
                        -{formatPaisaToPKR(row.returnedPaisa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PRODUCTS ── */}
      {activeTab === 'products' && (
        <div className="pharma-card overflow-hidden">
          <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
            <span className="text-xs font-bold text-pharma-text">Top Selling Products by Revenue</span>
            <span className="text-xs text-pharma-muted">
              {productsData?.data?.length || 0} products
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4 text-center">Packs Sold</th>
                  <th className="py-2.5 px-4 text-center">Base Units</th>
                  <th className="py-2.5 px-4 text-right font-bold text-pharma-primary">Revenue</th>
                  <th className="py-2.5 px-4 text-right">Discounts</th>
                  <th className="py-2.5 px-4 text-center">Returns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pharma-surface">
                {productsData?.data?.map((p) => (
                  <tr key={p.productId} className="hover:bg-pharma-surface/30">
                    <td className="py-2.5 px-4 font-bold text-pharma-text">{p.productName}</td>
                    <td className="py-2.5 px-4 font-mono text-pharma-muted">{p.sku}</td>
                    <td className="py-2.5 px-4 text-center font-semibold">{p.unitsSold}</td>
                    <td className="py-2.5 px-4 text-center text-pharma-muted">{p.baseUnitsSold}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-pharma-primary">
                      {formatPaisaToPKR(p.revenuePaisa)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-pharma-muted">
                      -{formatPaisaToPKR(p.discountPaisa)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {p.returnQty > 0 ? (
                        <Badge variant="quarantine">{p.returnQty} units</Badge>
                      ) : (
                        <span className="text-pharma-muted">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: CASHIERS ── */}
      {activeTab === 'cashiers' && (
        <div className="pharma-card overflow-hidden">
          <div className="p-4 border-b border-pharma-surface">
            <span className="text-xs font-bold text-pharma-text">Cashier Billing Performance</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Cashier Name</th>
                  <th className="py-2.5 px-4 text-center">Bills Processed</th>
                  <th className="py-2.5 px-4 text-right font-bold text-pharma-primary">Total Collection</th>
                  <th className="py-2.5 px-4 text-right">Discounts Authorized</th>
                  <th className="py-2.5 px-4 text-right">Average Bill Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pharma-surface">
                {cashiersData?.data?.map((c) => (
                  <tr key={c.cashierId} className="hover:bg-pharma-surface/30">
                    <td className="py-2.5 px-4 font-bold text-pharma-text">{c.cashierName}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium">{c.invoiceCount}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-pharma-primary">
                      {formatPaisaToPKR(c.totalSalesPaisa)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-pharma-muted">
                      {formatPaisaToPKR(c.totalDiscountPaisa)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {formatPaisaToPKR(c.averageBillPaisa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: DISCOUNTS ── */}
      {activeTab === 'discounts' && (
        <div className="pharma-card overflow-hidden">
          <div className="p-4 border-b border-pharma-surface flex justify-between items-center">
            <span className="text-xs font-bold text-pharma-text">Invoices with Applied Discounts</span>
            <span className="text-xs text-pharma-muted">Audited against role threshold limits</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Cashier</th>
                  <th className="py-2.5 px-4 text-right">Bill Total</th>
                  <th className="py-2.5 px-4 text-right font-bold text-pharma-danger">Discount Given</th>
                  <th className="py-2.5 px-4 text-center">Discount %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pharma-surface">
                {discountsData?.data?.map((d) => (
                  <tr key={d.invoiceNumber} className="hover:bg-pharma-surface/30">
                    <td className="py-2.5 px-4 font-mono font-bold text-pharma-primary">
                      {d.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-4 text-pharma-muted">{formatDateDDMMYYYY(d.saleDate)}</td>
                    <td className="py-2.5 px-4">{d.cashierName}</td>
                    <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(d.grandTotalPaisa)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-pharma-danger">
                      -{formatPaisaToPKR(d.discountPaisa)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {d.discountPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: RETURNS ── */}
      {activeTab === 'returns' && (
        <div className="pharma-card overflow-hidden">
          <div className="p-4 border-b border-pharma-surface">
            <span className="text-xs font-bold text-pharma-text">Sales Returns & Refunds Audit</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Return #</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Cashier</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4 text-right font-bold text-pharma-danger">Refund Amount</th>
                  <th className="py-2.5 px-4 text-center">Disposition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pharma-surface">
                {returnsData?.data?.map((r) => (
                  <tr key={r.returnNumber} className="hover:bg-pharma-surface/30">
                    <td className="py-2.5 px-4 font-mono font-bold text-pharma-primary">
                      {r.returnNumber}
                    </td>
                    <td className="py-2.5 px-4 text-pharma-muted">{formatDateDDMMYYYY(r.returnDate)}</td>
                    <td className="py-2.5 px-4 font-mono">{r.saleInvoiceNumber || 'No Invoice'}</td>
                    <td className="py-2.5 px-4">{r.cashierName}</td>
                    <td className="py-2.5 px-4 max-w-xs truncate">{r.reason}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-pharma-danger">
                      -{formatPaisaToPKR(r.totalRefundPaisa)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-pharma-surface font-medium">
                        {r.restockedCount} Restocked / {r.quarantinedCount} Quarantined
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: STOCK VALUATION ── */}
      {activeTab === 'stock-position' && (
        <div className="pharma-card overflow-hidden">
          <div className="p-4 border-b border-pharma-surface flex justify-between items-center">
            <span className="text-xs font-bold text-pharma-text">Current Stock Position & Valuation</span>
            {!isCashier && (
              <span className="text-xs text-pharma-muted">
                Valuations based on integer paisa unit costs
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Medicine</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4 text-center">On-Hand Stock</th>
                  <th className="py-2.5 px-4 text-right">MRP per Unit</th>
                  <th className="py-2.5 px-4 text-right font-bold text-pharma-primary">Total MRP Value</th>
                  {!isCashier && (
                    <th className="py-2.5 px-4 text-right text-pharma-muted">Cost Value</th>
                  )}
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pharma-surface">
                {stockData?.data?.map((s) => (
                  <tr key={s.productId} className="hover:bg-pharma-surface/30">
                    <td className="py-2.5 px-4 font-bold text-pharma-text">{s.name}</td>
                    <td className="py-2.5 px-4 font-mono text-pharma-muted">{s.sku}</td>
                    <td className="py-2.5 px-4 text-center font-bold">{s.currentStock}</td>
                    <td className="py-2.5 px-4 text-right">{formatPaisaToPKR(s.mrpPaisa)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-pharma-primary">
                      {formatPaisaToPKR(s.totalMrpValuePaisa)}
                    </td>
                    {!isCashier && (
                      <td className="py-2.5 px-4 text-right text-pharma-muted">
                        {s.totalCostValuePaisa ? formatPaisaToPKR(s.totalCostValuePaisa) : '—'}
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-center">
                      {s.isLowStock ? (
                        <Badge variant="expired">Low Stock</Badge>
                      ) : (
                        <Badge variant="active">Normal</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 7: EXPIRY WATCHLIST ── */}
      {activeTab === 'expiry' && (
        <div className="pharma-card overflow-hidden">
          <div className="p-4 border-b border-pharma-surface flex justify-between items-center">
            <span className="text-xs font-bold text-pharma-text">Near-Expiry & Expired Batches</span>
            <span className="text-xs text-pharma-danger font-medium">
              Batches expiring within alert window
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Medicine</th>
                  <th className="py-2.5 px-4">Batch #</th>
                  <th className="py-2.5 px-4">Expiry Date</th>
                  <th className="py-2.5 px-4 text-center">Days Left</th>
                  <th className="py-2.5 px-4 text-center">Stock Left</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right text-pharma-danger font-bold">At-Risk Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pharma-surface">
                {expiryData?.data?.map((e) => (
                  <tr key={e.batchId} className="hover:bg-pharma-surface/30">
                    <td className="py-2.5 px-4 font-bold text-pharma-text">{e.productName}</td>
                    <td className="py-2.5 px-4 font-mono">{e.batchNumber}</td>
                    <td className="py-2.5 px-4 text-pharma-muted">{formatDateDDMMYYYY(e.expiryDate)}</td>
                    <td className="py-2.5 px-4 text-center font-bold">
                      {e.daysToExpiry <= 0 ? (
                        <span className="text-pharma-danger">EXPIRED</span>
                      ) : (
                        `${e.daysToExpiry} days`
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold">{e.quantity}</td>
                    <td className="py-2.5 px-4 text-center">
                      {e.status === 'EXPIRED' ? (
                        <Badge variant="expired">EXPIRED</Badge>
                      ) : (
                        <Badge variant="near-expiry">NEAR EXPIRY</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-pharma-danger">
                      {formatPaisaToPKR(e.lossValuePaisa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 8: IMMUTABLE AUDIT TRAIL (Admin Only) ── */}
      {activeTab === 'audit' && isAdmin && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter by action (e.g. POST_SALE, SALE_RETURN, VOID_SALE, UPDATE_PRICE)..."
              value={auditFilterAction}
              onChange={(e) => setAuditFilterAction(e.target.value)}
              className="bg-white border border-pharma-muted/30 rounded-lg px-3 py-1.5 text-xs flex-1 max-w-md outline-none focus:ring-1 focus:ring-pharma-primary"
            />
          </div>

          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex justify-between items-center">
              <span className="text-xs font-bold text-pharma-text">Immutable Audit Ledger</span>
              <span className="text-xs text-pharma-muted">
                System records every financial, price, and stock modification
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4">Reason / Notes</th>
                    <th className="py-2.5 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pharma-surface">
                  {auditData?.data?.map((a) => (
                    <tr key={a.id} className="hover:bg-pharma-surface/30">
                      <td className="py-2.5 px-4 text-pharma-muted font-mono text-[11px]">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-pharma-text">{a.userName || 'System'}</span>
                        {a.role && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.2 bg-pharma-surface rounded text-pharma-primary">
                            {a.role}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-pharma-primary">{a.action}</td>
                      <td className="py-2.5 px-4 text-pharma-muted font-mono">{a.entity}</td>
                      <td className="py-2.5 px-4 max-w-xs truncate text-pharma-text">
                        {a.reason || (a.newValue ? JSON.stringify(a.newValue) : '—')}
                      </td>
                      <td className="py-2.5 px-4 text-pharma-muted font-mono text-[11px]">
                        {a.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
