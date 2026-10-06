import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  UserRole,
  ReorderSuggestionItemDto,
  SupplierReorderGroupDto,
  DraftPurchaseOrderDto,
  CreateDraftPoSchema,
  CreateDraftPoInput,
} from '@pharmacy/shared';
import { SEED_PRODUCTS } from './products';
import { MEMORY_BATCHES } from './purchases';

// In-memory store for draft POs (persists during process lifetime)
export const MEMORY_DRAFT_POS: DraftPurchaseOrderDto[] = [
  {
    id: 'po-draft-demo-1',
    poNumber: 'PO-202610-0001',
    supplierId: 'sup-1',
    supplierName: 'Al-Madina Pharma Distributors',
    supplierPhone: '0300-1234567',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdByName: 'Dr. Tariq (Pharmacist)',
    targetCoverageDays: 30,
    speedWindowDays: 30,
    totalEstimatedPaisa: 1545000, // PKR 15,450
    status: 'DRAFT',
    notes: 'Urgent refill for high-velocity analgesics & antibiotics before weekend rush',
    items: [
      {
        productId: 'prod-1',
        productName: 'Panadol 500mg',
        sku: 'MED-PAN-500',
        unitName: 'Box',
        conversionFactor: 200,
        quantityInPacks: 15,
        totalSmallestUnits: 3000,
        costPricePaisa: 58000,
        lineTotalPaisa: 870000,
      },
      {
        productId: 'prod-3',
        productName: 'Augmentin 625mg',
        sku: 'MED-AUG-625',
        unitName: 'Box',
        conversionFactor: 12,
        quantityInPacks: 35,
        totalSmallestUnits: 420,
        costPricePaisa: 19500,
        lineTotalPaisa: 682500,
      },
    ],
  },
];

let PO_COUNTER = 2;

// Default demo sales velocity per product when database historical records are not populated
const DEMO_VELOCITY_MAP: Record<string, { s30: number; s60: number; s90: number }> = {
  'prod-1': { s30: 1250, s60: 2400, s90: 3600 }, // Panadol 500mg (Fast mover)
  'prod-2': { s30: 450, s60: 920, s90: 1350 },   // Calpol 500mg
  'prod-3': { s30: 320, s60: 620, s90: 910 },    // Augmentin 625mg
  'prod-4': { s30: 140, s60: 270, s90: 410 },    // Insulin Mixtard
  'prod-5': { s30: 550, s60: 1100, s90: 1620 },  // Brufen 400mg
  'prod-6': { s30: 380, s60: 740, s90: 1090 },   // Flagyl 400mg
  'prod-7': { s30: 290, s60: 570, s90: 840 },    // Risek 20mg
  'prod-8': { s30: 210, s60: 410, s90: 630 },    // Disprin 300mg
};

