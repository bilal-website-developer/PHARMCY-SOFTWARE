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
import { SupplierLedgerPage } from './pages/inventory/SupplierLedgerPage';
import { PurchasesPage } from './pages/inventory/PurchasesPage';
import { StockBatchesPage } from './pages/inventory/StockBatchesPage';
import { POSPage } from './pages/pos/POSPage';
import { ReturnsPage } from './pages/returns/ReturnsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerLedgerPage } from './pages/customers/CustomerLedgerPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { CompliancePage } from './pages/compliance/CompliancePage';
import { StocktakePage } from './pages/inventory/StocktakePage';
import { BatchRecallPage } from './pages/compliance/BatchRecallPage';
import { ReorderSuggestionsPage } from './pages/inventory/ReorderSuggestionsPage';
import { AdvancedAnalyticsPage } from './pages/reports/AdvancedAnalyticsPage';
import { RemindersPage } from './pages/customers/RemindersPage';
import { BarcodePrintingPage } from './pages/inventory/BarcodePrintingPage';
import { BranchesAndTransfersPage } from './pages/branches/BranchesAndTransfersPage';
import { OwnerMobileDashboardPage } from './pages/OwnerMobileDashboardPage';
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
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <StyleGuidePage />
          </RoleGuard>
        ),
      },
      {
        path: 'pos',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER]}>
            <POSPage />
          </RoleGuard>
        ),
      },
      {
        path: 'returns',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER]}>
            <ReturnsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'customers',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.ACCOUNTANT]}>
            <CustomersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'customers/:id/ledger',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.ACCOUNTANT]}>
            <CustomerLedgerPage />
          </RoleGuard>
        ),
      },
      {
        path: 'products',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
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
        path: 'suppliers/:id/ledger',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.ACCOUNTANT]}>
            <SupplierLedgerPage />
          </RoleGuard>
        ),
      },
      {
        path: 'purchases',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.ACCOUNTANT]}>
            <PurchasesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'reorder-suggestions',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
            <ReorderSuggestionsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'stock',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
            <StockBatchesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'accounts',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT]}>
            <AccountsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'compliance',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST]}>
            <CompliancePage />
          </RoleGuard>
        ),
      },
      {
        path: 'stocktake',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
            <StocktakePage />
          </RoleGuard>
        ),
      },
      {
        path: 'batch-recall',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST]}>
            <BatchRecallPage />
          </RoleGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT]}>
            <ReportsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'analytics',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT]}>
            <AdvancedAnalyticsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'reminders',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST]}>
            <RemindersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'barcode-printing',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
            <BarcodePrintingPage />
          </RoleGuard>
        ),
      },
      {
        path: 'branches',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY]}>
            <BranchesAndTransfersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'owner-mobile',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <OwnerMobileDashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <SettingsPage />
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
