import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserRole,
  ROLE_LABELS,
  formatPaisaToPKR,
  DashboardMetricsDto,
  AlertDto,
} from '@pharmacy/shared';
import { useAuthStore } from '../stores/authStore';
import { apiFetch } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/Table';
import {
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  Wallet,
  Sparkles,
  ClipboardCheck,
  RefreshCw,
  ExternalLink,
  Snowflake,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || UserRole.CASHIER;
  const isCashier = role === UserRole.CASHIER;

  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [alerts, setAlerts] = useState<AlertDto[]>([]);
  const [alertFilter, setAlertFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        apiFetch<any>('/api/reports/dashboard'),
        apiFetch<any>(`/api/reports/alerts${alertFilter !== 'ALL' ? `?type=${alertFilter}` : ''}`),
      ]);

      if (metricsRes.success) {
        setMetrics(metricsRes.data);
      }
      if (alertsRes.success) {
        setAlerts(alertsRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [alertFilter]);

  return (
    <div className="space-y-6">
      {/* ── Welcome & Header Banner ────────────────────────────────────────── */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
              Signed in as:
            </span>
            <Badge variant="role" dot={false}>
              {ROLE_LABELS[role]}
            </Badge>
            <span className="text-xs text-pharma-muted flex items-center gap-1 font-mono">
              • Integer Paisa Ledger Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text flex items-center gap-2">
            Welcome back, {user?.fullName}!
          </h2>
          <p className="text-xs text-pharma-muted mt-1">
            Real-time pharmacy metrics: Live sales, cash balance, near-expiry windows & intelligent stock warnings.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={loadDashboard} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link to="/pos">
            <Button variant="primary" size="sm">
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Open POS (F1)
            </Button>
          </Link>

          {!isCashier && (
            <>
              <Link to="/stocktake">
                <Button variant="outline" size="sm">
                  <ClipboardCheck className="w-4 h-4 mr-1.5" />
                  Stocktake
                </Button>
              </Link>
              <Link to="/batch-recall">
                <Button variant="outline" size="sm">
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Batch Recall
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Role Security Notice for Cashier ─────────────────────────────────── */}
      {isCashier && (
        <div className="p-4 rounded-pharma bg-pharma-surface border border-pharma-accent/40 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-pharma-primary shrink-0 mt-0.5" />
          <div className="text-xs text-pharma-text leading-relaxed">
            <strong className="font-bold">Role Enforcement Active (Cashier):</strong> Product costs, profit margins, and supplier purchase financials are automatically stripped by the server. Your interface is optimized for rapid sales counter operations.
          </div>
        </div>
      )}

      {/* ── KPI Metrics Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Sales */}
        <div className="pharma-panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pharma-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-full bg-pharma-primary/10 text-pharma-primary flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-pharma-text">
              {metrics ? formatPaisaToPKR(metrics.todaySalesNetPaisa) : 'Rs 0.00'}
            </div>
            <div className="text-[11px] text-pharma-muted mt-1 flex items-center justify-between">
              <span>{metrics?.todayInvoicesCount || 0} Invoices</span>
              <span className="text-pharma-primary font-semibold">Net Posted</span>
            </div>
          </div>
        </div>

        {/* Today's Profit (Hidden from Cashier) */}
        {!isCashier ? (
          <div className="pharma-panel p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-pharma-muted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Today's Profit</span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-emerald-700">
                {metrics ? formatPaisaToPKR(metrics.todayProfitPaisa) : 'Rs 0.00'}
              </div>
              <div className="text-[11px] text-pharma-muted mt-1">
                Gross Margin on Sold Units
              </div>
            </div>
          </div>
        ) : (
          <div className="pharma-panel p-4 flex flex-col justify-between opacity-70">
            <div className="flex items-center justify-between text-pharma-muted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Profit Margin</span>
              <ShieldAlert className="w-4 h-4 text-pharma-muted" />
            </div>
            <div>
              <div className="text-base font-bold text-pharma-muted">Restricted</div>
              <div className="text-[11px] text-pharma-muted mt-1">Admin/Pharmacist Only</div>
            </div>
          </div>
        )}

        {/* Cash in Drawer */}
        <div className="pharma-panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pharma-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cash in Drawer</span>
            <div className="w-8 h-8 rounded-full bg-pharma-primary/10 text-pharma-primary flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-pharma-text">
              {metrics ? formatPaisaToPKR(metrics.todayCashPaisa) : 'Rs 0.00'}
            </div>
            <div className="text-[11px] text-pharma-muted mt-1">
              Live Cash Book Balance
            </div>
          </div>
        </div>

        {/* Low Stock Count */}
        <div className="pharma-panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pharma-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock</span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-amber-700">
              {metrics?.lowStockCount || 0} Products
            </div>
            <div className="text-[11px] text-pharma-muted mt-1">
              At or below reorder level
            </div>
          </div>
        </div>

        {/* Expiring Value */}
        <div className="pharma-panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pharma-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring Value</span>
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-red-700">
              {metrics ? formatPaisaToPKR(metrics.totalExpiringValuePaisa) : 'Rs 0.00'}
            </div>
            <div className="text-[11px] text-pharma-muted mt-1">
              Within 6-Month Window
            </div>
          </div>
        </div>
      </div>

      {/* ── Near-Expiry Breakdown Strip ──────────────────────────────────────── */}
      <div className="pharma-panel p-4 bg-gradient-to-r from-red-50/50 via-amber-50/30 to-pharma-surface border border-red-200/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            <div>
              <h4 className="text-sm font-bold text-pharma-text">Near-Expiry Capital Watch (Windows: 1, 3, 6 Months)</h4>
              <p className="text-xs text-pharma-muted">Live stock inventory valuation exposed to expiry across regulatory horizons.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-pharma-white px-3 py-1.5 rounded border border-red-200 text-xs">
              <span className="text-red-700 font-bold">1 Month: </span>
              <span className="font-mono font-bold text-pharma-text">
                {metrics ? formatPaisaToPKR(metrics.expiringValue1mPaisa) : 'Rs 0.00'}
              </span>
            </div>
            <div className="bg-pharma-white px-3 py-1.5 rounded border border-amber-200 text-xs">
              <span className="text-amber-700 font-bold">3 Months: </span>
              <span className="font-mono font-bold text-pharma-text">
                {metrics ? formatPaisaToPKR(metrics.expiringValue3mPaisa) : 'Rs 0.00'}
              </span>
            </div>
            <div className="bg-pharma-white px-3 py-1.5 rounded border border-pharma-primary/20 text-xs">
              <span className="text-pharma-primary font-bold">6 Months: </span>
              <span className="font-mono font-bold text-pharma-text">
                {metrics ? formatPaisaToPKR(metrics.expiringValue6mPaisa) : 'Rs 0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Alerts + Top Sellers ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Alerts Stream (7 Cols) */}
        <div className="lg:col-span-7 pharma-panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pharma-muted/15 pb-3">
            <div>
              <h3 className="text-sm font-bold text-pharma-text flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Live Stock & Expiry Alerts ({alerts.length})
              </h3>
              <p className="text-xs text-pharma-muted">
                Computed from live batch inventory, reorder levels, cold chain and supplier price logs.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'LOW_STOCK', label: 'Low Stock' },
                { id: 'NEAR_EXPIRY_1M', label: '1m Expiry' },
                { id: 'NEAR_EXPIRY_3M', label: '3m Expiry' },
                { id: 'PRICE_INCREASE', label: 'Price Change' },
                { id: 'COLD_STORAGE', label: 'Fridge ❄️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAlertFilter(tab.id)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${alertFilter === tab.id
                      ? 'bg-pharma-primary text-white'
                      : 'bg-pharma-surface text-pharma-muted hover:text-pharma-text'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts List */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-pharma-muted">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-pharma-primary mb-2" />
              Checking live inventory conditions...
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-10 text-center text-xs text-pharma-muted">
              <Sparkles className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
              No active alerts matching current filter. All inventory parameters healthy!
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {alerts.map((alt) => {
                const isCrit = alt.severity === 'CRITICAL';
                const isWarn = alt.severity === 'WARNING';

                return (
                  <div
                    key={alt.id}
                    className={`p-3 rounded-pharma border flex items-start justify-between gap-3 transition-colors ${isCrit
                        ? 'bg-red-50/50 border-red-200'
                        : isWarn
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-pharma-surface border-pharma-muted/20'
                      }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCrit
                              ? 'bg-red-600 text-white'
                              : isWarn
                                ? 'bg-amber-600 text-white'
                                : 'bg-pharma-primary text-white'
                            }`}
                        >
                          {alt.severity}
                        </span>

                        <h4 className="text-xs font-bold text-pharma-text">{alt.title}</h4>

                        {/* Cold Storage Badge */}
                        {alt.isRefrigerated && (
                          <span className="text-[10px] font-bold bg-pharma-surface text-pharma-primary px-1.5 py-0.5 rounded flex items-center gap-1 border border-pharma-primary/20">
                            <Snowflake className="w-3 h-3 text-pharma-primary" />
                            Cold Storage (2-8°C)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-pharma-muted leading-relaxed">
                        {alt.message}
                      </p>

                      <div className="text-[11px] text-pharma-muted font-mono flex items-center gap-3 pt-1">
                        {alt.batchNumber && <span>Batch: <strong>{alt.batchNumber}</strong></span>}
                        {alt.currentStock !== undefined && (
                          <span>In-Stock: <strong>{alt.currentStock}</strong></span>
                        )}
                        {alt.daysToExpiry !== undefined && (
                          <span className={alt.daysToExpiry <= 30 ? 'text-red-700 font-bold' : ''}>
                            Expiry: {alt.daysToExpiry}d left
                          </span>
                        )}
                      </div>
                    </div>

                    <Link to={alt.linkPath}>
                      <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs">
                        View <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Top Selling Products (5 Cols) */}
        <div className="lg:col-span-5 pharma-panel space-y-4">
          <div className="border-b border-pharma-muted/15 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-pharma-text flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-pharma-primary" />
                Top Sellers Today
              </h3>
              <p className="text-xs text-pharma-muted">Ranked by revenue & units sold.</p>
            </div>
            <Link to="/reports">
              <span className="text-xs text-pharma-primary font-bold hover:underline flex items-center gap-1">
                Full Report <ExternalLink className="w-3 h-3" />
              </span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics?.topSellers && metrics.topSellers.length > 0 ? (
                  metrics.topSellers.map((seller, idx) => (
                    <TableRow key={seller.productId}>
                      <TableCell>
                        <div className="font-bold text-xs text-pharma-text flex items-center gap-1">
                          <span className="w-4 text-pharma-muted font-mono">{idx + 1}.</span>
                          {seller.productName}
                          {seller.isRefrigerated && (
                            <span title="Cold Storage (2-8°C)">
                              <Snowflake className="w-3 h-3 text-pharma-primary shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-pharma-muted font-mono pl-5">
                          {seller.sku}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs">
                        {seller.unitsSold}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-pharma-primary">
                        {formatPaisaToPKR(seller.revenuePaisa)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-pharma-muted py-6">
                      No sales recorded today yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Quick Shortcuts */}
          <div className="pt-2 border-t border-pharma-muted/15 space-y-2">
            <span className="text-[11px] font-bold text-pharma-muted uppercase tracking-wider">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link to="/stock" className="p-2 rounded bg-pharma-surface hover:bg-pharma-primary/10 border border-pharma-muted/20 flex items-center justify-between transition-colors">
                <span>Batch Expiry Stock</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-pharma-muted" />
              </Link>
              <Link to="/stocktake" className="p-2 rounded bg-pharma-surface hover:bg-pharma-primary/10 border border-pharma-muted/20 flex items-center justify-between transition-colors">
                <span>Physical Stocktake</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-pharma-muted" />
              </Link>
              <Link to="/batch-recall" className="p-2 rounded bg-pharma-surface hover:bg-pharma-primary/10 border border-pharma-muted/20 flex items-center justify-between transition-colors">
                <span>Batch Recall Trace</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-pharma-muted" />
              </Link>
              <Link to="/compliance" className="p-2 rounded bg-pharma-surface hover:bg-pharma-primary/10 border border-pharma-muted/20 flex items-center justify-between transition-colors">
                <span>Form 8 / Controlled Rx</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-pharma-muted" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