export const reorderRoutes: FastifyPluginAsync = async (fastify) => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. GET /api/reorder/suggestions
  // Calculates sales speed across 30, 60, 90 days and groups recommendations
  // by primary supplier into actionable draft purchase orders
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/suggestions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;
    if (
      ![UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.ACCOUNTANT, UserRole.CASHIER].includes(user.role)
    ) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }

    const query = request.query as {
      windowDays?: string;
      supplierId?: string;
      targetCoverageDays?: string;
      leadTimeDays?: string;
      urgentOnly?: string;
    };

    const windowDays: 30 | 60 | 90 = Number(query.windowDays) === 60 ? 60 : Number(query.windowDays) === 90 ? 90 : 30;
    const targetCoverageDays = Number(query.targetCoverageDays) || 30;
    const leadTimeDays = Number(query.leadTimeDays) || 7;
    const urgentOnly = query.urgentOnly === 'true';

    try {
      // 1. Fetch products & suppliers
      let products: any[] = [];
      let dbSalesMap: Record<string, { s30: number; s60: number; s90: number }> = {};

      try {
        products = await prisma.product.findMany({
          where: {
            status: 'ACTIVE',
            ...(query.supplierId ? { primarySupplierId: query.supplierId } : {}),
          },
          include: {
            primarySupplier: true,
            units: true,
            batches: {
              where: { quantity: { gt: 0 } },
            },
          },
        });

        // Query sales velocity from SaleItem if sales exist in DB
        const now = new Date();
        const d90 = new Date(now.getTime() - 90 * 86400000);
        const saleItems = await prisma.saleItem.findMany({
          where: {
            sale: {
              saleDate: { gte: d90 },
              status: 'POSTED',
            },
          },
          select: {
            productId: true,
            quantitySmallestUnits: true,
            sale: { select: { saleDate: true } },
          },
        });

        const nowMs = now.getTime();
        for (const it of saleItems) {
          const ageDays = (nowMs - new Date(it.sale.saleDate).getTime()) / 86400000;
          if (!dbSalesMap[it.productId]) {
            dbSalesMap[it.productId] = { s30: 0, s60: 0, s90: 0 };
          }
          if (ageDays <= 30) dbSalesMap[it.productId].s30 += it.quantitySmallestUnits;
          if (ageDays <= 60) dbSalesMap[it.productId].s60 += it.quantitySmallestUnits;
          if (ageDays <= 90) dbSalesMap[it.productId].s90 += it.quantitySmallestUnits;
        }
      } catch {
        // Fallback to in-memory datasets
        products = [];
      }

      // If DB was empty or not populated, merge with SEED_PRODUCTS
      if (products.length === 0) {
        products = SEED_PRODUCTS.filter((p) => {
          if (query.supplierId && p.primarySupplierId !== query.supplierId) return false;
          return true;
        }).map((p) => {
          const batches = MEMORY_BATCHES.filter((b) => b.productId === p.id);
          const currentStock = batches.reduce((s, b) => s + b.quantity, 0) || p.currentStock || 0;
          return {
            ...p,
            currentStock,
            primarySupplier: {
              id: p.primarySupplierId,
              name: p.primarySupplierName,
              code: 'SUP-01',
              phone: '0300-1234567',
            },
          };
        });
      }

      const suggestionItems: ReorderSuggestionItemDto[] = [];

      for (const p of products) {
        // Current stock in base units
        const currentStock = typeof p.currentStock === 'number'
          ? p.currentStock
          : (p.batches ? p.batches.reduce((sum: number, b: any) => sum + b.quantity, 0) : 0);

        // Historical consumption velocity
        const vel = dbSalesMap[p.id] || DEMO_VELOCITY_MAP[p.id] || {
          s30: Math.round((p.minStockLevel || 20) * 1.5),
          s60: Math.round((p.minStockLevel || 20) * 3.0),
          s90: Math.round((p.minStockLevel || 20) * 4.4),
        };

        const unitsInSelectedWindow = windowDays === 30 ? vel.s30 : windowDays === 60 ? vel.s60 : vel.s90;
        const dailyRunRate = Number((unitsInSelectedWindow / windowDays).toFixed(2));

        const daysStockRemaining = dailyRunRate > 0
          ? Math.round(currentStock / dailyRunRate)
          : (currentStock > 0 ? 999 : 0);

        // Determine urgency
        let urgency: 'OUT_OF_STOCK' | 'CRITICAL' | 'REORDER_NOW' | 'ADEQUATE' = 'ADEQUATE';
        if (currentStock <= 0) {
          urgency = 'OUT_OF_STOCK';
        } else if (daysStockRemaining <= 5) {
          urgency = 'CRITICAL';
        } else if (daysStockRemaining <= 15 || currentStock <= (p.minStockLevel || 10)) {
          urgency = 'REORDER_NOW';
        }

        // Buffer calculation: target coverage days + supplier lead time
        const neededUnits = Math.ceil((targetCoverageDays + leadTimeDays) * dailyRunRate);
        const suggestedReorderBaseUnits = Math.max(0, neededUnits - currentStock);

        // Filter if urgent only
        if (urgentOnly && urgency === 'ADEQUATE') {
          continue;
        }

        // Purchasing Pack Unit selection (prefer Box/Carton/Strip over base tablet)
        const packUnit = (p.units && p.units.length > 0)
          ? p.units.find((u: any) => u.conversionFactor > 1 && !u.isBaseUnit) || p.units[0]
          : { unitName: 'Box', conversionFactor: 1 };

        const conversionFactor = packUnit.conversionFactor || 1;
        const suggestedPackUnits = conversionFactor > 1
          ? Math.ceil(suggestedReorderBaseUnits / conversionFactor)
          : suggestedReorderBaseUnits;

        // Effective unit cost in paisa per entered pack
        const baseUnitCost = p.costPricePaisa || Math.round(p.mrpPaisa * 0.8) || 1000;
        const packUnitCostPaisa = conversionFactor > 1
          ? (packUnit.pricePaisa ? Math.round(packUnit.pricePaisa * 0.8) : baseUnitCost * conversionFactor)
          : baseUnitCost;

        const estimatedCostPaisa = suggestedPackUnits * packUnitCostPaisa;

        const supplier = p.primarySupplier || {
          id: p.primarySupplierId || 'sup-1',
          name: p.primarySupplierName || 'Al-Madina Pharma Distributors',
          code: 'SUP-01',
          phone: '0300-1234567',
        };

        suggestionItems.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          genericName: p.genericName,
          rackLocation: p.rackLocation || 'Rack A-01',
          isRefrigerated: p.storageCondition === 'COLD_REFRIGERATED' || p.storageCondition === 'COOL',
          minStockLevel: p.minStockLevel || 10,
          currentStock,
          sales30d: vel.s30,
          sales60d: vel.s60,
          sales90d: vel.s90,
          dailyRunRate,
          daysStockRemaining,
          urgency,
          suggestedReorderBaseUnits,
          packUnitName: packUnit.unitName || 'Box',
          conversionFactor,
          suggestedPackUnits,
          unitCostPaisa: packUnitCostPaisa,
          estimatedCostPaisa,
          primarySupplierId: supplier.id,
          primarySupplierName: supplier.name,
          supplierCode: supplier.code,
          supplierPhone: supplier.phone,
        });
      }

      // Group suggestions by Supplier
      const groupsMap = new Map<string, SupplierReorderGroupDto>();

      for (const item of suggestionItems) {
        if (!groupsMap.has(item.primarySupplierId)) {
          groupsMap.set(item.primarySupplierId, {
            supplierId: item.primarySupplierId,
            supplierName: item.primarySupplierName,
            supplierCode: item.supplierCode,
            supplierPhone: item.supplierPhone,
            itemCount: 0,
            totalEstimatedPaisa: 0,
            items: [],
          });
        }

        const grp = groupsMap.get(item.primarySupplierId)!;
        grp.items.push(item);
        grp.itemCount += 1;
        grp.totalEstimatedPaisa += item.estimatedCostPaisa;
      }

      const groups = Array.from(groupsMap.values()).sort((a, b) => b.totalEstimatedPaisa - a.totalEstimatedPaisa);
      const totalItemsToReorder = suggestionItems.filter((i) => i.suggestedPackUnits > 0).length;
      const totalEstimatedPaisa = groups.reduce((sum, g) => sum + g.totalEstimatedPaisa, 0);

      return reply.send({
        success: true,
        data: {
          windowDays,
          targetCoverageDays,
          leadTimeDays,
          totalSuppliers: groups.length,
          totalItemsToReorder,
          totalEstimatedPaisa,
          groups,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to generate reorder suggestions',
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. POST /api/reorder/draft-po
  // Creates and saves a draft purchase order grouped for a supplier
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/draft-po', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;
    if (
      ![UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY, UserRole.ACCOUNTANT].includes(user.role)
    ) {
      return reply.status(403).send({ success: false, error: 'Only inventory managers, pharmacists and admins can create draft purchase orders' });
    }

    const parseResult = CreateDraftPoSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const input: CreateDraftPoInput = parseResult.data;

    // Lookup supplier
    let supplierName = 'Supplier';
    let supplierPhone = 'N/A';
    try {
      const sup = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
      if (sup) {
        supplierName = sup.name;
        supplierPhone = sup.phone || 'N/A';
      }
    } catch {
      // Demo supplier lookup
      if (input.supplierId === 'sup-1') {
        supplierName = 'Al-Madina Pharma Distributors';
        supplierPhone = '0300-1234567';
      } else if (input.supplierId === 'sup-2') {
        supplierName = 'Khyber Medicos & Wholesale';
        supplierPhone = '0333-9876543';
      }
    }

    const now = new Date();
    const poNumStr = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(PO_COUNTER++).padStart(4, '0')}`;

    const items = input.items.map((it) => {
      const totalUnits = it.quantityInPacks * it.conversionFactor;
      const lineTotal = it.quantityInPacks * it.costPricePaisa;
      return {
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        unitName: it.unitName,
        conversionFactor: it.conversionFactor,
        quantityInPacks: it.quantityInPacks,
        totalSmallestUnits: totalUnits,
        costPricePaisa: it.costPricePaisa,
        lineTotalPaisa: lineTotal,
      };
    });

    const totalEstimatedPaisa = items.reduce((sum, it) => sum + it.lineTotalPaisa, 0);

    const draftPo: DraftPurchaseOrderDto = {
      id: `po-draft-${Date.now()}`,
      poNumber: poNumStr,
      supplierId: input.supplierId,
      supplierName,
      supplierPhone,
      createdAt: now.toISOString(),
      createdByName: user.fullName || user.username,
      targetCoverageDays: input.targetCoverageDays,
      speedWindowDays: input.speedWindowDays,
      totalEstimatedPaisa,
      status: 'DRAFT',
      notes: input.notes || `Reorder generated from ${input.speedWindowDays}-day sales speed for ${input.targetCoverageDays} days coverage.`,
      items,
    };

    MEMORY_DRAFT_POS.unshift(draftPo);

    return reply.status(201).send({
      success: true,
      data: draftPo,
      message: `Draft Purchase Order ${draftPo.poNumber} created successfully`,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. GET /api/reorder/draft-pos
  // Lists all draft purchase orders
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/draft-pos', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    return reply.send({
      success: true,
      data: MEMORY_DRAFT_POS,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. GET /api/reorder/draft-pos/:id
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/draft-pos/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const found = MEMORY_DRAFT_POS.find((po) => po.id === id || po.poNumber === id);
    if (!found) {
      return reply.status(404).send({ success: false, error: 'Draft purchase order not found' });
    }
    return reply.send({ success: true, data: found });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PATCH /api/reorder/draft-pos/:id/status
  // Updates status: DRAFT -> SENT_TO_SUPPLIER -> CONVERTED_TO_PURCHASE
  // ───────────────────────────────────────────────────────────────────────────
  fastify.patch('/draft-pos/:id/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'DRAFT' | 'SENT_TO_SUPPLIER' | 'CONVERTED_TO_PURCHASE' };

    const found = MEMORY_DRAFT_POS.find((po) => po.id === id);
    if (!found) {
      return reply.status(404).send({ success: false, error: 'Draft purchase order not found' });
    }

    found.status = status;
    return reply.send({
      success: true,
      data: found,
      message: `Status updated to ${status}`,
    });
  });
};
