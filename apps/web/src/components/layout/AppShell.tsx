import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Truck,
  PackageSearch,
  Receipt,
  BarChart3,
  Palette,
  Sliders,
  RotateCcw,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  User,
  Users,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { getNavForRole, ROLE_LABELS, UserRole } from '@pharmacy/shared';
import { useAuthStore, DEMO_USERS } from '../../stores/authStore';
import { Badge } from '../ui/Badge';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4 shrink-0" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4 shrink-0" />,
  RotateCcw: <RotateCcw className="w-4 h-4 shrink-0" />,
  Users: <Users className="w-4 h-4 shrink-0" />,
  Pill: <Pill className="w-4 h-4 shrink-0" />,
  Truck: <Truck className="w-4 h-4 shrink-0" />,
  PackageSearch: <PackageSearch className="w-4 h-4 shrink-0" />,
  ClipboardCheck: <ClipboardCheck className="w-4 h-4 shrink-0" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4 shrink-0" />,
  Receipt: <Receipt className="w-4 h-4 shrink-0" />,
  BarChart3: <BarChart3 className="w-4 h-4 shrink-0" />,
  Palette: <Palette className="w-4 h-4 shrink-0" />,
  Sliders: <Sliders className="w-4 h-4 shrink-0" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4 shrink-0" />,
  TrendingUp: <TrendingUp className="w-4 h-4 shrink-0" />,
  MessageSquare: <MessageSquare className="w-4 h-4 shrink-0" />,
  Printer: <Printer className="w-4 h-4 shrink-0" />,
};

const NAV_GROUP_ORDER = [
  'Overview',
  'Sales',
  'Catalog',
  'People',
  'Purchasing',
  'Finance',
  'Compliance',
  'Admin',
];

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, pageTitle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, switchDemoRole } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  // Compute allowed navigation items for the current user's role
  const userRole = user?.role || UserRole.CASHIER;
  const navItems = getNavForRole(userRole);
  const navGroups = navItems.reduce<Record<string, typeof navItems>>((groups, item) => {
    (groups[item.group] ||= []).push(item);
    return groups;
  }, {});

  const currentPageTitle =
    pageTitle ||
    navItems.find((item) => item.path === location.pathname)?.title ||
    'PharmaCare';

  return (
    <div className="min-h-screen flex flex-col bg-pharma-surface">
      {/* -------------------------------------------------------------
          TOP GREEN HEADER STRIP
          Per specification: Dark green header strip (#14532D),
          page title left, logged-in role right.
          ------------------------------------------------------------- */}
      <header className="bg-pharma-sidebar text-pharma-white h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-pharma-sm border-b border-pharma-sidebar">
        {/* Left: Mobile hamburger + Pharmacy Logo + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-pharma-white hover:bg-white/10 p-1.5 rounded-pharma transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 text-pharma-white font-bold text-lg tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-pharma-white/15 border border-pharma-white/20 flex items-center justify-center font-bold text-base shadow-sm">
              ℞
            </span>
            <span className="hidden sm:inline font-bold">PharmaCare</span>
          </Link>

          <span className="hidden sm:inline text-white/40">|</span>

          {/* Current Page Title */}
          <h1 className="text-sm sm:text-base font-semibold text-pharma-white tracking-wide truncate">
            {currentPageTitle}
          </h1>
        </div>

        {/* Right: Quick Role Switcher + Current User Info + Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Role Switcher Dropdown (Dev & Phase 0 Verification) */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="flex items-center gap-1.5 bg-pharma-white text-pharma-primary px-2.5 py-1 rounded-full text-xs font-bold shadow-sm hover:brightness-95 transition-all"
              title="Click to test different role permissions"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-pharma-primary" />
              <span>Role: {ROLE_LABELS[userRole]}</span>
            </button>

            {roleSwitcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setRoleSwitcherOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-pharma-white rounded-pharma shadow-2xl border border-pharma-muted/20 py-2 z-30">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-pharma-muted uppercase tracking-wider border-b border-pharma-muted/15">
                    Test Role Permissions (Phase 0)
                  </div>
                  {(Object.keys(DEMO_USERS) as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchDemoRole(r);
                        setRoleSwitcherOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-pharma-surface transition-colors ${userRole === r ? 'font-bold text-pharma-primary bg-pharma-surface' : 'text-pharma-text'
                        }`}
                    >
                      <span>{ROLE_LABELS[r]}</span>
                      {userRole === r && <span className="text-[10px] text-pharma-primary font-bold">✓ Active</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Logged in User Name */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/90">
            <User className="w-3.5 h-3.5 text-pharma-white" />
            <span className="font-medium truncate max-w-[130px]">{user?.fullName || 'Active User'}</span>
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-pharma-white/90 hover:text-pharma-white hover:bg-white/10 p-1.5 rounded-pharma transition-colors"
            title="Sign out"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MAIN LAYOUT CONTAINER (Sidebar on Surface + Content)
          ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Dark green sidebar */}
        <aside
          className={`
            fixed md:static inset-y-14 left-0 z-30
            w-64 bg-pharma-sidebar text-pharma-white border-r border-pharma-white/15
            p-4 flex flex-col justify-between shrink-0
            transition-transform duration-200 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="space-y-6">
            {/* Role Header Banner in Sidebar */}
            <div className="bg-pharma-white p-3 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-pharma-muted tracking-wider">
                  Permitted Views
                </span>
                <Badge variant="role" dot={false}>
                  {ROLE_LABELS[userRole]}
                </Badge>
              </div>
              <p className="text-xs text-pharma-text font-semibold mt-1">
                {user?.fullName}
              </p>
            </div>

            {/* Role-Aware Navigation Menu */}
            <nav className="space-y-4">
              {NAV_GROUP_ORDER.filter((group) => navGroups[group]).map((group) => (
                <section key={group} aria-label={group}>
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-pharma-white/70 px-2 py-1 select-none">
                    {group}
                  </h2>
                  <div className="space-y-1">
                    {navGroups[group].map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`
                            flex items-center justify-between px-3 py-2.5 rounded-pharma text-xs font-semibold
                            transition-all duration-150 group
                            ${isActive
                              ? 'bg-pharma-primary text-pharma-white shadow-sm'
                              : 'text-pharma-white/85 hover:bg-pharma-white hover:text-pharma-sidebar'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={isActive ? 'text-pharma-white' : 'text-pharma-white/70 group-hover:text-pharma-sidebar'}>
                              {ICON_MAP[item.icon] || <Pill className="w-4 h-4" />}
                            </span>
                            <span>{item.title}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-pharma-accent/20 text-pharma-text'
                                }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer: System Status */}
          <div className="pt-4 border-t border-pharma-white/15 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-pharma-white/70">
              <span>System Currency</span>
              <span className="font-semibold text-pharma-white">PKR (Paisa)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-pharma-white/70">
              <span>Date Format</span>
              <span className="font-semibold text-pharma-white">DD/MM/YYYY</span>
            </div>
            <Link
              to="/style-guide"
              className="flex items-center justify-center gap-1.5 w-full mt-2 py-1.5 text-xs text-pharma-primary bg-pharma-white border border-pharma-primary/30 rounded-pharma font-medium hover:bg-pharma-surface transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Pharma Style Guide</span>
            </Link>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
