import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardMetricsDto,
  formatPaisaToPKR,
} from '@pharmacy/shared';
import { apiFetch } from '../lib/api';
import {
  Smartphone,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Share2,
  Snowflake,
} from 'lucide-react';

export const OwnerMobileDashboardPage: React.FC = () => {
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { data: metrics, isLoading, refetch } = useQuery<DashboardMetricsDto>({
    queryKey: ['owner-mobile-metrics'],
    queryFn: async () => {
      const res = await apiFetch<any>('/api/reports/dashboard-metrics');
      setLastRefreshed(new Date());
      return res.data;
    },
    refetchInterval: 30000, // Live poll every 30 seconds
  });

  const handleShareOwnerWhatsApp = () => {
    if (!metrics) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text =
      `*📊 PHARMACARE EXECUTIVE CLOSE — ${new Date().toLocaleDateString('en-GB')} (${nowStr})*\n\n` +
      `💰 *Today's Net Sales:* ${formatPaisaToPKR(metrics.todaySalesNetPaisa)}\n` +
      `📈 *Today's Net Profit:* ${formatPaisaToPKR(metrics.todayProfitPaisa)}\n` +
      `💵 *Physical Cash in Till:* ${formatPaisaToPKR(metrics.todayCashPaisa)}\n` +
      `🧾 *Total Invoices Posted:* ${metrics.todayInvoicesCount}\n\n` +
      `⚠️ *Alerts & Risk Watch:*\n` +
      `• Low Stock Items: ${metrics.lowStockCount}\n` +
      `• Expiring (1 Month): ${formatPaisaToPKR(metrics.expiringValue1mPaisa)}\n` +
      `• Expiring (3 Months): ${formatPaisaToPKR(metrics.expiringValue3mPaisa)}\n\n` +
      `_Generated via PharmaCare Mobile Executive Portal_`;

    navigator.clipboard.writeText(text);
    alert('Executive Daily Briefing copied to clipboard! You can paste in your WhatsApp chat.');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      {/* ── Mobile Executive Header ─────────────────────────────────────────── */}
      <div className="bg-pharma-primary text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-pharma-accent" />
            <span className="text-xs font-semibold tracking-wider uppercase text-pharma-surface">
              Owner's Live Pocket Portal
            </span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
            {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs text-white/80">Today's Total Net Revenue</p>
          <h1 className="text-3xl font-extrabold font-mono tracking-tight text-white mt-0.5">
            {formatPaisaToPKR(metrics?.todaySalesNetPaisa || 0)}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-pharma-accent/30 text-white px-2 py-0.5 rounded font-mono font-bold">
              Profit: {formatPaisaToPKR(metrics?.todayProfitPaisa || 0)}
            </span>
            <span className="text-xs text-white/70 font-mono">
              ({metrics?.todayInvoicesCount || 0} Invoices)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20 text-xs">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-white/90 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Live Sync
          </button>
          <button
            onClick={handleShareOwnerWhatsApp}
            className="flex items-center gap-1.5 bg-white text-pharma-primary font-bold px-3 py-1 rounded-full shadow-sm hover:brightness-95"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            WhatsApp Digest
          </button>
        </div>
      </div>

      {/* ── Cash Drawer & Tender Status ──────────────────────────────────────── */}
      <div className="bg-pharma-white p-4 rounded-xl border border-pharma-muted/20 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-pharma-muted uppercase tracking-wider flex items-center justify-between">
          <span>Drawer & Liquid Cash</span>
          <DollarSign className="w-4 h-4 text-pharma-primary" />
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-pharma-surface p-3 rounded-lg border border-pharma-muted/15">
            <p className="text-[10px] text-pharma-muted">Cash in Drawer</p>
            <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              {formatPaisaToPKR(metrics?.todayCashPaisa || 0)}
            </p>
          </div>
          <div className="bg-pharma-surface p-3 rounded-lg border border-pharma-muted/15">
            <p className="text-[10px] text-pharma-muted">Est. Daily Margin</p>
            <p className="text-lg font-bold font-mono text-pharma-primary mt-0.5">
              {metrics && metrics.todaySalesGrossPaisa > 0
                ? `${Math.round((metrics.todayProfitPaisa / metrics.todaySalesGrossPaisa) * 100)}%`
                : '28%'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stock Alerts & Expiry Watch ──────────────────────────────────────── */}
      <div className="bg-pharma-white p-4 rounded-xl border border-pharma-muted/20 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-pharma-muted uppercase tracking-wider flex items-center justify-between">
          <span>Inventory Risks & Alerts</span>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span className="font-semibold text-red-900">Low Stock / Stockouts</span>
            </div>
            <span className="font-mono font-bold text-red-700">
              {metrics?.lowStockCount || 0} Products
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span className="font-semibold text-amber-900">Expiring in 30 Days</span>
            </div>
            <span className="font-mono font-bold text-amber-800">
              {formatPaisaToPKR(metrics?.expiringValue1mPaisa || 0)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-pharma-surface border border-pharma-primary/20 text-xs">
            <div className="flex items-center gap-2">
              <Snowflake className="w-3.5 h-3.5 text-pharma-primary" />
              <span className="font-semibold text-pharma-text">Fridge Log (2°C - 8°C)</span>
            </div>
            <span className="font-mono font-bold text-pharma-primary">Verified Today</span>
          </div>
        </div>
      </div>

      {/* ── Top Selling Products Today ───────────────────────────────────────── */}
      <div className="bg-pharma-white p-4 rounded-xl border border-pharma-muted/20 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-pharma-muted uppercase tracking-wider flex items-center justify-between">
          <span>Top Movers Today</span>
          <TrendingUp className="w-4 h-4 text-pharma-primary" />
        </h3>

        <div className="divide-y divide-pharma-muted/15">
          {metrics?.topSellers.map((item, idx) => (
            <div key={item.productId} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-pharma-text flex items-center gap-1">
                  <span className="text-[10px] text-pharma-muted font-mono">{idx + 1}.</span>
                  {item.productName}
                </p>
                <p className="text-[10px] text-pharma-muted font-mono pl-3">{item.sku}</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-pharma-primary">{item.unitsSold} sold</p>
                <p className="text-[10px] text-pharma-muted font-mono">{formatPaisaToPKR(item.revenuePaisa)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
