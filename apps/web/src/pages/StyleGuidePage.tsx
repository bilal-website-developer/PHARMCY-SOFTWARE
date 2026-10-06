import React, { useState } from 'react';
import {
  PHARMA_THEME,
  formatPaisaToPKR,
  formatDateDDMMYYYY,
} from '@pharmacy/shared';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Badge } from '../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ToastItem, ToastMessage } from '../components/ui/Toast';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { FormActionPair } from '../components/ui/FormActionPair';
import { Search, ScanBarcode, Pill, Info } from 'lucide-react';

export const StyleGuidePage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('components');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const newToast: ToastMessage = {
      id: Math.random().toString(),
      type,
      title,
      message,
    };
    setToasts((prev) => [newToast, ...prev]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const tokensList = [
    {
      name: 'Primary',
      token: 'var(--color-primary)',
      hex: PHARMA_THEME.colors.primary,
      bgClass: 'bg-pharma-primary',
      textClass: 'text-pharma-white',
      usage: 'Header bars, Save/primary buttons, active menu',
      contrastRule: 'High contrast with white text (#FFFFFF)',
    },
    {
      name: 'Accent',
      token: 'var(--color-accent)',
      hex: PHARMA_THEME.colors.accent,
      bgClass: 'bg-pharma-accent',
      textClass: 'text-pharma-text',
      usage: 'Highlights, icons, success badges, focus rings',
      contrastRule: 'NEVER put white text on accent (use dark green text)',
    },
    {
      name: 'Surface',
      token: 'var(--color-surface)',
      hex: PHARMA_THEME.colors.surface,
      bgClass: 'bg-pharma-surface',
      textClass: 'text-pharma-text',
      usage: 'Page background & pale-green container panels',
      contrastRule: 'Clean tinted background',
    },
    {
      name: 'White',
      token: 'var(--color-white)',
      hex: PHARMA_THEME.colors.white,
      bgClass: 'bg-pharma-white',
      textClass: 'text-pharma-text',
      usage: 'Inputs, table rows, cards inside pale-green panels',
      contrastRule: 'Crisp readability inside surface',
    },
    {
      name: 'Danger',
      token: 'var(--color-danger)',
      hex: PHARMA_THEME.colors.danger,
      bgClass: 'bg-pharma-danger',
      textClass: 'text-pharma-white',
      usage: 'Cancel, void, delete, expired stock alerts',
      contrastRule: 'High contrast alert action with white text',
    },
    {
      name: 'Text',
      token: 'var(--color-text)',
      hex: PHARMA_THEME.colors.text,
      bgClass: 'bg-pharma-text',
      textClass: 'text-pharma-white',
      usage: 'Headings, primary data values, table text',
      contrastRule: 'Deep Forest Green base text',
    },
    {
      name: 'Muted',
      token: 'var(--color-muted)',
      hex: PHARMA_THEME.colors.muted,
      bgClass: 'bg-pharma-muted',
      textClass: 'text-pharma-white',
      usage: 'Secondary hints, placeholders, borders',
      contrastRule: 'Soft supporting neutral green',
    },
    {
      name: 'Warning',
      token: 'var(--color-warning)',
      hex: PHARMA_THEME.colors.warning,
      bgClass: 'bg-pharma-warning',
      textClass: 'text-pharma-white',
      usage: 'Near-expiry warnings (1 to 3 months)',
      contrastRule: 'Attention-grabbing amber',
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </div>

      {/* Page Title & Spec Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-pharma-white p-5 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-pharma-primary bg-pharma-primary/10 px-2 py-0.5 rounded-full">
              Phase 0 Foundation
            </span>
            <span className="text-xs text-pharma-muted">•</span>
            <span className="text-xs font-medium text-pharma-muted">Theme & Design System</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-pharma-text mt-1">
            Pharma Green Design System & Style Guide
          </h2>
          <p className="text-xs sm:text-sm text-pharma-muted mt-1">
            Built strictly to the Pharma Management System spec: zero hard-coded colours outside tokens, 12px radius, and standard component kit.
          </p>
        </div>

        {/* Tab Controls */}
        <Tabs
          tabs={[
            { id: 'components', label: 'Component Kit' },
            { id: 'tokens', label: 'Color Tokens' },
            { id: 'rules', label: 'Data & Layout Rules' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* -------------------------------------------------------------
          TAB 1: COMPONENT KIT
          ------------------------------------------------------------- */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          {/* SECTION 1: Buttons & Form Action Pair */}
          <div className="pharma-panel space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-pharma-text">1. Buttons & Form Action Pair</h3>
                <p className="text-xs text-pharma-muted">
                  Primary (#15803D), Danger (#DC2626), Ghost, Outline, and the mandatory full-width Save + Cancel pair.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-pharma-white p-4 rounded-pharma border border-pharma-muted/15">
              <Button variant="primary">Primary Button</Button>
              <Button variant="danger">Danger Action</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="primary" size="sm">Small Button</Button>
              <Button variant="primary" size="md">Medium Button</Button>
              <Button variant="primary" size="lg">Large Button</Button>
              <Button variant="primary" isLoading>Loading State</Button>
            </div>

            {/* Spec Highlight: Save (green) and Cancel (red) as a full-width pair at the bottom of forms */}
            <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20">
              <span className="text-xs font-bold text-pharma-text uppercase tracking-wider block mb-1">
                Mandatory Form Action Pair (Full-Width at bottom of forms)
              </span>
              <p className="text-xs text-pharma-muted mb-3">
                Specification: "Save (green) and Cancel (red) as a full-width pair at the bottom of forms."
              </p>
              <FormActionPair
                saveLabel="Save Medicine Record"
                cancelLabel="Discard & Cancel"
                onSave={() => addToast('success', 'Saved Successfully', 'Record was saved with transaction safety.')}
                onCancel={() => addToast('error', 'Action Cancelled', 'Operation was discarded.')}
              />
            </div>
          </div>

          {/* SECTION 2: Form Controls (Input, Select, DatePicker) */}
          <div className="pharma-panel space-y-4">
            <div>
              <h3 className="text-base font-bold text-pharma-text">2. Form Inputs, Selects & Date Picker</h3>
              <p className="text-xs text-pharma-muted">
                Inputs are white rounded rows inside pale-green surface panels, with clear labels and error support.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-pharma-white p-5 rounded-pharma border border-pharma-muted/15">
              <Input
                label="Product Brand Name"
                placeholder="e.g. Panadol 500mg"
                hint="Required field"
                prefixElement={<Search className="w-4 h-4" />}
              />

              <Input
                label="Barcode / SKU"
                placeholder="Scan or type barcode"
                prefixElement={<ScanBarcode className="w-4 h-4" />}
              />

              <Input
                label="Trade Price (Paisa format)"
                placeholder="12000"
                hint="Stored as Paisa"
                prefixElement={<span className="font-semibold text-xs text-pharma-text">Rs</span>}
              />

              <Select
                label="Drug Classification"
                hint="Spec Section 2"
                options={[
                  { value: 'OTC', label: 'Over The Counter (OTC)' },
                  { value: 'RX', label: 'Prescription Only (Rx)' },
                  { value: 'CONTROLLED', label: 'Controlled Substance' },
                  { value: 'NARCOTIC', label: 'Narcotic / Schedule Drug' },
                ]}
              />

              <DatePicker
                label="Batch Expiry Date"
                hint="DD/MM/YYYY format"
                defaultValue="2027-12-31"
              />

              <Input
                label="Validation Error State"
                defaultValue="Negative stock not allowed"
                error="Negative stock violates strict data invariant"
              />
            </div>
          </div>

          {/* SECTION 3: Stock Status Badges */}
          <div className="pharma-panel space-y-4">
            <div>
              <h3 className="text-base font-bold text-pharma-text">3. Batch & Stock Status Badges</h3>
              <p className="text-xs text-pharma-muted">
                Active, Near-Expiry, Expired, Quarantine, and Role badges.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-pharma-white p-4 rounded-pharma border border-pharma-muted/15">
              <Badge variant="active">Active Stock</Badge>
              <Badge variant="near-expiry">Near Expiry (&lt; 3 Months)</Badge>
              <Badge variant="expired">Expired (Sale Blocked)</Badge>
              <Badge variant="quarantine">Quarantine / Damaged</Badge>
              <Badge variant="primary">System Verified</Badge>
              <Badge variant="role">Pharmacist Access</Badge>
            </div>
          </div>

          {/* SECTION 4: Table (White rounded rows inside pale-green panel) */}
          <div className="pharma-panel space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-pharma-text">
                  4. Themed Table: White Rounded Rows in Pale-Green Panel
                </h3>
                <p className="text-xs text-pharma-muted">
                  Specification: "Look: green header strip (title left, logged-in role right), white rounded rows inside a pale-green panel".
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => addToast('info', 'FEFO Order', 'Items ordered by Earliest Expiry First.')}
              >
                Auto FEFO Pick
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-transparent shadow-none hover:shadow-none hover:border-transparent">
                  <TableHead>Medicine / Generic</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Expiry (DD/MM/YYYY)</TableHead>
                  <TableHead>Quantity (Tablets)</TableHead>
                  <TableHead>MRP (PKR)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-semibold text-pharma-text">Augmentin 625mg</div>
                    <div className="text-[11px] text-pharma-muted">Amoxicillin + Clavulanic Acid</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">BAT-2024-884</TableCell>
                  <TableCell>{formatDateDDMMYYYY('2027-08-15')}</TableCell>
                  <TableCell className="font-semibold text-pharma-text">450 tablets (45 strips)</TableCell>
                  <TableCell className="font-bold text-pharma-text">{formatPaisaToPKR(32000)}</TableCell>
                  <TableCell>
                    <Badge variant="active">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Select</Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <div className="font-semibold text-pharma-text">Panadol Extra 500mg</div>
                    <div className="text-[11px] text-pharma-muted">Paracetamol + Caffeine</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">BAT-2024-112</TableCell>
                  <TableCell>{formatDateDDMMYYYY('2026-11-20')}</TableCell>
                  <TableCell className="font-semibold text-pharma-text">1,200 tablets</TableCell>
                  <TableCell className="font-bold text-pharma-text">{formatPaisaToPKR(450)}</TableCell>
                  <TableCell>
                    <Badge variant="near-expiry">Near-Expiry</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Select</Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <div className="font-semibold text-pharma-text">Brufen 400mg</div>
                    <div className="text-[11px] text-pharma-muted">Ibuprofen</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">BAT-2023-094</TableCell>
                  <TableCell className="text-pharma-danger font-semibold">{formatDateDDMMYYYY('2024-05-10')}</TableCell>
                  <TableCell className="font-semibold text-pharma-danger">80 tablets</TableCell>
                  <TableCell className="font-bold text-pharma-text">{formatPaisaToPKR(180)}</TableCell>
                  <TableCell>
                    <Badge variant="expired">Expired</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[11px] font-semibold text-pharma-danger">Sale Blocked</span>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <div className="font-semibold text-pharma-text">Lexotanil 3mg</div>
                    <div className="text-[11px] text-pharma-muted">Bromazepam (Controlled)</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">BAT-2024-901</TableCell>
                  <TableCell>{formatDateDDMMYYYY('2028-02-14')}</TableCell>
                  <TableCell className="font-semibold text-pharma-text">150 tablets</TableCell>
                  <TableCell className="font-bold text-pharma-text">{formatPaisaToPKR(1250)}</TableCell>
                  <TableCell>
                    <Badge variant="quarantine">Quarantine Check</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Inspect</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* SECTION 5: Modals, Toasts & Empty State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modal & Toast triggers */}
            <div className="pharma-panel space-y-4">
              <h3 className="text-base font-bold text-pharma-text">5. Modal & Interactive Feedback</h3>
              <p className="text-xs text-pharma-muted">
                Accessible dialogs with standard header, content body, and Save/Cancel action pair.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => setModalOpen(true)}>
                  Open Sample Modal
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    addToast('success', 'Sale Posted #INV-00104', 'Sequential invoice posted with lock.')
                  }
                >
                  Success Toast
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    addToast('error', 'Sale Blocked', 'Expired batch BAT-2023-094 cannot be billed.')
                  }
                >
                  Error Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    addToast('warning', 'Low Stock Warning', 'Augmentin 625mg below reorder level (50 tablets).')
                  }
                >
                  Warning Toast
                </Button>
              </div>
            </div>

            {/* Empty State */}
            <div className="pharma-panel">
              <EmptyState
                icon={<Pill className="w-7 h-7 text-pharma-primary" />}
                title="No Hold Bills Found"
                description="All active POS customer carts have either been completed or cancelled."
                actionLabel="Create New Sale (F1)"
                onAction={() => addToast('info', 'POS Shortcut', 'Starting new customer transaction.')}
              />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: COLOR TOKENS
          ------------------------------------------------------------- */}
      {activeTab === 'tokens' && (
        <div className="space-y-6">
          <div className="pharma-panel">
            <h3 className="text-base font-bold text-pharma-text mb-1">
              Pharma Green Color Palette Tokens
            </h3>
            <p className="text-xs text-pharma-muted mb-6">
              Defined once as CSS variables and Tailwind tokens. Strict contrast compliance enforced.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tokensList.map((t) => (
                <div
                  key={t.name}
                  className="bg-pharma-white rounded-pharma border border-pharma-muted/20 overflow-hidden shadow-sm hover:shadow-pharma-md transition-all"
                >
                  <div className={`h-24 ${t.bgClass} flex items-center justify-center p-3 relative`}>
                    <span className={`text-xs font-bold ${t.textClass} tracking-wider`}>
                      {t.hex}
                    </span>
                  </div>
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-pharma-text">{t.name}</h4>
                      <code className="text-[10px] bg-pharma-surface px-1.5 py-0.5 rounded text-pharma-muted font-mono">
                        {t.token}
                      </code>
                    </div>
                    <p className="text-xs text-pharma-muted leading-snug">{t.usage}</p>
                    <div className="pt-2 border-t border-pharma-muted/15 text-[11px] text-pharma-text font-medium flex items-center gap-1">
                      <Info className="w-3 h-3 text-pharma-primary shrink-0" />
                      <span>{t.contrastRule}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: DATA & LAYOUT RULES
          ------------------------------------------------------------- */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="pharma-panel space-y-4">
            <h3 className="text-base font-bold text-pharma-text">
              Data Rules & Architectural Invariants (Non-Negotiable)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm space-y-2">
                <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
                  1. Integer Paisa & Smallest Stock Unit
                </span>
                <p className="text-xs text-pharma-muted leading-relaxed">
                  Money is stored as integer paisa (e.g., Rs 100.50 = 10,050 paisa). Stock is stored in the smallest unit (tablet/capsule/ml). No floating point arithmetic for financial or inventory ledger.
                </p>
                <div className="bg-pharma-surface p-2.5 rounded-md text-xs font-mono text-pharma-text">
                  formatPaisaToPKR(12050) = <strong>{formatPaisaToPKR(12050)}</strong>
                </div>
              </div>

              <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm space-y-2">
                <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
                  2. Stock Movement Invariant
                </span>
                <p className="text-xs text-pharma-muted leading-relaxed">
                  Every stock change creates a row in <code>stock_movements</code>. <code>stock_batches.quantity</code> must always equal the sum of its movements. Every operation runs inside one database transaction.
                </p>
                <div className="bg-pharma-surface p-2.5 rounded-md text-xs font-mono text-pharma-text">
                  Σ(stock_movements) ≡ stock_batches.quantity
                </div>
              </div>

              <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm space-y-2">
                <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
                  3. Zero Negative Stock & Blocked Expiries
                </span>
                <p className="text-xs text-pharma-muted leading-relaxed">
                  No negative stock allowed under any circumstances. Expired batches cannot be billed (Admin override only with a logged audit reason).
                </p>
              </div>

              <div className="bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20 shadow-sm space-y-2">
                <span className="text-xs font-bold text-pharma-primary uppercase tracking-wider">
                  4. Gap-Free Invoices & No Hard Deletes
                </span>
                <p className="text-xs text-pharma-muted leading-relaxed">
                  Posted invoices are read-only. Sequential invoice numbers with lock. No hard deletes of financial or stock records; use cancel/void with reason and audit log.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Medicine Batch"
        description="Verify batch number and manufacturer expiry before committing to stock ledger."
      >
        <div className="space-y-4">
          <Input label="Batch Number" defaultValue="BAT-2024-999" />
          <DatePicker label="Manufacturer Expiry Date" defaultValue="2027-06-30" />
          <Input label="Received Quantity (Smallest Unit: Tablets)" defaultValue="500" />
          <FormActionPair
            saveLabel="Commit to Stock Batch"
            cancelLabel="Close Modal"
            onSave={() => {
              setModalOpen(false);
              addToast('success', 'Batch Added', 'Batch BAT-2024-999 added to stock.');
            }}
            onCancel={() => setModalOpen(false)}
          />
        </div>
      </Modal>
    </div>
  );
};
