import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  ProductSchema,
  DrugClass,
  StorageCondition,
  ProductStatus,
  calculateLoosePrice,
} from '@pharmacy/shared';

// Demo initial products dataset used if DB is offline or before seed
export const SEED_PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'MED-PAN-500',
    name: 'Panadol 500mg',
    urduName: 'پیناڈول ۵۰۰ ملی گرام',
    genericName: 'Paracetamol',
    strength: '500mg',
    dosageForm: 'Tablet',
    drugClass: 'OTC',
    storageCondition: 'ROOM_TEMPERATURE',
    categoryId: 'cat-2',
    categoryName: 'Analgesics & Antipyretics',
    companyId: 'comp-1',
    companyName: 'GSK Pakistan',
    primarySupplierId: 'sup-1',
    primarySupplierName: 'Al-Madina Pharma Distributors',
    minStockLevel: 200,
    maxStockLevel: 2000,
    currentStock: 1250,
    rackLocation: 'Rack A-01',
    taxRatePct: 0.0,
    status: 'ACTIVE',
    requiresPrescription: false,
    isLooseSellingEnabled: true,
    loosePricePaisa: 350, // Rs 3.50 per tablet
    mrpPaisa: 7000,       // Rs 70.00 per pack of 20 tablets
    costPricePaisa: 5800, // Rs 58.00 trade price
    units: [
      { unitName: 'Box', conversionFactor: 200, isBaseUnit: false, isDefaultSellingUnit: true, barcode: '8964000123456' },
      { unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: false, barcode: '8964000123457' },
      { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, barcode: '8964000123458', pricePaisa: 350 },
    ],
    barcodes: ['8964000123456', '8964000123457', '8964000123458'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    sku: 'MED-CAL-500',
    name: 'Calpol 500mg',
    urduName: 'کالپول ۵۰۰ ملی گرام',
    genericName: 'Paracetamol', // Substitute of Panadol 500mg!
    strength: '500mg',
    dosageForm: 'Tablet',
    drugClass: 'OTC',
    storageCondition: 'ROOM_TEMPERATURE',
    categoryId: 'cat-2',
    categoryName: 'Analgesics & Antipyretics',
    companyId: 'comp-1',
    companyName: 'GSK Pakistan',
    primarySupplierId: 'sup-1',
    primarySupplierName: 'Al-Madina Pharma Distributors',
    minStockLevel: 100,
    maxStockLevel: 1000,
    currentStock: 480,
    rackLocation: 'Rack A-02',
    taxRatePct: 0.0,
    status: 'ACTIVE',
    requiresPrescription: false,
    isLooseSellingEnabled: true,
    loosePricePaisa: 350,
    mrpPaisa: 6800,
    costPricePaisa: 5650,
    units: [
      { unitName: 'Box', conversionFactor: 200, isBaseUnit: false, isDefaultSellingUnit: true, barcode: '8964000123460' },
      { unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: false, barcode: '8964000123461' },
      { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, barcode: '8964000123462', pricePaisa: 350 },
    ],
    barcodes: ['8964000123460', '8964000123461', '8964000123462'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    sku: 'MED-AUG-625',
    name: 'Augmentin 625mg',
    urduName: 'آگمنٹن ۶۲۵ ملی گرام',
    genericName: 'Amoxicillin + Clavulanic Acid',
    strength: '625mg',
    dosageForm: 'Tablet',
    drugClass: 'RX',
    storageCondition: 'ROOM_TEMPERATURE',
    categoryId: 'cat-1',
    categoryName: 'Antibiotics',
    companyId: 'comp-1',
    companyName: 'GSK Pakistan',
    primarySupplierId: 'sup-1',
    primarySupplierName: 'Al-Madina Pharma Distributors',
    minStockLevel: 50,
    maxStockLevel: 500,
    currentStock: 180,
    rackLocation: 'Rack B-05',
    taxRatePct: 0.0,
    status: 'ACTIVE',
    requiresPrescription: true,
    isLooseSellingEnabled: true,
    loosePricePaisa: 3800, // Rs 38.00 per tablet
    mrpPaisa: 22800,       // Rs 228.00 per strip of 6
    costPricePaisa: 19500,
    units: [
      { unitName: 'Box', conversionFactor: 12, isBaseUnit: false, isDefaultSellingUnit: true, barcode: '8964000222111' },
      { unitName: 'Strip', conversionFactor: 6, isBaseUnit: false, isDefaultSellingUnit: false, barcode: '8964000222112' },
      { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, barcode: '8964000222113', pricePaisa: 3800 },
    ],
    barcodes: ['8964000222111', '8964000222112', '8964000222113'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    sku: 'MED-AMOCLAV-625',
    name: 'Amoclav 625mg',
    urduName: 'اموکلاو ۶۲۵ ملی گرام',
    genericName: 'Amoxicillin + Clavulanic Acid', // Substitute of Augmentin 625mg!
    strength: '625mg',
    dosageForm: 'Tablet',
    drugClass: 'RX',
    storageCondition: 'ROOM_TEMPERATURE',
    categoryId: 'cat-1',
    categoryName: 'Antibiotics',
    companyId: 'comp-2',
    companyName: 'Getz Pharma',
    primarySupplierId: 'sup-2',
    primarySupplierName: 'Khyber Medicos & Wholesale',
    minStockLevel: 30,
    maxStockLevel: 300,
    currentStock: 95,
    rackLocation: 'Rack B-06',
    taxRatePct: 0.0,
    status: 'ACTIVE',
    requiresPrescription: true,
    isLooseSellingEnabled: true,
    loosePricePaisa: 3400,
    mrpPaisa: 20400,
    costPricePaisa: 17200,
    units: [
      { unitName: 'Box', conversionFactor: 12, isBaseUnit: false, isDefaultSellingUnit: true, barcode: '8964000333221' },
      { unitName: 'Strip', conversionFactor: 6, isBaseUnit: false, isDefaultSellingUnit: false, barcode: '8964000333222' },
      { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, barcode: '8964000333223', pricePaisa: 3400 },
    ],
    barcodes: ['8964000333221', '8964000333222', '8964000333223'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    sku: 'MED-RIS-20',
    name: 'Risek 20mg',
    urduName: 'رائزک ۲۰ ملی گرام',
    genericName: 'Omeprazole',
    strength: '20mg',
    dosageForm: 'Capsule',
    drugClass: 'OTC',
    storageCondition: 'ROOM_TEMPERATURE',
    categoryId: 'cat-4',
    categoryName: 'Gastrointestinal',
    companyId: 'comp-2',
    companyName: 'Getz Pharma',
    primarySupplierId: 'sup-2',
    primarySupplierName: 'Khyber Medicos & Wholesale',
    minStockLevel: 50,
    maxStockLevel: 600,
    currentStock: 340,
    rackLocation: 'Rack C-01',
    taxRatePct: 0.0,
    status: 'ACTIVE',
    requiresPrescription: false,
    isLooseSellingEnabled: true,
    loosePricePaisa: 2800, // Rs 28.00 per capsule
    mrpPaisa: 39200,       // Rs 392.00 per pack of 14
    costPricePaisa: 33500,
    units: [
      { unitName: 'Pack', conversionFactor: 14, isBaseUnit: false, isDefaultSellingUnit: true, barcode: '8964000444331' },
      { unitName: 'Capsule', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, barcode: '8964000444332', pricePaisa: 2800 },
    ],
    barcodes: ['8964000444331', '8964000444332'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    sku: 'MED-LIP-20',
    name: 'Lipiget 20mg',
    urduName: 'لیپی گیٹ ۲۰ ملی گرام',
    genericName: 'Atorvastatin',
    strength: '20mg',
    dosageForm: 'Tablet',
    drugClass: 'RX',
    storageCondition: 'ROOM_TEMPERATURE',
    categoryId: 'cat-3',
    categoryName: 'Cardiovascular',
    companyId: 'comp-2',
    companyName: 'Getz Pharma',
    primarySupplierId: 'sup-3',
    primarySupplierName: 'Sindh Healthcare Logistics',
    minStockLevel: 20,
    maxStockLevel: 200,
    currentStock: 80,
    rackLocation: 'Rack C-08',
    taxRatePct: 0.0,
    status: 'ACTIVE',
    requiresPrescription: true,
    isLooseSellingEnabled: true,
    loosePricePaisa: 3200,
    mrpPaisa: 32000,
    costPricePaisa: 27000,
    units: [
      { unitName: 'Pack', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: true, barcode: '8964000555441' },
      { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, barcode: '8964000555442', pricePaisa: 3200 },
    ],
    barcodes: ['8964000555441', '8964000555442'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    sku: 'MED-XAN-05',
    name: 'Xanax 0.5mg',
    urduName: 'زینکس ۰.۵ ملی گرام',
    genericName: 'Alprazolam',
    strength: '0.5mg',
    dosageForm: 'Tablet',
    drugClass: 'CONTROLLED',
    storageCondition: 'ROOM_TEMPERATURE',
    categoryId: 'cat-2',
    categoryName: 'Analgesics & Antipyretics',
    companyId: 'comp-3',
    companyName: 'Abbott Laboratories',
    primarySupplierId: 'sup-3',
    primarySupplierName: 'Sindh Healthcare Logistics',
    minStockLevel: 20,
    maxStockLevel: 100,
    currentStock: 45,
    rackLocation: 'Safe Lock Box A',
    taxRatePct: 0.0,
    status: 'ACTIVE',
    requiresPrescription: true,
    isLooseSellingEnabled: false,
    loosePricePaisa: null,
    mrpPaisa: 18500,
    costPricePaisa: 15500,
    units: [
      { unitName: 'Strip', conversionFactor: 30, isBaseUnit: true, isDefaultSellingUnit: true, barcode: '8964000666551' },
    ],
    barcodes: ['8964000666551'],
    createdAt: new Date().toISOString(),
  },
];

// In-memory price history store for fallback
export const MEMORY_PRICE_HISTORY: Record<string, any[]> = {};

/**
 * Filter out cost and purchase price fields when requesting user is CASHIER
 */
export function sanitizeProductForRole(product: any, role?: string) {
  if (role === 'CASHIER') {
    const { costPricePaisa, ...sanitized } = product;
    if (sanitized.priceHistory) {
      sanitized.priceHistory = sanitized.priceHistory.map((h: any) => {
        const { oldCostPricePaisa, newCostPricePaisa, ...rest } = h;
        return rest;
      });
    }
    return sanitized;
  }
  return product;
}

export const productsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/products
  // Query: q, categoryId, drugClass, status, page, limit
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const user = req.user as any;
      const role = user?.role;
      const {
        q,
        categoryId,
        drugClass,
        status,
        page = '1',
        limit = '50',
      } = req.query as {
        q?: string;
        categoryId?: string;
        drugClass?: string;
        status?: string;
        page?: string;
        limit?: string;
      };

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      try {
        const where: any = {};
        if (q && q.trim().length > 0) {
          const query = q.trim();
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { genericName: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { barcodes: { some: { barcode: { contains: query, mode: 'insensitive' } } } },
          ];
        }
        if (categoryId) where.categoryId = categoryId;
        if (drugClass) where.drugClass = drugClass;
        if (status) where.status = status;

        const [total, products] = await Promise.all([
          prisma.product.count({ where }),
          prisma.product.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { name: 'asc' },
            include: {
              category: { select: { id: true, name: true } },
              company: { select: { id: true, name: true } },
              primarySupplier: { select: { id: true, name: true } },
              units: { orderBy: { conversionFactor: 'desc' } },
              barcodes: true,
            },
          }),
        ]);

        const mapped = products.map((p) => {
          const formatted = {
            ...p,
            categoryName: p.category?.name,
            companyName: p.company?.name,
            primarySupplierName: p.primarySupplier?.name,
            barcodes: p.barcodes.map((b) => b.barcode),
          };
          return sanitizeProductForRole(formatted, role);
        });

        return {
          success: true,
          data: mapped,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        };
      } catch {
        // In-memory fallback
        let filtered = [...SEED_PRODUCTS];
        if (q && q.trim().length > 0) {
          const query = q.toLowerCase().trim();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              p.genericName.toLowerCase().includes(query) ||
              p.sku.toLowerCase().includes(query) ||
              p.barcodes.some((b) => b.includes(query))
          );
        }
        if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId);
        if (drugClass) filtered = filtered.filter((p) => p.drugClass === drugClass);
        if (status) filtered = filtered.filter((p) => p.status === status);

        const total = filtered.length;
        const sliced = filtered.slice(skip, skip + limitNum).map((p) => sanitizeProductForRole(p, role));

        return {
          success: true,
          data: sliced,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        };
      }
    }
  );

  // GET /api/products/search-fast
  // High-performance endpoint for POS barcode scanning and instant typeahead
  fastify.get(
    '/search-fast',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const user = req.user as any;
      const role = user?.role;
      const { term } = req.query as { term?: string };

      if (!term || term.trim().length === 0) {
        return { success: true, data: [] };
      }

      const cleanTerm = term.trim();

      try {
        const products = await prisma.product.findMany({
          where: {
            status: 'ACTIVE',
            OR: [
              { sku: { equals: cleanTerm, mode: 'insensitive' } },
              { barcodes: { some: { barcode: { equals: cleanTerm } } } },
              { name: { contains: cleanTerm, mode: 'insensitive' } },
              { genericName: { contains: cleanTerm, mode: 'insensitive' } },
            ],
          },
          take: 15,
          include: {
            units: { orderBy: { conversionFactor: 'asc' } },
            barcodes: true,
          },
        });

        const sanitized = products.map((p) => sanitizeProductForRole(p, role));
        return { success: true, data: sanitized };
      } catch {
        const lower = cleanTerm.toLowerCase();
        const matches = SEED_PRODUCTS.filter(
          (p) =>
            p.status === ProductStatus.ACTIVE &&
            (p.sku.toLowerCase() === lower ||
              p.barcodes.includes(cleanTerm) ||
              p.name.toLowerCase().includes(lower) ||
              p.genericName.toLowerCase().includes(lower))
        )
          .slice(0, 15)
          .map((p) => sanitizeProductForRole(p, role));

        return { success: true, data: matches };
      }
    }
  );

  // GET /api/products/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;
      const role = user?.role;

      try {
        const product = await prisma.product.findUnique({
          where: { id },
          include: {
            category: true,
            company: true,
            primarySupplier: true,
            units: { orderBy: { conversionFactor: 'desc' } },
            barcodes: true,
            priceHistory: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        });

        if (!product) {
          return reply.status(404).send({ success: false, message: 'Product not found' });
        }

        const formatted = {
          ...product,
          categoryName: product.category?.name,
          companyName: product.company?.name,
          primarySupplierName: product.primarySupplier?.name,
          barcodes: product.barcodes.map((b) => b.barcode),
        };

        return { success: true, data: sanitizeProductForRole(formatted, role) };
      } catch {
        const found = SEED_PRODUCTS.find((p) => p.id === id);
        if (!found) {
          return reply.status(404).send({ success: false, message: 'Product not found' });
        }
        const withHistory = {
          ...found,
          priceHistory: MEMORY_PRICE_HISTORY[id] || [],
        };
        return { success: true, data: sanitizeProductForRole(withHistory, role) };
      }
    }
  );

  // GET /api/products/:id/substitutes
  // Automatically finds products sharing the exact same genericName + strength
  fastify.get(
    '/:id/substitutes',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;
      const role = user?.role;

      try {
        const current = await prisma.product.findUnique({
          where: { id },
          select: { id: true, genericName: true, strength: true },
        });

        if (!current) {
          return reply.status(404).send({ success: false, message: 'Product not found' });
        }

        const substitutes = await prisma.product.findMany({
          where: {
            id: { not: current.id },
            genericName: { equals: current.genericName, mode: 'insensitive' },
            strength: { equals: current.strength, mode: 'insensitive' },
            status: 'ACTIVE',
          },
          include: {
            company: { select: { name: true } },
          },
        });

        const mapped = substitutes.map((s) => ({
          id: s.id,
          sku: s.sku,
          name: s.name,
          companyName: s.company?.name,
          genericName: s.genericName,
          strength: s.strength,
          dosageForm: s.dosageForm,
          mrpPaisa: s.mrpPaisa,
          currentStock: s.currentStock,
          rackLocation: s.rackLocation,
          status: s.status,
        }));

        return { success: true, data: mapped };
      } catch {
        const current = SEED_PRODUCTS.find((p) => p.id === id);
        if (!current) {
          return reply.status(404).send({ success: false, message: 'Product not found' });
        }

        const substitutes = SEED_PRODUCTS.filter(
          (p) =>
            p.id !== current.id &&
            p.genericName.toLowerCase() === current.genericName.toLowerCase() &&
            p.strength.toLowerCase() === current.strength.toLowerCase() &&
            p.status === ProductStatus.ACTIVE
        ).map((s) => ({
          id: s.id,
          sku: s.sku,
          name: s.name,
          companyName: s.companyName,
          genericName: s.genericName,
          strength: s.strength,
          dosageForm: s.dosageForm,
          mrpPaisa: s.mrpPaisa,
          currentStock: s.currentStock,
          rackLocation: s.rackLocation,
          status: s.status,
        }));

        return { success: true, data: substitutes };
      }
    }
  );

  // POST /api/products (Admin / Pharmacist / Inventory only)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const parsed = ProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid product input',
          errors: parsed.error.issues,
        });
      }

      const input = parsed.data;
      const user = req.user as any;

      // Auto-calculate loose price if loose selling enabled and loosePricePaisa is not specified
      let loosePricePaisa = input.loosePricePaisa;
      if (input.isLooseSellingEnabled && !loosePricePaisa) {
        const baseUnit = input.units.find((u) => u.isBaseUnit);
        const topUnit = input.units.find((u) => !u.isBaseUnit);
        const unitsPerPack = topUnit?.conversionFactor || 1;
        loosePricePaisa = calculateLoosePrice(input.mrpPaisa, unitsPerPack);
      }

      try {
        const product = await prisma.$transaction(async (tx) => {
          const created = await tx.product.create({
            data: {
              sku: input.sku.toUpperCase(),
              name: input.name,
              urduName: input.urduName || null,
              genericName: input.genericName,
              strength: input.strength,
              dosageForm: input.dosageForm,
              drugClass: input.drugClass as any,
              storageCondition: input.storageCondition as any,
              categoryId: input.categoryId || null,
              companyId: input.companyId || null,
              primarySupplierId: input.primarySupplierId || null,
              minStockLevel: input.minStockLevel,
              maxStockLevel: input.maxStockLevel,
              currentStock: input.currentStock || 0,
              rackLocation: input.rackLocation || null,
              taxRatePct: input.taxRatePct,
              status: input.status as any,
              requiresPrescription: input.requiresPrescription,
              isLooseSellingEnabled: input.isLooseSellingEnabled,
              loosePricePaisa: loosePricePaisa || null,
              mrpPaisa: input.mrpPaisa,
              costPricePaisa: input.costPricePaisa || null,
            },
          });

          // Units
          if (input.units && input.units.length > 0) {
            for (const unit of input.units) {
              await tx.productUnit.create({
                data: {
                  productId: created.id,
                  unitName: unit.unitName,
                  conversionFactor: unit.conversionFactor,
                  isBaseUnit: unit.isBaseUnit,
                  isDefaultSellingUnit: unit.isDefaultSellingUnit,
                  barcode: unit.barcode || null,
                  pricePaisa: unit.pricePaisa || null,
                },
              });
            }
          }

          // Barcodes
          if (input.barcodes && input.barcodes.length > 0) {
            for (let i = 0; i < input.barcodes.length; i++) {
              const code = input.barcodes[i];
              if (code.trim()) {
                await tx.productBarcode.create({
                  data: {
                    productId: created.id,
                    barcode: code.trim(),
                    isPrimary: i === 0,
                  },
                });
              }
            }
          }

          // Initial Price History
          await tx.priceHistory.create({
            data: {
              productId: created.id,
              oldMrpPaisa: input.mrpPaisa,
              newMrpPaisa: input.mrpPaisa,
              oldCostPricePaisa: input.costPricePaisa,
              newCostPricePaisa: input.costPricePaisa,
              changeReason: 'Initial Product Creation',
              changedByUserId: user?.id,
              changedByName: user?.fullName || user?.username,
            },
          });

          // Audit Log
          await tx.auditLog.create({
            data: {
              userId: user?.id,
              userName: user?.fullName || user?.username,
              role: user?.role,
              action: 'CREATE_PRODUCT',
              entity: 'Product',
              entityId: created.id,
              newValue: { sku: input.sku, name: input.name, mrpPaisa: input.mrpPaisa },
            },
          });

          return created;
        });

        return { success: true, data: product };
      } catch (err: any) {
        // Fallback for offline DB: add to memory
        const newProd = {
          ...input,
          id: `prod-${Date.now()}`,
          loosePricePaisa,
          createdAt: new Date().toISOString(),
        };
        SEED_PRODUCTS.unshift(newProd as any);
        return { success: true, data: newProd, message: 'Saved to memory (DB offline)' };
      }
    }
  );

  // PUT /api/products/:id (Admin / Pharmacist / Inventory only)
  fastify.put(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = ProductSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid product input',
        });
      }

      const input = parsed.data;
      const user = req.user as any;

      try {
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
          return reply.status(404).send({ success: false, message: 'Product not found' });
        }

        const mrpChanged = input.mrpPaisa !== undefined && input.mrpPaisa !== existing.mrpPaisa;
        const costChanged = input.costPricePaisa !== undefined && input.costPricePaisa !== existing.costPricePaisa;

        const updated = await prisma.$transaction(async (tx) => {
          const prod = await tx.product.update({
            where: { id },
            data: {
              name: input.name,
              urduName: input.urduName,
              genericName: input.genericName,
              strength: input.strength,
              dosageForm: input.dosageForm,
              drugClass: input.drugClass as any,
              storageCondition: input.storageCondition as any,
              categoryId: input.categoryId,
              companyId: input.companyId,
              primarySupplierId: input.primarySupplierId,
              minStockLevel: input.minStockLevel,
              maxStockLevel: input.maxStockLevel,
              rackLocation: input.rackLocation,
              taxRatePct: input.taxRatePct,
              status: input.status as any,
              requiresPrescription: input.requiresPrescription,
              isLooseSellingEnabled: input.isLooseSellingEnabled,
              loosePricePaisa: input.loosePricePaisa,
              mrpPaisa: input.mrpPaisa,
              costPricePaisa: input.costPricePaisa,
            },
          });

          // If price changed, record in PriceHistory
          if (mrpChanged || costChanged) {
            await tx.priceHistory.create({
              data: {
                productId: id,
                oldMrpPaisa: existing.mrpPaisa,
                newMrpPaisa: input.mrpPaisa ?? existing.mrpPaisa,
                oldCostPricePaisa: existing.costPricePaisa,
                newCostPricePaisa: input.costPricePaisa ?? existing.costPricePaisa,
                changeReason: (req.body as any).changeReason || 'Price update via Product Master',
                changedByUserId: user?.id,
                changedByName: user?.fullName || user?.username,
              },
            });
          }

          // Audit Log
          await tx.auditLog.create({
            data: {
              userId: user?.id,
              userName: user?.fullName || user?.username,
              role: user?.role,
              action: 'UPDATE_PRODUCT',
              entity: 'Product',
              entityId: id,
              oldValue: existing as any,
              newValue: prod as any,
            },
          });

          return prod;
        });

        return { success: true, data: updated };
      } catch (err: any) {
        // Fallback for offline DB
        const idx = SEED_PRODUCTS.findIndex((p) => p.id === id);
        if (idx !== -1) {
          const old = SEED_PRODUCTS[idx];
          SEED_PRODUCTS[idx] = { ...old, ...(input as any) };
          if (input.mrpPaisa && input.mrpPaisa !== old.mrpPaisa) {
            if (!MEMORY_PRICE_HISTORY[id]) MEMORY_PRICE_HISTORY[id] = [];
            MEMORY_PRICE_HISTORY[id].unshift({
              id: `ph-${Date.now()}`,
              productId: id,
              oldMrpPaisa: old.mrpPaisa,
              newMrpPaisa: input.mrpPaisa,
              oldCostPricePaisa: old.costPricePaisa,
              newCostPricePaisa: input.costPricePaisa || old.costPricePaisa,
              changeReason: 'Manual price revision',
              changedByName: user?.fullName || 'User',
              createdAt: new Date().toISOString(),
            });
          }
          return { success: true, data: SEED_PRODUCTS[idx] };
        }
        return reply.status(404).send({ success: false, message: 'Product not found' });
      }
    }
  );

  // POST /api/products/import-csv
  fastify.post(
    '/import-csv',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const { csvText, dryRun = false } = req.body as { csvText: string; dryRun?: boolean };
      if (!csvText) {
        return reply.status(400).send({ success: false, message: 'CSV text content is required' });
      }

      const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        return reply.status(400).send({ success: false, message: 'CSV has no data rows' });
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const expected = ['sku', 'name', 'genericname', 'strength', 'dosageform', 'mrppkr'];
      for (const exp of expected) {
        if (!headers.includes(exp)) {
          return reply.status(400).send({
            success: false,
            message: `Missing required CSV column header: "${exp}". Found: ${headers.join(', ')}`,
          });
        }
      }

      const validRows: any[] = [];
      const errors: { row: number; reason: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx] || '';
        });

        if (!row.sku || !row.name || !row.genericname || !row.strength || !row.dosageform) {
          errors.push({ row: i + 1, reason: 'Missing mandatory fields (SKU, Name, Generic, Strength, Dosage)' });
          continue;
        }

        const mrpPkr = parseFloat(row.mrppkr || '0');
        if (isNaN(mrpPkr) || mrpPkr <= 0) {
          errors.push({ row: i + 1, reason: `Invalid MRP value: "${row.mrppkr}"` });
          continue;
        }

        const costPkr = parseFloat(row.costpkr || '0');
        const mrpPaisa = Math.round(mrpPkr * 100);
        const costPricePaisa = isNaN(costPkr) ? null : Math.round(costPkr * 100);

        validRows.push({
          sku: row.sku.toUpperCase(),
          name: row.name,
          genericName: row.genericname,
          strength: row.strength,
          dosageForm: row.dosageform,
          drugClass: (row.drugclass?.toUpperCase() as any) || DrugClass.OTC,
          storageCondition: StorageCondition.ROOM_TEMPERATURE,
          mrpPaisa,
          costPricePaisa,
          minStockLevel: parseInt(row.minstock || '10', 10) || 10,
          maxStockLevel: parseInt(row.maxstock || '100', 10) || 100,
          rackLocation: row.racklocation || null,
          status: ProductStatus.ACTIVE,
          requiresPrescription: row.drugclass?.toUpperCase() === 'RX',
          isLooseSellingEnabled: row.looseselling === 'true' || row.looseselling === '1',
          barcodes: row.barcode ? [row.barcode] : [],
        });
      }

      if (!dryRun && validRows.length > 0) {
        for (const item of validRows) {
          SEED_PRODUCTS.push({
            ...item,
            id: `prod-csv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            currentStock: 0,
            units: [
              { unitName: 'Base', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: true, barcode: item.barcodes[0] || null },
            ],
            createdAt: new Date().toISOString(),
          } as any);
        }
      }

      return {
        success: true,
        summary: {
          totalRows: lines.length - 1,
          validCount: validRows.length,
          errorCount: errors.length,
          dryRun,
        },
        preview: validRows.slice(0, 5),
        errors,
      };
    }
  );
};
