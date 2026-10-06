import { z } from 'zod';

/**
 * -------------------------------------------------------------
 * ROLES & PERMISSIONS
 * Roles: Admin, Pharmacist/Manager, Cashier, Inventory/Purchase, Accountant
 * -------------------------------------------------------------
 */
export const UserRole = {
  ADMIN: 'ADMIN',
  PHARMACIST: 'PHARMACIST',
  CASHIER: 'CASHIER',
  INVENTORY: 'INVENTORY',
  ACCOUNTANT: 'ACCOUNTANT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.PHARMACIST]: 'Pharmacist / Manager',
  [UserRole.CASHIER]: 'Cashier',
  [UserRole.INVENTORY]: 'Inventory / Purchase',
  [UserRole.ACCOUNTANT]: 'Accountant',
};

/**
 * -------------------------------------------------------------
 * THEME TOKENS ("Pharma Green")
 * Strict color tokens specified in Global Rules.
 * Never hard-code hex outside this definition.
 * -------------------------------------------------------------
 */
export const PHARMA_THEME = {
  colors: {
    primary: '#15803D',       // Save/primary buttons and headings
    sidebar: '#14532D',       // Sidebar and top header
    accent: '#22C55E',        // Highlights, icons, success badges, focus rings (never white text on it)
    surface: '#F0FDF4',       // Page and panel backgrounds
    white: '#FFFFFF',         // Inputs, rows, cards inside panels
    danger: '#DC2626',        // Cancel, void, delete, expired stock
    text: '#14532D',          // Primary body and title text
    muted: '#6B8F7B',         // Secondary and muted descriptions
    warning: '#F59E0B',       // Near-expiry warnings and alerts
  },
  borderRadius: '12px',
  fonts: {
    base: 'Inter, system-ui, sans-serif',
    urdu: "'Noto Nastaliq Urdu', serif",
  },
} as const;

/**
 * -------------------------------------------------------------
 * SCHEMAS
 * -------------------------------------------------------------
 */
export const LoginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  role: z.enum([
    UserRole.ADMIN,
    UserRole.PHARMACIST,
    UserRole.CASHIER,
    UserRole.INVENTORY,
    UserRole.ACCOUNTANT,
  ]),
  isActive: z.boolean(),
  createdAt: z.string().or(z.date()),
});

export type UserDto = z.infer<typeof UserSchema>;

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * -------------------------------------------------------------
 * NAVIGATION & ROLE-BASED ACCESS
 * -------------------------------------------------------------
 */
export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: string;
  group: string;
  allowedRoles: UserRole[];
  badge?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    group: 'Overview',
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.PHARMACIST,
      UserRole.CASHIER,
      UserRole.INVENTORY,
      UserRole.ACCOUNTANT,
    ],
  },
  {
    id: 'pos',
    title: 'POS Billing',
    path: '/pos',
    icon: 'ShoppingCart',
    group: 'Sales',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER],
    badge: 'F1',
  },
  {
    id: 'returns',
    title: 'Sales Returns',
    path: '/returns',
    icon: 'RotateCcw',
    group: 'Sales',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER],
  },
  {
    id: 'customers',
    title: 'Credit Customers',
    path: '/customers',
    icon: 'Users',
    group: 'People',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.ACCOUNTANT],
  },
  {
    id: 'products',
    title: 'Medicine Catalog',
    path: '/products',
    icon: 'Pill',
    group: 'Catalog',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
  },
  {
    id: 'suppliers',
    title: 'Suppliers & Creditors',
    path: '/suppliers',
    icon: 'Truck',
    group: 'Purchasing',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.ACCOUNTANT],
  },
  {
    id: 'purchases',
    title: 'Purchases & GRN',
    path: '/purchases',
    icon: 'Truck',
    group: 'Purchasing',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
  },
  {
    id: 'reorder-suggestions',
    title: 'Reorder & Draft POs',
    path: '/reorder-suggestions',
    icon: 'ShoppingCart',
    group: 'Purchasing',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
    badge: 'Phase 3',
  },
  {
    id: 'stock',
    title: 'Batch Stock & Expiry',
    path: '/stock',
    icon: 'PackageSearch',
    group: 'Catalog',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
  },
  {
    id: 'stocktake',
    title: 'Stocktake & Audits',
    path: '/stocktake',
    icon: 'ClipboardCheck',
    group: 'Catalog',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
  },
  {
    id: 'batch-recall',
    title: 'Batch Recall Trace',
    path: '/batch-recall',
    icon: 'AlertTriangle',
    group: 'Catalog',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST],
  },
  {
    id: 'accounts',
    title: 'Accounts & Ledgers',
    path: '/accounts',
    icon: 'Receipt',
    group: 'Finance',
    allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.PHARMACIST],
  },
  {
    id: 'compliance',
    title: 'Controlled Drugs & Rx',
    path: '/compliance',
    icon: 'ShieldCheck',
    group: 'Compliance',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST],
  },
  {
    id: 'reports',
    title: 'Reports & Audits',
    path: '/reports',
    icon: 'BarChart3',
    group: 'Sales',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT],
  },
  {
    id: 'analytics',
    title: 'Advanced Analytics',
    path: '/analytics',
    icon: 'TrendingUp',
    group: 'Finance',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT],
    badge: 'Phase 3',
  },
  {
    id: 'reminders',
    title: 'Credit & Refill Alerts',
    path: '/reminders',
    icon: 'MessageSquare',
    group: 'People',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER],
    badge: 'Phase 3',
  },
  {
    id: 'barcode-printing',
    title: 'Barcode Label Printing',
    path: '/barcode-printing',
    icon: 'Printer',
    group: 'Catalog',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
    badge: 'Phase 3',
  },
  {
    id: 'style-guide',
    title: 'Pharma Style Guide',
    path: '/style-guide',
    icon: 'Palette',
    group: 'Admin',
    allowedRoles: [UserRole.ADMIN],
    badge: 'Phase 0',
  },
  {
    id: 'settings',
    title: 'System Settings',
    path: '/settings',
    icon: 'Sliders',
    group: 'Admin',
    allowedRoles: [UserRole.ADMIN],
  },
];

/**
 * Filter navigation items permitted for a given user role
 */
