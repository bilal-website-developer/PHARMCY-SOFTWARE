import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { UserRole } from '@pharmacy/shared';
import { useAuthStore } from './stores/authStore';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StyleGuidePage } from './pages/StyleGuidePage';
import { ProductsPage } from './pages/inventory/ProductsPage';
import { SuppliersPage } from './pages/inventory/SuppliersPage';
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage';
import { ShieldAlert } from 'lucide-react';
import { Button } from './components/ui/Button';

// Authenticated Layout wrapper
const AuthenticatedLayout: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

// Role Guard wrapper
interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="pharma-panel p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-pharma-danger/10 text-pharma-danger flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-pharma-text">Access Restricted</h3>
        <p className="text-xs text-pharma-muted max-w-md mx-auto">
          Your current role (<strong>{user.role}</strong>) does not have access to this screen.
          This boundary is enforced both on the client and strictly on the API server.
        </p>
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AuthenticatedLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'style-guide',
        element: <StyleGuidePage />,
      },
      {
        path: 'pos',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER]}>
            <ModulePlaceholderPage
              title="Point of Sale (POS) Billing"
              phase="Phase 1C"
              description="High-speed keyboard billing, barcode scanning, auto FEFO batch selection, split payments, and 58mm/80mm thermal receipts."
            />
          </RoleGuard>
        ),
      },
      {
        path: 'products',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.CASHIER]}>
            <ProductsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'suppliers',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.ACCOUNTANT]}>
            <SuppliersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'purchases',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
            <ModulePlaceholderPage
              title="Purchases & Supplier GRN"
              phase="Phase 1B"
              description="Supplier invoices, batch number, expiry warnings, bonus quantity recalculation, and stock movement ledger creation."
            />
          </RoleGuard>
        ),
      },
      {
        path: 'stock',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
            <ModulePlaceholderPage
              title="Batch Stock & Expiry Tracking"
              phase="Phase 1B"
              description="Batch-wise inventory, status tracking (Active, Near-Expiry, Expired, Quarantine), and stock movement audit."
            />
          </RoleGuard>
        ),
      },
      {
        path: 'accounts',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT]}>
            <ModulePlaceholderPage
              title="Accounts & Financial Ledgers"
              phase="Phase 2A & 2B"
              description="Customer and supplier ledgers, cash book, shift closing balance, P&L reporting, and tax summaries."
            />
          </RoleGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT]}>
            <ModulePlaceholderPage
              title="Reports & Audit Trails"
              phase="Phase 1D"
              description="Daily sales, cashier performance, discount analysis, return records, and immutable audit logs."
            />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <ModulePlaceholderPage
              title="System Configuration & Settings"
              phase="Phase 1D"
              description="Database-driven configuration: expiry warning threshold, role discount limits, loose selling rules, and receipt headers."
            />
          </RoleGuard>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
