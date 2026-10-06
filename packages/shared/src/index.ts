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
    primary: '#15803D',       // Header bars, Save/primary buttons, headings, active menu
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
  allowedRoles: UserRole[];
  badge?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
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
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER],
    badge: 'F1',
  },
  {
    id: 'products',
    title: 'Medicine Catalog',
    path: '/products',
    icon: 'Pill',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
  },
  {
    id: 'suppliers',
    title: 'Suppliers & Creditors',
    path: '/suppliers',
    icon: 'Truck',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.ACCOUNTANT],
  },
  {
    id: 'purchases',
    title: 'Purchases & GRN',
    path: '/purchases',
    icon: 'Truck',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
  },
  {
    id: 'stock',
    title: 'Batch Stock & Expiry',
    path: '/stock',
    icon: 'PackageSearch',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY],
  },
  {
    id: 'accounts',
    title: 'Accounts & Ledgers',
    path: '/accounts',
    icon: 'Receipt',
    allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT],
  },
  {
    id: 'reports',
    title: 'Reports & Audits',
    path: '/reports',
    icon: 'BarChart3',
    allowedRoles: [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT],
  },
  {
    id: 'style-guide',
    title: 'Pharma Style Guide',
    path: '/style-guide',
    icon: 'Palette',
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.PHARMACIST,
      UserRole.CASHIER,
      UserRole.INVENTORY,
      UserRole.ACCOUNTANT,
    ],
    badge: 'Phase 0',
  },
  {
    id: 'settings',
    title: 'System Settings',
    path: '/settings',
    icon: 'Sliders',
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