export function getNavForRole(role: UserRole): NavItem[] {
  return NAVIGATION_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

/**
 * -------------------------------------------------------------
 * MONEY & STOCK UTILITIES (Non-negotiable integer rules)
 * Money is stored in integer PAISA (1 PKR = 100 Paisa).
 * -------------------------------------------------------------
 */
export function paisaToRupees(paisa: number): number {
  return Math.round(paisa) / 100;
}

export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatPaisaToPKR(paisa: number): string {
  const rupees = paisaToRupees(paisa);
  return `Rs ${rupees.toLocaleString('en-PK', {
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateDDMMYYYY(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * -------------------------------------------------------------
 * PHASE 1A: MASTER CATALOG & SUPPLIERS ENUMS & TYPES
 * -------------------------------------------------------------
 */

export const DrugClass = {
  OTC: 'OTC',
  RX: 'RX',
  CONTROLLED: 'CONTROLLED',
  NARCOTIC: 'NARCOTIC',
} as const;
export type DrugClass = (typeof DrugClass)[keyof typeof DrugClass];

export const DRUG_CLASS_LABELS: Record<DrugClass, string> = {
  [DrugClass.OTC]: 'Over the Counter (OTC)',
  [DrugClass.RX]: 'Prescription Only (Rx)',
  [DrugClass.CONTROLLED]: 'Controlled Substance',
  [DrugClass.NARCOTIC]: 'Narcotic / Schedule D',
};

export const StorageCondition = {
  ROOM_TEMPERATURE: 'ROOM_TEMPERATURE', // 15°C - 25°C
  COOL: 'COOL',                         // 8°C - 15°C
  COLD_REFRIGERATED: 'COLD_REFRIGERATED', // 2°C - 8°C
  FROZEN: 'FROZEN',                     // Below 0°C
} as const;
export type StorageCondition = (typeof StorageCondition)[keyof typeof StorageCondition];

export const STORAGE_LABELS: Record<StorageCondition, string> = {
  [StorageCondition.ROOM_TEMPERATURE]: 'Room Temperature (15-25°C)',
  [StorageCondition.COOL]: 'Cool Place (8-15°C)',
  [StorageCondition.COLD_REFRIGERATED]: 'Refrigerated (2-8°C)',
  [StorageCondition.FROZEN]: 'Deep Freeze (Below 0°C)',
};

export const ProductStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DISCONTINUED: 'DISCONTINUED',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const SupplierStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus];

export const DosageForms = [
  'Tablet',
  'Capsule',
  'Syrup / Suspension',
  'Injection',
  'Cream / Ointment',
  'Eye / Ear Drops',
  'Inhaler',
  'Sachet',
  'Infusion',
  'Gel',
  'Suppository',
  'Patch',
] as const;
export type DosageForm = (typeof DosageForms)[number];

// Units & Pack Conversions
export const ProductUnitSchema = z.object({
  id: z.string().optional(),
  unitName: z.string().min(1, 'Unit name is required'), // e.g. "Carton", "Box", "Strip", "Tablet"
  conversionFactor: z.number().int().min(1, 'Conversion factor must be >= 1'), // count of smallest unit
  isBaseUnit: z.boolean().default(false), // true if smallest unit (Tablet/Capsule/Bottle)
  isDefaultSellingUnit: z.boolean().default(false),
  barcode: z.string().optional().nullable(),
  pricePaisa: z.number().int().min(0).optional().nullable(),
});
export type ProductUnitDto = z.infer<typeof ProductUnitSchema>;

// Category
export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Category name is required'),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
});
export type CategoryDto = z.infer<typeof CategorySchema>;

// Company (Manufacturer)
export const CompanySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Manufacturer name is required'),
  code: z.string().optional().nullable(),
  country: z.string().default('Pakistan'),
});
export type CompanyDto = z.infer<typeof CompanySchema>;

// Supplier
export const SupplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Supplier name is required'),
  code: z.string().min(2, 'Supplier code is required'),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(), // NTN / STRN
  paymentTermsDays: z.number().int().min(0).default(30),
  openingBalancePaisa: z.number().int().default(0), // in Paisa
  currentBalancePaisa: z.number().int().default(0), // in Paisa
  status: z.enum([SupplierStatus.ACTIVE, SupplierStatus.INACTIVE]).default(SupplierStatus.ACTIVE),
  createdAt: z.string().optional(),
});
export type SupplierDto = z.infer<typeof SupplierSchema>;
export type SupplierCreateInput = z.infer<typeof SupplierSchema>;

// Price History
export interface PriceHistoryDto {
  id: string;
  productId: string;
  oldMrpPaisa: number;
  newMrpPaisa: number;
  oldCostPricePaisa?: number | null;
  newCostPricePaisa?: number | null;
  changeReason?: string | null;
  changedByName?: string | null;
  createdAt: string;
}

// Product Barcode
export interface ProductBarcodeDto {
  id?: string;
  barcode: string;
  unitName?: string | null;
  isPrimary?: boolean;
}

// Product Master
export const ProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(2, 'Product brand name is required'),
  urduName: z.string().optional().nullable(),
  genericName: z.string().min(2, 'Generic / Salt formula is required'),
  strength: z.string().min(1, 'Strength is required (e.g. 500mg, 10ml)'),
  dosageForm: z.string().min(1, 'Dosage form is required'),
  drugClass: z.enum([DrugClass.OTC, DrugClass.RX, DrugClass.CONTROLLED, DrugClass.NARCOTIC]),
  storageCondition: z.enum([
    StorageCondition.ROOM_TEMPERATURE,
    StorageCondition.COOL,
    StorageCondition.COLD_REFRIGERATED,
    StorageCondition.FROZEN,
  ]).default(StorageCondition.ROOM_TEMPERATURE),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  primarySupplierId: z.string().optional().nullable(),
  primarySupplierName: z.string().optional().nullable(),
  minStockLevel: z.number().int().min(0).default(10), // Smallest units
  maxStockLevel: z.number().int().min(0).default(100), // Smallest units
  rackLocation: z.string().optional().nullable(), // e.g. "Rack A-04"
  taxRatePct: z.number().min(0).max(100).default(0), // percentage
  status: z.enum([ProductStatus.ACTIVE, ProductStatus.INACTIVE, ProductStatus.DISCONTINUED]).default(ProductStatus.ACTIVE),
  requiresPrescription: z.boolean().default(false),
  isLooseSellingEnabled: z.boolean().default(false),
  loosePricePaisa: z.number().int().min(0).optional().nullable(), // in Paisa
  mrpPaisa: z.number().int().min(0, 'MRP must be >= 0'), // Pack/base MRP in Paisa
  costPricePaisa: z.number().int().min(0).optional().nullable(), // Purchase price (STRIPPED for Cashier)
  units: z.array(ProductUnitSchema).default([]),
  barcodes: z.array(z.string()).default([]),
  currentStock: z.number().int().default(0), // Smallest unit count
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ProductDto = z.infer<typeof ProductSchema>;
export type ProductCreateInput = z.infer<typeof ProductSchema>;
export type ProductUpdateInput = Partial<ProductCreateInput>;

// Product Substitute (Same generic + strength)
export interface ProductSubstituteDto {
  id: string;
  sku: string;
  name: string;
  companyName?: string | null;
  genericName: string;
  strength: string;
  dosageForm: string;
  mrpPaisa: number;
  currentStock: number;
  rackLocation?: string | null;
  status: ProductStatus;
}

// Helpers
export function calculateLoosePrice(packMrpPaisa: number, unitsPerPack: number): number {
  if (unitsPerPack <= 0) return packMrpPaisa;
  // Standard rounding up to nearest paisa or ceiling
  return Math.ceil(packMrpPaisa / unitsPerPack);
}

export function convertUnits(quantity: number, fromFactor: number, toFactor: number): number {
  if (toFactor <= 0) return 0;
  // Convert from origin factor to smallest units, then to target factor
  const smallestUnits = quantity * fromFactor;
  return Math.floor(smallestUnits / toFactor);
}

/**
 * -------------------------------------------------------------
 * PHASE 1B: PURCHASES (GRN), BATCHES & STOCK MOVEMENTS
 * -------------------------------------------------------------
 */

export const BatchStatus = {
  ACTIVE: 'ACTIVE',
  NEAR_EXPIRY: 'NEAR_EXPIRY',
  EXPIRED: 'EXPIRED',
  QUARANTINE: 'QUARANTINE',
  RETURNED: 'RETURNED',
  EXPIRED_CLAIM_PENDING: 'EXPIRED_CLAIM_PENDING',
} as const;
export type BatchStatus = (typeof BatchStatus)[keyof typeof BatchStatus];

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  [BatchStatus.ACTIVE]: 'Active Stock',
  [BatchStatus.NEAR_EXPIRY]: 'Near Expiry',
  [BatchStatus.EXPIRED]: 'Expired Stock',
  [BatchStatus.QUARANTINE]: 'Quarantine / Damaged',
  [BatchStatus.RETURNED]: 'Returned to Supplier',
  [BatchStatus.EXPIRED_CLAIM_PENDING]: 'Expired - Claim Pending',
};

export const StockMovementType = {
  PURCHASE: 'PURCHASE',                 // Inflow from supplier GRN (+)
  SALE: 'SALE',                         // Outflow from POS (-)
  PURCHASE_RETURN: 'PURCHASE_RETURN',   // Outflow returned to supplier (-)
  SALE_RETURN: 'SALE_RETURN',           // Inflow customer return (+)
  ADJUSTMENT_ADD: 'ADJUSTMENT_ADD',     // Inventory audit count addition (+)
  ADJUSTMENT_DAMAGE: 'ADJUSTMENT_DAMAGE', // Damage / broken write-off (-)
  ADJUSTMENT_EXPIRED: 'ADJUSTMENT_EXPIRED', // Expired stock write-off (-)
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

export const PurchaseStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;
export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

// Purchase Item Schema
export const PurchaseItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, 'Product selection is required'),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'), // YYYY-MM-DD
  quantity: z.number().int().min(1, 'Quantity must be >= 1'),
  unitName: z.string().default('Box'),
  conversionFactor: z.number().int().min(1).default(1),
  bonusQuantity: z.number().int().min(0).default(0),
  tradePricePaisa: z.number().int().min(0, 'Trade price must be >= 0'),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(100).default(0),
  mrpPaisa: z.number().int().min(0, 'MRP must be >= 0'),
  totalSmallestUnits: z.number().int().min(1).optional(),
  effectiveCostPerSmallestUnitPaisa: z.number().int().min(0).optional(),
});
export type PurchaseItemDto = z.infer<typeof PurchaseItemSchema>;

// Purchase (GRN) Schema
export const PurchaseSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string().min(1, 'Supplier selection is required'),
  supplierName: z.string().optional(),
  supplierCode: z.string().optional(),
  billNumber: z.string().min(1, 'Supplier bill number is required'),
  billDate: z.string().min(1, 'Bill date is required'), // YYYY-MM-DD
  totalAmountPaisa: z.number().int().min(0),
  discountPaisa: z.number().int().min(0).default(0),
  taxPaisa: z.number().int().min(0).default(0),
  netPayablePaisa: z.number().int().min(0),
  paidAmountPaisa: z.number().int().min(0).default(0),
  status: z.enum([PurchaseStatus.DRAFT, PurchaseStatus.CONFIRMED, PurchaseStatus.CANCELLED]).default(PurchaseStatus.CONFIRMED),
  billAttachmentUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(PurchaseItemSchema).min(1, 'At least one medicine item is required in the purchase'),
  createdByName: z.string().optional(),
  createdAt: z.string().optional(),
});
export type PurchaseDto = z.infer<typeof PurchaseSchema>;
export type PurchaseCreateInput = z.infer<typeof PurchaseSchema>;

// Stock Batch DTO
export interface StockBatchDto {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  genericName?: string;
  dosageForm?: string;
  rackLocation?: string | null;
  batchNumber: string;
  expiryDate: string; // ISO or YYYY-MM-DD
  daysToExpiry: number;
  quantity: number; // Smallest base unit
  initialQuantity: number;
  costPricePaisa: number; // per smallest base unit
  mrpPaisa: number; // pack/base MRP
  status: BatchStatus;
  createdAt: string;
}

// Stock Movement Ledger Entry (Invariant: Batch Quantity = SUM(Movements))
export interface StockMovementDto {
  id: string;
  productId: string;
  productName?: string;
  batchId: string;
  batchNumber?: string;
  movementType: StockMovementType;
  quantity: number; // Positive = Inflow, Negative = Outflow
  balanceAfter: number;
  referenceType: string; // 'PURCHASE', 'SALE', 'ADJUSTMENT'
  referenceId: string;
  reason?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

// Stock Adjustment Schema (Damage, Expired write-off, count correction)
export const StockAdjustmentSchema = z.object({
  batchId: z.string().min(1, 'Stock batch is required'),
  adjustmentType: z.enum([
    StockMovementType.ADJUSTMENT_DAMAGE,
    StockMovementType.ADJUSTMENT_EXPIRED,
    StockMovementType.ADJUSTMENT_ADD,
  ]),
  quantitySmallestUnits: z.number().int().min(1, 'Quantity must be >= 1'),
  reason: z.string().min(3, 'Audit reason is mandatory for any stock modification'),
});
export type StockAdjustmentCreateInput = z.infer<typeof StockAdjustmentSchema>;

// Phase 1B Calculation Helpers
export function calculateEffectiveUnitCost(
  tradePricePaisa: number,
  discountPct: number,
  taxPct: number,
  totalSmallestUnits: number
): number {
  if (totalSmallestUnits <= 0) return 0;
  // Apply line discount and sales tax
  const discounted = tradePricePaisa * (1 - discountPct / 100);
  const taxed = discounted * (1 + taxPct / 100);
  // Bonus quantity was added to totalSmallestUnits, reducing average unit cost
  return Math.round(taxed / totalSmallestUnits);
}

export function getDaysToExpiry(expiryDate: string | Date): number {
  const exp = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diffTime = exp.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function evaluateBatchStatus(
  expiryDate: string | Date,
  warningMonths: number = 3
): BatchStatus {
  const days = getDaysToExpiry(expiryDate);
  if (days <= 0) return BatchStatus.EXPIRED;
  if (days <= warningMonths * 30.5) return BatchStatus.NEAR_EXPIRY;
  return BatchStatus.ACTIVE;
}

/**
 * -------------------------------------------------------------
 * PHASE 1C: POS SALES SCREEN
 * -------------------------------------------------------------
 */

export const SaleStatus = {
  POSTED: 'POSTED',
  VOIDED: 'VOIDED',
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  JAZZCASH: 'JAZZCASH',
  EASYPAISA: 'EASYPAISA',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CREDIT: 'CREDIT',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Credit / Debit Card',
  [PaymentMethod.JAZZCASH]: 'JazzCash',
  [PaymentMethod.EASYPAISA]: 'Easypaisa',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.CREDIT]: 'Customer Credit',
};

// A single line item in the POS cart (in-memory before posting)
export interface CartItem {
  /** Unique row key for the cart (not a DB id) */
  cartRowId: string;
  productId: string;
  productName: string;
  productSku: string;
  genericName: string;
  drugClass: DrugClass;

  // Batch selected via FEFO
  batchId: string;
  batchNumber: string;
  expiryDate: string; // ISO
  daysToExpiry: number;
  availableSmallestUnits: number; // Stock remaining in the chosen batch

  // Unit selection
  unitName: string;
  conversionFactor: number; // smallest units per selling unit

  // Quantities
  quantityInUnit: number;

  // Pricing (paisa)
  mrpPaisaPerUnit: number; // MRP per selling unit
  discountPct: number;
  taxPct: number;

  // Computed on the fly
  lineTotalPaisa: number;
}

// A split-payment entry in the cart
export interface PaymentEntry {
  method: PaymentMethod;
  amountPaisa: number;
}

// The full cart state (held bill serializes this)
export interface CartState {
  items: CartItem[];
  billDiscountPct: number; // Bill-level discount %
  payments: PaymentEntry[];
  holdLabel?: string;
  requiresRx: boolean;
  doctorName: string;
  patientName: string;
  patientPhone: string;
}

// Schema for posting a sale to the API
export const PostSalePaymentSchema = z.object({
  method: z.enum([
    PaymentMethod.CASH,
    PaymentMethod.CARD,
    PaymentMethod.JAZZCASH,
    PaymentMethod.EASYPAISA,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.CREDIT,
  ]),
  amountPaisa: z.number().int().min(1),
});


export const PostSaleItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  productSku: z.string(),
  batchId: z.string().min(1, 'Batch is required for every line item'),
  batchNumber: z.string(),
  expiryDate: z.string(),
  unitName: z.string(),
  conversionFactor: z.number().int().min(1),
  quantityInUnit: z.number().int().min(1),
  quantitySmallestUnits: z.number().int().min(1),
  mrpPaisaPerUnit: z.number().int().min(0),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(100).default(0),
  lineTotalPaisa: z.number().int().min(0),
});
export type PostSaleItemInput = z.infer<typeof PostSaleItemSchema>;

export const PostSaleSchema = z.object({
  items: z.array(PostSaleItemSchema).min(1, 'At least one item is required'),
  payments: z.array(PostSalePaymentSchema).min(1, 'At least one payment is required'),
  subtotalPaisa: z.number().int().min(0),
  discountPaisa: z.number().int().min(0).default(0),
  taxPaisa: z.number().int().min(0).default(0),
  grandTotalPaisa: z.number().int().min(0),
  paidPaisa: z.number().int().min(0),
  changePaisa: z.number().int().min(0).default(0),
  requiresRx: z.boolean().default(false),
  doctorName: z.string().optional(),
  doctorRegNo: z.string().optional(),
  patientName: z.string().optional(),
  patientCnic: z.string().optional(),
  patientPhone: z.string().optional(),
  prescriptionRef: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  isCreditSale: z.boolean().optional().default(false),
  creditApprovedById: z.string().optional(),
  creditApprovedByName: z.string().optional(),
});
export type PostSaleInput = z.infer<typeof PostSaleSchema>;

// Sale DTO returned from API
export interface SaleDto {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  status: SaleStatus;
  voidReason?: string | null;

  subtotalPaisa: number;
  discountPaisa: number;
  taxPaisa: number;
  grandTotalPaisa: number;
  paidPaisa: number;
  changePaisa: number;

  requiresRx: boolean;
  doctorName?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;

  cashierId?: string | null;
  cashierName?: string | null;

  items: SaleItemDto[];
  payments: PaymentDto[];
  createdAt: string;
}

export interface SaleItemDto {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  productSku: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  unitName: string;
  conversionFactor: number;
  quantityInUnit: number;
  quantitySmallestUnits: number;
  mrpPaisaPerUnit: number;
  discountPct: number;
  taxPct: number;
  lineTotalPaisa: number;
}

export interface PaymentDto {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amountPaisa: number;
}

export interface HeldBillDto {
  id: string;
  label?: string | null;
  status: 'HELD' | 'RESUMED' | 'EXPIRED';
  billData: CartState;
  cashierId?: string | null;
  cashierName?: string | null;
  createdAt: string;
}

// ── POS Calculation Helpers ──────────────────────────────────────────────────

/**
 * Calculate a single cart line total in paisa.
 * All values in paisa; discount and tax in %.
 */
export function calcLineTotal(
  mrpPaisaPerUnit: number,
  quantityInUnit: number,
  discountPct: number,
  taxPct: number
): number {
  const gross = mrpPaisaPerUnit * quantityInUnit;
  const discounted = Math.round(gross * (1 - discountPct / 100));
  const withTax = Math.round(discounted * (1 + taxPct / 100));
  return withTax;
}

/**
 * Calculate bill-level discount and grand total.
 */
export function calcBillTotals(
  items: Pick<CartItem, 'lineTotalPaisa' | 'taxPct' | 'mrpPaisaPerUnit' | 'quantityInUnit' | 'discountPct'>[],
  billDiscountPct: number
): {
  subtotalPaisa: number;
  discountPaisa: number;
  taxPaisa: number;
  grandTotalPaisa: number;
} {
  // Items already have tax baked into lineTotalPaisa via calcLineTotal,
  // but for reporting we separate them.
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const gross = item.mrpPaisaPerUnit * item.quantityInUnit;
    const disc = Math.round(gross * (1 - item.discountPct / 100));
    subtotal += disc;
    tax += Math.round(disc * item.taxPct / 100);
  }
  const billDiscount = Math.round(subtotal * (billDiscountPct / 100));
  const afterBillDisc = subtotal - billDiscount;
  const grandTotal = afterBillDisc + tax;
  return {
    subtotalPaisa: subtotal,
    discountPaisa: billDiscount,
    taxPaisa: tax,
    grandTotalPaisa: grandTotal,
  };
}

/** Max discount % allowed per role (enforced both server + client) */
export const ROLE_MAX_DISCOUNT: Record<string, number> = {
  ADMIN: 100,
  PHARMACIST: 20,
  CASHIER: 5,
  INVENTORY: 0,
  ACCOUNTANT: 0,
};

// ─── PHASE 1D: RETURNS, REPORTS, AUDIT, SETTINGS ─────────────────────────────

export enum ReturnDestination {
  RESTOCK_ORIGINAL_BATCH = 'RESTOCK_ORIGINAL_BATCH',
  DAMAGED_QUARANTINE = 'DAMAGED_QUARANTINE',
}

export enum RefundMethod {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
}

export enum ReturnStatus {
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
}

export const SaleReturnItemInputSchema = z.object({
  saleItemId: z.string().optional(),
  productId: z.string().min(1, 'Product ID required'),
  productName: z.string().min(1, 'Product name required'),
  batchId: z.string().min(1, 'Batch ID required'),
  batchNumber: z.string().min(1, 'Batch number required'),
  unitName: z.string().min(1, 'Unit name required'),
  conversionFactor: z.number().int().positive().default(1),
  quantityInUnit: z.number().int().positive('Quantity must be at least 1'),
  refundPricePaisaPerUnit: z.number().int().nonnegative(),
  destination: z.nativeEnum(ReturnDestination).default(ReturnDestination.RESTOCK_ORIGINAL_BATCH),
  reason: z.string().optional(),
});

export type SaleReturnItemInput = z.infer<typeof SaleReturnItemInputSchema>;

export const PostReturnSchema = z.object({
  saleId: z.string().optional(),
  saleInvoiceNumber: z.string().optional(),
  refundMethod: z.nativeEnum(RefundMethod).default(RefundMethod.CASH),
  reason: z.string().min(3, 'Return reason must be at least 3 characters'),
  notes: z.string().optional(),
  items: z.array(SaleReturnItemInputSchema).min(1, 'At least one item must be returned'),
  approvedById: z.string().optional(),
});

export type PostReturnInput = z.infer<typeof PostReturnSchema>;

export const VoidSchema = z.object({
  reason: z.string().min(5, 'Reason for cancellation/void must be at least 5 characters'),
});

export type VoidInput = z.infer<typeof VoidSchema>;

export interface SaleReturnItemDto {
  id: string;
  saleReturnId: string;
  saleItemId?: string | null;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  unitName: string;
  conversionFactor: number;
  quantityInUnit: number;
  quantitySmallestUnits: number;
  refundPricePaisaPerUnit: number;
  lineTotalRefundPaisa: number;
  destination: ReturnDestination;
  reason?: string | null;
}

export interface SaleReturnDto {
  id: string;
  returnNumber: string;
  saleId?: string | null;
  saleInvoiceNumber?: string | null;
  returnDate: string;
  status: ReturnStatus;
  refundMethod: RefundMethod;
  totalRefundPaisa: number;
  reason: string;
  needsApproval: boolean;
  isApproved: boolean;
  approvedById?: string | null;
  approvedByName?: string | null;
  cashierId?: string | null;
  cashierName?: string | null;
  notes?: string | null;
  items: SaleReturnItemDto[];
  createdAt: string;
}

// ── System Settings ─────────────────────────────────────────────────────────

export interface SystemSettingsDto {
  expiryWarningMonths: number;
  maxDiscountCashier: number;
  maxDiscountPharmacist: number;
  maxDiscountAdmin: number;
  looseSellingDefault: boolean;
  receiptHeaderName: string;
  receiptHeaderAddress: string;
  receiptHeaderPhone: string;
  receiptHeaderNtn: string;
  receiptFooterMsg: string;
}

export const UpdateSettingsSchema = z.object({
  expiryWarningMonths: z.number().int().min(1).max(24).optional(),
  maxDiscountCashier: z.number().min(0).max(100).optional(),
  maxDiscountPharmacist: z.number().min(0).max(100).optional(),
  maxDiscountAdmin: z.number().min(0).max(100).optional(),
  looseSellingDefault: z.boolean().optional(),
  receiptHeaderName: z.string().min(1).optional(),
  receiptHeaderAddress: z.string().optional(),
  receiptHeaderPhone: z.string().optional(),
  receiptHeaderNtn: z.string().optional(),
  receiptFooterMsg: z.string().optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

// ── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogDto {
  id: string;
  userId?: string | null;
  userName?: string | null;
  role?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  reason?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

// ── Reports DTOs ────────────────────────────────────────────────────────────

export interface DailySalesSummaryDto {
  date: string;
  invoiceCount: number;
  grossSalesPaisa: number;
  discountPaisa: number;
  taxPaisa: number;
  netSalesPaisa: number;
  cashPaisa: number;
  cardPaisa: number;
  digitalPaisa: number;
  returnedPaisa: number;
}

export interface ProductSalesDto {
  productId: string;
  productName: string;
  sku: string;
  genericName: string;
  dosageForm: string;
  unitsSold: number;
  baseUnitsSold: number;
  revenuePaisa: number;
  discountPaisa: number;
  returnQty: number;
}

export interface CashierSalesDto {
  cashierId: string;
  cashierName: string;
  invoiceCount: number;
  totalSalesPaisa: number;
  totalDiscountPaisa: number;
  averageBillPaisa: number;
}

export interface DiscountAuditDto {
  invoiceNumber: string;
  saleDate: string;
  cashierName: string;
  grandTotalPaisa: number;
  discountPaisa: number;
  discountPct: number;
  hasItemDiscount: boolean;
}

export interface ReturnReportDto {
  returnNumber: string;
  returnDate: string;
  saleInvoiceNumber?: string;
  cashierName: string;
  refundMethod: RefundMethod;
  totalRefundPaisa: number;
  restockedCount: number;
  quarantinedCount: number;
  reason: string;
}

export interface StockPositionDto {
  productId: string;
  sku: string;
  name: string;
  genericName: string;
  currentStock: number;
  minStockLevel: number;
  mrpPaisa: number;
  costPricePaisa?: number; // Only for Admin / Pharmacist
  totalMrpValuePaisa: number;
  totalCostValuePaisa?: number; // Only for Admin / Pharmacist
  isLowStock: boolean;
  batchCount: number;
}

export interface ExpiryReportDto {
  productId: string;
  productName: string;
  sku: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  daysToExpiry: number;
  quantity: number;
  mrpPaisa: number;
  costPricePaisa?: number;
  status: BatchStatus;
  lossValuePaisa: number;
}

// ─── PHASE 2A: CUSTOMERS & CREDIT LEDGERS ────────────────────────────────────

export enum CustomerType {
  WALK_IN = 'WALK_IN',
  REGULAR = 'REGULAR',
  CORPORATE = 'CORPORATE',
  DOCTOR_CLINIC = 'DOCTOR_CLINIC',
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  [CustomerType.WALK_IN]: 'Walk-in Customer',
  [CustomerType.REGULAR]: 'Regular Customer',
  [CustomerType.CORPORATE]: 'Corporate Account',
  [CustomerType.DOCTOR_CLINIC]: 'Doctor / Clinic Partner',
};

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum CustomerLedgerEntryType {
  CREDIT_SALE = 'CREDIT_SALE',
  SALE_RETURN_CREDIT = 'SALE_RETURN_CREDIT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  OPENING_BALANCE = 'OPENING_BALANCE',
}

export const CreateCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  phone: z.string().min(7, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  cnic: z.string().optional(),
  customerType: z.nativeEnum(CustomerType).default(CustomerType.REGULAR),
  creditLimitPaisa: z.number().int().nonnegative().default(0),
  openingBalancePaisa: z.number().int().nonnegative().default(0),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.ACTIVE),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  status: z.nativeEnum(CustomerStatus).optional(),
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const ReceiveCustomerPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer ID required'),
  amountPaisa: z.number().int().positive('Payment amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type ReceiveCustomerPaymentInput = z.infer<typeof ReceiveCustomerPaymentSchema>;

export interface CustomerDto {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  cnic?: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  creditLimitPaisa: number;
  openingBalancePaisa: number;
  currentBalancePaisa: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLedgerEntryDto {
  id: string;
  customerId: string;
  entryType: CustomerLedgerEntryType;
  debitPaisa: number;
  creditPaisa: number;
  runningBalancePaisa: number;
  referenceType: string;
  referenceId: string;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface CustomerPaymentDto {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName?: string;
  paymentDate: string;
  amountPaisa: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  receivedById?: string | null;
  receivedByName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CustomerAgeingDto {
  customerId: string;
  customerName: string;
  phone: string;
  creditLimitPaisa: number;
  currentBalancePaisa: number;
  currentPaisa: number; // 0 - 30 days
  days31To60Paisa: number;
  days61To90Paisa: number;
  over90DaysPaisa: number;
}

// ─── PHASE 2A: SUPPLIER LEDGER, DEBIT NOTES & EXPIRY CLAIMS ─────────────────

export enum SupplierLedgerEntryType {
  PURCHASE_BILL = 'PURCHASE_BILL',
  PURCHASE_RETURN_DEBIT = 'PURCHASE_RETURN_DEBIT',
  PAYMENT_MADE = 'PAYMENT_MADE',
  EXPIRY_CLAIM_CREDIT_NOTE = 'EXPIRY_CLAIM_CREDIT_NOTE',
  OPENING_BALANCE = 'OPENING_BALANCE',
}

export enum ExpiryClaimStatus {
  CLAIM_PENDING = 'CLAIM_PENDING',
  CREDIT_NOTE_RECEIVED = 'CREDIT_NOTE_RECEIVED',
  ADJUSTED = 'ADJUSTED',
}

export const RecordSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID required'),
  amountPaisa: z.number().int().positive('Payment amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  chequeOrTxNumber: z.string().optional(),
  adjustedCreditNoteId: z.string().optional(),
  notes: z.string().optional(),
});

export type RecordSupplierPaymentInput = z.infer<typeof RecordSupplierPaymentSchema>;

export interface SupplierLedgerEntryDto {
  id: string;
  supplierId: string;
  entryType: SupplierLedgerEntryType;
  creditPaisa: number;
  debitPaisa: number;
  runningBalancePaisa: number;
  referenceType: string;
  referenceId: string;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface SupplierPaymentDto {
  id: string;
  voucherNumber: string;
  supplierId: string;
  supplierName?: string;
  paymentDate: string;
  amountPaisa: number;
  paymentMethod: PaymentMethod;
  chequeOrTxNumber?: string | null;
  adjustedCreditNoteId?: string | null;
  paidById?: string | null;
  paidByName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export const CreateDebitNoteItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  batchId: z.string().min(1),
  batchNumber: z.string().min(1),
  quantitySmallestUnits: z.number().int().positive(),
  costPricePaisaPerUnit: z.number().int().nonnegative(),
});

export const CreateDebitNoteSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID required'),
  purchaseId: z.string().optional(),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  notes: z.string().optional(),
  items: z.array(CreateDebitNoteItemSchema).min(1, 'At least one item required for debit note'),
});

export type CreateDebitNoteInput = z.infer<typeof CreateDebitNoteSchema>;

export interface DebitNoteItemDto {
  id: string;
  debitNoteId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  quantitySmallestUnits: number;
  costPricePaisaPerUnit: number;
  totalAmountPaisa: number;
}

export interface DebitNoteDto {
  id: string;
  debitNoteNumber: string;
  supplierId: string;
  supplierName?: string;
  purchaseId?: string | null;
  returnDate: string;
  totalAmountPaisa: number;
  reason: string;
  status: string;
  notes?: string | null;
  items: DebitNoteItemDto[];
  createdAt: string;
}

export const CreateExpiryClaimItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  batchId: z.string().min(1),
  batchNumber: z.string().min(1),
  expiryDate: z.string(),
  quantitySmallestUnits: z.number().int().positive(),
  costPricePaisa: z.number().int().nonnegative(),
});

export const CreateExpiryClaimSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID required'),
  notes: z.string().optional(),
  items: z.array(CreateExpiryClaimItemSchema).min(1, 'At least one batch item required for claim'),
});

export type CreateExpiryClaimInput = z.infer<typeof CreateExpiryClaimSchema>;

export const UpdateExpiryClaimStatusSchema = z.object({
  status: z.nativeEnum(ExpiryClaimStatus),
  creditNoteNumber: z.string().optional(),
  creditNoteAmountPaisa: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export type UpdateExpiryClaimStatusInput = z.infer<typeof UpdateExpiryClaimStatusSchema>;

export interface ExpiryClaimItemDto {
  id: string;
  claimId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantitySmallestUnits: number;
  costPricePaisa: number;
  totalAmountPaisa: number;
}

export interface ExpiryClaimDto {
  id: string;
  claimNumber: string;
  supplierId: string;
  supplierName?: string;
  claimDate: string;
  status: ExpiryClaimStatus;
  totalClaimPaisa: number;
  creditNoteNumber?: string | null;
  creditNoteReceivedDate?: string | null;
  creditNoteAmountPaisa?: number | null;
  adjustedAt?: string | null;
  adjustedPaymentId?: string | null;
  notes?: string | null;
  items: ExpiryClaimItemDto[];
  createdAt: string;
  updatedAt: string;
}

// ─── PHASE 2B: ACCOUNTS, CASH BOOK, P&L, COMPLIANCE ─────────────────────────

export enum CashBookEntryType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

export enum CashBookCategory {
  OPENING_BALANCE = 'OPENING_BALANCE',
  SALE_CASH = 'SALE_CASH',
  CUSTOMER_PAYMENT = 'CUSTOMER_PAYMENT',
  EXPENSE = 'EXPENSE',
  SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT',
  CASH_DROP = 'CASH_DROP',
  OTHER = 'OTHER',
}

export enum ExpenseCategory {
  UTILITIES = 'UTILITIES',
  SALARIES = 'SALARIES',
  RENT = 'RENT',
  PACKAGING = 'PACKAGING',
  MAINTENANCE = 'MAINTENANCE',
  TEA_REFRESHMENT = 'TEA_REFRESHMENT',
  TRANSPORT = 'TRANSPORT',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}

export enum ShiftClosingStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RECONCILED = 'RECONCILED',
}

export const RecordExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory),
  amountPaisa: z.number().int().positive('Expense amount must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  payee: z.string().min(2, 'Payee / recipient name is required'),
  expenseDate: z.string().optional(),
  notes: z.string().optional(),
  receiptImage: z.string().optional(),
});
export type RecordExpenseInput = z.infer<typeof RecordExpenseSchema>;

export const CreateShiftClosingSchema = z.object({
  cashierId: z.string().min(1, 'Cashier ID required'),
  cashierName: z.string().min(1, 'Cashier name required'),
  shiftStart: z.string(),
  shiftEnd: z.string().optional(),
  openingCashPaisa: z.number().int().nonnegative().default(0),
  countedCashPaisa: z.number().int().nonnegative('Counted cash must be non-negative'),
  denominations: z.record(z.number().int().nonnegative()).optional(),
  notes: z.string().optional(),
});
export type CreateShiftClosingInput = z.infer<typeof CreateShiftClosingSchema>;

export const CapturePrescriptionSchema = z.object({
  doctorName: z.string().min(2, 'Doctor name is required'),
  doctorRegNo: z.string().optional(),
  doctorHospital: z.string().optional(),
  patientName: z.string().min(2, 'Patient name is required'),
  patientCnic: z.string().optional(),
  patientPhone: z.string().optional(),
  patientAge: z.number().int().positive().optional(),
  patientGender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  imageUrl: z.string().optional(),
  saleId: z.string().optional(),
  notes: z.string().optional(),
});
export type CapturePrescriptionInput = z.infer<typeof CapturePrescriptionSchema>;

export const CreateControlledDrugRegisterEntrySchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  genericName: z.string().min(1, 'Generic name is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  drugClass: z.string().default('CONTROLLED'),
  movementType: z.enum(['INFLOW', 'OUTFLOW']),
  quantitySmallestUnits: z.number().int().positive('Quantity must be greater than zero'),
  balanceAfterSmallestUnits: z.number().int().nonnegative('Balance must be non-negative'),
  patientName: z.string().optional(),
  patientCnic: z.string().optional(),
  doctorName: z.string().optional(),
  doctorRegNo: z.string().optional(),
  prescriptionRef: z.string().optional(),
  invoiceNumber: z.string().optional(),
  dispensedByName: z.string().min(1, 'Dispenser name is required'),
  notes: z.string().optional(),
});
export type CreateControlledDrugRegisterEntryInput = z.infer<typeof CreateControlledDrugRegisterEntrySchema>;

export interface CashBookEntryDto {
  id: string;
  date: string;
  entryType: CashBookEntryType;
  category: CashBookCategory;
  amountPaisa: number;
  runningBalancePaisa: number;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  performedById?: string | null;
  performedByName?: string | null;
  createdAt: string;
}

export interface ExpenseDto {
  id: string;
  voucherNumber: string;
  category: ExpenseCategory;
  amountPaisa: number;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  payee: string;
  notes?: string | null;
  receiptImage?: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface ShiftClosingDto {
  id: string;
  closingNumber: string;
  cashierId: string;
  cashierName: string;
  shiftStart: string;
  shiftEnd: string;
  openingCashPaisa: number;
  cashSalesPaisa: number;
  customerReceiptsPaisa: number;
  cashExpensesPaisa: number;
  supplierCashPaymentsPaisa: number;
  expectedCashPaisa: number;
  countedCashPaisa: number;
  differencePaisa: number; // counted - expected (negative = shortage, positive = excess)
  denominations?: Record<string, number> | null;
  status: ShiftClosingStatus;
  notes?: string | null;
  verifiedById?: string | null;
  verifiedByName?: string | null;
  createdAt: string;
}

export interface ProfitAndLossDto {
  periodStart: string;
  periodEnd: string;
  grossSalesPaisa: number;
  discountPaisa: number;
  netSalesPaisa: number;
  cogsPaisa: number; // Cost of goods sold based on exact batch cost price
  grossProfitPaisa: number; // netSales - cogs
  grossMarginPct: number;
  totalExpensesPaisa: number;
  expensesByCategory: Record<string, number>;
  netOperatingProfitPaisa: number; // grossProfit - totalExpenses
  netMarginPct: number;
}

export interface MarginReportItemDto {
  id: string;
  name: string;
  secondaryName?: string;
  unitsSold: number;
  revenuePaisa: number;
  costPaisa: number;
  profitPaisa: number;
  marginPct: number;
}

export interface StockValuationDto {
  totalBatches: number;
  totalProducts: number;
  valuationAtCostPaisa: number; // Stock valued at exact purchase cost
  valuationAtMrpPaisa: number;  // Stock valued at retail MRP
  unrealizedProfitPaisa: number;
  potentialMarginPct: number;
}

export interface SalesTaxSummaryDto {
  periodStart: string;
  periodEnd: string;
  taxableSalesPaisa: number;
  exemptSalesPaisa: number;
  outputTaxCollectedPaisa: number;
  inputTaxPurchasesPaisa: number;
  netTaxPayablePaisa: number;
}

export interface PrescriptionDto {
  id: string;
  prescriptionNumber: string;
  saleId?: string | null;
  doctorName: string;
  doctorRegNo?: string | null;
  doctorHospital?: string | null;
  patientName: string;
  patientCnic?: string | null;
  patientPhone?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  capturedById: string;
  capturedByName: string;
  createdAt: string;
}

export interface ControlledDrugRegisterEntryDto {
  id: string;
  date: string;
  productId: string;
  productName: string;
  genericName: string;
  batchNumber: string;
  drugClass: DrugClass;
  movementType: 'INFLOW' | 'OUTFLOW';
  quantitySmallestUnits: number;
  balanceAfterSmallestUnits: number;
  patientName?: string | null;
  patientCnic?: string | null;
  doctorName?: string | null;
  doctorRegNo?: string | null;
  prescriptionRef?: string | null;
  invoiceNumber?: string | null;
  dispensedByName: string;
  notes?: string | null;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PHASE 2C: ALERTS, DASHBOARD, PHYSICAL STOCKTAKE, RECALL & REPORTS
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. ALERTS & DASHBOARD ─────────────────────────────────────────────────────

export const AlertType = {
  LOW_STOCK: 'LOW_STOCK',
  NEAR_EXPIRY_1M: 'NEAR_EXPIRY_1M',
  NEAR_EXPIRY_3M: 'NEAR_EXPIRY_3M',
  NEAR_EXPIRY_6M: 'NEAR_EXPIRY_6M',
  PRICE_INCREASE: 'PRICE_INCREASE',
  PRICE_DECREASE: 'PRICE_DECREASE',
  COLD_STORAGE: 'COLD_STORAGE',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const AlertSeverity = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export interface AlertDto {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  productId: string;
  productName: string;
  productSku: string;
  batchId?: string;
  batchNumber?: string;
  currentStock?: number;
  reorderLevel?: number;
  daysToExpiry?: number;
  expiryDate?: string;
  oldCostPricePaisa?: number;
  newCostPricePaisa?: number;
  isRefrigerated: boolean;
  linkPath: string;
}

export interface DashboardMetricsDto {
  todaySalesGrossPaisa: number;
  todaySalesNetPaisa: number;
  todayProfitPaisa: number;
  todayCashPaisa: number;
  todayInvoicesCount: number;
  lowStockCount: number;
  expiringValue1mPaisa: number;
  expiringValue3mPaisa: number;
  expiringValue6mPaisa: number;
  totalExpiringValuePaisa: number;
  topSellers: Array<{
    productId: string;
    productName: string;
    sku: string;
    unitsSold: number;
    revenuePaisa: number;
    profitPaisa: number;
    isRefrigerated: boolean;
  }>;
  alertsSummary: {
    totalAlerts: number;
    lowStockCount: number;
    nearExpiryCount: number;
    priceChangeCount: number;
    coldStorageCount: number;
  };
  recentAlerts: AlertDto[];
}

// ── 2. PHYSICAL STOCKTAKE (Section 10) ────────────────────────────────────────

export const StocktakeStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type StocktakeStatus = (typeof StocktakeStatus)[keyof typeof StocktakeStatus];

export interface StocktakeItemDto {
  id: string;
  stocktakeId: string;
  productId: string;
  productName: string;
  productSku: string;
  rackLocation: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  systemQuantity: number;
  countedQuantity: number | null;
  varianceQuantity: number; // countedQuantity - systemQuantity
  costPricePaisa: number;
  varianceValuePaisa: number; // varianceQuantity * costPricePaisa
  isRefrigerated: boolean;
}

export interface StocktakeDto {
  id: string;
  stocktakeNumber: string;
  rackLocation?: string | null;
  status: StocktakeStatus;
  notes?: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectedById?: string | null;
  rejectedByName?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  totalItems: number;
  varianceItemsCount: number;
  netVarianceQuantity: number;
  netVarianceValuePaisa: number;
  items: StocktakeItemDto[];
}

export const CreateStocktakeSchema = z.object({
  rackLocation: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateStocktakeInput = z.infer<typeof CreateStocktakeSchema>;

export const UpdateStocktakeCountsSchema = z.object({
  items: z.array(
    z.object({
      batchId: z.string().min(1),
      countedQuantity: z.number().int().min(0),
    })
  ),
  notes: z.string().optional(),
  submitForReview: z.boolean().optional(),
});
export type UpdateStocktakeCountsInput = z.infer<typeof UpdateStocktakeCountsSchema>;

export const ApproveStocktakeSchema = z.object({
  notes: z.string().optional(),
});
export type ApproveStocktakeInput = z.infer<typeof ApproveStocktakeSchema>;

// ── 3. BATCH RECALL REPORT (Section 12) ────────────────────────────────────────

export interface RecallInvoiceDto {
  invoiceNumber: string;
  saleDate: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string | null;
  customerCnic?: string | null;
  quantitySold: number;
  unitPricePaisa: number;
  totalPaisa: number;
}

export interface RecallSupplierDto {
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  phone: string;
  contactPerson: string;
  billNumber: string;
  billDate: string;
  costPricePaisa: number;
}

export interface RecallReportDto {
  productId: string;
  productName: string;
  productSku: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  isRefrigerated: boolean;
  initialQuantity: number;
  currentStockRemaining: number;
  totalUnitsSold: number;
  supplier: RecallSupplierDto | null;
  invoices: RecallInvoiceDto[];
  affectedCustomersCount: number;
}

// ── 4. REMAINING REPORTS (Section 11) ──────────────────────────────────────────

export interface PurchaseReportItemDto {
  id: string;
  billNumber: string;
  billDate: string;
  supplierName: string;
  supplierCode: string;
  status: string;
  itemCount: number;
  totalAmountPaisa: number;
  discountPaisa: number;
  netPayablePaisa: number;
  paidAmountPaisa: number;
  balanceDuePaisa: number;
}

export interface DeadStockItemDto {
  productId: string;
  productName: string;
  sku: string;
  genericName: string;
  rackLocation: string;
  quantityInStock: number;
  unitCostPricePaisa: number;
  tiedUpCapitalPaisa: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number;
  isRefrigerated: boolean;
}

export interface MovementSpeedItemDto {
  productId: string;
  productName: string;
  sku: string;
  unitsSold: number;
  revenuePaisa: number;
  currentStock: number;
  monthlyVelocity: number;
  category: 'FAST' | 'NORMAL' | 'SLOW';
  isRefrigerated: boolean;
}

export interface ComplianceSummaryDto {
  dateRange: { startDate: string; endDate: string };
  controlledDrugEntriesCount: number;
  controlledNarcoticInflow: number;
  controlledNarcoticOutflow: number;
  controlledPsychotropicInflow: number;
  controlledPsychotropicOutflow: number;
  prescriptionsCapturedCount: number;
  prescriptionsVerifiedCount: number;
  doctorPmdcVerifiedCount: number;
  auditEventsCount: number;
  coldStorageCheckCompliancePct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: REORDER SUGGESTIONS & DRAFT PURCHASE ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ReorderSuggestionItemDto {
  productId: string;
  productName: string;
  sku: string;
  genericName?: string;
  rackLocation?: string;
  isRefrigerated: boolean;
  minStockLevel: number;
  currentStock: number;
  sales30d: number;
  sales60d: number;
  sales90d: number;
  dailyRunRate: number;
  daysStockRemaining: number;
  urgency: 'OUT_OF_STOCK' | 'CRITICAL' | 'REORDER_NOW' | 'ADEQUATE';
  suggestedReorderBaseUnits: number;
  packUnitName: string;
  conversionFactor: number;
  suggestedPackUnits: number;
  unitCostPaisa: number;
  estimatedCostPaisa: number;
  primarySupplierId: string;
  primarySupplierName: string;
  supplierCode?: string;
  supplierPhone?: string;
}

export interface SupplierReorderGroupDto {
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  supplierPhone?: string;
  itemCount: number;
  totalEstimatedPaisa: number;
  items: ReorderSuggestionItemDto[];
}

export interface DraftPoItemDto {
  productId: string;
  productName: string;
  sku: string;
  unitName: string;
  conversionFactor: number;
  quantityInPacks: number;
  totalSmallestUnits: number;
  costPricePaisa: number;
  lineTotalPaisa: number;
}

export interface DraftPurchaseOrderDto {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  createdAt: string;
  createdByName: string;
  targetCoverageDays: number;
  speedWindowDays: 30 | 60 | 90;
  totalEstimatedPaisa: number;
  status: 'DRAFT' | 'SENT_TO_SUPPLIER' | 'CONVERTED_TO_PURCHASE';
  notes?: string;
  items: DraftPoItemDto[];
}

export const CreateDraftPoSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  targetCoverageDays: z.number().int().min(7).max(180).default(30),
  speedWindowDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      productName: z.string().min(1),
      sku: z.string().min(1),
      unitName: z.string().min(1),
      conversionFactor: z.number().int().min(1).default(1),
      quantityInPacks: z.number().int().min(1),
      costPricePaisa: z.number().int().min(0),
    })
  ).min(1, 'At least one item must be included in the draft PO'),
});
export type CreateDraftPoInput = z.infer<typeof CreateDraftPoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: ADVANCED ANALYTICS (Margins, Companies, Categories, Cashiers)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompanyMarginDto {
  companyId: string;
  companyName: string;
  productCount: number;
  unitsSold: number;
  revenuePaisa: number;
  costPaisa: number;
  grossProfitPaisa: number;
  marginPct: number;
  topProduct: string;
}

export interface CategoryMarginDto {
  categoryId: string;
  categoryName: string;
  productCount: number;
  unitsSold: number;
  revenuePaisa: number;
  costPaisa: number;
  grossProfitPaisa: number;
  marginPct: number;
}

export interface CashierPerformanceDto {
  cashierId: string;
  cashierName: string;
  invoiceCount: number;
  unitsSold: number;
  grossSalesPaisa: number;
  discountGivenPaisa: number;
  netSalesPaisa: number;
  grossProfitPaisa: number;
  avgBasketPaisa: number;
  marginPct: number;
}

export interface AdvancedAnalyticsDto {
  dateRange: { startDate: string; endDate: string };
  overallRevenuePaisa: number;
  overallCostPaisa: number;
  overallProfitPaisa: number;
  overallMarginPct: number;
  byCompany: CompanyMarginDto[];
  byCategory: CategoryMarginDto[];
  byCashier: CashierPerformanceDto[];
  fastMovers: MovementSpeedItemDto[];
  slowMovers: MovementSpeedItemDto[];
  deadStock: DeadStockItemDto[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: WHATSAPP / SMS CREDIT & REFILL REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

export interface CreditReminderItemDto {
  customerId: string;
  customerName: string;
  phone: string;
  currentBalancePaisa: number;
  creditLimitPaisa: number;
  daysOverdue: number;
  lastPaymentDate: string | null;
  suggestedMessage: string;
}

export interface RefillReminderItemDto {
  id: string;
  patientName: string;
  phone: string;
  doctorName?: string;
  medicineName: string;
  dosageForm: string;
  lastPurchaseDate: string;
  daysSupply: number;
  daysSincePurchase: number;
  daysUntilRefill: number;
  isOverdue: boolean;
  suggestedMessage: string;
}

export interface ReminderLogDto {
  id: string;
  recipientName: string;
  phone: string;
  reminderType: 'CREDIT' | 'REFILL';
  channel: 'WHATSAPP' | 'SMS';
  sentAt: string;
  messageText: string;
  status: 'SENT' | 'FAILED';
}

export const SendReminderSchema = z.object({
  recipientName: z.string().min(1),
  recipientPhone: z.string().min(8),
  reminderType: z.enum(['CREDIT', 'REFILL']),
  channel: z.enum(['WHATSAPP', 'SMS']).default('WHATSAPP'),
  messageText: z.string().min(1),
  referenceId: z.string().optional(),
});
export type SendReminderInput = z.infer<typeof SendReminderSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: BARCODE LABEL PRINTING
// ─────────────────────────────────────────────────────────────────────────────

export interface BarcodeLabelDto {
  productId: string;
  productName: string;
  strength: string;
  sku: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  mrpPaisa: number;
  rackLocation: string;
  quantityToPrint: number;
}

export const PrintLabelsSchema = z.object({
  labelSize: z.enum(['50x25', '38x25', 'A4_24UP', 'A4_40UP']).default('50x25'),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      productName: z.string().min(1),
      strength: z.string().optional(),
      sku: z.string().min(1),
      barcode: z.string().min(1),
      batchNumber: z.string().min(1),
      expiryDate: z.string().min(1),
      mrpPaisa: z.number().int().min(0),
      rackLocation: z.string().optional(),
      quantityToPrint: z.number().int().min(1).max(500).default(1),
    })
  ).min(1, 'Select at least one product label to print'),
});
export type PrintLabelsInput = z.infer<typeof PrintLabelsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: MULTI-BRANCH: CENTRAL STOCK, TRANSFERS, SEPARATE CASH BOOKS
// ─────────────────────────────────────────────────────────────────────────────

export interface BranchDto {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  isMainBranch: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  currentCashPaisa: number;
  todaySalesPaisa: number;
}

export interface StockTransferItemDto {
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  quantitySmallestUnits: number;
  unitName: string;
  conversionFactor: number;
  quantityInUnit: number;
}

export const StockTransferStatus = {
  REQUESTED: 'REQUESTED',
  DISPATCHED: 'DISPATCHED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type StockTransferStatus = (typeof StockTransferStatus)[keyof typeof StockTransferStatus];

export interface StockTransferDto {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  status: StockTransferStatus;
  notes?: string;
  createdAt: string;
  createdByName: string;
  dispatchedAt?: string;
  receivedAt?: string;
  items: StockTransferItemDto[];
}

export const CreateStockTransferSchema = z.object({
  sourceBranchId: z.string().min(1, 'Source branch is required'),
  destinationBranchId: z.string().min(1, 'Destination branch is required'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      productName: z.string().min(1),
      sku: z.string().min(1),
      batchNumber: z.string().min(1),
      expiryDate: z.string().min(1),
      quantityInUnit: z.number().int().min(1),
      unitName: z.string().min(1),
      conversionFactor: z.number().int().min(1).default(1),
    })
  ).min(1, 'At least one item required for stock transfer'),
});
export type CreateStockTransferInput = z.infer<typeof CreateStockTransferSchema>;

