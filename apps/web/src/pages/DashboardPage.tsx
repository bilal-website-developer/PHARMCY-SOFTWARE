import React from 'react';
import { Link } from 'react-router-dom';
import { UserRole, ROLE_LABELS, getNavForRole, formatPaisaToPKR } from '@pharmacy/shared';
import { useAuthStore } from '../stores/authStore';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  ShoppingCart,
  Palette,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || UserRole.CASHIER;
  const navItems = getNavForRole(role);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Card */}
      <div className="bg-pharma-white p-6 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-pharma-muted uppercase tracking-wider">
              Signed in as:
            </span>
            <Badge variant="role" dot={false}>
              {ROLE_LABELS[role]}
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-pharma-text">
            Welcome back, {user?.fullName}!
          </h2>
          <p className="text-xs text-pharma-muted mt-1">
            System status: All services operational • Integer Paisa Ledger Active • No unposted transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/style-guide">
            <Button variant="outline" size="sm">
              <Palette className="w-4 h-4 mr-1.5" />
              Pharma Style Guide
            </Button>
          </Link>
          {navItems.some((n) => n.id === 'pos') && (
            <Link to="/pos">
              <Button variant="primary" size="sm">
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Open POS (F1)
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Role Security Notice - Especially for Cashier */}
      {role === UserRole.CASHIER && (
        <div className="p-4 rounded-pharma bg-pharma-surface border border-pharma-accent/40 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-pharma-primary shrink-0 mt-0.5" />
          <div className="text-xs text-pharma-text leading-relaxed">
            <strong className="font-bold">Role Enforcement Active (Cashier):</strong> Per system rules, cost and supplier purchase prices are automatically stripped by the server. Your interface is streamlined for rapid keyboard POS sales, customer receipts, and shift tally.
          </div>
        </div>
      )}

      {/* Allowed Modules Grid for Current Role */}
      <div className="pharma-panel space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-pharma-text">Accessible System Modules</h3>
            <p className="text-xs text-pharma-muted">
              Role-aware routing ensures you only see screens permitted for {ROLE_LABELS[role]}.
            </p>
          </div>
          <span className="text-xs font-mono text-pharma-muted bg-pharma-white px-2 py-0.5 rounded border border-pharma-muted/20">
            {navItems.length} modules available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="pharma-card-row p-4 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-pharma-text group-hover:text-pharma-primary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-pharma-muted mt-1">
                    Route: <code className="font-mono text-[11px] text-pharma-text">{item.path}</code>
                  </p>
                </div>
                {item.badge && (
                  <Badge variant="primary" dot={false}>
                    {item.badge}
                  </Badge>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-pharma-muted/15 flex items-center justify-between text-xs text-pharma-primary font-semibold">
                <span>Enter Module</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick KPI Preview (Role Aware) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm">
          <div className="text-[11px] uppercase font-bold text-pharma-muted tracking-wider">
            Today's Store Sales
          </div>
          <div className="text-xl font-bold text-pharma-text mt-1">
            {formatPaisaToPKR(18542000)}
          </div>
          <div className="text-[11px] text-pharma-primary font-semibold mt-1">
            ↑ 142 transactions completed
          </div>
        </div>

        <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm">
          <div className="text-[11px] uppercase font-bold text-pharma-muted tracking-wider">
            Active Stock Batches
          </div>
          <div className="text-xl font-bold text-pharma-text mt-1">
            1,480 Batches
          </div>
          <div className="text-[11px] text-pharma-muted mt-1">
            Strict FEFO Order maintained
          </div>
        </div>

        <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm">
          <div className="text-[11px] uppercase font-bold text-pharma-muted tracking-wider">
            Near-Expiry Alerts
          </div>
          <div className="text-xl font-bold text-pharma-warning mt-1">
            14 Batches
          </div>
          <div className="text-[11px] text-pharma-warning font-medium mt-1">
            Expires within 90 days
          </div>
        </div>

        <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm">
          <div className="text-[11px] uppercase font-bold text-pharma-muted tracking-wider">
            Sequential Invoice Counter
          </div>
          <div className="text-xl font-bold text-pharma-text mt-1 font-mono">
            #INV-004812
          </div>
          <div className="text-[11px] text-pharma-primary font-semibold mt-1">
            ✓ Gap-free guaranteed
          </div>
        </div>
      </div>
    </div>
  );
};
