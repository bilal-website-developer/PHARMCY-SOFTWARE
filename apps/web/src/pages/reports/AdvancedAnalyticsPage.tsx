import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AdvancedAnalyticsDto,
  formatPaisaToPKR,
} from '@pharmacy/shared';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
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
  Building,
  FolderTree,
  UserCheck,
  Download,
  RefreshCw,
  Clock,
  DollarSign,
  Package,
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

export const AdvancedAnalyticsPage: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<'company' | 'category' | 'cashier' | 'movers'>('company');

  const { data: analytics, isLoading, refetch } = useQuery<AdvancedAnalyticsDto>({
    queryKey: ['advanced-analytics', days],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/reports/advanced-analytics?days=${days}`);
      return res.data;
    },
  });

  const handleExport = () => {
    if (!analytics) return;
    if (activeTab === 'company') {
      exportToCsv(
        'analytics-by-company',
        analytics.byCompany.map((c) => ({
          Company: c.companyName,
          Products: c.productCount,
          UnitsSold: c.unitsSold,
          RevenuePKR: (c.revenuePaisa / 100).toFixed(2),
          CostPKR: (c.costPaisa / 100).toFixed(2),
          ProfitPKR: (c.grossProfitPaisa / 100).toFixed(2),
          MarginPct: `${c.marginPct}%`,
          TopProduct: c.topProduct,
        }))
      );
    } else if (activeTab === 'category') {
      exportToCsv(
        'analytics-by-category',
        analytics.byCategory.map((cat) => ({
          Category: cat.categoryName,
          Products: cat.productCount,
          UnitsSold: cat.unitsSold,
          RevenuePKR: (cat.revenuePaisa / 100).toFixed(2),
          CostPKR: (cat.costPaisa / 100).toFixed(2),
          ProfitPKR: (cat.grossProfitPaisa / 100).toFixed(2),
          MarginPct: `${cat.marginPct}%`,
        }))
      );
    } else if (activeTab === 'cashier') {
      exportToCsv(
        'analytics-by-cashier',
        analytics.byCashier.map((cs) => ({
          Cashier: cs.cashierName,
          Invoices: cs.invoiceCount,
          UnitsSold: cs.unitsSold,
          GrossSalesPKR: (cs.grossSalesPaisa / 100).toFixed(2),
          DiscountPKR: (cs.discountGivenPaisa / 100).toFixed(2),
          NetSalesPKR: (cs.netSalesPaisa / 100).toFixed(2),
          ProfitPKR: (cs.grossProfitPaisa / 100).toFixed(2),
          AvgBasketPKR: (cs.avgBasketPaisa / 100).toFixed(2),
          MarginPct: `${cs.marginPct}%`,
        }))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header Strip ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-pharma-white p-5 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pharma-accent" />
            <span className="text-xs text-pharma-primary font-semibold font-mono uppercase tracking-wider">
              Phase 3 • Deep Margin & Profitability Intelligence
            </span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text mt-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-pharma-primary" />
            Advanced Margin & Performance Analytics
          </h2>
          <p className="text-xs text-pharma-muted mt-0.5">
            Realized gross margins broken down by Pharmaceutical Manufacturer, Drug Category, and Cashier Till.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Window Buttons */}
          <div className="inline-flex rounded-lg border border-pharma-muted/30 p-0.5 bg-pharma-surface">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${days === d
                    ? 'bg-pharma-primary text-white shadow-xs'
                    : 'text-pharma-muted hover:text-pharma-text'
                  }`}
              >
                {d === 7 ? '7 Days' : d === 30 ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={!analytics}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm">
          <div className="flex items-center justify-between text-pharma-muted mb-1">
            <span className="text-[11px] font-medium uppercase">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-pharma-primary" />
          </div>
          <h3 className="text-xl font-bold font-mono text-pharma-text">
            {formatPaisaToPKR(analytics?.overallRevenuePaisa || 0)}
          </h3>
          <p className="text-[10px] text-pharma-muted mt-1">Total retail turnover</p>
        </div>

        <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm">
          <div className="flex items-center justify-between text-pharma-muted mb-1">
            <span className="text-[11px] font-medium uppercase">Realized Cost</span>
            <Package className="w-4 h-4 text-pharma-primary" />
          </div>
          <h3 className="text-xl font-bold font-mono text-pharma-text">
            {formatPaisaToPKR(analytics?.overallCostPaisa || 0)}
          </h3>
          <p className="text-[10px] text-pharma-muted mt-1">Cost of Goods Sold (COGS)</p>
        </div>

        <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm">
          <div className="flex items-center justify-between text-pharma-muted mb-1">
            <span className="text-[11px] font-medium uppercase">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold font-mono text-emerald-700">
            {formatPaisaToPKR(analytics?.overallProfitPaisa || 0)}
          </h3>
          <p className="text-[10px] text-pharma-muted mt-1">Revenue minus wholesale cost</p>
        </div>

        <div className="p-4 rounded-pharma bg-pharma-white border border-pharma-muted/20 shadow-sm">
          <div className="flex items-center justify-between text-pharma-muted mb-1">
            <span className="text-[11px] font-medium uppercase">Average Margin</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold font-mono text-pharma-primary">
            {analytics?.overallMarginPct ?? 0}%
          </h3>
          <p className="text-[10px] text-pharma-muted mt-1">Blended profit margin</p>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────────────────── */}
      <div className="flex border-b border-pharma-muted/20 gap-2">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${activeTab === 'company'
              ? 'border-pharma-primary text-pharma-primary'
              : 'border-transparent text-pharma-muted hover:text-pharma-text'
            }`}
        >
          <Building className="w-4 h-4" />
          Margin by Company / Manufacturer
        </button>

        <button
          onClick={() => setActiveTab('category')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${activeTab === 'category'
              ? 'border-pharma-primary text-pharma-primary'
              : 'border-transparent text-pharma-muted hover:text-pharma-text'
            }`}
        >
          <FolderTree className="w-4 h-4" />
          Margin by Drug Category
        </button>

        <button
          onClick={() => setActiveTab('cashier')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${activeTab === 'cashier'
              ? 'border-pharma-primary text-pharma-primary'
              : 'border-transparent text-pharma-muted hover:text-pharma-text'
            }`}
        >
          <UserCheck className="w-4 h-4" />
          Cashier & Counter Efficiency
        </button>

        <button
          onClick={() => setActiveTab('movers')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${activeTab === 'movers'
              ? 'border-pharma-primary text-pharma-primary'
              : 'border-transparent text-pharma-muted hover:text-pharma-text'
            }`}
        >
          <TrendingUp className="w-4 h-4" />
          Fast, Slow & Dead Stock
        </button>
      </div>

      {/* ── Tab 1: Margin by Company ─────────────────────────────────────────── */}
      {activeTab === 'company' && (
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-pharma-text">
              Manufacturer Profitability Matrix ({analytics?.byCompany.length || 0} Companies)
            </h3>
            <span className="text-xs text-pharma-muted">Sorted by revenue volume</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pharmaceutical Company</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue (PKR)</TableHead>
                <TableHead className="text-right">Cost (PKR)</TableHead>
                <TableHead className="text-right">Profit (PKR)</TableHead>
                <TableHead className="w-44 text-center">Profit Margin %</TableHead>
                <TableHead>Top Selling Product</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.byCompany.map((c) => (
                <TableRow key={c.companyId} className="hover:bg-pharma-surface/50">
                  <TableCell className="font-bold text-xs text-pharma-text">{c.companyName}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{c.productCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{c.unitsSold.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatPaisaToPKR(c.revenuePaisa)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-pharma-muted">{formatPaisaToPKR(c.costPaisa)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-emerald-700">
                    {formatPaisaToPKR(c.grossProfitPaisa)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-pharma-primary h-2 rounded-full"
                          style={{ width: `${Math.min(100, c.marginPct * 3)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-xs text-pharma-primary">{c.marginPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-pharma-muted font-medium">{c.topProduct}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab 2: Margin by Category ────────────────────────────────────────── */}
      {activeTab === 'category' && (
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-pharma-text">
              Therapeutic Category Margins ({analytics?.byCategory.length || 0} Categories)
            </h3>
            <span className="text-xs text-pharma-muted">Gross margin contribution</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug Category</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">COGS Cost</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="w-48 text-center">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.byCategory.map((cat) => (
                <TableRow key={cat.categoryId} className="hover:bg-pharma-surface/50">
                  <TableCell className="font-bold text-xs text-pharma-text">{cat.categoryName}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{cat.productCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{cat.unitsSold.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatPaisaToPKR(cat.revenuePaisa)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-pharma-muted">{formatPaisaToPKR(cat.costPaisa)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-emerald-700">
                    {formatPaisaToPKR(cat.grossProfitPaisa)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, cat.marginPct * 3)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-700">{cat.marginPct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab 3: Cashier Performance ───────────────────────────────────────── */}
      {activeTab === 'cashier' && (
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-pharma-text">
              Cashier & Dispensing Performance Matrix
            </h3>
            <span className="text-xs text-pharma-muted">Tracks average ticket size and discounts</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cashier / Dispenser</TableHead>
                <TableHead className="text-center">Invoices Handled</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Gross Sales</TableHead>
                <TableHead className="text-right">Discounts Given</TableHead>
                <TableHead className="text-right">Net Sales</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">Avg Basket Size</TableHead>
                <TableHead className="text-center">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.byCashier.map((cs) => (
                <TableRow key={cs.cashierId} className="hover:bg-pharma-surface/50">
                  <TableCell className="font-bold text-xs text-pharma-text">{cs.cashierName}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{cs.invoiceCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{cs.unitsSold.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatPaisaToPKR(cs.grossSalesPaisa)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-amber-700 font-semibold">
                    {formatPaisaToPKR(cs.discountGivenPaisa)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-pharma-primary">
                    {formatPaisaToPKR(cs.netSalesPaisa)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-emerald-700">
                    {formatPaisaToPKR(cs.grossProfitPaisa)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-pharma-muted">
                    {formatPaisaToPKR(cs.avgBasketPaisa)}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-xs text-pharma-primary">
                    {cs.marginPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab 4: Movers & Dead Stock ────────────────────────────────────────── */}
      {activeTab === 'movers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fast Movers */}
          <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-3">
            <h4 className="font-bold text-sm text-pharma-text flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Top Fast Movers (Highest Turn Velocity)
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.fastMovers.map((m) => (
                  <TableRow key={m.productId}>
                    <TableCell>
                      <div className="font-bold text-xs text-pharma-text">{m.productName}</div>
                      <div className="text-[10px] text-pharma-muted font-mono">{m.sku}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">{m.unitsSold}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-pharma-primary">
                      {formatPaisaToPKR(m.revenuePaisa)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-pharma-muted">{m.currentStock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Dead Stock */}
          <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-3">
            <h4 className="font-bold text-sm text-pharma-text flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Dead Stock & Capital Trapped (&gt; 90 Days No Sales)
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-center">Days Idle</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="text-right">Tied-Up Capital</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.deadStock.map((d) => (
                  <TableRow key={d.productId}>
                    <TableCell>
                      <div className="font-bold text-xs text-pharma-text">{d.productName}</div>
                      <div className="text-[10px] text-pharma-muted font-mono">Rack: {d.rackLocation}</div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold text-red-700">
                      {d.daysSinceLastSale}d
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{d.quantityInStock}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-red-600">
                      {formatPaisaToPKR(d.tiedUpCapitalPaisa)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
